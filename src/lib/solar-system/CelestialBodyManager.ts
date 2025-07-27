import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";
import { PerformanceManager } from "./PerformanceManager";
import { AssetLoader } from "./AssetLoader";

/**
 * Manages celestial body 3D objects and their properties with performance optimizations
 */
export class CelestialBodyManager {
    private bodies = new Map<string, THREE.Object3D>();
    private orbitLines = new Map<string, THREE.Line>();
    private bodyData = new Map<string, CelestialBodyData>();
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
        // For now, create a simple fallback implementation to avoid breaking the build
        // This will be enhanced with LOD and asset loading later
        const geometry = this.createFallbackGeometry(data);
        const material = this.createFallbackMaterial(data);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(data.position);
        mesh.scale.setScalar(data.scale);
        mesh.userData = { celestialBodyData: data };
        mesh.name = data.id;
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        // Store references
        this.bodies.set(data.id, mesh);
        this.bodyData.set(data.id, data);
        this.scene.add(mesh);

        return mesh;
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
     * Update all LOD levels based on camera position
     */
    updateLOD(): void {
        this.performanceManager.updateLOD();
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
    updateAnimations(deltaTime: number): void {
        this.bodies.forEach((body, id) => {
            const data = this.bodyData.get(id);
            if (!data) return;

            // Apply rotation
            if (data.type === "planet" || data.type === "star") {
                body.rotation.y += deltaTime * 0.01;
            }

            // Apply orbital motion if defined
            if (data.orbitRadius && data.orbitSpeed) {
                const time = Date.now() * 0.001;
                const angle = time * data.orbitSpeed;
                body.position.x = Math.cos(angle) * data.orbitRadius;
                body.position.z = Math.sin(angle) * data.orbitRadius;
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
