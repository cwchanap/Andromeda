import * as THREE from "three";
import type { SolarSystemConfig } from "./types";

/**
 * Simple seeded random number generator for consistent star distribution
 */
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Linear congruential generator for seeded random numbers
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Generate random number between min and max
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}

/**
 * Manages the 3D scene setup including lighting, background, and particles
 */
export class SceneManager {
    private particles: THREE.Points | null = null;
    private ambientLight: THREE.AmbientLight | null = null;
    private directionalLight: THREE.DirectionalLight | null = null;
    private seededRandom: SeededRandom | null = null;
    private starAnimationTime: number = 0;
    private originalStarColors: Float32Array | null = null;

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

        // Explicitly disable shadows on directional light
        this.directionalLight.castShadow = false;

        this.scene.add(this.directionalLight);

        // Add point light at sun position for better illumination
        const sunLight = new THREE.PointLight(0xffffff, 1.5, 500);
        sunLight.position.set(0, 0, 0);

        // Explicitly disable shadows on point light
        sunLight.castShadow = false;

        this.scene.add(sunLight);

        // Add subtle fill light to prevent completely dark sides
        const fillLight = new THREE.DirectionalLight(0x404080, 0.3);
        fillLight.position.set(100, 50, 100);

        // Explicitly disable shadows on fill light
        fillLight.castShadow = false;

        this.scene.add(fillLight);

        console.log(
            "Lighting setup complete - all shadows explicitly disabled",
        );
    }

    /**
     * Creates animated star field background with seeded random distribution
     */
    private createStarField(): void {
        // Get background star configuration
        const starConfig = this.config.backgroundStars || {
            enabled: true,
            density: 1.0,
            seed: 12345,
            animationSpeed: 1.0,
            minRadius: 2000,
            maxRadius: 5000,
            colorVariation: true,
        };

        if (!starConfig.enabled) {
            return;
        }

        // Initialize seeded random number generator
        this.seededRandom = new SeededRandom(starConfig.seed);

        const starCount = Math.floor(
            this.config.particleCount * starConfig.density,
        );
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        // Store original colors for animation
        this.originalStarColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;

            // Create sphere distribution using seeded random
            const radius = this.seededRandom.range(
                starConfig.minRadius,
                starConfig.maxRadius,
            );
            const theta = this.seededRandom.range(0, Math.PI * 2);
            const phi = Math.acos(2 * this.seededRandom.next() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Vary star colors using seeded random (white to blue-white to yellow-white)
            let r = 1,
                g = 1,
                b = 1;

            if (starConfig.colorVariation) {
                const starTemp = this.seededRandom.next();
                if (starTemp < 0.6) {
                    // White stars
                    r = g = b = 1;
                } else if (starTemp < 0.8) {
                    // Blue-white stars
                    r = 0.8;
                    g = 0.9;
                    b = 1;
                } else {
                    // Yellow-white stars
                    r = 1;
                    g = 0.9;
                    b = 0.7;
                }
            }

            // Store original colors
            this.originalStarColors[i3] = r;
            this.originalStarColors[i3 + 1] = g;
            this.originalStarColors[i3 + 2] = b;

            // Set initial colors
            colors[i3] = r;
            colors[i3 + 1] = g;
            colors[i3 + 2] = b;
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

        // Explicitly disable shadows on particles
        this.particles.castShadow = false;
        this.particles.receiveShadow = false;

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
        if (this.particles && this.originalStarColors) {
            // Get background star configuration
            const starConfig = this.config.backgroundStars || {
                enabled: true,
                density: 1.0,
                seed: 12345,
                animationSpeed: 1.0,
                minRadius: 2000,
                maxRadius: 5000,
                colorVariation: true,
            };

            if (!starConfig.enabled) return;

            this.starAnimationTime += deltaTime * starConfig.animationSpeed;

            // Gentle rotation of starfield based on animation speed
            this.particles.rotation.y +=
                0.0001 * deltaTime * starConfig.animationSpeed;
            this.particles.rotation.x +=
                0.00005 * deltaTime * starConfig.animationSpeed;

            // Animate star twinkling with consistent, seeded patterns
            const colors = this.particles.geometry.attributes.color;

            for (let i = 0; i < colors.count; i++) {
                const colorIndex = i * 3;

                // Create consistent twinkling pattern based on star index and seed
                const twinklePhase = this.starAnimationTime * 0.001 + i * 0.1;
                const twinkle = 0.6 + 0.4 * Math.sin(twinklePhase);

                // Apply twinkling to original star colors
                colors.array[colorIndex] =
                    this.originalStarColors[colorIndex] * twinkle;
                colors.array[colorIndex + 1] =
                    this.originalStarColors[colorIndex + 1] * twinkle;
                colors.array[colorIndex + 2] =
                    this.originalStarColors[colorIndex + 2] * twinkle;
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
