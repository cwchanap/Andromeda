// 3D Sphere Renderer for Comparative Planetology Mode
import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";
import { calculateSizeRatios } from "../../utils/comparisonUtils";

export interface ComparisonRendererConfig {
    enableRotation?: boolean;
    backgroundColor?: number;
    maxSphereRadius?: number;
}

const DEFAULT_CONFIG: Required<ComparisonRendererConfig> = {
    enableRotation: true,
    backgroundColor: 0x000011,
    maxSphereRadius: 2,
};

/**
 * Framework-agnostic 3D renderer for comparing celestial body sizes
 * Renders rotating spheres side-by-side with accurate relative scaling
 */
export class ComparisonSphereRenderer {
    private container: HTMLElement;
    private config: Required<ComparisonRendererConfig>;
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private spheres: THREE.Mesh[] = [];
    private labels: THREE.Sprite[] = [];
    private animationId: number | null = null;
    private bodies: CelestialBodyData[] = [];

    constructor(container: HTMLElement, config: ComparisonRendererConfig = {}) {
        this.container = container;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.scene = new THREE.Scene();
        this.camera = this.createCamera();
        this.renderer = this.createRenderer();

        this.setupLighting();
        this.setupBackground();

        // Handle resize
        window.addEventListener("resize", this.handleResize);
    }

    private createCamera(): THREE.OrthographicCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 10;
        const camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000,
        );
        camera.position.set(0, 0, 20);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    private createRenderer(): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true, // Required for PNG export
        });
        renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight,
        );
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // CRITICAL: Shadows disabled per CLAUDE.md
        renderer.shadowMap.enabled = false;
        this.container.appendChild(renderer.domElement);
        return renderer;
    }

    private setupLighting(): void {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        // CRITICAL: Shadows disabled per CLAUDE.md
        directionalLight.castShadow = false;
        this.scene.add(directionalLight);

        // Soft fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-3, -2, 3);
        fillLight.castShadow = false;
        this.scene.add(fillLight);
    }

    private setupBackground(): void {
        this.scene.background = new THREE.Color(this.config.backgroundColor);
    }

    /**
     * Update the bodies to render
     */
    updateBodies(bodies: CelestialBodyData[]): void {
        this.bodies = bodies;
        this.clearSpheres();

        if (bodies.length === 0) return;

        const sizeRatios = calculateSizeRatios(bodies);
        const spacing = 4;
        const totalWidth = bodies.length * spacing;

        bodies.forEach((body, index) => {
            // Calculate sphere radius based on size ratio
            const radius = sizeRatios[index] * this.config.maxSphereRadius;

            // Create sphere geometry
            const geometry = new THREE.SphereGeometry(radius, 32, 32);

            // Create material with body color
            const material = new THREE.MeshStandardMaterial({
                color: body.material.color,
                metalness: 0.3,
                roughness: 0.7,
                emissive: body.material.emissive
                    ? new THREE.Color(body.material.emissive)
                    : undefined,
                emissiveIntensity: body.type === "star" ? 0.5 : 0,
            });

            const sphere = new THREE.Mesh(geometry, material);

            // Position spheres side by side, centered
            const x = index * spacing - totalWidth / 2 + spacing / 2;
            sphere.position.set(x, 0.5, 0);

            // Store body ID for reference
            sphere.userData = { bodyId: body.id, bodyName: body.name };

            // CRITICAL: Shadows disabled per CLAUDE.md
            sphere.castShadow = false;
            sphere.receiveShadow = false;

            this.scene.add(sphere);
            this.spheres.push(sphere);

            // Create text label below sphere
            this.createLabel(body.name, x, -2.5 - radius);
        });
    }

    private createLabel(text: string, x: number, y: number): void {
        // Create canvas for text
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = 256;
        canvas.height = 64;

        // Draw text
        context.fillStyle = "rgba(0, 0, 0, 0)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = "bold 32px Arial";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.set(x, y, 0);
        sprite.scale.set(3, 0.75, 1);

        this.scene.add(sprite);
        this.labels.push(sprite);
    }

    private clearSpheres(): void {
        // Dispose spheres
        this.spheres.forEach((sphere) => {
            sphere.geometry.dispose();
            (sphere.material as THREE.Material).dispose();
            this.scene.remove(sphere);
        });
        this.spheres = [];

        // Dispose labels
        this.labels.forEach((label) => {
            (label.material as THREE.SpriteMaterial).map?.dispose();
            (label.material as THREE.Material).dispose();
            this.scene.remove(label);
        });
        this.labels = [];
    }

    /**
     * Start rotation animation
     */
    startAnimation(): void {
        if (this.animationId !== null) return;

        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            if (this.config.enableRotation) {
                this.spheres.forEach((sphere) => {
                    sphere.rotation.y += 0.005;
                });
            }

            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    /**
     * Stop rotation animation
     */
    stopAnimation(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Render a single frame (for static display)
     */
    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get the canvas element for export
     */
    getCanvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    /**
     * Export current view as PNG data URL
     */
    exportAsPNG(): string {
        this.render();
        return this.renderer.domElement.toDataURL("image/png");
    }

    private handleResize = (): void => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const frustumSize = 10;

        this.camera.left = (-frustumSize * aspect) / 2;
        this.camera.right = (frustumSize * aspect) / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    };

    /**
     * Clean up all resources
     */
    dispose(): void {
        this.stopAnimation();
        window.removeEventListener("resize", this.handleResize);

        this.clearSpheres();

        // Dispose renderer
        this.renderer.dispose();

        // Remove canvas from DOM
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(
                this.renderer.domElement,
            );
        }
    }
}
