import * as THREE from "three";
import type {
    SkyConfiguration,
    Star,
    Constellation,
} from "../../types/constellation";
import { celestialToSphere, magnitudeToSize } from "../../utils/astronomy";

export class ConstellationRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLCanvasElement;
    private starPoints: THREE.Points | null = null;
    private constellationLines: THREE.Group | null = null;
    private labelSprites: THREE.Group | null = null;
    private constellationLabels: THREE.Group | null = null;
    private isMouseDown: boolean = false;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private cameraRotationX: number = 0;
    private cameraRotationY: number = 0;
    private isDragging: boolean = false;
    private dragVelocityX: number = 0;
    private dragVelocityY: number = 0;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;

    constructor(container: HTMLElement) {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();

        // Create a dark starfield background instead of solid color
        this.createStarfieldBackground();

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

        // Handle window resize
        window.addEventListener("resize", this.handleResize.bind(this));

        // Setup mouse and touch controls for 360-degree viewing
        this.setupMouseControls();
        this.setupTouchControls();
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
        starfieldMesh.renderOrder = 0; // Render first
        this.scene.add(starfieldMesh);
    }

    /**
     * Setup mouse controls for 360-degree camera rotation
     */
    private setupMouseControls(): void {
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.canvas.addEventListener("wheel", this.onMouseWheel.bind(this), {
            passive: false,
        });

        // Prevent context menu on right click
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    /**
     * Setup touch controls for mobile devices
     */
    private setupTouchControls(): void {
        let touchStartX = 0;
        let touchStartY = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;

        this.canvas.addEventListener(
            "touchstart",
            (event) => {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    lastTouchX = touch.clientX;
                    lastTouchY = touch.clientY;

                    this.isMouseDown = true;
                    this.isDragging = true;
                    this.canvas.style.cursor = "grabbing";
                }
            },
            { passive: true },
        );

        this.canvas.addEventListener(
            "touchmove",
            (event) => {
                if (event.touches.length === 1 && this.isMouseDown) {
                    const touch = event.touches[0];
                    const deltaX = touch.clientX - touchStartX;
                    const deltaY = touch.clientY - touchStartY;

                    // Calculate velocity for momentum
                    this.dragVelocityX = touch.clientX - lastTouchX;
                    this.dragVelocityY = touch.clientY - lastTouchY;

                    // Update camera rotation
                    this.cameraRotationY -= deltaX * 0.008;
                    this.cameraRotationX -= deltaY * 0.008;

                    // Limit vertical rotation
                    this.cameraRotationX = Math.max(
                        -Math.PI / 2.2,
                        Math.min(Math.PI / 2.2, this.cameraRotationX),
                    );

                    this.updateCameraRotation();

                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    lastTouchX = touch.clientX;
                    lastTouchY = touch.clientY;
                }
            },
            { passive: false },
        );

        this.canvas.addEventListener(
            "touchend",
            () => {
                this.isMouseDown = false;
                this.canvas.style.cursor = "grab";

                // Start momentum animation if there was significant movement
                if (
                    Math.abs(this.dragVelocityX) > 0.5 ||
                    Math.abs(this.dragVelocityY) > 0.5
                ) {
                    this.startMomentumAnimation();
                }
            },
            { passive: true },
        );
    }

    /**
     * Handle mouse down event
     */
    private onMouseDown(event: MouseEvent): void {
        this.isMouseDown = true;
        this.isDragging = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.dragVelocityX = 0;
        this.dragVelocityY = 0;

        // Add cursor style for better UX
        this.canvas.style.cursor = "grabbing";
    }

    /**
     * Handle mouse move event
     */
    private onMouseMove(event: MouseEvent): void {
        if (!this.isMouseDown) return;

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
            -Math.PI / 2.2,
            Math.min(Math.PI / 2.2, this.cameraRotationX),
        );

        this.updateCameraRotation();

        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    /**
     * Handle mouse up event
     */
    private onMouseUp(): void {
        this.isMouseDown = false;

        // Restore cursor style
        this.canvas.style.cursor = "grab";

        // Start momentum animation if there was significant movement
        if (
            Math.abs(this.dragVelocityX) > 0.5 ||
            Math.abs(this.dragVelocityY) > 0.5
        ) {
            this.startMomentumAnimation();
        }
    }

    /**
     * Start momentum animation for smooth deceleration
     */
    private startMomentumAnimation(): void {
        const friction = 0.95;
        const minVelocity = 0.1;

        const animateMomentum = () => {
            if (
                Math.abs(this.dragVelocityX) < minVelocity &&
                Math.abs(this.dragVelocityY) < minVelocity
            ) {
                this.isDragging = false;
                return;
            }

            // Apply momentum to camera rotation
            this.cameraRotationY -= this.dragVelocityX * 0.004;
            this.cameraRotationX -= this.dragVelocityY * 0.004;

            // Limit vertical rotation
            this.cameraRotationX = Math.max(
                -Math.PI / 2.2,
                Math.min(Math.PI / 2.2, this.cameraRotationX),
            );

            this.updateCameraRotation();

            // Apply friction
            this.dragVelocityX *= friction;
            this.dragVelocityY *= friction;

            requestAnimationFrame(animateMomentum);
        };

        requestAnimationFrame(animateMomentum);
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
     * Update camera rotation based on mouse movement
     */
    private updateCameraRotation(): void {
        // Create rotation matrix for camera
        const cosX = Math.cos(this.cameraRotationX);
        const sinX = Math.sin(this.cameraRotationX);
        const cosY = Math.cos(this.cameraRotationY);
        const sinY = Math.sin(this.cameraRotationY);

        // Calculate look direction
        const lookX = sinY * cosX;
        const lookY = sinX;
        const lookZ = cosY * cosX;

        // Set camera look direction
        this.camera.lookAt(lookX * 10, lookY * 10, lookZ * 10);
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

        // Create constellation name labels
        this.createConstellationLabels(constellations, skyConfig);

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
     * Create star field as points in 360-degree space
     */
    private async createStars(
        stars: Star[],
        skyConfig: SkyConfiguration,
    ): Promise<void> {
        const starPositions: number[] = [];
        const starColors: number[] = [];
        const starSizes: number[] = [];

        stars.forEach((star) => {
            // Skip stars dimmer than minimum magnitude
            if (star.magnitude > skyConfig.minimumMagnitude) {
                return;
            }

            // Convert celestial coordinates to 3D sphere position
            const spherePos = celestialToSphere(
                star.rightAscension,
                star.declination,
                skyConfig.location,
                skyConfig.dateTime,
                100, // Sphere radius
            );

            // All stars are placed in the 360-degree sphere
            starPositions.push(spherePos.x, spherePos.y, spherePos.z);

            // Parse star color
            const color = new THREE.Color(star.color);
            starColors.push(color.r, color.g, color.b);

            // Calculate size based on magnitude - make brighter stars more visible
            const size = magnitudeToSize(star.magnitude) * 3; // Triple the size for better visibility
            starSizes.push(size);
        });

        // If very few stars were created, add some procedural background stars for ambiance
        if (starPositions.length < 300) {
            // Less than 100 stars
            for (let i = 0; i < 500; i++) {
                // Create random stars distributed evenly across the celestial sphere
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
        }

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

        // Create enhanced material with better visibility
        const material = new THREE.PointsMaterial({
            size: 6,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Prevent depth issues
        });

        // Create points object
        this.starPoints = new THREE.Points(geometry, material);
        this.starPoints.name = "stars";
        this.starPoints.renderOrder = 1; // Render after background
        this.scene.add(this.starPoints);
    }

    /**
     * Create constellation lines in 3D space
     */
    private createConstellationLines(
        constellations: Constellation[],
        skyConfig: SkyConfiguration,
    ): void {
        this.constellationLines = new THREE.Group();
        this.constellationLines.name = "constellation-lines";

        constellations.forEach((constellation) => {
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions: number[] = [];

            // Get star positions in 3D sphere
            const starPositions = constellation.stars.map((star) => {
                return celestialToSphere(
                    star.rightAscension,
                    star.declination,
                    skyConfig.location,
                    skyConfig.dateTime,
                    98, // Slightly smaller radius than stars for depth
                );
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
                    color: 0x4488cc,
                    transparent: true,
                    opacity: 0.7,
                    linewidth: 3,
                    depthWrite: false,
                });

                const lines = new THREE.LineSegments(
                    lineGeometry,
                    lineMaterial,
                );
                lines.name = `constellation-${constellation.id}`;
                lines.renderOrder = 2; // Render after stars
                this.constellationLines!.add(lines);
            }
        });

        this.scene.add(this.constellationLines);
    }

    /**
     * Create constellation name labels in 3D space
     */
    private createConstellationLabels(
        constellations: Constellation[],
        skyConfig: SkyConfiguration,
    ): void {
        this.constellationLabels = new THREE.Group();
        this.constellationLabels.name = "constellation-labels";

        constellations.forEach((constellation) => {
            if (constellation.stars.length === 0) return;

            // Calculate the center position of the constellation
            let avgRA = 0;
            let avgDec = 0;

            constellation.stars.forEach((star) => {
                avgRA += star.rightAscension;
                avgDec += star.declination;
            });

            avgRA /= constellation.stars.length;
            avgDec /= constellation.stars.length;

            // Convert to 3D position
            const labelPos = celestialToSphere(
                avgRA,
                avgDec,
                skyConfig.location,
                skyConfig.dateTime,
                110, // Position labels farther out than stars for visibility
            );

            // Create text sprite for constellation name
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            canvas.width = 512;
            canvas.height = 128;

            // Clear with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw constellation name with larger, bold text
            context.fillStyle = "#4FC3F7"; // Cyan color for prominence
            context.font = "bold 48px Arial, sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";

            // Add glow effect for better visibility
            context.shadowColor = "#4FC3F7";
            context.shadowBlur = 12;
            context.fillText(constellation.name, 256, 48);

            // Add constellation abbreviation below
            context.font = "32px Arial, sans-serif";
            context.fillStyle = "#81C784"; // Light green for abbreviation
            context.shadowBlur = 8;
            context.fillText(`(${constellation.abbreviation})`, 256, 90);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(labelPos.x, labelPos.y, labelPos.z);
            sprite.scale.set(20, 5, 1); // Large scale for visibility
            sprite.renderOrder = 4; // Render above star labels
            sprite.name = `label-${constellation.id}`;

            this.constellationLabels!.add(sprite);
        });

        this.scene.add(this.constellationLabels);
    }

    /**
     * Create star name labels in 3D space
     */
    private createStarLabels(stars: Star[], skyConfig: SkyConfiguration): void {
        this.labelSprites = new THREE.Group();
        this.labelSprites.name = "star-labels";

        // Only label the brightest stars (magnitude < 1.5)
        const brightStars = stars.filter((star) => star.magnitude < 1.5);

        brightStars.forEach((star) => {
            const spherePos = celestialToSphere(
                star.rightAscension,
                star.declination,
                skyConfig.location,
                skyConfig.dateTime,
                105, // Slightly farther than stars
            );

            // Create text sprite
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            canvas.width = 256;
            canvas.height = 64;

            // Clear with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Set text properties
            context.fillStyle = "#ffffff";
            context.font = "bold 20px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";

            // Add text glow effect
            context.shadowColor = "#4488cc";
            context.shadowBlur = 4;
            context.fillText(star.name, 128, 32);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(spherePos.x, spherePos.y, spherePos.z);
            sprite.scale.set(8, 2, 1); // Larger labels for better visibility
            sprite.renderOrder = 3; // Render on top

            this.labelSprites!.add(sprite);
        });

        this.scene.add(this.labelSprites);
    }

    /**
     * Setup camera for 360-degree sky viewing with observer at center
     */
    private setupSkyCamera(): void {
        // Position camera as observer on the ground looking up at the sky
        // Camera at origin (observer position), looking upward (positive Y)
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(0, 10, 0); // Look upward toward the sky
        this.camera.up.set(0, 1, 0); // Y-up coordinate system for natural orientation
    }

    /**
     * Animation loop
     */
    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        // Update camera rotation if mouse is being dragged
        if (this.isMouseDown) {
            this.updateCameraRotation();
        }

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

        if (this.constellationLabels) {
            this.scene.remove(this.constellationLabels);
            this.constellationLabels.children.forEach((child) => {
                if (child instanceof THREE.Sprite) {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }
                    child.material.dispose();
                }
            });
            this.constellationLabels = null;
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

        // Remove mouse event listeners
        this.canvas.removeEventListener(
            "mousedown",
            this.onMouseDown.bind(this),
        );
        this.canvas.removeEventListener(
            "mousemove",
            this.onMouseMove.bind(this),
        );
        this.canvas.removeEventListener("mouseup", this.onMouseUp.bind(this));
        this.canvas.removeEventListener("wheel", this.onMouseWheel.bind(this));
        this.canvas.removeEventListener("contextmenu", (e) =>
            e.preventDefault(),
        );

        // Remove touch event listeners
        this.canvas.removeEventListener("touchstart", () => {});
        this.canvas.removeEventListener("touchmove", () => {});
        this.canvas.removeEventListener("touchend", () => {});

        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }

        this.renderer.dispose();
    }
}
