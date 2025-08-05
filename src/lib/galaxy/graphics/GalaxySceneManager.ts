import * as THREE from "three";
import type { GalaxyConfig } from "../types";

/**
 * Manages the 3D scene setup for galaxy view
 * Handles lighting, background stars, and environmental effects
 */
export class GalaxySceneManager {
    private scene: THREE.Scene;
    private config: Required<GalaxyConfig>;

    // Lighting
    private ambientLight!: THREE.AmbientLight;
    private directionalLight!: THREE.DirectionalLight;

    // Background elements
    private backgroundStars!: THREE.Points;
    private starFieldGeometry!: THREE.BufferGeometry;
    private starFieldMaterial!: THREE.PointsMaterial;

    constructor(scene: THREE.Scene, config: Required<GalaxyConfig>) {
        this.scene = scene;
        this.config = config;
    }

    /**
     * Initialize the galaxy scene
     */
    async initialize(): Promise<void> {
        this.setupLighting();
        this.createBackgroundStars();
        this.setupSceneProperties();
    }

    /**
     * Setup lighting for galaxy view
     * No shadows to maintain performance
     */
    private setupLighting(): void {
        // Ambient light for general illumination
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.ambientLight.castShadow = false;
        this.scene.add(this.ambientLight);

        // Directional light to simulate galactic background lighting
        this.directionalLight = new THREE.DirectionalLight(0x404080, 0.4);
        this.directionalLight.position.set(100, 100, 50);
        this.directionalLight.castShadow = false;
        this.scene.add(this.directionalLight);
    }

    /**
     * Create background star field
     */
    private createBackgroundStars(): void {
        const starCount = this.config.backgroundStarCount;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        // Generate random stars in a sphere around the galaxy
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;

            // Random position in a large sphere
            const radius = 100 + Math.random() * 400; // Stars far away
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Random star colors (bluish to reddish)
            const temp = 0.3 + Math.random() * 0.7; // Color temperature factor
            colors[i3] = 0.5 + temp * 0.5; // Red
            colors[i3 + 1] = 0.6 + temp * 0.4; // Green
            colors[i3 + 2] = 0.8 + temp * 0.2; // Blue

            // Random star sizes
            sizes[i] = 0.5 + Math.random() * 2.0;
        }

        this.starFieldGeometry = new THREE.BufferGeometry();
        this.starFieldGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3),
        );
        this.starFieldGeometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colors, 3),
        );
        this.starFieldGeometry.setAttribute(
            "size",
            new THREE.BufferAttribute(sizes, 1),
        );

        this.starFieldMaterial = new THREE.PointsMaterial({
            size: 0.8,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        this.backgroundStars = new THREE.Points(
            this.starFieldGeometry,
            this.starFieldMaterial,
        );
        this.scene.add(this.backgroundStars);
    }

    /**
     * Setup basic scene properties
     */
    private setupSceneProperties(): void {
        // Set background color to deep space black
        this.scene.background = new THREE.Color(0x000011);

        // Enable fog for depth perception
        this.scene.fog = new THREE.Fog(0x000011, 50, 500);
    }

    /**
     * Update background stars rotation for subtle animation
     */
    update(deltaTime: number): void {
        if (this.backgroundStars && this.config.enableAnimations) {
            this.backgroundStars.rotation.y += deltaTime * 0.00005; // Very slow rotation
            this.backgroundStars.rotation.x += deltaTime * 0.00002;
        }
    }

    /**
     * Update lighting based on camera position
     */
    updateLighting(cameraPosition: THREE.Vector3): void {
        if (this.directionalLight) {
            // Keep directional light relative to camera for consistent lighting
            const direction = cameraPosition
                .clone()
                .normalize()
                .multiplyScalar(100);
            this.directionalLight.position.copy(direction);
        }
    }

    /**
     * Dispose of scene resources
     */
    dispose(): void {
        if (this.starFieldGeometry) {
            this.starFieldGeometry.dispose();
        }
        if (this.starFieldMaterial) {
            this.starFieldMaterial.dispose();
        }
        if (this.backgroundStars) {
            this.scene.remove(this.backgroundStars);
        }
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
        }
    }

    /**
     * Get scene statistics
     */
    getStats(): { starCount: number; lightCount: number } {
        return {
            starCount: this.config.backgroundStarCount,
            lightCount: 2, // ambient + directional
        };
    }
}
