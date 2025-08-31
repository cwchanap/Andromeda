import * as THREE from "three";
import type {
    SkyConfiguration,
    Star,
    Constellation,
} from "../../types/constellation";
import { celestialToScreen, magnitudeToSize } from "../../utils/astronomy";

export class ConstellationRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLCanvasElement;
    private starPoints: THREE.Points | null = null;
    private constellationLines: THREE.Group | null = null;
    private labelSprites: THREE.Group | null = null;

    constructor(container: HTMLElement) {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);

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
            alpha: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Disable shadows for performance (following project convention)
        this.renderer.shadowMap.enabled = false;

        this.canvas = this.renderer.domElement;
        container.appendChild(this.canvas);

        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        ambientLight.castShadow = false;
        this.scene.add(ambientLight);

        // Handle window resize
        window.addEventListener("resize", this.handleResize.bind(this));
    }

    /**
     * Initialize the constellation view with stars and constellations
     */
    async initialize(
        stars: Star[],
        constellations: Constellation[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        // Clear existing objects
        this.clearScene();

        // Create star field
        await this.createStars(stars, skyConfig);

        // Create constellation lines
        if (skyConfig.showConstellationLines) {
            this.createConstellationLines(constellations, skyConfig);
        }

        // Create star labels
        if (skyConfig.showStarNames) {
            this.createStarLabels(stars, skyConfig);
        }

        // Setup camera for sky view
        this.setupSkyCamera();

        // Start render loop
        this.animate();
    }

    /**
     * Create star field as points
     */
    private async createStars(
        stars: Star[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        const starPositions: number[] = [];
        const starColors: number[] = [];
        const starSizes: number[] = [];

        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;

        stars.forEach((star) => {
            // Skip stars dimmer than minimum magnitude
            if (star.magnitude > skyConfig.minimumMagnitude) {
                return;
            }

            // Convert celestial coordinates to screen position
            const screenPos = celestialToScreen(
                star.rightAscension,
                star.declination,
                skyConfig.location,
                skyConfig.dateTime,
                screenWidth,
                screenHeight,
            );

            if (screenPos.visible) {
                // Convert screen coordinates to 3D sphere coordinates
                const spherePos = this.screenToSphere(
                    screenPos.x,
                    screenPos.y,
                    screenWidth,
                    screenHeight,
                );

                starPositions.push(spherePos.x, spherePos.y, spherePos.z);

                // Parse star color
                const color = new THREE.Color(star.color);
                starColors.push(color.r, color.g, color.b);

                // Calculate size based on magnitude
                const size = magnitudeToSize(star.magnitude);
                starSizes.push(size);
            }
        });

        // Create geometry
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

        // Create material with size attenuation
        const material = new THREE.PointsMaterial({
            size: 4,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });

        // Create points object
        this.starPoints = new THREE.Points(geometry, material);
        this.starPoints.name = "stars";
        this.scene.add(this.starPoints);
    }

    /**
     * Create constellation lines
     */
    private createConstellationLines(
        constellations: Constellation[],
        skyConfig: SkyConfiguration,
    ): void {
        this.constellationLines = new THREE.Group();
        this.constellationLines.name = "constellation-lines";

        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;

        constellations.forEach((constellation) => {
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions: number[] = [];

            // Get star positions
            const starPositions = constellation.stars.map((star) => {
                const screenPos = celestialToScreen(
                    star.rightAscension,
                    star.declination,
                    skyConfig.location,
                    skyConfig.dateTime,
                    screenWidth,
                    screenHeight,
                );

                if (screenPos.visible) {
                    return this.screenToSphere(
                        screenPos.x,
                        screenPos.y,
                        screenWidth,
                        screenHeight,
                    );
                }
                return null;
            });

            // Create line segments
            constellation.lines.forEach(([startIndex, endIndex]) => {
                const startPos = starPositions[startIndex];
                const endPos = starPositions[endIndex];

                if (startPos && endPos) {
                    linePositions.push(
                        startPos.x,
                        startPos.y,
                        startPos.z,
                        endPos.x,
                        endPos.y,
                        endPos.z,
                    );
                }
            });

            if (linePositions.length > 0) {
                lineGeometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(linePositions, 3),
                );

                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x4444aa,
                    transparent: true,
                    opacity: 0.6,
                    linewidth: 2,
                });

                const lines = new THREE.LineSegments(
                    lineGeometry,
                    lineMaterial,
                );
                lines.name = `constellation-${constellation.id}`;
                this.constellationLines!.add(lines);
            }
        });

        this.scene.add(this.constellationLines);
    }

    /**
     * Create star name labels (simplified for this implementation)
     */
    private createStarLabels(stars: Star[], skyConfig: SkyConfiguration): void {
        this.labelSprites = new THREE.Group();
        this.labelSprites.name = "star-labels";

        // For now, only label the brightest stars (magnitude < 1.5)
        const brightStars = stars.filter((star) => star.magnitude < 1.5);

        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;

        brightStars.forEach((star) => {
            const screenPos = celestialToScreen(
                star.rightAscension,
                star.declination,
                skyConfig.location,
                skyConfig.dateTime,
                screenWidth,
                screenHeight,
            );

            if (screenPos.visible) {
                const spherePos = this.screenToSphere(
                    screenPos.x,
                    screenPos.y,
                    screenWidth,
                    screenHeight,
                );

                // Create simple text sprite (this is a simplified version)
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d")!;
                canvas.width = 256;
                canvas.height = 64;

                context.fillStyle = "#ffffff";
                context.font = "16px Arial";
                context.textAlign = "center";
                context.fillText(star.name, 128, 32);

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.8,
                });

                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.position.copy(spherePos);
                sprite.scale.set(0.2, 0.05, 1);

                this.labelSprites!.add(sprite);
            }
        });

        this.scene.add(this.labelSprites);
    }

    /**
     * Convert screen coordinates to sphere coordinates for sky dome
     */
    private screenToSphere(
        x: number,
        y: number,
        screenWidth: number,
        screenHeight: number,
    ): THREE.Vector3 {
        // Convert screen coordinates to normalized coordinates (-1 to 1)
        const nx = (x / screenWidth) * 2 - 1;
        const ny = -(y / screenHeight) * 2 + 1;

        // Project onto hemisphere (simplified stereographic projection)
        const distance = Math.sqrt(nx * nx + ny * ny);
        const radius = 100; // Sky dome radius

        if (distance > 1) {
            // Points outside unit circle go to horizon
            const normalized = 1 / distance;
            return new THREE.Vector3(
                nx * normalized * radius,
                0,
                ny * normalized * radius,
            );
        } else {
            // Points inside unit circle project to dome
            const altitude = Math.acos(distance) - Math.PI / 2;
            const sphereY = Math.sin(altitude) * radius;
            const groundRadius = Math.cos(altitude) * radius;

            return new THREE.Vector3(
                nx * groundRadius,
                sphereY,
                ny * groundRadius,
            );
        }
    }

    /**
     * Setup camera for sky viewing
     */
    private setupSkyCamera(): void {
        // Position camera at origin looking up
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(0, 1, 0);
        this.camera.up.set(0, 1, 0);
    }

    /**
     * Animation loop
     */
    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
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
        if (this.starPoints) {
            this.scene.remove(this.starPoints);
            this.starPoints.geometry.dispose();
            if (Array.isArray(this.starPoints.material)) {
                this.starPoints.material.forEach((material) =>
                    material.dispose(),
                );
            } else {
                this.starPoints.material.dispose();
            }
            this.starPoints = null;
        }

        if (this.constellationLines) {
            this.scene.remove(this.constellationLines);
            this.constellationLines.children.forEach((child) => {
                if (child instanceof THREE.LineSegments) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material) =>
                            material.dispose(),
                        );
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.constellationLines = null;
        }

        if (this.labelSprites) {
            this.scene.remove(this.labelSprites);
            this.labelSprites.children.forEach((child) => {
                if (child instanceof THREE.Sprite) {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }
                    child.material.dispose();
                }
            });
            this.labelSprites = null;
        }
    }

    /**
     * Update the sky view with new configuration
     */
    async updateSky(
        stars: Star[],
        constellations: Constellation[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        await this.initialize(stars, constellations, skyConfig);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.clearScene();
        window.removeEventListener("resize", this.handleResize.bind(this));

        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }

        this.renderer.dispose();
    }
}
