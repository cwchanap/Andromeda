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
     * Creates a 3D mesh for a celestial body
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

        // Add to collections
        this.bodies.set(data.id, mesh);
        this.bodyData.set(data.id, data);
        this.scene.add(mesh);

        // Create orbit line if planet
        if (data.orbitRadius && data.type === "planet") {
            this.createOrbitLine(data);
        }

        return mesh;
    }

    /**
     * Creates geometry for different celestial body types
     */
    private createGeometry(data: CelestialBodyData): THREE.BufferGeometry {
        switch (data.type) {
            case "star":
                return new THREE.SphereGeometry(1, 32, 32);
            case "planet":
                return new THREE.SphereGeometry(1, 24, 24);
            case "moon":
                return new THREE.SphereGeometry(1, 16, 16);
            default:
                return new THREE.SphereGeometry(1, 16, 16);
        }
    }

    /**
     * Creates material for celestial bodies
     */
    private createMaterial(data: CelestialBodyData): THREE.Material {
        const materialProps: THREE.MeshPhongMaterialParameters = {
            color: data.material.color,
            shininess: 30,
        };

        // Add emissive for stars
        if (data.type === "star" && data.material.emissive) {
            materialProps.emissive = data.material.emissive;
            materialProps.emissiveIntensity = 0.3;
        }

        // Add texture if available
        if (data.material.texture) {
            materialProps.map = new THREE.TextureLoader().load(
                data.material.texture,
            );
        }

        return new THREE.MeshPhongMaterial(materialProps);
    }

    /**
     * Creates orbit line for planets
     */
    private createOrbitLine(data: CelestialBodyData): void {
        if (!data.orbitRadius) return;

        const points: THREE.Vector3[] = [];
        const segments = 64;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(
                new THREE.Vector3(
                    Math.cos(angle) * data.orbitRadius,
                    0,
                    Math.sin(angle) * data.orbitRadius,
                ),
            );
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            opacity: 0.3,
            transparent: true,
        });

        const orbitLine = new THREE.Line(geometry, material);
        this.orbitLines.set(data.id, orbitLine);
        this.scene.add(orbitLine);
    }

    /**
     * Updates orbital animations
     */
    updateOrbitalAnimations(deltaTime: number): void {
        this.bodies.forEach((mesh, id) => {
            const data = this.bodyData.get(id);
            if (!data || !data.orbitSpeed || !data.orbitRadius) return;

            // Update orbital position
            const currentAngle = mesh.userData.orbitAngle || 0;
            const newAngle = currentAngle + data.orbitSpeed * deltaTime;

            mesh.position.x = Math.cos(newAngle) * data.orbitRadius;
            mesh.position.z = Math.sin(newAngle) * data.orbitRadius;
            mesh.userData.orbitAngle = newAngle;

            // Update rotation
            mesh.rotation.y += 0.01 * deltaTime;
        });
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
     * Highlights a celestial body
     */
    highlightBody(id: string | null): void {
        // Reset all highlights
        this.bodies.forEach((mesh) => {
            const material = mesh.material as THREE.MeshPhongMaterial;
            material.emissive.setHex(0x000000);
        });

        // Highlight specific body
        if (id && this.bodies.has(id)) {
            const mesh = this.bodies.get(id)!;
            const material = mesh.material as THREE.MeshPhongMaterial;
            material.emissive.setHex(0x333333);
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

        this.orbitLines.forEach((line) => {
            line.geometry.dispose();
            if (Array.isArray(line.material)) {
                line.material.forEach((mat) => mat.dispose());
            } else {
                line.material.dispose();
            }
            this.scene.remove(line);
        });

        this.bodies.clear();
        this.orbitLines.clear();
        this.bodyData.clear();
    }
}
