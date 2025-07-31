import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import type { CelestialBodyData } from "../../../types/game";
import { PerformanceManager } from "./PerformanceManager";
import { AssetLoader } from "./AssetLoader";

/**
 * Manages celestial body 3D objects and their properties with performance optimizations
 */
export class CelestialBodyManager {
    private bodies = new Map<string, THREE.Object3D>();
    private orbitLines = new Map<string, Line2>();
    private bodyData = new Map<string, CelestialBodyData>();
    private orbitAngles = new Map<string, number>(); // Track accumulated orbital angles
    private performanceManager: PerformanceManager;
    private assetLoader: AssetLoader;

    constructor(
        private scene: THREE.Scene,
        private camera: THREE.Camera,
    ) {
        this.performanceManager = new PerformanceManager(scene, camera);
        this.assetLoader = new AssetLoader(
            (progress) => {
                console.log(
                    `Loading assets: ${(progress.progress * 100).toFixed(1)}%`,
                );
            },
            () => {
                console.log("All assets loaded successfully");
            },
            (error) => {
                console.error("Asset loading error:", error);
            },
        );
    }

    /**
     * Preload assets for all celestial bodies
     */
    async preloadAssets(celestialBodies: CelestialBodyData[]): Promise<void> {
        await this.assetLoader.preloadCelestialBodyAssets(celestialBodies);
    }

    /**
     * Creates a 3D object for a celestial body with enhanced realism and performance optimization
     */
    async createCelestialBody(
        data: CelestialBodyData,
    ): Promise<THREE.Object3D> {
        // Create a group to hold the planet and its rings
        const celestialGroup = new THREE.Group();
        celestialGroup.position.copy(data.position);
        celestialGroup.scale.setScalar(data.scale);
        celestialGroup.userData = { celestialBodyData: data };
        celestialGroup.name = data.id;

        // Create the main celestial body
        const geometry = this.createFallbackGeometry(data);
        const material = this.createFallbackMaterial(data);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.name = `${data.id}_body`;
        mesh.userData = { celestialBodyData: data }; // Add userData to the mesh too

        celestialGroup.add(mesh);

        // Add rings if configured
        if (data.rings && data.rings.enabled) {
            const ringObject = this.createRings(data);
            if (ringObject) {
                celestialGroup.add(ringObject);
            }
        }

        // Create orbit path visualization
        if (data.orbitRadius && data.orbitRadius > 0) {
            this.createOrbitLine(data);
        }

        // Store references
        this.bodies.set(data.id, celestialGroup);
        this.bodyData.set(data.id, data);

        // Initialize orbital angle based on current position if orbiting
        if (data.orbitRadius && data.orbitSpeed) {
            // Calculate initial orbital angle from current position
            const initialAngle = Math.atan2(data.position.z, data.position.x);
            this.orbitAngles.set(data.id, initialAngle);
        }

        this.scene.add(celestialGroup);

        return celestialGroup;
    }

    private createFallbackGeometry(
        data: CelestialBodyData,
    ): THREE.BufferGeometry {
        switch (data.type) {
            case "star":
                return new THREE.SphereGeometry(1, 32, 32);
            case "planet":
                return new THREE.SphereGeometry(1, 24, 24);
            case "moon":
                return new THREE.SphereGeometry(1, 16, 16);
            default:
                return new THREE.SphereGeometry(1, 20, 20);
        }
    }

    private createFallbackMaterial(data: CelestialBodyData): THREE.Material {
        if (data.type === "star") {
            return new THREE.MeshBasicMaterial({
                color: data.material.color,
                transparent: false,
            });
        } else {
            return new THREE.MeshStandardMaterial({
                color: data.material.color,
                metalness: data.material.metalness || 0.1,
                roughness: data.material.roughness || 0.8,
            });
        }
    }

    /**
     * Creates ring geometry for celestial bodies (like Saturn)
     */
    private createRings(data: CelestialBodyData): THREE.Object3D | null {
        if (!data.rings || !data.rings.enabled) {
            return null;
        }

        const ringConfig = data.rings;

        // Use particle system if enabled, otherwise fall back to solid ring
        if (ringConfig.particleSystem && ringConfig.particleSystem.enabled) {
            return this.createParticleRings(data);
        } else {
            return this.createSolidRings(data);
        }
    }

    /**
     * Creates particle-based rings that look like small rocks/asteroids
     */
    private createParticleRings(data: CelestialBodyData): THREE.Object3D {
        const ringConfig = data.rings!;
        const particleConfig = ringConfig.particleSystem!;

        const ringGroup = new THREE.Group();
        ringGroup.name = `${data.id}_rings`;

        // Create individual rock particles
        const rockGeometry = new THREE.BoxGeometry(1, 1, 1);
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: ringConfig.color,
            transparent: true,
            opacity: ringConfig.opacity,
            metalness: 0.3,
            roughness: 0.9,
        });

        let particlesCreated = 0;
        let attempts = 0;
        const maxAttempts = particleConfig.particleCount * 2; // Prevent infinite loop

        // Generate particles in the ring area
        while (
            particlesCreated < particleConfig.particleCount &&
            attempts < maxAttempts
        ) {
            attempts++;

            // Random position in ring
            const angle = Math.random() * Math.PI * 2;
            const radius =
                ringConfig.innerRadius +
                Math.random() *
                    (ringConfig.outerRadius - ringConfig.innerRadius);

            // Apply density variation - create some gaps but ensure we get enough particles
            if (
                Math.random() < particleConfig.densityVariation &&
                particlesCreated > particleConfig.particleCount * 0.5
            ) {
                continue; // Skip this particle to create gaps, but only after we have enough particles
            }

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 0.05; // Small vertical variation

            // Create individual rock particle
            const rock = new THREE.Mesh(rockGeometry, rockMaterial.clone());

            // Vary particle size
            const baseSize = particleConfig.particleSize;
            const sizeVariation = baseSize * particleConfig.particleVariation;
            const size = baseSize + (Math.random() - 0.5) * sizeVariation;

            rock.scale.set(
                size * (0.8 + Math.random() * 0.4), // Width variation
                size * (0.3 + Math.random() * 0.4), // Height variation
                size * (0.8 + Math.random() * 0.4), // Depth variation
            );

            rock.position.set(x, y, z);

            // Random rotation for each particle
            rock.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
            );

            rock.castShadow = false;
            rock.receiveShadow = false;

            ringGroup.add(rock);
            particlesCreated++;
        }

        console.log(
            `Created ${particlesCreated} ring particles for ${data.id}`,
        );

        // Apply custom rotation or default to horizontal (Saturn's rings are roughly in the equatorial plane)
        ringGroup.rotation.x =
            ringConfig.rotationX !== undefined
                ? ringConfig.rotationX
                : Math.PI / 2;
        ringGroup.rotation.y = ringConfig.rotationY || 0;
        ringGroup.rotation.z = ringConfig.rotationZ || 0;

        return ringGroup;
    }

    /**
     * Creates traditional solid ring geometry (fallback)
     */
    private createSolidRings(data: CelestialBodyData): THREE.Mesh {
        const ringConfig = data.rings!;

        // Create ring geometry - using RingGeometry
        const ringGeometry = new THREE.RingGeometry(
            ringConfig.innerRadius,
            ringConfig.outerRadius,
            ringConfig.thetaSegments || 64,
            ringConfig.segments || 1,
        );

        // Create ring material
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: ringConfig.color,
            transparent: true,
            opacity: ringConfig.opacity,
            side: THREE.DoubleSide, // Render both sides of the ring
            metalness: 0.1,
            roughness: 0.8,
        });

        // If texture is provided, load it
        if (ringConfig.texture) {
            const textureLoader = new THREE.TextureLoader();
            ringMaterial.map = textureLoader.load(ringConfig.texture);
        }

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.name = `${data.id}_rings`;
        ringMesh.castShadow = false;
        ringMesh.receiveShadow = false;

        // Apply custom rotation or default to horizontal (Saturn's rings are roughly in the equatorial plane)
        ringMesh.rotation.x =
            ringConfig.rotationX !== undefined
                ? ringConfig.rotationX
                : Math.PI / 2;
        ringMesh.rotation.y = ringConfig.rotationY || 0;
        ringMesh.rotation.z = ringConfig.rotationZ || 0;

        return ringMesh;
    }

    /**
     * Creates orbit line visualization for celestial bodies
     */
    private createOrbitLine(data: CelestialBodyData): void {
        if (!data.orbitRadius || data.orbitRadius <= 0) {
            return;
        }

        // Create orbit path geometry using LineGeometry for thick lines
        const orbitPoints: number[] = [];
        const segments = 128; // Number of segments for smooth circle

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * data.orbitRadius;
            const z = Math.sin(angle) * data.orbitRadius;
            orbitPoints.push(x, 0, z); // LineGeometry expects flat array
        }

        const orbitGeometry = new LineGeometry();
        orbitGeometry.setPositions(orbitPoints);

        // Create orbit line material with 5x thickness - subtle and unobtrusive
        const orbitMaterial = new LineMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3,
            linewidth: 5, // 5x thicker than default (which is typically 1)
        });

        const orbitLine = new Line2(orbitGeometry, orbitMaterial);
        orbitLine.name = `${data.id}_orbit`;

        // Store and add to scene
        this.orbitLines.set(data.id, orbitLine);
        this.scene.add(orbitLine);
    }

    /**
     * Update all LOD levels based on camera position
     */
    updateLOD(): void {
        this.performanceManager.updateLOD();
    }

    /**
     * Toggle visibility of all orbit lines
     */
    toggleOrbitLines(visible: boolean): void {
        this.orbitLines.forEach((line) => {
            line.visible = visible;
        });
    }

    /**
     * Update resolution for Line2 materials (needed for thick lines)
     */
    updateLineResolution(width: number, height: number): void {
        this.orbitLines.forEach((line) => {
            const material = line.material as LineMaterial;
            material.resolution.set(width, height);
        });
    }

    /**
     * Set orbit line visibility for a specific celestial body
     */
    setOrbitLineVisibility(id: string, visible: boolean): void {
        const orbitLine = this.orbitLines.get(id);
        if (orbitLine) {
            orbitLine.visible = visible;
        }
    }

    /**
     * Update orbit line opacity based on camera distance
     */
    updateOrbitLineOpacity(cameraPosition: THREE.Vector3): void {
        this.orbitLines.forEach((line, id) => {
            const data = this.bodyData.get(id);
            if (!data || !data.orbitRadius) return;

            // Calculate distance from camera to orbit center
            const distance = cameraPosition.length();

            // Adjust opacity based on distance - closer = more visible
            let opacity = 0.3;
            if (distance > data.orbitRadius * 3) {
                opacity = Math.max(
                    0.1,
                    0.3 - (distance - data.orbitRadius * 3) * 0.01,
                );
            }

            const material = line.material as LineMaterial;
            material.opacity = opacity;
        });
    }

    /**
     * Get celestial body by ID
     */
    getCelestialBody(id: string): THREE.Object3D | undefined {
        return this.bodies.get(id);
    }

    /**
     * Get all celestial bodies
     */
    getAllCelestialBodies(): THREE.Object3D[] {
        return Array.from(this.bodies.values());
    }

    /**
     * Get celestial body data
     */
    getCelestialBodyData(id: string): CelestialBodyData | undefined {
        return this.bodyData.get(id);
    }

    /**
     * Get celestial body data from a Three.js object
     */
    getBodyData(mesh: THREE.Object3D): CelestialBodyData | null {
        // Check if the object has celestial body data in userData
        if (mesh.userData && mesh.userData.celestialBodyData) {
            return mesh.userData.celestialBodyData as CelestialBodyData;
        }

        // Check if the parent has celestial body data (for grouped objects like rings)
        if (
            mesh.parent &&
            mesh.parent.userData &&
            mesh.parent.userData.celestialBodyData
        ) {
            return mesh.parent.userData.celestialBodyData as CelestialBodyData;
        }

        // Fallback: try to get by name/id - check if it's a _body mesh
        if (mesh.name && mesh.name.endsWith("_body")) {
            const bodyId = mesh.name.replace("_body", "");
            return this.bodyData.get(bodyId) || null;
        }

        // Fallback: try to get by name/id
        if (mesh.name) {
            return this.bodyData.get(mesh.name) || null;
        }

        return null;
    }

    /**
     * Highlight a celestial body
     */
    highlightCelestialBody(id: string): void {
        const body = this.bodies.get(id);
        if (body instanceof THREE.Mesh) {
            this.setMaterialHighlight(body);
        }
    }

    /**
     * Remove highlight from celestial body
     */
    unhighlightCelestialBody(id: string): void {
        const body = this.bodies.get(id);
        if (body instanceof THREE.Mesh) {
            this.resetMaterialHighlight(body);
        }
    }

    /**
     * Set material highlight effect
     */
    private setMaterialHighlight(mesh: THREE.Mesh): void {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => {
                if ("emissive" in material) {
                    (material as THREE.MeshStandardMaterial).emissive =
                        new THREE.Color(0x444444);
                }
            });
        } else {
            if ("emissive" in mesh.material) {
                (mesh.material as THREE.MeshStandardMaterial).emissive =
                    new THREE.Color(0x444444);
            }
        }
    }

    /**
     * Reset material highlight effect
     */
    private resetMaterialHighlight(mesh: THREE.Mesh): void {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => {
                if ("emissive" in material) {
                    (material as THREE.MeshStandardMaterial).emissive =
                        new THREE.Color(0x000000);
                }
            });
        } else {
            if ("emissive" in mesh.material) {
                (mesh.material as THREE.MeshStandardMaterial).emissive =
                    new THREE.Color(0x000000);
            }
        }
    }

    /**
     * Update celestial body animations (rotation, orbit)
     */
    updateAnimations(
        deltaTime: number,
        orbitSpeedMultiplier: number = 1.0,
    ): void {
        const time = Date.now() * 0.001;

        this.bodies.forEach((body, id) => {
            const data = this.bodyData.get(id);
            if (!data) return;

            // Apply rotation to the body itself (not the group)
            const bodyMesh = body.getObjectByName(`${id}_body`);
            if (bodyMesh && (data.type === "planet" || data.type === "star")) {
                // Different rotation speeds for different body types
                const rotationSpeed = data.type === "star" ? 0.005 : 0.02;
                bodyMesh.rotation.y += deltaTime * rotationSpeed;
            }

            // Apply orbital motion if defined
            if (data.orbitRadius && data.orbitSpeed) {
                // Get the current accumulated angle for this body
                let currentAngle = this.orbitAngles.get(id) || 0;

                // Increment the angle based on deltaTime and speed multiplier
                const angleIncrement =
                    deltaTime * data.orbitSpeed * orbitSpeedMultiplier;
                currentAngle += angleIncrement;

                // Store the updated angle
                this.orbitAngles.set(id, currentAngle);

                // Calculate position from the smooth accumulated angle
                body.position.x = Math.cos(currentAngle) * data.orbitRadius;
                body.position.z = Math.sin(currentAngle) * data.orbitRadius;

                // Debug: Log orbital position for Earth occasionally
                if (
                    id === "earth" &&
                    Math.floor(time) % 5 === 0 &&
                    Math.floor(time * 10) % 50 === 0
                ) {
                    // Debug log removed
                }
            }

            // Rotate rings slowly for visual effect (Saturn's rings)
            if (data.rings && data.rings.enabled) {
                const ringObject = body.getObjectByName(`${id}_rings`);
                if (ringObject) {
                    // For particle rings, rotate the entire group and occasionally update individual particles
                    if (
                        data.rings.particleSystem &&
                        data.rings.particleSystem.enabled &&
                        ringObject instanceof THREE.Group
                    ) {
                        // Rotate the entire ring group slowly
                        ringObject.rotation.z += deltaTime * 0.001;

                        // Only animate a subset of particles per frame for performance
                        const frameIndex = Math.floor(time * 10) % 200; // Update different particles every 0.1 seconds
                        const particlesToUpdate = Math.min(
                            25,
                            ringObject.children.length,
                        ); // Update 25 particles per frame (up from 10)

                        for (let i = 0; i < particlesToUpdate; i++) {
                            const particleIndex =
                                (frameIndex * particlesToUpdate + i) %
                                ringObject.children.length;
                            const particle = ringObject.children[particleIndex];

                            if (particle instanceof THREE.Mesh) {
                                // Slower, less frequent individual rotations
                                const rotSpeed = 0.0005;
                                particle.rotation.x += deltaTime * rotSpeed;
                                particle.rotation.y +=
                                    deltaTime * rotSpeed * 0.7;
                                particle.rotation.z +=
                                    deltaTime * rotSpeed * 0.3;
                            }
                        }
                    } else {
                        // Traditional solid ring rotation
                        ringObject.rotation.z += deltaTime * 0.001;
                    }
                }
            }
        });
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        totalBodies: number;
        performanceStats: Record<string, unknown>;
        assetStats: Record<string, unknown>;
    } {
        return {
            totalBodies: this.bodies.size,
            performanceStats: this.performanceManager.getPerformanceStats(),
            assetStats: this.assetLoader.getLoadingStats(),
        };
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        // Remove from scene and dispose bodies
        this.bodies.forEach((body) => {
            this.scene.remove(body);
            if (body instanceof THREE.Mesh) {
                body.geometry.dispose();
                if (Array.isArray(body.material)) {
                    body.material.forEach((mat: THREE.Material) =>
                        mat.dispose(),
                    );
                } else {
                    body.material.dispose();
                }
            }
        });

        // Remove orbit lines
        this.orbitLines.forEach((line) => {
            this.scene.remove(line);
            line.geometry.dispose();
            if (Array.isArray(line.material)) {
                line.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
                line.material.dispose();
            }
        });

        // Clear collections
        this.bodies.clear();
        this.bodyData.clear();
        this.orbitLines.clear();

        // Dispose performance manager and asset loader
        this.performanceManager.dispose();
        this.assetLoader.dispose();
    }
}
