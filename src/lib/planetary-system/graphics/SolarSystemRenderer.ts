import * as THREE from "three";
import type {
    SolarSystemConfig,
    CameraState,
    SolarSystemEvents,
    SolarSystemControls,
    RenderStats,
} from "./types";
import type { CelestialBodyData, SolarSystemData } from "../../../types/game";
import { CelestialBodyManager } from "./CelestialBodyManager";
import { SceneManager } from "./SceneManager";
import { InteractionManager } from "./InteractionManager";
import { CameraController } from "./CameraController";
import { PerformanceMonitor } from "../../performance/PerformanceMonitor";

/**
 * Main solar system renderer - framework agnostic with performance optimization
 */
export class SolarSystemRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private animationId: number | null = null;

    // Managers
    private sceneManager!: SceneManager;
    private celestialBodyManager!: CelestialBodyManager;
    private interactionManager!: InteractionManager;
    private cameraController!: CameraController;
    private performanceMonitor: PerformanceMonitor;

    // State
    private isInitialized = false;
    private isDisposed = false;
    private config: Required<SolarSystemConfig>;
    private events: SolarSystemEvents;

    constructor(
        container: HTMLElement,
        config: SolarSystemConfig = {},
        events: SolarSystemEvents = {},
    ) {
        // Set default configuration
        this.config = {
            enableControls: true,
            enableAnimations: true,
            enableMobileOptimization: false,
            antialiasing: true,
            shadows: false,
            particleCount: 1000,
            performanceMode: "medium",
            backgroundStars: {
                enabled: true,
                density: 1.0,
                seed: 12345,
                animationSpeed: 1.0,
                minRadius: 2000,
                maxRadius: 5000,
                colorVariation: true,
            },
            ...config,
        };

        this.events = events;
        this.clock = new THREE.Clock();

        // Initialize Three.js core
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            10000,
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.antialiasing,
            alpha: true,
        });

        this.setupRenderer(container);
        this.setupManagers();
        this.setupEventListeners();
        this.setupPerformanceMonitoring();
    }

    /**
     * Sets up managers
     */
    private setupManagers(): void {
        // Initialize managers
        this.sceneManager = new SceneManager(this.scene, this.config);
        this.celestialBodyManager = new CelestialBodyManager(
            this.scene,
            this.camera,
        );
        this.cameraController = new CameraController(this.camera, {
            onCameraChange: this.events.onCameraChange,
            onZoomChange: this.events.onZoomChange,
        });

        this.interactionManager = new InteractionManager(
            this.renderer.domElement,
            this.camera,
            this.scene,
            {
                onPlanetSelect: this.events.onPlanetSelect,
                onPlanetHover: this.events.onPlanetHover,
            },
        );
    }

    /**
     * Setup performance monitoring
     */
    private setupPerformanceMonitoring(): void {
        this.performanceMonitor = new PerformanceMonitor(this.renderer);

        // Start monitoring
        this.performanceMonitor.startMonitoring();

        // Add performance callbacks
        this.performanceMonitor.onMetrics((metrics) => {
            // Log performance metrics periodically
            if (metrics.fps > 0 && metrics.fps % 10 === 0) {
                console.log(
                    `Performance: ${metrics.fps} FPS, ${metrics.frameTime.toFixed(2)}ms frame time`,
                );
            }
        });

        this.performanceMonitor.onWarning((suggestions) => {
            console.warn("Performance warnings:", suggestions);
        });
    }

    /**
     * Sets up the WebGL renderer
     */
    private setupRenderer(container: HTMLElement): void {
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000011, 1);

        // Explicitly disable shadows completely
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.PCFShadowMap; // Set type but keep disabled

        container.appendChild(this.renderer.domElement);
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    /**
     * Initializes the solar system with celestial bodies and system configuration
     */
    async initialize(
        celestialBodies: CelestialBodyData[],
        systemData?: SolarSystemData,
    ): Promise<void> {
        try {
            // Configure background stars from system data if provided
            if (systemData?.backgroundStars) {
                this.configureBackgroundStars(systemData.backgroundStars);
            }

            // Setup scene environment
            await this.sceneManager.initialize();

            // Create celestial bodies
            celestialBodies.forEach((bodyData) => {
                this.celestialBodyManager.createCelestialBody(bodyData);
            });

            // Setup initial Line2 resolution for thick orbit lines
            const container = this.renderer.domElement.parentElement;
            if (container) {
                this.celestialBodyManager.updateLineResolution(
                    container.clientWidth,
                    container.clientHeight,
                );
            }

            // Setup camera controls
            this.cameraController.initialize(this.renderer.domElement);

            // Setup interactions
            this.interactionManager.initialize(this.celestialBodyManager);

            // Set initial camera position
            this.camera.position.set(0, 50, 100);
            this.cameraController.setTarget(new THREE.Vector3(0, 0, 0));

            this.isInitialized = true;
            this.startRenderLoop();

            // Notify ready
            this.events.onReady?.();
        } catch (error) {
            this.events.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Starts the render loop
     */
    private startRenderLoop(): void {
        if (this.animationId) return;

        const animate = () => {
            if (this.isDisposed) return;

            this.animationId = requestAnimationFrame(animate);
            this.render();
        };

        animate();
    }

    /**
     * Renders a single frame
     */
    private render(): void {
        if (!this.isInitialized || this.isDisposed) return;

        // Start performance monitoring
        this.performanceMonitor.frameStart();

        const deltaTime = this.clock.getDelta();

        // Update animations
        if (this.config.enableAnimations) {
            this.celestialBodyManager.updateAnimations(deltaTime);
            this.sceneManager.updateAnimations(deltaTime);
        }

        // Update LOD levels based on camera position
        this.celestialBodyManager.updateLOD();

        // Update orbit line opacity based on camera distance
        this.celestialBodyManager.updateOrbitLineOpacity(this.camera.position);

        // Update controls
        this.cameraController.update();

        // Start render timing
        this.performanceMonitor.renderStart();

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // End performance monitoring
        this.performanceMonitor.frameEnd();

        // Update render stats
        if (this.events.onRenderStats) {
            const stats: RenderStats = {
                fps: 1 / deltaTime,
                triangles: this.renderer.info.render.triangles,
                geometries: this.renderer.info.memory.geometries,
                textures: this.renderer.info.memory.textures,
            };
            this.events.onRenderStats(stats);
        }
    }

    /**
     * Handles window resize
     */
    private handleResize(): void {
        const container = this.renderer.domElement.parentElement;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // Update Line2 resolution for thick orbit lines
        this.celestialBodyManager.updateLineResolution(width, height);
    }

    /**
     * Gets the control interface
     */
    getControls(): SolarSystemControls {
        return {
            zoomIn: () => this.cameraController.zoomIn(),
            zoomOut: () => this.cameraController.zoomOut(),
            resetView: () => this.cameraController.resetView(),
            focusOnPlanet: (planetId: string) => this.focusOnPlanet(planetId),
            setCameraPosition: (
                position: THREE.Vector3,
                target?: THREE.Vector3,
            ) => {
                this.cameraController.setCameraPosition(position, target);
            },
            enableControls: (enabled: boolean) => {
                this.cameraController.enableControls(enabled);
            },
            dispose: () => this.dispose(),
        };
    }

    /**
     * Focuses camera on a specific planet
     */
    private focusOnPlanet(planetId: string): void {
        const planetMesh = this.celestialBodyManager.getCelestialBody(planetId);
        if (!planetMesh) return;

        const planetPosition = planetMesh.position.clone();
        const cameraOffset = new THREE.Vector3(0, 10, 20);
        const newCameraPosition = planetPosition.clone().add(cameraOffset);

        this.cameraController.animateToPosition(
            newCameraPosition,
            planetPosition,
        );
    }

    /**
     * Gets current camera state
     */
    getCameraState(): CameraState {
        return {
            position: this.camera.position.clone(),
            target: this.cameraController.getTarget(),
            zoom: this.cameraController.getZoom(),
        };
    }

    /**
     * Updates configuration
     */
    updateConfig(newConfig: Partial<SolarSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Apply configuration changes
        if (newConfig.enableAnimations !== undefined) {
            // Animation state is handled in render loop
        }

        if (newConfig.enableControls !== undefined) {
            this.cameraController.enableControls(newConfig.enableControls);
        }
    }

    /**
     * Toggle visibility of orbit lines
     */
    toggleOrbitLines(visible: boolean): void {
        this.celestialBodyManager.toggleOrbitLines(visible);
    }

    /**
     * Set orbit line visibility for a specific celestial body
     */
    setOrbitLineVisibility(bodyId: string, visible: boolean): void {
        this.celestialBodyManager.setOrbitLineVisibility(bodyId, visible);
    }

    /**
     * Selects a celestial body
     */
    selectCelestialBody(bodyId: string | null): void {
        if (bodyId) {
            this.celestialBodyManager.highlightCelestialBody(bodyId);
        }

        if (bodyId) {
            this.focusOnPlanet(bodyId);
        }
    }

    /**
     * Configure background stars from system data
     */
    configureBackgroundStars(backgroundStars?: {
        enabled: boolean;
        density: number;
        seed: number;
        animationSpeed: number;
        minRadius: number;
        maxRadius: number;
        colorVariation: boolean;
    }): void {
        if (backgroundStars) {
            this.config.backgroundStars = backgroundStars;
        }
    }

    /**
     * Disposes of all resources
     */
    dispose(): void {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // Cancel animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Dispose managers
        this.celestialBodyManager.dispose();
        this.sceneManager.dispose();
        this.interactionManager.dispose();
        this.cameraController.dispose();

        // Dispose performance monitor
        this.performanceMonitor.dispose();

        // Dispose Three.js resources
        this.renderer.dispose();

        // Remove event listeners
        window.removeEventListener("resize", this.handleResize);

        // Remove DOM element
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(
                this.renderer.domElement,
            );
        }
    }
}
