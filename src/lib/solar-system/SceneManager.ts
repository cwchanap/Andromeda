import * as THREE from "three";
import type { SolarSystemConfig } from "./types";

/**
 * Manages the 3D scene setup including lighting, background, and particles
 */
export class SceneManager {
    private particles: THREE.Points | null = null;
    private ambientLight: THREE.AmbientLight | null = null;
    private directionalLight: THREE.DirectionalLight | null = null;

    constructor(
        private scene: THREE.Scene,
        private config: Required<SolarSystemConfig>,
    ) {}

    /**
     * Initializes the scene with lighting and background
     */
    async initialize(): Promise<void> {
        this.setupLighting();
        this.createStarField();
        this.setupBackground();
    }

    /**
     * Sets up enhanced scene lighting for realistic planet rendering
     */
    private setupLighting(): void {
        // Ambient light for general illumination
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.ambientLight);

        // Main directional light from the sun (more intense)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.directionalLight.position.set(0, 0, 0); // Sun position

        this.scene.add(this.directionalLight);

        // Add point light at sun position for better illumination
        const sunLight = new THREE.PointLight(0xffffff, 1.5, 500);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);

        // Add subtle fill light to prevent completely dark sides
        const fillLight = new THREE.DirectionalLight(0x404080, 0.3);
        fillLight.position.set(100, 50, 100);
        this.scene.add(fillLight);
    }

    /**
     * Creates animated star field background
     */
    private createStarField(): void {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.particleCount * 3);
        const colors = new Float32Array(this.config.particleCount * 3);

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;

            // Create sphere distribution
            const radius = 2000 + Math.random() * 3000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Vary star colors (white to blue-white to yellow-white)
            const starTemp = Math.random();
            if (starTemp < 0.6) {
                // White stars
                colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 1;
            } else if (starTemp < 0.8) {
                // Blue-white stars
                colors[i3] = 0.8;
                colors[i3 + 1] = 0.9;
                colors[i3 + 2] = 1;
            } else {
                // Yellow-white stars
                colors[i3] = 1;
                colors[i3 + 1] = 0.9;
                colors[i3 + 2] = 0.7;
            }
        }

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: this.config.performanceMode === "low" ? 1 : 2,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    /**
     * Sets up the scene background
     */
    private setupBackground(): void {
        // Create gradient background
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;

        const context = canvas.getContext("2d")!;
        const gradient = context.createRadialGradient(
            128,
            128,
            0,
            128,
            128,
            128,
        );

        gradient.addColorStop(0, "#001122");
        gradient.addColorStop(0.5, "#000511");
        gradient.addColorStop(1, "#000000");

        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    /**
     * Updates animations (stars twinkling, background effects)
     */
    updateAnimations(deltaTime: number): void {
        if (this.particles) {
            // Gentle rotation of starfield
            this.particles.rotation.y += 0.0001 * deltaTime;
            this.particles.rotation.x += 0.00005 * deltaTime;

            // Animate star twinkling
            const positions = this.particles.geometry.attributes.position;
            const colors = this.particles.geometry.attributes.color;

            for (let i = 0; i < positions.count; i++) {
                // Subtle twinkling effect
                const twinkle =
                    0.8 + 0.4 * Math.sin(Date.now() * 0.001 + i * 0.1);
                const colorIndex = i * 3;

                // Preserve original color ratios while applying twinkle
                const baseR = colors.array[colorIndex];
                const baseG = colors.array[colorIndex + 1];
                const baseB = colors.array[colorIndex + 2];

                colors.array[colorIndex] = baseR * twinkle;
                colors.array[colorIndex + 1] = baseG * twinkle;
                colors.array[colorIndex + 2] = baseB * twinkle;
            }

            colors.needsUpdate = true;
        }
    } /**
     * Updates lighting based on performance settings
     */
    updateLighting(performanceMode: "low" | "medium" | "high"): void {
        if (this.ambientLight) {
            this.ambientLight.intensity = performanceMode === "low" ? 0.5 : 0.3;
        }

        if (this.directionalLight) {
            this.directionalLight.intensity =
                performanceMode === "low" ? 0.8 : 1;
        }
    }

    /**
     * Disposes of scene resources
     */
    dispose(): void {
        if (this.particles) {
            this.particles.geometry.dispose();
            if (Array.isArray(this.particles.material)) {
                this.particles.material.forEach((mat) => mat.dispose());
            } else {
                this.particles.material.dispose();
            }
            this.scene.remove(this.particles);
            this.particles = null;
        }

        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }

        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
            this.directionalLight = null;
        }
    }
}
