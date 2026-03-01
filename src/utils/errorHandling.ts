import * as THREE from "three";

export interface ErrorInfo {
    message: string;
    code: string;
    severity: "low" | "medium" | "high" | "critical";
    timestamp: number;
    context?: Record<string, unknown>;
}

export interface RecoveryAction {
    label: string;
    action: () => void | Promise<void>;
    type: "primary" | "secondary" | "danger";
}

export interface GeometryParams {
    radius?: number;
    width?: number;
    height?: number;
    depth?: number;
    widthSegments?: number;
    heightSegments?: number;
    innerRadius?: number;
    outerRadius?: number;
    thetaSegments?: number;
}

export interface FallbackResponse {
    message?: string;
    name?: string;
    type?: string;
    description?: string;
    keyFacts?: {
        diameter: string;
        distanceFromSun: string;
        orbitalPeriod: string;
        composition: string[];
        temperature: string;
    };
    error?: string;
    isError: boolean;
}

export class ErrorLogger {
    private static instance: ErrorLogger;
    private errors: ErrorInfo[] = [];
    private maxErrors = 100;

    private constructor() {}

    static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }

    log(error: ErrorInfo): void {
        this.errors.unshift(error);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error("Error logged:", error);
        }

        // In production, you might want to send to an error tracking service
        if (import.meta.env.PROD && error.severity === "critical") {
            this.reportToCrashlytics(error);
        }
    }

    getErrors(): ErrorInfo[] {
        return [...this.errors];
    }

    clearErrors(): void {
        this.errors = [];
    }

    private reportToCrashlytics(error: ErrorInfo): void {
        // Placeholder for production error reporting
        // In a real app, you'd integrate with services like Sentry, Bugsnag, etc.
        console.warn(
            "Critical error would be reported to crash analytics:",
            error,
        );
    }
}

export class WebGLErrorHandler {
    private renderer: THREE.WebGLRenderer | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private contextLostCallback?: () => void;
    private contextRestoredCallback?: () => void;

    private boundHandleContextLost: (event: Event) => void;
    private boundHandleContextRestored: () => void;

    constructor(
        renderer?: THREE.WebGLRenderer,
        onContextLost?: () => void,
        onContextRestored?: () => void,
    ) {
        this.renderer = renderer || null;
        this.contextLostCallback = onContextLost;
        this.contextRestoredCallback = onContextRestored;
        this.boundHandleContextLost = this.handleContextLost.bind(this);
        this.boundHandleContextRestored = this.handleContextRestored.bind(this);

        if (this.renderer) {
            this.setupContextHandlers();
        }
    }

    setRenderer(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        this.setupContextHandlers();
    }

    private setupContextHandlers(): void {
        if (!this.renderer) return;

        this.canvas = this.renderer.domElement;

        this.canvas.addEventListener(
            "webglcontextlost",
            this.boundHandleContextLost,
            false,
        );
        this.canvas.addEventListener(
            "webglcontextrestored",
            this.boundHandleContextRestored,
            false,
        );
    }

    private handleContextLost(event: Event): void {
        event.preventDefault();

        ErrorLogger.getInstance().log({
            message: "WebGL context lost",
            code: "WEBGL_CONTEXT_LOST",
            severity: "high",
            timestamp: Date.now(),
            context: {
                userAgent: navigator.userAgent,
                webglSupport: this.checkWebGLSupport(),
            },
        });

        if (this.contextLostCallback) {
            this.contextLostCallback();
        }
    }

    private handleContextRestored(): void {
        ErrorLogger.getInstance().log({
            message: "WebGL context restored",
            code: "WEBGL_CONTEXT_RESTORED",
            severity: "low",
            timestamp: Date.now(),
        });

        if (this.contextRestoredCallback) {
            this.contextRestoredCallback();
        }
    }

    checkWebGLSupport(): { webgl: boolean; webgl2: boolean } {
        const canvas = document.createElement("canvas");

        const webgl = !!(
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl")
        );

        const webgl2 = !!canvas.getContext("webgl2");

        return { webgl, webgl2 };
    }

    cleanup(): void {
        if (this.canvas) {
            this.canvas.removeEventListener(
                "webglcontextlost",
                this.boundHandleContextLost,
            );
            this.canvas.removeEventListener(
                "webglcontextrestored",
                this.boundHandleContextRestored,
            );
        }
    }
}

export class AssetLoader {
    private static textureCache = new Map<
        string,
        THREE.Texture | THREE.Color
    >();
    private static geometryCache = new Map<string, THREE.BufferGeometry>();
    private static failedAssets = new Set<string>();

    static async loadTexture(
        url: string,
        fallbackColor = 0x666666,
    ): Promise<THREE.Texture | THREE.Color> {
        const cacheKey = `texture_${url}`;

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        if (this.failedAssets.has(url)) {
            return new THREE.Color(fallbackColor);
        }

        try {
            const loader = new THREE.TextureLoader();
            const texture = await new Promise<THREE.Texture>(
                (resolve, reject) => {
                    loader.load(url, resolve, undefined, reject);
                },
            );

            this.textureCache.set(cacheKey, texture);
            return texture;
        } catch (error) {
            ErrorLogger.getInstance().log({
                message: `Failed to load texture: ${url}`,
                code: "TEXTURE_LOAD_FAILED",
                severity: "medium",
                timestamp: Date.now(),
                context: {
                    url,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            });

            this.failedAssets.add(url);
            const fallbackColorObj = new THREE.Color(fallbackColor);
            this.textureCache.set(cacheKey, fallbackColorObj);
            return fallbackColorObj;
        }
    }

    static async loadGeometry(
        type: "sphere" | "box" | "ring",
        params: GeometryParams,
        fallbackGeometry?: THREE.BufferGeometry,
    ): Promise<THREE.BufferGeometry> {
        try {
            switch (type) {
                case "sphere":
                    return new THREE.SphereGeometry(
                        params.radius || 1,
                        params.widthSegments || 32,
                        params.heightSegments || 16,
                    );
                case "box":
                    return new THREE.BoxGeometry(
                        params.width || 1,
                        params.height || 1,
                        params.depth || 1,
                    );
                case "ring":
                    return new THREE.RingGeometry(
                        params.innerRadius || 0.5,
                        params.outerRadius || 1,
                        params.thetaSegments || 8,
                    );
                default:
                    throw new Error(`Unsupported geometry type: ${type}`);
            }
        } catch (error) {
            ErrorLogger.getInstance().log({
                message: `Failed to create geometry: ${type}`,
                code: "GEOMETRY_CREATE_FAILED",
                severity: "medium",
                timestamp: Date.now(),
                context: {
                    type,
                    params,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            });

            return fallbackGeometry || new THREE.SphereGeometry(1, 8, 6);
        }
    }

    static clearCache(): void {
        this.textureCache.clear();
        this.geometryCache.clear();
        this.failedAssets.clear();
    }
}

export class APIErrorHandler {
    private static retryDelay = 1000; // Start with 1 second
    private static maxRetries = 3;
    private static maxRetryDelay = 30000; // Max 30 seconds

    static async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries = this.maxRetries,
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError =
                    error instanceof Error ? error : new Error(String(error));

                ErrorLogger.getInstance().log({
                    message: `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1})`,
                    code: "API_OPERATION_FAILED",
                    severity: attempt === maxRetries ? "high" : "medium",
                    timestamp: Date.now(),
                    context: {
                        operationName,
                        attempt: attempt + 1,
                        maxRetries: maxRetries + 1,
                        error: lastError.message,
                    },
                });

                if (attempt < maxRetries) {
                    const delay = Math.min(
                        this.retryDelay * Math.pow(2, attempt),
                        this.maxRetryDelay,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    static createFallbackResponse(operationName: string): FallbackResponse {
        const fallbacks: Record<string, FallbackResponse> = {
            AI_CHAT: {
                message:
                    "I'm sorry, I'm experiencing technical difficulties right now. Please try asking your question again in a moment. In the meantime, you can explore the planetary information available by clicking on different celestial bodies!",
                isError: true,
            },
            PLANET_DATA: {
                name: "Unknown Object",
                type: "unknown",
                description:
                    "Information about this celestial body is temporarily unavailable.",
                keyFacts: {
                    diameter: "Unknown",
                    distanceFromSun: "Unknown",
                    orbitalPeriod: "Unknown",
                    composition: ["Unknown"],
                    temperature: "Unknown",
                },
                isError: true,
            },
        };

        return (
            fallbacks[operationName] || {
                error: "Service temporarily unavailable",
                isError: true,
            }
        );
    }
}

export function createUserFriendlyErrorMessage(error: ErrorInfo): string {
    const errorMessages: Record<string, string> = {
        WEBGL_CONTEXT_LOST:
            "Your graphics driver encountered an issue. The 3D view will reload automatically.",
        TEXTURE_LOAD_FAILED:
            "Some visual elements couldn't load. The app will continue with simplified graphics.",
        GEOMETRY_CREATE_FAILED:
            "There was an issue rendering 3D objects. Using simplified shapes instead.",
        API_OPERATION_FAILED:
            "Network connection issue. Please check your internet connection and try again.",
        COMPONENT_ERROR:
            "A component encountered an error. The app will attempt to recover automatically.",
    };

    return (
        errorMessages[error.code] ||
        "Something went wrong, but we're working to fix it."
    );
}

export function getRecoveryActions(error: ErrorInfo): RecoveryAction[] {
    const actions: Record<string, RecoveryAction[]> = {
        WEBGL_CONTEXT_LOST: [
            {
                label: "Reload 3D View",
                action: () => window.location.reload(),
                type: "primary",
            },
        ],
        API_OPERATION_FAILED: [
            {
                label: "Try Again",
                action: () => window.location.reload(),
                type: "primary",
            },
            {
                label: "Continue Offline",
                action: () => {
                    // Switch to offline mode
                    localStorage.setItem("offlineMode", "true");
                },
                type: "secondary",
            },
        ],
        COMPONENT_ERROR: [
            {
                label: "Refresh Page",
                action: () => window.location.reload(),
                type: "primary",
            },
        ],
    };

    return (
        actions[error.code] || [
            {
                label: "Refresh Page",
                action: () => window.location.reload(),
                type: "primary",
            },
        ]
    );
}
