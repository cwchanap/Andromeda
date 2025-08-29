import * as THREE from "three";
import type { StarSystemData, GalaxyConfig } from "../types";
import type { CelestialBodyData } from "../../../types/game";

/**
 * Manages the rendering of star systems in galaxy view
 * Creates and manages star meshes, materials, and visual effects
 */
export class StarSystemManager {
    private scene: THREE.Scene;
    private config: Required<GalaxyConfig>;

    // Star system meshes and groups
    private starSystemGroups = new Map<string, THREE.Group>();
    private starMeshes = new Map<string, THREE.Mesh>();
    private glowMeshes = new Map<string, THREE.Mesh>();

    // Materials
    private starMaterials = new Map<string, THREE.MeshStandardMaterial>();
    private glowMaterials = new Map<string, THREE.ShaderMaterial>();

    // Mapping from star ID to system ID for efficient lookups
    private starToSystemMap = new Map<string, string>();

    constructor(scene: THREE.Scene, config: Required<GalaxyConfig>) {
        this.scene = scene;
        this.config = config;
    }

    /**
     * Initialize star systems in the galaxy
     */
    async initialize(starSystems: StarSystemData[]): Promise<void> {
        for (const system of starSystems) {
            await this.createStarSystem(system);
        }
    }

    /**
     * Create a star system with its stars
     */
    private async createStarSystem(systemData: StarSystemData): Promise<void> {
        const systemGroup = new THREE.Group();
        systemGroup.name = systemData.id;
        systemGroup.position.copy(systemData.position);

        // Create stars for this system
        for (const starData of systemData.stars) {
            const starGroup = await this.createStar(starData);
            systemGroup.add(starGroup);
            // Map star ID to system ID for efficient lookups
            this.starToSystemMap.set(starData.id, systemData.id);
        }

        this.starSystemGroups.set(systemData.id, systemGroup);
        this.scene.add(systemGroup);
    }

    /**
     * Create an individual star with glow effects
     */
    private async createStar(
        starData: CelestialBodyData,
    ): Promise<THREE.Group> {
        const starGroup = new THREE.Group();

        // Create star geometry
        const geometry = new THREE.SphereGeometry(
            starData.scale * 0.1, // Scale down for galaxy view
            32,
            16,
        );

        // Create star material based on spectral class and temperature
        const starMaterial = this.createStarMaterial(starData);

        // Create main star mesh
        const starMesh = new THREE.Mesh(geometry, starMaterial);
        starMesh.name = starData.id;
        starMesh.position.copy(starData.position);

        // Disable shadows
        starMesh.castShadow = false;
        starMesh.receiveShadow = false;

        this.starMeshes.set(starData.id, starMesh);
        starGroup.add(starMesh);

        // Create glow effect if enabled
        if (this.config.enableStarGlow) {
            const glowMesh = this.createStarGlow(starData);
            if (glowMesh) {
                this.glowMeshes.set(starData.id, glowMesh);
                starGroup.add(glowMesh);
            }
        }

        return starGroup;
    }

    /**
     * Create star material based on stellar properties
     */
    private createStarMaterial(
        starData: CelestialBodyData,
    ): THREE.MeshStandardMaterial {
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(starData.material.color),
            transparent: false,
            fog: true,
            roughness: 1.0,
            metalness: 0.0,
        });

        // Add emissive glow for stars
        if (starData.material.emissive) {
            material.emissive = new THREE.Color(starData.material.emissive);
            material.emissiveIntensity = 0.3;
        }

        this.starMaterials.set(starData.id, material);
        return material;
    }

    /**
     * Create glow effect for star
     */
    private createStarGlow(starData: CelestialBodyData): THREE.Mesh | null {
        if (!this.config.enableStarGlow) return null;

        const glowGeometry = new THREE.SphereGeometry(
            starData.scale * 0.15, // Slightly larger than the star
            16,
            8,
        );

        // Create glow shader material
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                c: { value: 0.3 },
                p: { value: 4.0 },
                glowColor: {
                    value: new THREE.Color(
                        starData.material.emissive || starData.material.color,
                    ),
                },
                viewVector: { value: new THREE.Vector3() },
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                
                void main() {
                    vec3 vNormal = normalize( normalMatrix * normal );
                    vec3 vNormel = normalize( normalMatrix * viewVector );
                    intensity = pow( c - dot(vNormal, vNormel), p );
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying float intensity;
                
                void main() {
                    vec3 glow = glowColor * intensity;
                    gl_FragColor = vec4( glow, intensity );
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
        });

        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(starData.position);
        glowMesh.castShadow = false;
        glowMesh.receiveShadow = false;

        this.glowMaterials.set(starData.id, glowMaterial);
        return glowMesh;
    } /**
     * Update star system animations
     */
    update(deltaTime: number, cameraPosition: THREE.Vector3): void {
        if (!this.config.enableAnimations) return;

        // Update glow shader uniforms
        this.glowMaterials.forEach((material) => {
            if (material.uniforms.viewVector) {
                material.uniforms.viewVector.value = cameraPosition
                    .clone()
                    .normalize();
            }
        });

        // Subtle star rotation animation
        this.starMeshes.forEach((mesh) => {
            mesh.rotation.y += deltaTime * 0.0001; // Very slow rotation
        });
    }

    /**
     * Get star system by ID
     */
    getStarSystem(systemId: string): THREE.Group | undefined {
        return this.starSystemGroups.get(systemId);
    }

    /**
     * Get star mesh by ID
     */
    getStarMesh(starId: string): THREE.Mesh | undefined {
        return this.starMeshes.get(starId);
    }

    /**
     * Highlight a star system
     */
    highlightStarSystem(systemId: string, highlight: boolean): void {
        // Find all star names that belong to this system using the mapping
        const systemStarNames: string[] = [];
        this.starToSystemMap.forEach((starSystemId, starId) => {
            if (starSystemId === systemId) {
                systemStarNames.push(starId);
            }
        });

        // Update materials for stars in this system
        systemStarNames.forEach((starName) => {
            const material = this.starMaterials.get(starName);
            if (material) {
                material.emissiveIntensity = highlight ? 0.6 : 0.3;
            }
        });
    }

    /**
     * Set visibility of star systems based on distance
     */
    updateVisibility(cameraPosition: THREE.Vector3): void {
        const maxDistance = this.config.maxRenderDistance;

        this.starSystemGroups.forEach((group) => {
            const distance = cameraPosition.distanceTo(group.position);
            const visible = distance <= maxDistance;
            group.visible = visible;
        });
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        // Dispose geometries and materials from meshes
        this.starMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
            }
        });

        this.glowMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
            }
        });

        // Also dispose materials from the maps to ensure all are disposed
        this.starMaterials.forEach((material) => {
            material.dispose();
        });

        this.glowMaterials.forEach((material) => {
            material.dispose();
        });

        // Clear maps
        this.starSystemGroups.clear();
        this.starMeshes.clear();
        this.glowMeshes.clear();
        this.starMaterials.clear();
        this.glowMaterials.clear();
        this.starToSystemMap.clear();
    }

    /**
     * Get all star meshes for interaction detection
     */
    getAllStarMeshes(): THREE.Mesh[] {
        return Array.from(this.starMeshes.values());
    }

    /**
     * Get system ID from a star mesh
     */
    getSystemIdFromMesh(mesh: THREE.Mesh): string | null {
        // Check if this is a known star mesh and return its system ID
        if (mesh.name && this.starToSystemMap.has(mesh.name)) {
            return this.starToSystemMap.get(mesh.name)!;
        }
        return null;
    }

    /**
     * Get rendering statistics
     */
    getStats(): { systemCount: number; starCount: number; glowCount: number } {
        return {
            systemCount: this.starSystemGroups.size,
            starCount: this.starMeshes.size,
            glowCount: this.glowMeshes.size,
        };
    }
}
