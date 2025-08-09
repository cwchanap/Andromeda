import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
    GalaxyConfig,
    GalaxyEvents,
    GalaxyCameraState,
    GalaxyRenderStats,
    GalaxyData,
    StarSystemData,
} from "../types";
import { GalaxySceneManager } from "./GalaxySceneManager";
import { StarSystemManager } from "./StarSystemManager";

/**
 * Main galaxy renderer - framework agnostic 3D galaxy view
 * Renders star systems in their galactic positions with realistic distances
 */
export class GalaxyRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private animationId: number | null = null;
    private controls: OrbitControls;

    // Managers
    private sceneManager!: GalaxySceneManager;
    private starSystemManager!: StarSystemManager;

    // State
    private isInitialized = false;
    private isDisposed = false;
    private config: Required<GalaxyConfig>;
    private events: GalaxyEvents;
    private container: HTMLElement;
    private galaxyData: GalaxyData | null = null;

    // Performance monitoring
    private lastFrameTime = 0;
    private frameCount = 0;
    private fpsUpdateInterval = 1000; // Update FPS every second

    // Interaction handling
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private hoveredSystemId: string | null = null;

    constructor(
        container: HTMLElement,
        config: Partial<GalaxyConfig> = {},
        events: GalaxyEvents = {},
    ) {
        this.container = container;
        this.events = events;

        // Set default configuration
        this.config = {
            enableControls: true,
            enableAnimations: true,
            enableMobileOptimization: false,
            antialiasing: true,
            performanceMode: "medium",
            starFieldDensity: 1.0,
            backgroundStarCount: 2000,
            enableStarLabels: true,
            enableDistanceIndicators: true,
            maxRenderDistance: 50, // 50 light-years max render distance
            enableBloom: false,
            enableStarGlow: true,
            starGlowIntensity: 1.0,
            ...config,
        };

        // Initialize Three.js components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000,
        );
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.antialiasing,
            alpha: true,
            powerPreference:
                this.config.performanceMode === "high"
                    ? "high-performance"
                    : "default",
        });
        this.clock = new THREE.Clock();

        // Initialize controls
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.setupControls();
        this.setupRenderer();
        this.setupCamera();
    }

    /**
     * Initialize the galaxy renderer
     */
    async initialize(galaxyData: GalaxyData): Promise<void> {
        if (this.isInitialized) {
            console.warn("GalaxyRenderer already initialized");
            return;
        }

        try {
            // Store galaxy data
            this.galaxyData = galaxyData;

            // Initialize managers
            this.sceneManager = new GalaxySceneManager(this.scene, this.config);
            this.starSystemManager = new StarSystemManager(
                this.scene,
                this.config,
            );

            await this.sceneManager.initialize();
            await this.starSystemManager.initialize(galaxyData.starSystems);

            // Position camera for good initial view
            this.camera.position.set(10, 10, 10);
            this.camera.lookAt(0, 0, 0);
            this.controls.update();

            this.isInitialized = true;
            this.startRenderLoop();

            this.events.onSystemLoad?.();
        } catch (error) {
            console.error("Failed to initialize galaxy renderer:", error);
            this.events.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Setup renderer configuration
     */
    private setupRenderer(): void {
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight,
        );
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false; // Disable shadows for performance
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Performance optimizations
        if (this.config.performanceMode === "low") {
            this.renderer.setPixelRatio(1);
        }

        this.container.appendChild(this.renderer.domElement);

        // Setup interaction events after canvas is added to DOM
        this.setupInteractionEvents();
    }

    /**
     * Setup camera configuration
     */
    private setupCamera(): void {
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        this.camera.near = 0.1;
        this.camera.far = 1000;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Setup orbit controls
     */
    private setupControls(): void {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = this.config.enableControls;
        this.controls.enablePan = this.config.enableControls;
        this.controls.enableRotate = this.config.enableControls;

        // Set distance limits
        this.controls.minDistance = 1;
        this.controls.maxDistance = 200;

        // Auto rotate
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;

        // Event listeners
        this.controls.addEventListener("change", () => {
            const zoom = this.camera.position.length();
            this.events.onCameraChange?.(this.camera.position, zoom);
        });
    }

    /**
     * Setup mouse and touch interaction events
     */
    private setupInteractionEvents(): void {
        // Mouse events - attach to the canvas element
        const canvas = this.renderer.domElement;
        canvas.addEventListener("click", this.handleClick.bind(this));
        canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));

        // Touch events
        canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
    }

    /**
     * Handle mouse click events
     */
    private handleClick(event: MouseEvent): void {
        this.updateMousePosition(event);
        const intersectedSystem = this.findIntersectedStarSystem();

        if (intersectedSystem) {
            // Find the system data
            const galaxyData = this.getCurrentGalaxyData();
            const systemData = galaxyData?.starSystems.find(
                (s: StarSystemData) => s.id === intersectedSystem.systemId,
            );

            if (systemData) {
                this.events.onStarSystemSelect?.(systemData);
            }
        }
    }

    /**
     * Handle mouse move events for hover effects
     */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);
        const intersectedSystem = this.findIntersectedStarSystem();

        const newHoveredSystemId = intersectedSystem?.systemId || null;

        if (newHoveredSystemId !== this.hoveredSystemId) {
            // Reset previous hover
            if (this.hoveredSystemId) {
                this.starSystemManager.highlightStarSystem(
                    this.hoveredSystemId,
                    false,
                );
            }

            // Set new hover
            if (newHoveredSystemId) {
                this.starSystemManager.highlightStarSystem(
                    newHoveredSystemId,
                    true,
                );
            }

            this.hoveredSystemId = newHoveredSystemId;
        }
    }

    /**
     * Handle touch end events (mobile)
     */
    private handleTouchEnd(event: TouchEvent): void {
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            this.updateMousePosition(touch);
            const intersectedSystem = this.findIntersectedStarSystem();

            if (intersectedSystem) {
                const galaxyData = this.getCurrentGalaxyData();
                const systemData = galaxyData?.starSystems.find(
                    (s: StarSystemData) => s.id === intersectedSystem.systemId,
                );

                if (systemData) {
                    this.events.onStarSystemSelect?.(systemData);
                }
            }
        }
    }

    /**
     * Update mouse position in normalized device coordinates
     */
    private updateMousePosition(event: MouseEvent | Touch): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Find intersected star system using raycasting
     */
    private findIntersectedStarSystem(): {
        systemId: string;
        mesh: THREE.Mesh;
    } | null {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get all star meshes from the star system manager
        const starMeshes = this.starSystemManager.getAllStarMeshes();
        const intersects = this.raycaster.intersectObjects(starMeshes);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as THREE.Mesh;
            const systemId =
                this.starSystemManager.getSystemIdFromMesh(intersectedMesh);

            if (systemId) {
                return { systemId, mesh: intersectedMesh };
            }
        }

        return null;
    }

    /**
     * Get current galaxy data
     */
    private getCurrentGalaxyData(): GalaxyData | null {
        return this.galaxyData;
    }

    /**
     * Start the render loop
     */
    private startRenderLoop(): void {
        if (this.animationId !== null) return;

        const animate = () => {
            if (this.isDisposed) return;

            this.animationId = requestAnimationFrame(animate);
            this.update();
            this.render();
        };

        animate();
    }

    /**
     * Update scene elements
     */
    private update(): void {
        if (!this.isInitialized) return;

        const deltaTime = this.clock.getDelta();

        // Update controls
        if (this.config.enableControls) {
            this.controls.update();
        }

        // Update managers
        this.sceneManager.update(deltaTime);
        this.starSystemManager.update(deltaTime, this.camera.position);

        // Update lighting based on camera position
        this.sceneManager.updateLighting(this.camera.position);

        // Update star system visibility based on distance
        this.starSystemManager.updateVisibility(this.camera.position);
    }

    /**
     * Render the scene
     */
    private render(): void {
        if (!this.isInitialized) return;

        this.renderer.render(this.scene, this.camera);
        this.updatePerformanceStats();
    }

    /**
     * Update performance statistics
     */
    private updatePerformanceStats(): void {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastFrameTime >= this.fpsUpdateInterval) {
            // Calculate FPS and reset counters
            this.lastFrameTime = currentTime;
            this.frameCount = 0;
        }
    }

    /**
     * Handle window resize
     */
    onResize(): void {
        if (!this.container || this.isDisposed) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Focus camera on a star system
     */
    focusOnStarSystem(systemId: string, animate = true): void {
        const systemGroup = this.starSystemManager.getStarSystem(systemId);
        if (!systemGroup) return;

        if (animate) {
            // Animate camera to system
            const targetPosition = systemGroup.position.clone();
            targetPosition.y += 5; // Offset for better viewing angle

            // TODO: Implement smooth camera animation
            this.camera.position.copy(targetPosition);
            this.controls.target.copy(systemGroup.position);
        } else {
            this.camera.position.copy(systemGroup.position);
            this.camera.position.y += 5;
            this.controls.target.copy(systemGroup.position);
        }

        this.controls.update();
    }

    /**
     * Highlight a star system
     */
    highlightStarSystem(systemId: string, highlight = true): void {
        this.starSystemManager.highlightStarSystem(systemId, highlight);
    }

    /**
     * Get current camera state
     */
    getCameraState(): GalaxyCameraState {
        return {
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
            zoom: this.camera.position.length(),
            fov: this.camera.fov,
        };
    }

    /**
     * Set camera state
     */
    setCameraState(state: Partial<GalaxyCameraState>): void {
        if (state.position) {
            this.camera.position.copy(state.position);
        }
        if (state.target) {
            this.controls.target.copy(state.target);
        }
        if (state.fov) {
            this.camera.fov = state.fov;
            this.camera.updateProjectionMatrix();
        }
        this.controls.update();
    }

    /**
     * Get rendering statistics
     */
    getStats(): GalaxyRenderStats {
        const rendererInfo = this.renderer.info;
        const sceneStats = this.sceneManager.getStats();
        const starStats = this.starSystemManager.getStats();

        return {
            fps: 60, // Simplified - would need proper FPS calculation
            frameTime: this.clock.getDelta(),
            starSystemCount: starStats.systemCount,
            backgroundStarCount: sceneStats.starCount,
            renderCalls: rendererInfo.render.calls,
            triangleCount: rendererInfo.render.triangles,
            memoryUsage:
                rendererInfo.memory.geometries + rendererInfo.memory.textures,
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<GalaxyConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Apply configuration changes
        if (newConfig.enableControls !== undefined) {
            this.controls.enabled = newConfig.enableControls;
        }

        // TODO: Apply other configuration changes as needed
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // Stop render loop
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Dispose managers
        this.sceneManager?.dispose();
        this.starSystemManager?.dispose();

        // Dispose Three.js resources
        this.renderer.dispose();
        this.controls.dispose();

        // Remove DOM element
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }

        console.log("GalaxyRenderer disposed");
    }
}
