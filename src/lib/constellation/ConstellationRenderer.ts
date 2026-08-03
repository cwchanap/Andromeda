import * as THREE from "three";
import type {
    SkyConfiguration,
    Star,
    Constellation,
} from "../../types/constellation";
import { ConstellationCatalogLayer } from "@/lib/constellation/ConstellationCatalogLayer";
import type { PreparedConstellationCatalog } from "@/lib/constellation/observerCatalog";
import {
    adaptLegacyCatalog,
    adaptPreparedCatalog,
} from "@/lib/constellation/rendererCatalog";
import type {
    RendererCatalog,
    RendererCatalogSettings,
    RendererStar,
} from "@/lib/constellation/rendererCatalog";
import type { CatalogPlacementContext } from "@/lib/constellation/rendererPlacement";

const HUD_CYAN = 0x00f0ff;
// Maximum elevation (pitch) the camera can reach, in radians. Slightly below
// π/2 to avoid gimbal lock at the zenith while keeping a near-overhead view.
// Used both as the drag/tween clamp and as the initial sky-camera elevation so
// the tracked rotation stays consistent with the actual camera orientation.
const MAX_ELEVATION_RAD = Math.PI / 2.2;

/**
 * Decorative render orders. The starfield sphere renders first, then the
 * optional legacy ambient points sit just above it but below all catalog
 * geometry; Earth-only guides are pinned between catalog layers and the
 * shooting stars render above everything.
 */
const STARFIELD_BACKGROUND_RENDER_ORDER = 0;
const LEGACY_AMBIENT_RENDER_ORDER = 0.25;
const EARTH_CARDINAL_RENDER_ORDER = 0.5;
const EARTH_HORIZON_RENDER_ORDER = 4.5;
const SHOOTING_STAR_RENDER_ORDER = 8;
// Legacy ambient points are only synthesized when fewer than this many
// ordinary stars made it into the catalog (sparse Earth pass).
const LEGACY_AMBIENT_STAR_THRESHOLD = 100;
const LEGACY_AMBIENT_STAR_COUNT = 500;
// Legacy Earth view labels only the brightest stars (magnitude < 1.5),
// preserving the pre-layer star-label gate.
const LEGACY_STAR_LABEL_MAGNITUDE_LIMIT = 1.5;

/**
 * Public request for initializing the renderer from prepared catalogs.
 * Structurally fixed-equatorial: it carries no location/date/timezone/FOV
 * state — only the two catalogs and the optional reference visibility.
 */
export interface PreparedCatalogRenderRequest {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly referenceVisible?: boolean;
}

export type PreparedCatalogRenderSettings = RendererCatalogSettings;

/**
 * Interaction callbacks for the layered renderer. Hover/click/selection are
 * primary-role concepts: the callbacks only ever report primary-catalog
 * objects, never reference or decorative ones. `onStarHover` receives the
 * full {@link RendererStar}, including the optional `marker` record for
 * marker records (e.g. synthetic Sol) — the marker must never be erased.
 */
export interface ConstellationRendererCallbacks {
    onStarHover?: (
        star: RendererStar | null,
        screenPos: { x: number; y: number } | null,
    ) => void;
    onConstellationHover?: (
        id: string | null,
        screenPos: { x: number; y: number } | null,
    ) => void;
    onConstellationClick?: (id: string) => void;
}

/**
 * One shared initialization request consumed by the private
 * {@link ConstellationRenderer.runSharedInitialization} path. The legacy
 * Earth view and the prepared fixed-equatorial view both reduce to this.
 */
interface SharedRendererInitialization {
    readonly primaryCatalog: RendererCatalog;
    readonly referenceCatalog?: RendererCatalog;
    readonly placementContext: CatalogPlacementContext;
    readonly settings: Readonly<RendererCatalogSettings>;
    readonly isLegacyEarth: boolean;
    readonly requestedReferenceVisible?: boolean;
}

export class ConstellationRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLCanvasElement;
    private horizonRing: THREE.LineLoop | null = null;
    private cardinalLabels: THREE.Group | null = null;
    private isMouseDown: boolean = false;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDownX: number = 0;
    private mouseDownY: number = 0;
    private static readonly CLICK_DRAG_THRESHOLD = 5; // px — ignore click if mouse moved more
    private cameraRotationX: number = 0;
    private cameraRotationY: number = 0;
    private selectedId: string | null = null;
    private hoveredId: string | null = null;
    private isDragging: boolean = false;
    private dragVelocityX: number = 0;
    private dragVelocityY: number = 0;
    private tweenState: {
        startX: number;
        startY: number;
        targetX: number;
        targetY: number;
        startedAt: number;
        duration: number;
        active: boolean;
    } = {
        startX: 0,
        startY: 0,
        targetX: 0,
        targetY: 0,
        startedAt: 0,
        duration: 0,
        active: false,
    };
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private clock = new THREE.Clock();
    private activeShootingStar: THREE.Line | null = null;
    private shootingStarCount: number = 0;
    private nextShootingStarAt: number = 0;
    private shootingStarStarted: number = 0;
    // Runtime-toggled label visibility (star + constellation name labels).
    // Both label groups are always created in initialize() so the toggle can
    // turn them on/off without re-running the (canvas-texture) creation path.
    private labelsVisible: boolean = true;
    // True once the runtime has called setLabelsVisible(). When set, a
    // subsequent initialize()/updateSky() must NOT overwrite labelsVisible
    // from skyConfig.showStarNames — the user's runtime choice wins even if
    // it arrived before init completed (e.g. toggling labels off while the
    // view is still loading).
    private _labelsVisibleUserSet: boolean = false;
    // Auto-rotate state — when enabled and no user drag/tween is active, the
    // camera yaw advances each frame to slowly pan the sky. Respects
    // reduced-motion (disabled entirely when `reducedMotion` is true).
    private autoRotate: boolean = false;
    private autoRotateSpeed: number = 0.04; // radians per second
    private reducedMotion: boolean = false;
    // Layered catalog state. The primary layer renders the active catalog;
    // the optional reference layer renders the comparison catalog. Both are
    // rebuilt on every initialization, while the decorative background below
    // (starfield sphere + optional ambient points) is created once in the
    // constructor and survives reinitializations.
    private primaryLayer: ConstellationCatalogLayer | null = null;
    private referenceLayer: ConstellationCatalogLayer | null = null;
    private referenceVisible = false;
    // One persistent decorative owner: the shader starfield sphere plus the
    // optional legacy ambient-points child (created lazily on the first
    // sparse Earth pass, kept until final disposal).
    private decorativeRoot: THREE.Group;
    private ambientStarPoints: THREE.Points | null = null;
    // Set while the single render-loop RAF chain is running; cleared by
    // final disposal. Repeated serialized initialization reuses the one
    // chain — overlapping async initialization is not supported.
    private animationRunning = false;

    public readonly callbacks: ConstellationRendererCallbacks = {};

    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouseNDC: { x: number; y: number } = { x: 0, y: 0 };
    private lastHoverEmit: number = 0;
    private _rafId: number | null = null;
    private _disposed: boolean = false;
    private _momentumRafId: number | null = null;

    // Reusable Vector3 instances to avoid per-frame allocations in worldToScreen
    private _wtsVec = new THREE.Vector3();
    private _wtsForward = new THREE.Vector3();
    private _wtsRel = new THREE.Vector3();

    // Bound handler references for proper addEventListener/removeEventListener
    private _clickHandler: (event: MouseEvent) => void = () => {};
    private _boundResize: () => void = () => {};
    private _boundMouseDown: (event: MouseEvent) => void = () => {};
    private _boundMouseMove: (event: MouseEvent) => void = () => {};
    private _boundMouseUp: () => void = () => {};
    private _boundMouseWheel: (event: WheelEvent) => void = () => {};
    private _boundContextMenu: (event: Event) => void = () => {};
    private _boundTouchStart: (event: TouchEvent) => void = () => {};
    private _boundTouchMove: (event: TouchEvent) => void = () => {};
    private _boundTouchEnd: () => void = () => {};
    private _boundMouseLeave: () => void = () => {};

    constructor(
        container: HTMLElement,
        callbacks: ConstellationRendererCallbacks = {},
    ) {
        this.callbacks = callbacks;
        // Initialize Three.js scene
        this.scene = new THREE.Scene();

        // Create one persistent decorative owner: the shader starfield sphere
        // (and later the optional legacy ambient points) live inside this root
        // and survive reinitializations. Only final dispose() releases it.
        this.decorativeRoot = new THREE.Group();
        this.decorativeRoot.name = "decorative-background";

        // Create a dark starfield background instead of solid color
        this.createStarfieldBackground();
        this.scene.add(this.decorativeRoot);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 0, 0);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false, // Opaque background for starfield
        });

        // Check if WebGL context was actually created
        const gl = this.renderer.getContext();
        if (!gl) {
            console.error("WebGL context not available");
            this.renderer.dispose();
            throw new Error("WebGL is not supported or failed to initialize");
        }

        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Disable shadows for performance (following project convention)
        this.renderer.shadowMap.enabled = false;

        this.canvas = this.renderer.domElement;
        container.appendChild(this.canvas);

        // Set initial cursor style
        this.canvas.style.cursor = "grab";

        // Add enhanced ambient lighting for better star visibility
        const ambientLight = new THREE.AmbientLight(0x102040, 0.8); // Slightly blue ambient light
        ambientLight.castShadow = false;
        this.scene.add(ambientLight);

        // Bind and store handler references for proper cleanup in dispose()
        this._boundResize = this.handleResize.bind(this);
        this._boundMouseDown = this.onMouseDown.bind(this);
        this._boundMouseMove = this.onMouseMove.bind(this);
        this._boundMouseUp = this.onMouseUp.bind(this);
        this._boundMouseWheel = this.onMouseWheel.bind(this);
        this._boundContextMenu = (e: Event) => e.preventDefault();
        this._boundTouchStart = this._createTouchStartHandler();
        this._boundTouchMove = this._createTouchMoveHandler();
        this._boundTouchEnd = this._createTouchEndHandler();
        this._boundMouseLeave = this.onMouseLeave.bind(this);
        this._clickHandler = this.handleCanvasClick.bind(this);

        // Handle window resize
        window.addEventListener("resize", this._boundResize);

        // Setup mouse and touch controls for 360-degree viewing
        this.setupMouseControls();
        this.setupTouchControls();

        // Register click handler for raycasting
        this.canvas.addEventListener("click", this._clickHandler);
    }

    /**
     * Create a realistic starfield background
     */
    private createStarfieldBackground(): void {
        // Create sphere geometry for starfield background
        const starfieldGeometry = new THREE.SphereGeometry(200, 64, 32);

        // Create shader material for realistic starfield
        const starfieldMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
            },
            vertexShader: `
                varying vec3 vPosition;
                void main() {
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec3 vPosition;
                
                // Simple noise function
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                void main() {
                    vec3 pos = normalize(vPosition);
                    
                    // Create star field pattern
                    vec2 st = vec2(
                        atan(pos.z, pos.x) / (2.0 * 3.14159) + 0.5,
                        acos(pos.y) / 3.14159
                    );
                    
                    // Scale up for more stars
                    st *= 50.0;
                    
                    vec2 ipos = floor(st);
                    vec2 fpos = fract(st);
                    
                    float star = random(ipos);
                    
                    // Create point stars
                    float dist = distance(fpos, vec2(0.5));
                    float brightness = star > 0.985 ? (1.0 - smoothstep(0.0, 0.3, dist)) * (star - 0.985) * 50.0 : 0.0;
                    
                    // Create twinkling effect
                    brightness *= 0.7 + 0.3 * sin(time * 2.0 + star * 100.0);
                    
                    // Color variation
                    vec3 color = vec3(1.0);
                    if (star > 0.995) {
                        color = vec3(0.7, 0.8, 1.0); // Blue stars
                    } else if (star > 0.992) {
                        color = vec3(1.0, 0.7, 0.4); // Orange stars
                    } else if (star > 0.990) {
                        color = vec3(1.0, 0.5, 0.3); // Red stars
                    }
                    
                    // Nebula-like background
                    float nebula = sin(pos.x * 2.0) * sin(pos.y * 2.0) * sin(pos.z * 2.0);
                    nebula = smoothstep(-0.8, 0.8, nebula) * 0.03;
                    
                    vec3 finalColor = color * brightness + vec3(0.05, 0.08, 0.15) * nebula;
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            side: THREE.BackSide, // Render inside of sphere
            depthWrite: false,
        });

        const starfieldMesh = new THREE.Mesh(
            starfieldGeometry,
            starfieldMaterial,
        );
        starfieldMesh.name = "starfield-background";
        starfieldMesh.renderOrder = STARFIELD_BACKGROUND_RENDER_ORDER; // Render first
        this.decorativeRoot.add(starfieldMesh);
    }

    /**
     * Setup mouse controls for 360-degree camera rotation
     */
    private setupMouseControls(): void {
        this.canvas.addEventListener("mousedown", this._boundMouseDown);
        this.canvas.addEventListener("mousemove", this._boundMouseMove);
        this.canvas.addEventListener("mouseup", this._boundMouseUp);
        this.canvas.addEventListener("mouseleave", this._boundMouseLeave);
        this.canvas.addEventListener("wheel", this._boundMouseWheel, {
            passive: false,
        });

        // Prevent context menu on right click
        this.canvas.addEventListener("contextmenu", this._boundContextMenu);
    }

    // Touch tracking state (shared by touch handlers)
    private _touchStartX: number = 0;
    private _touchStartY: number = 0;
    private _lastTouchX: number = 0;
    private _lastTouchY: number = 0;

    /**
     * Setup touch controls for mobile devices
     */
    private setupTouchControls(): void {
        this.canvas.addEventListener("touchstart", this._boundTouchStart, {
            passive: true,
        });
        this.canvas.addEventListener("touchmove", this._boundTouchMove, {
            passive: false,
        });
        this.canvas.addEventListener("touchend", this._boundTouchEnd, {
            passive: true,
        });
    }

    private _createTouchStartHandler(): (event: TouchEvent) => void {
        return (event: TouchEvent): void => {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                this._touchStartX = touch.clientX;
                this._touchStartY = touch.clientY;
                this._lastTouchX = touch.clientX;
                this._lastTouchY = touch.clientY;

                // Mirror into click-threshold state so that a synthesized
                // "click" event (emitted after touchend without a preceding
                // mousedown) compares against the correct origin coordinates.
                this.mouseDownX = touch.clientX;
                this.mouseDownY = touch.clientY;

                // Cancel any in-flight tween so the drag isn't overwritten by tickTween.
                this.tweenState.active = false;

                this.isMouseDown = true;
                this.isDragging = true;
                this.canvas.style.cursor = "grabbing";
            }
        };
    }

    private _createTouchMoveHandler(): (event: TouchEvent) => void {
        return (event: TouchEvent): void => {
            if (event.touches.length === 1 && this.isMouseDown) {
                const touch = event.touches[0];
                const deltaX = touch.clientX - this._touchStartX;
                const deltaY = touch.clientY - this._touchStartY;

                // Calculate velocity for momentum
                this.dragVelocityX = touch.clientX - this._lastTouchX;
                this.dragVelocityY = touch.clientY - this._lastTouchY;

                // Update camera rotation
                this.cameraRotationY -= deltaX * 0.008;
                this.cameraRotationX -= deltaY * 0.008;

                // Limit vertical rotation
                this.cameraRotationX = Math.max(
                    -MAX_ELEVATION_RAD,
                    Math.min(MAX_ELEVATION_RAD, this.cameraRotationX),
                );

                this.updateCameraRotation();

                this._touchStartX = touch.clientX;
                this._touchStartY = touch.clientY;
                this._lastTouchX = touch.clientX;
                this._lastTouchY = touch.clientY;
            }
        };
    }

    private _createTouchEndHandler(): () => void {
        return (): void => {
            this.isMouseDown = false;
            this.canvas.style.cursor = "grab";

            // Start momentum animation if there was significant movement.
            // See onMouseUp for why isDragging must be cleared on the
            // non-momentum path (auto-rotate gate in animate()).
            if (
                Math.abs(this.dragVelocityX) > 0.5 ||
                Math.abs(this.dragVelocityY) > 0.5
            ) {
                this.startMomentumAnimation();
            } else {
                this.isDragging = false;
            }
        };
    }

    /**
     * Handle mouse down event
     */
    private onMouseDown(event: MouseEvent): void {
        // Cancel any in-flight tween so the drag isn't overwritten by tickTween.
        this.tweenState.active = false;

        this.isMouseDown = true;
        this.isDragging = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.mouseDownX = event.clientX;
        this.mouseDownY = event.clientY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.dragVelocityX = 0;
        this.dragVelocityY = 0;

        // Clear hover state while dragging so the HUD doesn't stay stuck
        this.setHovered(null);
        if (this.callbacks.onConstellationHover) {
            this.callbacks.onConstellationHover(null, null);
        }
        if (this.callbacks.onStarHover) {
            this.callbacks.onStarHover(null, null);
        }

        // Add cursor style for better UX
        this.canvas.style.cursor = "grabbing";
    }

    /**
     * Handle mouse move event
     */
    private onMouseMove(event: MouseEvent): void {
        if (this.isMouseDown) {
            const deltaX = event.clientX - this.mouseX;
            const deltaY = event.clientY - this.mouseY;

            // Calculate velocity for momentum
            this.dragVelocityX = event.clientX - this.lastMouseX;
            this.dragVelocityY = event.clientY - this.lastMouseY;

            // Update camera rotation with improved sensitivity
            this.cameraRotationY -= deltaX * 0.008; // Horizontal rotation (increased sensitivity)
            this.cameraRotationX -= deltaY * 0.008; // Vertical rotation (increased sensitivity)

            // Limit vertical rotation to prevent over-rotation (allow looking behind)
            this.cameraRotationX = Math.max(
                -MAX_ELEVATION_RAD,
                Math.min(MAX_ELEVATION_RAD, this.cameraRotationX),
            );

            this.updateCameraRotation();

            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }

        // Hover raycasting (throttled to ~60fps)
        const now = performance.now();
        if (
            !this.isMouseDown &&
            now - this.lastHoverEmit > 16 &&
            (this.callbacks.onConstellationHover || this.callbacks.onStarHover)
        ) {
            this.lastHoverEmit = now;
            const rect = this.canvas.getBoundingClientRect();
            this.mouseNDC.x =
                ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouseNDC.y =
                -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(
                this.mouseNDC as unknown as THREE.Vector2,
                this.camera,
            );

            let hoveredId: string | null = null;
            const lineHitObjects = this.primaryLayer?.lineHitObjects ?? [];
            if (
                this.callbacks.onConstellationHover &&
                lineHitObjects.length > 0
            ) {
                const hits = this.raycaster.intersectObjects(
                    [...lineHitObjects],
                    false,
                );
                if (hits.length > 0) {
                    hoveredId =
                        (
                            hits[0].object.userData as {
                                constellationId?: string;
                            }
                        ).constellationId ?? null;
                }
            }
            const screen = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            };
            if (this.callbacks.onConstellationHover) {
                this.callbacks.onConstellationHover(
                    hoveredId,
                    hoveredId ? screen : null,
                );
            }
            this.setHovered(hoveredId);

            // Star hover raycasting. The primary layer's marker hit objects
            // are raycast independently of the ordinary-star points, and a
            // marker hit takes priority (the marker renders above the points
            // and carries the complete RendererStar — the `marker` record
            // must never be erased before invoking onStarHover). Reference
            // and decorative objects are never hover targets.
            if (this.callbacks.onStarHover && this.primaryLayer) {
                // Set threshold for point raycasting (larger threshold = easier to hover)
                this.raycaster.params.Points = { threshold: 2 };

                let hoveredStar: RendererStar | null = null;
                if (this.primaryLayer.markerHitObjects.length > 0) {
                    const markerHits = this.raycaster.intersectObjects(
                        [...this.primaryLayer.markerHitObjects],
                        true,
                    );
                    if (markerHits.length > 0) {
                        hoveredStar =
                            (
                                markerHits[0].object.userData as {
                                    star?: RendererStar;
                                }
                            ).star ?? null;
                    }
                }
                if (!hoveredStar && this.primaryLayer.ordinaryStarPoints) {
                    const starHits = this.raycaster.intersectObject(
                        this.primaryLayer.ordinaryStarPoints,
                        false,
                    );
                    if (
                        starHits.length > 0 &&
                        starHits[0].index !== undefined
                    ) {
                        const starIdx = starHits[0].index;
                        hoveredStar =
                            this.primaryLayer.renderedOrdinaryStars[starIdx] ??
                            null;
                    }
                }
                this.callbacks.onStarHover(
                    hoveredStar,
                    hoveredStar ? screen : null,
                );
            }
        }
    }

    /**
     * Handle mouse up event
     */
    private onMouseUp(): void {
        this.isMouseDown = false;

        // Restore cursor style
        this.canvas.style.cursor = "grab";

        // Start momentum animation if there was significant movement.
        // The momentum loop clears isDragging when it settles; for a click
        // or low-velocity drag (no momentum started) we must clear it here
        // so the auto-rotate gate in animate() doesn't stay latched forever.
        if (
            Math.abs(this.dragVelocityX) > 0.5 ||
            Math.abs(this.dragVelocityY) > 0.5
        ) {
            this.startMomentumAnimation();
        } else {
            this.isDragging = false;
        }
    }

    /**
     * Handle mouse leave event — clear hover state so the HUD
     * doesn't stay stuck when the pointer exits the canvas.
     */
    private onMouseLeave(): void {
        this.setHovered(null);
        if (this.callbacks.onConstellationHover) {
            this.callbacks.onConstellationHover(null, null);
        }
        if (this.callbacks.onStarHover) {
            this.callbacks.onStarHover(null, null);
        }
    }

    /**
     * Start momentum animation for smooth deceleration
     */
    private startMomentumAnimation(): void {
        const friction = 0.95;
        const minVelocity = 0.1;

        const animateMomentum = () => {
            if (this._disposed) return;

            if (
                Math.abs(this.dragVelocityX) < minVelocity &&
                Math.abs(this.dragVelocityY) < minVelocity
            ) {
                this.isDragging = false;
                this._momentumRafId = null;
                return;
            }

            // Apply momentum to camera rotation
            this.cameraRotationY -= this.dragVelocityX * 0.004;
            this.cameraRotationX -= this.dragVelocityY * 0.004;

            // Limit vertical rotation
            this.cameraRotationX = Math.max(
                -MAX_ELEVATION_RAD,
                Math.min(MAX_ELEVATION_RAD, this.cameraRotationX),
            );

            this.updateCameraRotation();

            // Apply friction
            this.dragVelocityX *= friction;
            this.dragVelocityY *= friction;

            this._momentumRafId = requestAnimationFrame(animateMomentum);
        };

        this._momentumRafId = requestAnimationFrame(animateMomentum);
    }

    /**
     * Handle mouse wheel for zooming
     */
    private onMouseWheel(event: WheelEvent): void {
        event.preventDefault();

        // Zoom in/out by adjusting field of view
        const zoomSpeed = 0.1;

        // For now, we'll keep the camera at origin and just adjust field of view
        const fov =
            this.camera.fov + (event.deltaY > 0 ? zoomSpeed : -zoomSpeed);
        this.camera.fov = Math.max(30, Math.min(120, fov));
        this.camera.updateProjectionMatrix();
    }

    /**
     * Compute the camera forward unit vector from the current rotation angles.
     */
    private _getCameraForward(): { x: number; y: number; z: number } {
        const cosX = Math.cos(this.cameraRotationX);
        const sinX = Math.sin(this.cameraRotationX);
        const cosY = Math.cos(this.cameraRotationY);
        const sinY = Math.sin(this.cameraRotationY);
        return { x: sinY * cosX, y: sinX, z: cosY * cosX };
    }

    /**
     * Update camera rotation based on mouse movement
     */
    private updateCameraRotation(): void {
        // Calculate look direction
        const { x: lookX, y: lookY, z: lookZ } = this._getCameraForward();

        // Set camera look direction
        this.camera.lookAt(lookX * 10, lookY * 10, lookZ * 10);
    }

    /**
     * Initialize the constellation view with legacy Earth-mode stars and
     * constellations. The legacy catalog is adapted and routed through the
     * same shared initialization path as {@link initializePreparedCatalogs}.
     */
    async initialize(
        stars: readonly Star[],
        constellations: readonly Constellation[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        this.runSharedInitialization({
            primaryCatalog: adaptLegacyCatalog(stars, constellations),
            placementContext: { kind: "earth-horizontal", skyConfig },
            settings: {
                minimumMagnitude: skyConfig.minimumMagnitude,
                showConstellationLines: skyConfig.showConstellationLines,
                showStarNames: skyConfig.showStarNames,
            },
            isLegacyEarth: true,
        });
    }

    /**
     * Initialize the renderer from prepared catalogs. Structurally
     * fixed-equatorial: the request carries only catalogs and the optional
     * reference visibility — never location/date/timezone/FOV state.
     */
    async initializePreparedCatalogs(
        request: PreparedCatalogRenderRequest,
        settings: Readonly<PreparedCatalogRenderSettings>,
    ): Promise<void> {
        this.runSharedInitialization({
            primaryCatalog: adaptPreparedCatalog(request.primaryCatalog),
            referenceCatalog: request.referenceCatalog
                ? adaptPreparedCatalog(request.referenceCatalog)
                : undefined,
            placementContext: { kind: "fixed-equatorial" },
            settings,
            isLegacyEarth: false,
            requestedReferenceVisible: request.referenceVisible,
        });
    }

    /**
     * One shared initialization path for both the legacy Earth-horizontal
     * view and the prepared fixed-equatorial view.
     *
     * Order:
     * 1. dispose old layers and Earth guides;
     * 2. clear stale selected/hovered IDs;
     * 3. resolve labels/reference preferences;
     * 4. adapt/build primary;
     * 5. adapt/build optional reference;
     * 6. add roots to scene;
     * 7. apply label/reference visibility;
     * 8. create Earth guides only for legacy Earth;
     * 9. update ambient visibility for the active context;
     * 10. set the existing initial camera policy;
     * 11. ensure one animation loop.
     */
    private runSharedInitialization(
        request: SharedRendererInitialization,
    ): void {
        // 1. dispose old layers and Earth guides
        this.clearScene();

        // 2. clear stale selected/hovered IDs
        this.selectedId = null;
        this.hoveredId = null;

        // 3. resolve labels/reference preferences. A request value updates
        // stored state; an omitted request value preserves stored state. A
        // runtime label toggle (setLabelsVisible) always wins over the
        // request so re-initialization never overwrites the user's choice.
        if (!this._labelsVisibleUserSet) {
            this.labelsVisible = request.settings.showStarNames;
        }
        if (request.requestedReferenceVisible !== undefined) {
            this.referenceVisible = request.requestedReferenceVisible;
        }

        // 4. adapt/build primary
        this.primaryLayer = new ConstellationCatalogLayer({
            role: "primary",
            catalog: request.primaryCatalog,
            placementContext: request.placementContext,
            settings: request.settings,
            starLabelMagnitudeLimit: request.isLegacyEarth
                ? LEGACY_STAR_LABEL_MAGNITUDE_LIMIT
                : undefined,
        });

        // 5. adapt/build optional reference
        this.referenceLayer = request.referenceCatalog
            ? new ConstellationCatalogLayer({
                  role: "reference",
                  catalog: request.referenceCatalog,
                  placementContext: request.placementContext,
                  settings: request.settings,
              })
            : null;

        // 6. add roots to scene
        this.scene.add(this.primaryLayer.root);
        if (this.referenceLayer) this.scene.add(this.referenceLayer.root);

        // 7. apply label/reference visibility
        this.primaryLayer.setVisible(true);
        this.primaryLayer.setLabelsVisible(this.labelsVisible);
        if (this.referenceLayer) {
            this.referenceLayer.setVisible(this.referenceVisible);
        }

        // 8. create Earth guides only for legacy Earth
        if (request.isLegacyEarth) {
            this.createOrientationGuides();
        }

        // 9. update ambient visibility for the active context. The ambient
        // points are a decorative child of the persistent root, created once
        // on the first sparse legacy pass and hidden for prepared views so
        // prepared output is independent of navigation history. They are
        // never part of any catalog buffer.
        if (
            request.isLegacyEarth &&
            this.ambientStarPoints === null &&
            this.primaryLayer.renderedOrdinaryStars.length <
                LEGACY_AMBIENT_STAR_THRESHOLD
        ) {
            this.createAmbientStarPoints();
        }
        if (this.ambientStarPoints !== null) {
            this.ambientStarPoints.visible =
                request.placementContext.kind === "earth-horizontal";
        }

        // 10. set the existing initial camera policy
        this.setupSkyCamera();

        // 11. ensure one animation loop
        this.ensureAnimationRunning();
    }

    /**
     * Create the legacy procedural ambient-star points. These are purely
     * decorative (they are not catalog records), so Math.random() is fine
     * here — the determinism constraint applies only to catalog layers.
     * The child lives inside {@link decorativeRoot} and is kept until final
     * disposal; visibility is toggled per placement context.
     */
    private createAmbientStarPoints(): void {
        const starPositions: number[] = [];
        const starColors: number[] = [];
        const starSizes: number[] = [];

        // Random stars distributed evenly across the celestial sphere
        for (let i = 0; i < LEGACY_AMBIENT_STAR_COUNT; i++) {
            const theta = Math.random() * Math.PI * 2; // Azimuth (0 to 2π)
            const phi = Math.acos(2 * Math.random() - 1); // Elevation (0 to π, evenly distributed)
            const radius = 95 + Math.random() * 10; // Slight radius variation

            // Convert spherical to Cartesian coordinates
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            starPositions.push(x, y, z);

            // Varied star colors for realism
            const colorVariant = Math.random();
            if (colorVariant < 0.1) {
                starColors.push(1.0, 0.7, 0.4); // Orange giants
            } else if (colorVariant < 0.2) {
                starColors.push(1.0, 0.4, 0.3); // Red giants
            } else if (colorVariant < 0.4) {
                starColors.push(0.7, 0.8, 1.0); // Blue-white
            } else {
                starColors.push(1.0, 1.0, 0.9); // White/yellow
            }

            starSizes.push(0.5 + Math.random() * 2); // Varied sizes for realism
        }

        // Per-star randomized seed for varied twinkle phase/speed
        const starSeeds: number[] = [];
        for (let i = 0; i < LEGACY_AMBIENT_STAR_COUNT; i++) {
            starSeeds.push(Math.random());
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(starPositions, 3),
        );
        geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(starColors, 3),
        );
        geometry.setAttribute(
            "size",
            new THREE.Float32BufferAttribute(starSizes, 1),
        );
        geometry.setAttribute(
            "aSeed",
            new THREE.Float32BufferAttribute(starSeeds, 1),
        );

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: {
                    value: Math.min(window.devicePixelRatio || 1, 2),
                },
            },
            vertexShader: `
    attribute float size;
    attribute float aSeed;
    varying vec3 vColor;
    varying float vSeed;
    uniform float uPixelRatio;
    void main() {
      vColor = color;
      vSeed = aSeed;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = size * 4.0 * uPixelRatio;
    }
  `,
            fragmentShader: `
    uniform float uTime;
    varying vec3 vColor;
    varying float vSeed;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);
      float alpha = smoothstep(0.5, 0.1, d);
      float twinkle = 1.0 + 0.35 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 6.28318);
      vec3 col = vColor * twinkle;
      gl_FragColor = vec4(col, alpha);
    }
  `,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        points.name = "ambient-stars";
        points.renderOrder = LEGACY_AMBIENT_RENDER_ORDER;
        this.ambientStarPoints = points;
        this.decorativeRoot.add(points);
    }

    /**
     * Create orientation guides: a horizon ring on the y=0 plane and
     * four cardinal direction labels (N/E/S/W). These are single-char
     * labels only — the wrapper renders the localized "compass" / "view
     * from earth" text in the HUD. Created only for the legacy Earth
     * placement; prepared fixed-equatorial views get no guides.
     */
    private createOrientationGuides(): void {
        const radius = 100;
        const segments = 128;
        const points: number[] = [];
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            points.push(radius * Math.cos(a), 0, radius * Math.sin(a));
        }
        const ringGeom = new THREE.BufferGeometry();
        ringGeom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(points, 3),
        );
        const ringMat = new THREE.LineBasicMaterial({
            color: 0x1b6b7a,
            transparent: true,
            opacity: 0.4,
        });
        this.horizonRing = new THREE.LineLoop(ringGeom, ringMat);
        this.horizonRing.name = "horizon-ring";
        this.horizonRing.renderOrder = EARTH_HORIZON_RENDER_ORDER;
        this.scene.add(this.horizonRing);

        this.cardinalLabels = new THREE.Group();
        this.cardinalLabels.name = "cardinal-labels";
        const dirs = [
            { label: "N", az: 0 },
            { label: "E", az: Math.PI / 2 },
            { label: "S", az: Math.PI },
            { label: "W", az: (3 * Math.PI) / 2 },
        ];
        for (const { label, az } of dirs) {
            const x = radius * Math.sin(az);
            const z = radius * Math.cos(az);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            canvas.width = 128;
            canvas.height = 128;
            ctx.clearRect(0, 0, 128, 128);
            ctx.fillStyle = "#4FC3F7";
            ctx.font = "bold 64px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#4FC3F7";
            ctx.shadowBlur = 12;
            ctx.fillText(label, 64, 64);
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                }),
            );
            sprite.position.set(x, 0, z);
            sprite.scale.set(6, 6, 1);
            sprite.name = `cardinal-${label}`;
            sprite.renderOrder = EARTH_CARDINAL_RENDER_ORDER;
            this.cardinalLabels.add(sprite);
        }
        this.scene.add(this.cardinalLabels);
    }

    /**
     * Setup camera for 360-degree sky viewing with observer at center
     */
    private setupSkyCamera(): void {
        // Position camera as observer on the ground looking up at the sky.
        // Camera at origin (observer position), Y-up for natural orientation.
        this.camera.position.set(0, 0, 0);
        this.camera.up.set(0, 1, 0);
        // Drive the orientation through the tracked rotation values so the
        // HUD compass (getCameraElevation/Azimuth) and auto-rotate start in
        // sync with the actual camera. Bypassing updateCameraRotation() with a
        // direct lookAt(0,10,0) left cameraRotationX at 0 (horizon), so the
        // compass reported a horizon-facing pitch for a zenith-facing camera
        // and auto-rotate snapped the view down on its first frame.
        this.cameraRotationX = MAX_ELEVATION_RAD; // near-zenith
        this.cameraRotationY = 0; // facing North (+z)
        this.updateCameraRotation();
    }

    /**
     * Project a world-space point to canvas pixel coordinates.
     * Returns `visible: false` if the point lies behind the camera.
     */
    public worldToScreen(point: { x: number; y: number; z: number }): {
        x: number;
        y: number;
        visible: boolean;
    } {
        const vec = this._wtsVec.set(point.x, point.y, point.z);
        // Use the camera's actual world-space forward direction so visibility
        // checks stay in sync with the transform used by vec.project(this.camera).
        const forward = this._wtsForward;
        this.camera.getWorldDirection(forward);
        // Compute the vector from the camera position to the point so that
        // behind-camera detection is correct even when the camera has moved.
        const rel = this._wtsRel
            .set(point.x, point.y, point.z)
            .sub(this.camera.position);
        const dot = rel.dot(forward);
        if (dot <= 0) return { x: 0, y: 0, visible: false };

        vec.project(this.camera);
        const width = this.canvas.clientWidth || this.canvas.width;
        const height = this.canvas.clientHeight || this.canvas.height;
        return {
            x: (vec.x * 0.5 + 0.5) * width,
            y: (1 - (vec.y * 0.5 + 0.5)) * height,
            visible: true,
        };
    }

    /**
     * Set the selected constellation by id (or null to deselect).
     * Highlights the selected constellation and dims the rest.
     * Selection/dimming is a primary-role concept; the layer owns the line
     * materials and never the reference layer.
     */
    public setSelected(id: string | null): void {
        this.selectedId = id;
        this.primaryLayer?.setSelectedConstellation(id);
    }

    /**
     * Set the hovered constellation by id (or null to clear hover).
     * Used for visual feedback and selection dimming.
     */
    public setHovered(id: string | null): void {
        this.hoveredId = id;
    }

    /**
     * Apply the current `labelsVisible` state to the primary layer. The layer
     * owns the star/constellation/Sol label groups and lazily creates them on
     * the first enable, mirroring the pre-layer lazy-creation behavior.
     */
    private applyLabelsVisibility(): void {
        this.primaryLayer?.setLabelsVisible(this.labelsVisible);
    }

    /**
     * Toggle visibility of star + constellation name labels at runtime.
     * Lazily (re)creates the star-label group on first enable. Labels are a
     * primary-role concept: the reference layer is comparison-only and never
     * receives a label toggle.
     */
    public setLabelsVisible(visible: boolean): void {
        this.labelsVisible = visible;
        this._labelsVisibleUserSet = true;
        this.applyLabelsVisibility();
    }

    /**
     * Toggle the comparison reference layer at runtime. The request value
     * updates the stored reference visibility (so it survives a later
     * re-initialization that omits `referenceVisible`), then forwards to the
     * reference layer. A call before the reference layer exists only
     * persists the preference — prepared initialization applies it after
     * building the layer.
     */
    public setReferenceVisible(visible: boolean): void {
        this.referenceVisible = visible;
        this.referenceLayer?.setVisible(visible);
    }

    /**
     * Return a plain `{x, y, z}` copy of a star's world position from the
     * primary layer, or null when the id is unknown (including reference-only
     * ids, which the primary layer does not track). The returned object is
     * never the live `THREE.Vector3` the layer holds.
     */
    public getStarWorldPosition(
        id: string,
    ): { x: number; y: number; z: number } | null {
        const position = this.primaryLayer?.getWorldPosition(id);
        if (!position) return null;
        return { x: position.x, y: position.y, z: position.z };
    }

    /**
     * Focus the camera on a star by id: invert the camera-forward mapping
     * (pitch = asin(y / radius), yaw = atan2(x, z)) and tween to it. The
     * existing pitch clamp and reduced-motion handling live in
     * {@link tweenCameraTo} and are inherited automatically. Returns false
     * when the primary layer has no position for the id (absent,
     * reference-only, unrendered) or the position is non-finite or
     * zero-length. Focus is an on-demand public API — it is never invoked
     * automatically during prepared initialization.
     */
    public focusStarById(id: string, durationMs?: number): boolean {
        const position = this.primaryLayer?.getWorldPosition(id);
        if (!position) return false;

        const { x, y, z } = position;
        const radius = Math.hypot(x, y, z);
        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(z) ||
            !Number.isFinite(radius) ||
            radius <= 0
        ) {
            return false;
        }

        const pitch = Math.asin(y / radius);
        const yaw = Math.atan2(x, z);
        this.tweenCameraTo(pitch, yaw, durationMs);
        return true;
    }

    /**
     * Enable/disable slow automatic yaw rotation of the camera. Ignored while
     * the user is dragging or a camera tween is in progress, and disabled
     * entirely when reduced-motion is set via setReducedMotion().
     */
    public setAutoRotate(enabled: boolean): void {
        this.autoRotate = enabled;
    }

    /**
     * Set the auto-rotate angular speed in radians per second.
     */
    public setAutoRotateSpeed(radPerSec: number): void {
        this.autoRotateSpeed = radPerSec;
    }

    /**
     * Inform the renderer of the user's reduced-motion preference. When true,
     * auto-rotate is disabled (the camera stays still) per WCAG §2.3.3.
     */
    public setReducedMotion(reduced: boolean): void {
        this.reducedMotion = reduced;
    }

    /**
     * Smoothly pan the camera to the given rotation angles over durationMs milliseconds.
     * Cancels any active drag momentum so the tween runs uninterrupted.
     */
    public tweenCameraTo(
        targetRotX: number,
        targetRotY: number,
        durationMs: number = 900,
    ): void {
        this.dragVelocityX = 0;
        this.dragVelocityY = 0;
        if (this.reducedMotion || this.prefersReducedMotion()) {
            this.cameraRotationX = Math.max(
                -MAX_ELEVATION_RAD,
                Math.min(MAX_ELEVATION_RAD, targetRotX),
            );
            this.cameraRotationY = targetRotY;
            this.updateCameraRotation();
            this.tweenState.active = false;
            return;
        }
        // Normalize targetRotY to the nearest equivalent angle to startY
        // so the tween always follows the shortest arc instead of
        // spinning through accumulated full revolutions from dragging.
        const twoPi = 2 * Math.PI;
        const startY = this.cameraRotationY;
        const normalizedTargetY =
            targetRotY - twoPi * Math.round((targetRotY - startY) / twoPi);

        this.tweenState = {
            startX: this.cameraRotationX,
            startY: startY,
            targetX: Math.max(
                -MAX_ELEVATION_RAD,
                Math.min(MAX_ELEVATION_RAD, targetRotX),
            ),
            targetY: normalizedTargetY,
            startedAt: performance.now(),
            duration: durationMs,
            active: true,
        };
    }

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    public tickTween(nowMs: number = performance.now()): void {
        if (!this.tweenState.active) return;
        const t = Math.min(
            1,
            (nowMs - this.tweenState.startedAt) / this.tweenState.duration,
        );
        const k = this.easeInOutCubic(t);
        this.cameraRotationX =
            this.tweenState.startX +
            (this.tweenState.targetX - this.tweenState.startX) * k;
        this.cameraRotationY =
            this.tweenState.startY +
            (this.tweenState.targetY - this.tweenState.startY) * k;
        this.updateCameraRotation();
        if (t >= 1) this.tweenState.active = false;
    }

    /**
     * Get the currently selected constellation id, or null if none selected.
     */
    public getSelectedId(): string | null {
        return this.selectedId;
    }

    /**
     * Get the currently hovered constellation id, or null if none hovered.
     */
    public getHoveredId(): string | null {
        return this.hoveredId;
    }

    /**
     * Get the camera's current azimuth as a normalized degree value in
     * [0, 360), where 0 = North. Derived from the tracked yaw rotation.
     */
    public getCameraAzimuth(): number {
        let deg = (this.cameraRotationY * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        return deg;
    }

    /**
     * Get the camera's current elevation (pitch) in degrees, where 0 = horizon,
     * positive = above horizon (toward zenith), negative = below (toward nadir).
     * Derived from the tracked pitch rotation, which is clamped to ±π/2.2 so the
     * value stays within roughly ±82°.
     */
    public getCameraElevation(): number {
        return (this.cameraRotationX * 180) / Math.PI;
    }

    private prefersReducedMotion(): boolean {
        return (
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ===
                true
        );
    }

    private maybeSpawnShootingStar(now: number): void {
        if (this.reducedMotion || this.prefersReducedMotion()) return;
        if (this.shootingStarCount > 0) return;
        if (this.nextShootingStarAt === 0) {
            this.nextShootingStarAt = now + (8000 + Math.random() * 6000);
            return;
        }
        if (now < this.nextShootingStarAt) return;
        this.spawnShootingStar(now);
        this.nextShootingStarAt = now + (8000 + Math.random() * 6000);
    }

    private spawnShootingStar(now: number): void {
        if (this.shootingStarCount > 0) return;
        const startAz = Math.random() * Math.PI * 2;
        const startEl = (Math.random() - 0.5) * Math.PI * 0.7;
        const dirAz = startAz + (Math.random() - 0.5) * 0.6;
        const dirEl = startEl + 0.3 + Math.random() * 0.2;

        const r = 95;
        const start = {
            x: r * Math.cos(startEl) * Math.cos(startAz),
            y: r * Math.sin(startEl),
            z: r * Math.cos(startEl) * Math.sin(startAz),
        };
        const end = {
            x: r * Math.cos(dirEl) * Math.cos(dirAz),
            y: r * Math.sin(dirEl),
            z: r * Math.cos(dirEl) * Math.sin(dirAz),
        };

        const geom = new THREE.BufferGeometry();
        geom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                [start.x, start.y, start.z, end.x, end.y, end.z],
                3,
            ),
        );
        const mat = new THREE.LineBasicMaterial({
            color: HUD_CYAN,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        const line = new THREE.LineSegments(geom, mat);
        line.renderOrder = SHOOTING_STAR_RENDER_ORDER; // above all catalog geometry
        this.scene.add(line);
        this.activeShootingStar = line as unknown as THREE.Line;
        this.shootingStarCount = 1;
        this.shootingStarStarted = now;
    }

    private tickShootingStar(now: number): void {
        if (!this.activeShootingStar) return;
        const elapsed = now - this.shootingStarStarted;
        const t = elapsed / 700;
        if (t >= 1) {
            this.scene.remove(this.activeShootingStar);
            const line = this
                .activeShootingStar as unknown as THREE.LineSegments;
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
            this.activeShootingStar = null;
            this.shootingStarCount = 0;
            return;
        }
        const mat = (this.activeShootingStar as unknown as THREE.LineSegments)
            .material as THREE.LineBasicMaterial;
        mat.opacity = 0.9 * (1 - t);
    }

    /**
     * Ensure exactly one animation loop is running. Repeated serialized
     * initialization reuses the single RAF chain; overlapping asynchronous
     * initialization is not supported (callers must await initialization).
     */
    private ensureAnimationRunning(): void {
        if (this.animationRunning || this._disposed) return;
        this.animationRunning = true;
        this.animate();
    }

    /**
     * Animation loop
     */
    private animate(): void {
        if (!this.animationRunning || this._disposed) return;
        this._rafId = requestAnimationFrame(() => this.animate());

        // Update camera rotation if mouse is being dragged
        if (this.isMouseDown) {
            this.updateCameraRotation();
        }

        const now = performance.now();
        this.tickTween(now);
        const delta = this.clock.getDelta();

        // Auto-rotate: slowly pan the sky when enabled and no user drag or
        // camera tween is active. Skipped entirely under reduced-motion.
        if (
            this.autoRotate &&
            !this.reducedMotion &&
            !this.isMouseDown &&
            !this.isDragging &&
            !this.tweenState.active
        ) {
            this.cameraRotationY += this.autoRotateSpeed * delta;
            this.updateCameraRotation();
        }

        this.primaryLayer?.tick(delta);
        this.referenceLayer?.tick(delta);
        this.tickShootingStar(now);
        this.maybeSpawnShootingStar(now);
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    private handleResize(): void {
        const container = this.canvas.parentElement;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Clear the scene
     */
    private clearScene(): void {
        if (this.activeShootingStar) {
            this.scene.remove(this.activeShootingStar);
            const line = this
                .activeShootingStar as unknown as THREE.LineSegments;
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
            this.activeShootingStar = null;
            this.shootingStarCount = 0;
        }
        this.nextShootingStarAt = 0;
        this.shootingStarStarted = 0;

        // NOTE: The decorative root ("decorative-background") holding the
        // starfield sphere and the optional ambient points is persistent and
        // intentionally kept across reinitializations. Do NOT remove it
        // here — initialize() does not recreate it; final dispose() does.

        // Layers own their star/line/label/marker resources; dispose()
        // releases each exactly once and detaches the root.
        if (this.primaryLayer) {
            this.primaryLayer.dispose();
            this.primaryLayer = null;
        }
        if (this.referenceLayer) {
            this.referenceLayer.dispose();
            this.referenceLayer = null;
        }

        if (this.horizonRing) {
            this.horizonRing.geometry.dispose();
            (this.horizonRing.material as THREE.Material).dispose();
            this.scene.remove(this.horizonRing);
            this.horizonRing = null;
        }

        if (this.cardinalLabels) {
            this.cardinalLabels.traverse((obj) => {
                const sprite = obj as THREE.Sprite;
                const mat = sprite.material as THREE.SpriteMaterial | undefined;
                if (mat) {
                    mat.map?.dispose();
                    mat.dispose();
                }
            });
            this.scene.remove(this.cardinalLabels);
            this.cardinalLabels = null;
        }

        this.selectedId = null;
        this.hoveredId = null;
    }

    /**
     * Update the sky view with new configuration
     */
    async updateSky(
        stars: readonly Star[],
        constellations: readonly Constellation[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        await this.initialize(stars, constellations, skyConfig);
    }

    /**
     * Handle canvas click — raycast against the primary layer's line hit
     * objects (never reference or decorative objects) and fire
     * onConstellationClick.
     */
    private handleCanvasClick(event: MouseEvent): void {
        if (!this.callbacks.onConstellationClick) return;

        // Suppress click if the mouse moved significantly since mousedown (drag)
        const dx = event.clientX - this.mouseDownX;
        const dy = event.clientY - this.mouseDownY;
        if (
            dx * dx + dy * dy >
            ConstellationRenderer.CLICK_DRAG_THRESHOLD ** 2
        ) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(
            this.mouseNDC as unknown as THREE.Vector2,
            this.camera,
        );

        const lineHitObjects = this.primaryLayer?.lineHitObjects ?? [];
        const hits = this.raycaster.intersectObjects(
            [...lineHitObjects],
            false,
        );
        if (hits.length > 0) {
            const id = (hits[0].object.userData as { constellationId?: string })
                .constellationId;
            if (id) this.callbacks.onConstellationClick(id);
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this._disposed = true;
        this.animationRunning = false;
        this.tweenState.active = false;

        // Cancel the render loop
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // Cancel momentum animation
        if (this._momentumRafId !== null) {
            cancelAnimationFrame(this._momentumRafId);
            this._momentumRafId = null;
        }

        // Phase 1: Clear scene objects (including the decorative background on final dispose)
        try {
            this.clearScene();

            // Dispose the decorative root (starfield sphere + optional
            // ambient points) — intentionally kept across re-inits but
            // released here on final dispose.
            for (const child of this.decorativeRoot.children) {
                const withResources = child as Partial<THREE.Mesh> &
                    Partial<THREE.Points>;
                if (withResources.geometry) {
                    (
                        withResources.geometry as { dispose: () => void }
                    ).dispose();
                }
                if (withResources.material) {
                    (
                        withResources.material as { dispose: () => void }
                    ).dispose();
                }
            }
            this.decorativeRoot.children.length = 0;
            this.ambientStarPoints = null;
            this.scene.remove(this.decorativeRoot);
        } catch (e) {
            console.error(
                "ConstellationRenderer dispose: clearScene failed",
                e,
            );
        }

        // Phase 2: Remove event listeners
        try {
            window.removeEventListener("resize", this._boundResize);
            this.canvas.removeEventListener("mousedown", this._boundMouseDown);
            this.canvas.removeEventListener("mousemove", this._boundMouseMove);
            this.canvas.removeEventListener("mouseup", this._boundMouseUp);
            this.canvas.removeEventListener(
                "mouseleave",
                this._boundMouseLeave,
            );
            this.canvas.removeEventListener("wheel", this._boundMouseWheel);
            this.canvas.removeEventListener(
                "contextmenu",
                this._boundContextMenu,
            );
            this.canvas.removeEventListener("click", this._clickHandler);
            this.canvas.removeEventListener(
                "touchstart",
                this._boundTouchStart,
            );
            this.canvas.removeEventListener("touchmove", this._boundTouchMove);
            this.canvas.removeEventListener("touchend", this._boundTouchEnd);
        } catch (e) {
            console.error(
                "ConstellationRenderer dispose: event listener cleanup failed",
                e,
            );
        }

        // Phase 3: Remove canvas from DOM
        try {
            if (this.canvas.parentElement) {
                this.canvas.parentElement.removeChild(this.canvas);
            }
        } catch (e) {
            console.error(
                "ConstellationRenderer dispose: canvas removal failed",
                e,
            );
        }

        // Phase 4: Dispose WebGL renderer
        try {
            this.renderer.dispose();
        } catch (e) {
            console.error(
                "ConstellationRenderer dispose: renderer.dispose failed",
                e,
            );
        }
    }
}
