import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";

/**
 * Manages celestial body 3D objects and their properties
 */
export class CelestialBodyManager {
    private bodies = new Map<string, THREE.Mesh>();
    private orbitLines = new Map<string, THREE.Line>();
    private bodyData = new Map<string, CelestialBodyData>();

    constructor(private scene: THREE.Scene) {}

    /**
     * Creates a 3D mesh for a celestial body with enhanced realism
     */
    createCelestialBody(data: CelestialBodyData): THREE.Mesh {
        // Create geometry based on body type
        const geometry = this.createGeometry(data);
        const material = this.createMaterial(data);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(data.position);
        mesh.scale.setScalar(data.scale);
        mesh.userData = { celestialBodyData: data };
        mesh.name = data.id;

        // Create a group to hold the main body and any additional effects
        const celestialGroup = new THREE.Group();
        celestialGroup.add(mesh);

        // Add atmospheric glow for planets with atmospheres (FIXED - no shadow artifacts)
        if (data.material.atmosphereColor && data.type === "planet") {
            const atmosphereMesh = this.createAtmosphere(data);
            celestialGroup.add(atmosphereMesh);
        }

        // Add rings for Saturn
        if (data.id === "saturn") {
            const rings = this.createRings(data);
            celestialGroup.add(rings);
        }

        // Add Sun glow effect
        if (data.type === "star") {
            const sunGlow = this.createSunGlow(data);
            celestialGroup.add(sunGlow);
        }

        // Set group position and scale
        celestialGroup.position.copy(data.position);
        celestialGroup.userData = { celestialBodyData: data };
        celestialGroup.name = data.id;

        // Add to collections (store the main mesh, not the group)
        this.bodies.set(data.id, mesh);
        this.bodyData.set(data.id, data);
        this.scene.add(celestialGroup);

        // Orbital lines removed - they were being mistaken for shadows

        return mesh;
    }

    /**
     * Creates enhanced geometry for different celestial body types
     */
    private createGeometry(data: CelestialBodyData): THREE.BufferGeometry {
        switch (data.type) {
            case "star":
                // Higher detail for the sun
                return new THREE.SphereGeometry(1, 64, 64);
            case "planet":
                // Variable detail based on planet size and type
                if (["jupiter", "saturn"].includes(data.id)) {
                    // Higher detail for large gas giants
                    return new THREE.SphereGeometry(1, 48, 48);
                } else if (data.id === "earth") {
                    // High detail for Earth
                    return new THREE.SphereGeometry(1, 40, 40);
                } else {
                    // Standard detail for other planets
                    return new THREE.SphereGeometry(1, 32, 32);
                }
            case "moon":
                // Lower detail for moons
                return new THREE.SphereGeometry(1, 20, 20);
            default:
                return new THREE.SphereGeometry(1, 24, 24);
        }
    }

    /**
     * Creates material for celestial bodies with enhanced realism
     */
    private createMaterial(data: CelestialBodyData): THREE.Material {
        // Use different material types based on celestial body type
        if (data.type === "star") {
            return this.createStarMaterial(data);
        } else {
            return this.createPlanetMaterial(data);
        }
    }

    /**
     * Creates realistic star material with glow effect
     */
    private createStarMaterial(data: CelestialBodyData): THREE.Material {
        const materialProps: THREE.MeshBasicMaterialParameters = {
            color: data.material.color,
            transparent: true,
            opacity: 0.95,
        };

        // Add emissive glow
        if (data.material.emissive) {
            materialProps.color = data.material.emissive;
        }

        // Add texture if available
        if (data.material.texture) {
            materialProps.map = new THREE.TextureLoader().load(
                data.material.texture,
            );
        }

        return new THREE.MeshBasicMaterial(materialProps);
    }

    /**
     * Creates realistic planet material with surface details
     */
    private createPlanetMaterial(data: CelestialBodyData): THREE.Material {
        const materialProps: THREE.MeshStandardMaterialParameters = {
            color: data.material.color,
            roughness: data.material.roughness ?? 0.8,
            metalness: data.material.metalness ?? 0.1,
        };

        // Add main texture
        if (data.material.texture) {
            materialProps.map = new THREE.TextureLoader().load(
                data.material.texture,
            );
        }

        // Add normal map for surface detail
        if (data.material.normalMap) {
            materialProps.normalMap = new THREE.TextureLoader().load(
                data.material.normalMap,
            );
            materialProps.normalScale = new THREE.Vector2(1, 1);
        }

        // Add bump map for height detail
        if (data.material.bumpMap) {
            materialProps.bumpMap = new THREE.TextureLoader().load(
                data.material.bumpMap,
            );
            materialProps.bumpScale = 0.1;
        }

        // Add specular map for reflectivity variation
        if (data.material.specularMap) {
            const specularTexture = new THREE.TextureLoader().load(
                data.material.specularMap,
            );
            materialProps.roughnessMap = specularTexture;
        }

        // Handle transparency for gas giants
        if (data.material.transparent) {
            materialProps.transparent = true;
            materialProps.opacity = data.material.opacity ?? 0.9;
        }

        // Special handling for different planet types
        if (data.id === "earth") {
            materialProps.roughness = 0.6;
            materialProps.metalness = 0.0;
        } else if (data.id === "mars") {
            materialProps.roughness = 0.9;
            materialProps.metalness = 0.2;
        } else if (
            ["jupiter", "saturn", "uranus", "neptune"].includes(data.id)
        ) {
            // Gas giants - more atmospheric appearance
            materialProps.roughness = 0.3;
            materialProps.metalness = 0.0;
            materialProps.transparent = true;
            materialProps.opacity = 0.95;
        }

        return new THREE.MeshStandardMaterial(materialProps);
    }

    /**
     * Creates atmospheric glow effect for planets (FIXED - no more shadow artifacts)
     */
    private createAtmosphere(data: CelestialBodyData): THREE.Mesh {
        const atmosphereGeometry = new THREE.SphereGeometry(1.08, 32, 32);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: data.material.atmosphereColor,
            transparent: true,
            opacity: 0.05, // Much lower opacity
            side: THREE.FrontSide, // Changed from BackSide to FrontSide
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Prevent depth buffer writes that could cause sorting issues
        });

        const atmosphereMesh = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial,
        );
        atmosphereMesh.scale.setScalar(data.scale);
        return atmosphereMesh;
    }

    /**
     * Creates rings for Saturn with enhanced detail
     */
    private createRings(data: CelestialBodyData): THREE.Mesh {
        const innerRadius = 1.2;
        const outerRadius = 2.0;
        const ringGeometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            128,
        );

        // Create ring texture pattern
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;

        // Create gradient for ring bands
        const gradient = ctx.createRadialGradient(
            256,
            256,
            innerRadius * 200,
            256,
            256,
            outerRadius * 200,
        );
        gradient.addColorStop(0, "rgba(196, 164, 132, 0.9)");
        gradient.addColorStop(0.3, "rgba(180, 140, 100, 0.7)");
        gradient.addColorStop(0.6, "rgba(160, 120, 80, 0.8)");
        gradient.addColorStop(1, "rgba(140, 100, 60, 0.6)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add ring gaps
        for (let i = 0; i < 8; i++) {
            const radius =
                innerRadius * 200 + (outerRadius - innerRadius) * 200 * (i / 8);
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.arc(256, 256, radius, 0, Math.PI * 2);
            ctx.lineWidth = Math.random() * 3 + 1;
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
        }

        const ringTexture = new THREE.CanvasTexture(canvas);

        const ringMaterial = new THREE.MeshStandardMaterial({
            map: ringTexture,
            transparent: true,
            opacity: 0.9, // Increased from 0.8 for better visibility
            side: THREE.DoubleSide,
            roughness: 0.8, // Reduced from 0.9 for more reflection
            metalness: 0.05, // Reduced from 0.1 for more realistic appearance
            alphaTest: 0.1, // Add alpha test to prevent sorting issues
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2; // Rotate to be horizontal
        ringMesh.scale.setScalar(data.scale);
        return ringMesh;
    }

    /**
     * Creates enhanced sun glow effect with corona
     */
    private createSunGlow(data: CelestialBodyData): THREE.Group {
        const glowGroup = new THREE.Group();

        // Inner glow
        const innerGlowGeometry = new THREE.SphereGeometry(1.1, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: data.material.emissive || data.material.color,
            transparent: true,
            opacity: 0.6,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.scale.setScalar(data.scale);
        glowGroup.add(innerGlow);

        // Outer corona
        const coronaGeometry = new THREE.SphereGeometry(1.3, 32, 32);
        const coronaMaterial = new THREE.MeshBasicMaterial({
            color: "#FFB366",
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        corona.scale.setScalar(data.scale);
        glowGroup.add(corona);

        // Distant glow
        const distantGlowGeometry = new THREE.SphereGeometry(1.6, 32, 32);
        const distantGlowMaterial = new THREE.MeshBasicMaterial({
            color: "#FF9933",
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const distantGlow = new THREE.Mesh(
            distantGlowGeometry,
            distantGlowMaterial,
        );
        distantGlow.scale.setScalar(data.scale);
        glowGroup.add(distantGlow);

        return glowGroup;
    }

    // /**
    //  * Creates orbit line for planets - DISABLED (was being mistaken for shadows)
    //  */
    // private createOrbitLine(data: CelestialBodyData): void {
    //     if (!data.orbitRadius) return;

    //     const points: THREE.Vector3[] = [];
    //     const segments = 64;

    //     for (let i = 0; i <= segments; i++) {
    //         const angle = (i / segments) * Math.PI * 2;
    //         points.push(
    //             new THREE.Vector3(
    //                 Math.cos(angle) * data.orbitRadius,
    //                 0,
    //                 Math.sin(angle) * data.orbitRadius,
    //             ),
    //         );
    //     }

    //     const geometry = new THREE.BufferGeometry().setFromPoints(points);
    //     const material = new THREE.LineBasicMaterial({
    //         color: 0x444444,
    //         opacity: 0.3,
    //         transparent: true,
    //     });

    //     const orbitLine = new THREE.Line(geometry, material);
    //     this.orbitLines.set(data.id, orbitLine);
    //     this.scene.add(orbitLine);
    // }

    /**
     * Updates orbital animations with realistic rotation speeds
     */
    updateOrbitalAnimations(deltaTime: number): void {
        this.bodies.forEach((mesh, id) => {
            const data = this.bodyData.get(id);
            if (!data) return;

            // Handle orbital motion for planets
            if (data.orbitSpeed && data.orbitRadius && data.type === "planet") {
                const currentAngle = mesh.userData.orbitAngle || 0;
                const newAngle = currentAngle + data.orbitSpeed * deltaTime;

                // Update orbital position
                const parent = mesh.parent;
                if (parent) {
                    parent.position.x = Math.cos(newAngle) * data.orbitRadius;
                    parent.position.z = Math.sin(newAngle) * data.orbitRadius;
                }
                mesh.userData.orbitAngle = newAngle;
            }

            // Add realistic rotation speeds based on actual planetary data
            const rotationSpeed = this.getRotationSpeed(data.id);
            mesh.rotation.y += rotationSpeed * deltaTime;

            // Add subtle axial tilt for some planets
            if (data.id === "earth") {
                mesh.rotation.z = Math.sin(Date.now() * 0.001) * 0.05; // Subtle wobble
            } else if (data.id === "uranus") {
                mesh.rotation.z = Math.PI / 3; // Uranus is tilted on its side
            }

            // Special effects for different celestial bodies
            if (data.type === "star") {
                // Pulsing effect for the sun
                const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.02;
                mesh.scale.setScalar(data.scale * pulse);

                // Update sun glow
                const parent = mesh.parent;
                if (parent) {
                    const glowGroup = parent.children.find(
                        (child) =>
                            child !== mesh && child instanceof THREE.Group,
                    ) as THREE.Group;
                    if (glowGroup) {
                        glowGroup.children.forEach((glowMesh, index) => {
                            const glowPulse =
                                1 +
                                Math.sin(Date.now() * 0.002 + index * 0.5) *
                                    0.03;
                            glowMesh.scale.setScalar(
                                data.scale * glowPulse * (1.1 + index * 0.2),
                            );
                        });
                    }
                }
            }

            // Animate gas giant cloud bands
            if (["jupiter", "saturn"].includes(data.id)) {
                mesh.rotation.y += rotationSpeed * deltaTime * 1.5; // Faster cloud movement
            }
        });
    }

    /**
     * Gets realistic rotation speed for celestial bodies (in radians per second)
     */
    private getRotationSpeed(bodyId: string): number {
        const rotationSpeeds: Record<string, number> = {
            sun: 0.05, // Slow rotation
            mercury: 0.02, // Very slow (tidally locked tendency)
            venus: -0.01, // Retrograde rotation
            earth: 0.1, // 24-hour rotation
            mars: 0.1, // Similar to Earth
            jupiter: 0.3, // Fast rotation (10 hours)
            saturn: 0.28, // Fast rotation (10.7 hours)
            uranus: 0.12, // 17-hour rotation
            neptune: 0.15, // 16-hour rotation
        };

        return rotationSpeeds[bodyId] || 0.05;
    }

    /**
     * Gets celestial body mesh by ID
     */
    getBody(id: string): THREE.Mesh | undefined {
        return this.bodies.get(id);
    }

    /**
     * Gets all celestial body meshes
     */
    getAllBodies(): THREE.Mesh[] {
        return Array.from(this.bodies.values());
    }

    /**
     * Gets celestial body data by mesh
     */
    getBodyData(mesh: THREE.Mesh): CelestialBodyData | null {
        return mesh.userData.celestialBodyData || null;
    }

    /**
     * Highlights a celestial body with the new material system
     */
    highlightBody(id: string | null): void {
        // Reset all highlights
        this.bodies.forEach((mesh) => {
            this.resetMaterialHighlight(mesh);
        });

        // Highlight specific body
        if (id && this.bodies.has(id)) {
            const mesh = this.bodies.get(id)!;
            this.setMaterialHighlight(mesh);
        }
    }

    /**
     * Sets highlight effect on material
     */
    private setMaterialHighlight(mesh: THREE.Mesh): void {
        const material = mesh.material;

        if (material instanceof THREE.MeshStandardMaterial) {
            // For standard materials (planets), adjust emissive color
            if (!material.userData.originalEmissive) {
                material.userData.originalEmissive = material.emissive.clone();
            }
            material.emissive.setHex(0x444444);
        } else if (material instanceof THREE.MeshBasicMaterial) {
            // For basic materials (stars), adjust opacity or add outline effect
            if (!material.userData.originalOpacity) {
                material.userData.originalOpacity = material.opacity;
            }
            material.opacity = Math.min(1.0, material.opacity * 1.3);
        } else if (material instanceof THREE.MeshPhongMaterial) {
            // Fallback for any remaining phong materials
            material.emissive.setHex(0x333333);
        }
    }

    /**
     * Resets highlight effect on material
     */
    private resetMaterialHighlight(mesh: THREE.Mesh): void {
        const material = mesh.material;

        if (material instanceof THREE.MeshStandardMaterial) {
            // Reset emissive color
            if (material.userData.originalEmissive) {
                material.emissive.copy(material.userData.originalEmissive);
            } else {
                material.emissive.setHex(0x000000);
            }
        } else if (material instanceof THREE.MeshBasicMaterial) {
            // Reset opacity
            if (material.userData.originalOpacity !== undefined) {
                material.opacity = material.userData.originalOpacity;
            }
        } else if (material instanceof THREE.MeshPhongMaterial) {
            // Fallback for any remaining phong materials
            material.emissive.setHex(0x000000);
        }
    }

    /**
     * Disposes of all resources
     */
    dispose(): void {
        this.bodies.forEach((mesh) => {
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => mat.dispose());
            } else {
                mesh.material.dispose();
            }
            this.scene.remove(mesh);
        });

        // Orbital lines cleanup removed since we no longer create them

        this.bodies.clear();
        this.orbitLines.clear(); // Keep for backward compatibility but it will be empty
        this.bodyData.clear();
    }
}
