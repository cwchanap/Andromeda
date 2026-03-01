import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import {
    ErrorLogger,
    APIErrorHandler,
    AssetLoader,
    WebGLErrorHandler,
    createUserFriendlyErrorMessage,
    getRecoveryActions,
    type ErrorInfo,
} from "../errorHandling";

// Reset the ErrorLogger singleton between tests
function resetSingleton() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ErrorLogger as any).instance = undefined;
}

const makeError = (
    code: string,
    severity: ErrorInfo["severity"] = "low",
): ErrorInfo => ({
    message: "test error",
    code,
    severity,
    timestamp: Date.now(),
});

describe("ErrorLogger", () => {
    beforeEach(() => {
        resetSingleton();
    });

    it("returns the same singleton instance", () => {
        const a = ErrorLogger.getInstance();
        const b = ErrorLogger.getInstance();
        expect(a).toBe(b);
    });

    it("starts with no errors", () => {
        expect(ErrorLogger.getInstance().getErrors()).toHaveLength(0);
    });

    it("logs errors and returns them in reverse order", () => {
        const logger = ErrorLogger.getInstance();
        logger.log(makeError("FIRST"));
        logger.log(makeError("SECOND"));
        const errors = logger.getErrors();
        expect(errors[0].code).toBe("SECOND");
        expect(errors[1].code).toBe("FIRST");
    });

    it("getErrors returns a copy (not the internal array)", () => {
        const logger = ErrorLogger.getInstance();
        logger.log(makeError("A"));
        const errors = logger.getErrors();
        errors.pop();
        expect(logger.getErrors()).toHaveLength(1);
    });

    it("clears all errors", () => {
        const logger = ErrorLogger.getInstance();
        logger.log(makeError("A"));
        logger.clearErrors();
        expect(logger.getErrors()).toHaveLength(0);
    });

    it("caps stored errors at 100", () => {
        const logger = ErrorLogger.getInstance();
        for (let i = 0; i < 110; i++) {
            logger.log(makeError(`E${i}`));
        }
        expect(logger.getErrors()).toHaveLength(100);
    });
});

describe("createUserFriendlyErrorMessage", () => {
    it("returns a message for WEBGL_CONTEXT_LOST", () => {
        const msg = createUserFriendlyErrorMessage(
            makeError("WEBGL_CONTEXT_LOST"),
        );
        expect(msg).toContain("graphics driver");
    });

    it("returns a message for TEXTURE_LOAD_FAILED", () => {
        const msg = createUserFriendlyErrorMessage(
            makeError("TEXTURE_LOAD_FAILED"),
        );
        expect(msg).toContain("visual elements");
    });

    it("returns a message for GEOMETRY_CREATE_FAILED", () => {
        const msg = createUserFriendlyErrorMessage(
            makeError("GEOMETRY_CREATE_FAILED"),
        );
        expect(msg).toContain("3D objects");
    });

    it("returns a message for API_OPERATION_FAILED", () => {
        const msg = createUserFriendlyErrorMessage(
            makeError("API_OPERATION_FAILED"),
        );
        expect(msg).toContain("Network connection");
    });

    it("returns a message for COMPONENT_ERROR", () => {
        const msg = createUserFriendlyErrorMessage(
            makeError("COMPONENT_ERROR"),
        );
        expect(msg).toContain("component");
    });

    it("returns a generic fallback for unknown codes", () => {
        const msg = createUserFriendlyErrorMessage(makeError("UNKNOWN_CODE"));
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe("string");
    });
});

describe("getRecoveryActions", () => {
    it("returns actions for WEBGL_CONTEXT_LOST", () => {
        const actions = getRecoveryActions(makeError("WEBGL_CONTEXT_LOST"));
        expect(actions.length).toBeGreaterThan(0);
        expect(actions[0].type).toBe("primary");
    });

    it("returns multiple actions for API_OPERATION_FAILED", () => {
        const actions = getRecoveryActions(makeError("API_OPERATION_FAILED"));
        expect(actions.length).toBeGreaterThanOrEqual(2);
        const types = actions.map((a) => a.type);
        expect(types).toContain("primary");
        expect(types).toContain("secondary");
    });

    it("returns actions for COMPONENT_ERROR", () => {
        const actions = getRecoveryActions(makeError("COMPONENT_ERROR"));
        expect(actions.length).toBeGreaterThan(0);
    });

    it("returns a default action for unknown error codes", () => {
        const actions = getRecoveryActions(makeError("TOTALLY_UNKNOWN"));
        expect(actions.length).toBeGreaterThan(0);
        expect(actions[0]).toHaveProperty("label");
        expect(actions[0]).toHaveProperty("action");
    });

    it("action functions are callable", () => {
        const actions = getRecoveryActions(makeError("API_OPERATION_FAILED"));
        // The secondary "Continue Offline" action sets localStorage
        const secondary = actions.find((a) => a.type === "secondary");
        expect(secondary).toBeDefined();
        expect(() => secondary!.action()).not.toThrow();
        expect(localStorage.setItem).toHaveBeenCalledWith(
            "offlineMode",
            "true",
        );
    });
});

describe("APIErrorHandler", () => {
    describe("createFallbackResponse", () => {
        it("returns AI_CHAT fallback with isError=true", () => {
            const r = APIErrorHandler.createFallbackResponse("AI_CHAT");
            expect(r.isError).toBe(true);
            expect(typeof r.message).toBe("string");
        });

        it("returns PLANET_DATA fallback with keyFacts", () => {
            const r = APIErrorHandler.createFallbackResponse("PLANET_DATA");
            expect(r.isError).toBe(true);
            expect(r.keyFacts).toBeDefined();
        });

        it("returns a generic fallback for unknown operation names", () => {
            const r = APIErrorHandler.createFallbackResponse("UNKNOWN_OP");
            expect(r.isError).toBe(true);
            expect(r.error).toBeDefined();
        });
    });

    describe("withRetry", () => {
        it("resolves immediately when operation succeeds on first try", async () => {
            const op = vi.fn().mockResolvedValue("ok");
            const result = await APIErrorHandler.withRetry(op, "TEST_OP", 2);
            expect(result).toBe("ok");
            expect(op).toHaveBeenCalledTimes(1);
        });

        it("retries and succeeds on second attempt", async () => {
            const op = vi
                .fn()
                .mockRejectedValueOnce(new Error("fail"))
                .mockResolvedValue("ok");
            const result = await APIErrorHandler.withRetry(op, "TEST_OP", 2);
            expect(result).toBe("ok");
            expect(op).toHaveBeenCalledTimes(2);
        });

        it("throws after all retries are exhausted", async () => {
            const op = vi.fn().mockRejectedValue(new Error("always fails"));
            await expect(
                APIErrorHandler.withRetry(op, "TEST_OP", 2),
            ).rejects.toThrow("always fails");
            expect(op).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        });

        it("wraps non-Error rejects in an Error", async () => {
            const op = vi.fn().mockRejectedValue("string error");
            await expect(
                APIErrorHandler.withRetry(op, "TEST_OP", 0),
            ).rejects.toBeTruthy();
        });
    });
});

describe("AssetLoader", () => {
    beforeEach(() => {
        AssetLoader.clearCache();
        globalThis.__threeTextureLoadOutcome = undefined;
    });

    describe("loadTexture", () => {
        it("returns a texture on success", async () => {
            const result = await AssetLoader.loadTexture("/textures/earth.jpg");
            // The mock returns a THREE.Texture; it should have a dispose fn
            expect(result).toHaveProperty("dispose");
        });

        it("returns cached texture on second call", async () => {
            const first = await AssetLoader.loadTexture("/textures/earth.jpg");
            const second = await AssetLoader.loadTexture("/textures/earth.jpg");
            expect(first).toBe(second);
        });

        it("returns a fallback Color when texture load fails", async () => {
            globalThis.__threeTextureLoadOutcome = {
                "/textures/missing.jpg": "error",
            };
            const result = await AssetLoader.loadTexture(
                "/textures/missing.jpg",
            );
            // Fallback is a THREE.Color, which has setHex
            expect(result).toHaveProperty("setHex");
        });

        it("returns cached fallback on repeated failure", async () => {
            globalThis.__threeTextureLoadOutcome = {
                "/textures/bad.jpg": "error",
            };
            const first = await AssetLoader.loadTexture("/textures/bad.jpg");
            const second = await AssetLoader.loadTexture("/textures/bad.jpg");
            expect(first).toBe(second);
        });
    });

    describe("loadGeometry", () => {
        it("creates a sphere geometry", async () => {
            const geo = await AssetLoader.loadGeometry("sphere", {
                radius: 1,
                widthSegments: 32,
                heightSegments: 16,
            });
            expect(geo).toHaveProperty("dispose");
        });

        it("creates a box geometry", async () => {
            const geo = await AssetLoader.loadGeometry("box", {
                width: 1,
                height: 1,
                depth: 1,
            });
            expect(geo).toHaveProperty("dispose");
        });

        it("creates a ring geometry", async () => {
            const geo = await AssetLoader.loadGeometry("ring", {
                innerRadius: 0.5,
                outerRadius: 1,
                thetaSegments: 8,
            });
            expect(geo).toHaveProperty("dispose");
        });

        it("uses default params when not provided", async () => {
            const geo = await AssetLoader.loadGeometry("sphere", {});
            expect(geo).toHaveProperty("dispose");
        });

        it("falls back to SphereGeometry for unsupported type", async () => {
            // Using unknown cast to bypass TypeScript type guard for testing invalid input
            const geo = await AssetLoader.loadGeometry("invalid" as never, {});
            expect(geo).toHaveProperty("dispose");
        });
    });

    describe("clearCache", () => {
        it("clears cached assets so next call re-fetches", async () => {
            const first = await AssetLoader.loadTexture("/t/a.jpg");
            AssetLoader.clearCache();
            const second = await AssetLoader.loadTexture("/t/a.jpg");
            // After clearing, a new object is returned
            expect(first).not.toBe(second);
        });
    });

    describe("loadTexture – failedAssets path", () => {
        it("returns a Color when URL is in failedAssets but not in textureCache", async () => {
            // First call: fails and populates both caches
            globalThis.__threeTextureLoadOutcome = {
                "/textures/fail2.jpg": "error",
            };
            await AssetLoader.loadTexture("/textures/fail2.jpg");

            // Manually remove from textureCache (simulating cache eviction) so
            // the failedAssets early-return branch (lines 213-215) is hit
            (
                AssetLoader as unknown as { textureCache: Map<string, unknown> }
            ).textureCache.delete("texture_/textures/fail2.jpg");

            const result = await AssetLoader.loadTexture("/textures/fail2.jpg");
            // Should return a THREE.Color (has setHex)
            expect(result).toHaveProperty("setHex");
        });
    });
});

describe("WebGLErrorHandler", () => {
    beforeEach(() => {
        // @ts-expect-error - accessing private static property for testing
        (ErrorLogger as { instance: unknown }).instance = undefined;
    });

    it("cleanup() removes event listeners from canvas when renderer is set", () => {
        const mockCanvas = document.createElement("canvas");
        const removeEventListenerSpy = vi.spyOn(
            mockCanvas,
            "removeEventListener",
        );
        const mockRenderer = {
            domElement: mockCanvas,
        } as Partial<THREE.WebGLRenderer> & { domElement: HTMLCanvasElement };

        const handler = new WebGLErrorHandler(
            mockRenderer as THREE.WebGLRenderer,
        );

        // Use the exact bounds methods from the instance
        const boundLost = (
            handler as unknown as {
                boundHandleContextLost: (event: Event) => void;
            }
        ).boundHandleContextLost;
        const boundRestored = (
            handler as unknown as { boundHandleContextRestored: () => void }
        ).boundHandleContextRestored;

        handler.cleanup();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "webglcontextlost",
            boundLost,
        );
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "webglcontextrestored",
            boundRestored,
        );
    });

    it("cleanup() is a no-op when no renderer was provided", () => {
        const handler = new WebGLErrorHandler();
        expect(() => handler.cleanup()).not.toThrow();
    });

    it("checkWebGLSupport() returns webgl/webgl2 booleans", () => {
        const handler = new WebGLErrorHandler();
        const support = handler.checkWebGLSupport();
        expect(typeof support.webgl).toBe("boolean");
        expect(typeof support.webgl2).toBe("boolean");
    });

    it("checkWebGLSupport() reaches experimental-webgl branch when webgl is unavailable", () => {
        const handler = new WebGLErrorHandler();
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        try {
            // Make "webgl" return null so the || chain evaluates "experimental-webgl"
            HTMLCanvasElement.prototype.getContext = function (
                this: HTMLCanvasElement,
                type: string,
                ...args: unknown[]
            ) {
                if (type === "webgl") return null;
                return origGetContext.call(this, type as never, ...args);
            } as typeof HTMLCanvasElement.prototype.getContext;
            const support = handler.checkWebGLSupport();
            expect(typeof support.webgl).toBe("boolean");
        } finally {
            HTMLCanvasElement.prototype.getContext = origGetContext;
        }
    });

    it("setRenderer() configures context handlers on a new renderer", () => {
        const handler = new WebGLErrorHandler();
        const mockCanvas = document.createElement("canvas");
        const addEventListenerSpy = vi.spyOn(mockCanvas, "addEventListener");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockRenderer = { domElement: mockCanvas } as any;

        handler.setRenderer(mockRenderer);

        expect(addEventListenerSpy).toHaveBeenCalledWith(
            "webglcontextlost",
            expect.any(Function),
            false,
        );
        expect(addEventListenerSpy).toHaveBeenCalledWith(
            "webglcontextrestored",
            expect.any(Function),
            false,
        );
    });

    it("handleContextLost fires ErrorLogger entry and invokes callback", () => {
        const mockCanvas = document.createElement("canvas");
        const onContextLost = vi.fn();
        const mockRenderer = {
            domElement: mockCanvas,
        } as Partial<THREE.WebGLRenderer> & { domElement: HTMLCanvasElement };

        new WebGLErrorHandler(
            mockRenderer as THREE.WebGLRenderer,
            onContextLost,
        );

        const event = new Event("webglcontextlost");
        mockCanvas.dispatchEvent(event);

        expect(onContextLost).toHaveBeenCalled();
        const errors = ErrorLogger.getInstance().getErrors();
        expect(errors.some((e) => e.code === "WEBGL_CONTEXT_LOST")).toBe(true);
    });

    it("handleContextRestored fires ErrorLogger entry and invokes callback", () => {
        const mockCanvas = document.createElement("canvas");
        const onContextRestored = vi.fn();
        const mockRenderer = {
            domElement: mockCanvas,
        } as Partial<THREE.WebGLRenderer> & { domElement: HTMLCanvasElement };

        new WebGLErrorHandler(
            mockRenderer as THREE.WebGLRenderer,
            undefined,
            onContextRestored,
        );

        mockCanvas.dispatchEvent(new Event("webglcontextrestored"));

        expect(onContextRestored).toHaveBeenCalled();
        const errors = ErrorLogger.getInstance().getErrors();
        expect(errors.some((e) => e.code === "WEBGL_CONTEXT_RESTORED")).toBe(
            true,
        );
    });
});
