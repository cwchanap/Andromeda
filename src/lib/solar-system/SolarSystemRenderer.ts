import * as THREE from "three";
import type {
    SolarSystemConfig,
    CameraState,
    SolarSystemEvents,
    SolarSystemControls,
    RenderStats,
} from "./types";
import type { CelestialBodyData } from "../../types/game";
import { CelestialBodyManager } from "./CelestialBodyManager";
import { SceneManager } from "./SceneManager";
import { InteractionManager } from "./InteractionManager";
import { CameraController } from "./CameraController";

/**
 * Main solar system renderer - framework agnostic
 */
export class SolarSystemRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private animationId: number | null = null;

    // Managers
    private sceneManager: SceneManager;
    private celestialBodyManager: CelestialBodyManager;
    private interactionManager: InteractionManager;
    private cameraController: CameraController;

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

        // Initialize managers
        this.sceneManager = new SceneManager(this.scene, this.config);
        this.celestialBodyManager = new CelestialBodyManager(this.scene);
        this.cameraController = new CameraController(this.camera, {
            onCameraChange: this.events.onCameraChange,
            onZoomChange: this.events.onZoomChange,
        });

        this.interactionManager = new InteractionManager(
            container,
            this.camera,
            this.scene,
            {
                onPlanetSelect: this.events.onPlanetSelect,
                onPlanetHover: this.events.onPlanetHover,
            },
        );

        this.setupRenderer(container);
        this.setupEventListeners();
    }

    /**
     * Sets up the WebGL renderer
     */
    private setupRenderer(container: HTMLElement): void {
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000011, 1);

        container.appendChild(this.renderer.domElement);
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    /**
     * Initializes the solar system with celestial bodies
     */
    async initialize(celestialBodies: CelestialBodyData[]): Promise<void> {
        try {
            // Setup scene environment
            await this.sceneManager.initialize();

            // Create celestial bodies
            celestialBodies.forEach((bodyData) => {
                this.celestialBodyManager.createCelestialBody(bodyData);
            });

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

        const deltaTime = this.clock.getDelta();

        // Update animations
        if (this.config.enableAnimations) {
            this.celestialBodyManager.updateOrbitalAnimations(deltaTime);
            this.sceneManager.updateAnimations(deltaTime);
        }

        // Update controls
        this.cameraController.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);

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
        const planetMesh = this.celestialBodyManager.getBody(planetId);
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
     * Selects a celestial body
     */
    selectCelestialBody(bodyId: string | null): void {
        this.celestialBodyManager.highlightBody(bodyId);

        if (bodyId) {
            this.focusOnPlanet(bodyId);
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
