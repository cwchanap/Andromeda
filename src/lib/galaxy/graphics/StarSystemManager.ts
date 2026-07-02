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

    // Sol origin marker and distance lines
    private solMarkerGroup: THREE.Group | null = null;
    private solRing: THREE.Mesh | null = null;
    // Distance lines are parented into each system's group so that
    // updateVisibility's group.visible toggle culls them automatically —
    // otherwise lines float to invisible endpoints when the render-distance
    // slider hides the target system.
    private distanceLinesBySystem = new Map<string, THREE.Line>();
    private distanceLinesMaterial: THREE.LineBasicMaterial | null = null;
    // Cached star systems + config so distance lines can be lazily (re)created
    // by setDistanceLinesVisible when enableDistanceIndicators was off at init.
    private starSystemsCache: StarSystemData[] = [];
    // Sol ring pulse accumulator (seconds). Drives a subtle scale + opacity
    // oscillation so Sol stands out from the nearby-star meshes. Suppressed
    // when reducedMotion is set.
    private solPulseTime = 0;
    private reducedMotion = false;

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

        // Cache star systems so distance lines can be lazily (re)created by
        // setDistanceLinesVisible when the flag was off at init time.
        this.starSystemsCache = starSystems;

        this.solMarkerGroup = this.createSolMarker();
        this.scene.add(this.solMarkerGroup);

        if (this.config.enableDistanceIndicators) {
            this.createDistanceLines(starSystems);
        }
    }

    /**
     * Create the Sol origin marker (sphere + ring + optional label)
     */
    private createSolMarker(): THREE.Group {
        const group = new THREE.Group();
        group.name = "sol-marker";
        group.position.set(0, 0, 0);

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            new THREE.MeshBasicMaterial({ color: "#7dd3fc" }),
        );
        core.name = "sol-marker-core";
        core.castShadow = false;
        core.receiveShadow = false;
        group.add(core);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.6, 0.8, 32),
            new THREE.MeshBasicMaterial({
                color: "#00f0ff",
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
            }),
        );
        ring.name = "sol-marker-ring";
        ring.castShadow = false;
        ring.receiveShadow = false;
        this.solRing = ring;
        group.add(ring);

        if (this.config.enableSolLabel) {
            group.add(this.createSolLabel(this.config.solMarkerLabel));
        }

        return group;
    }

    /**
     * Create the Sol marker label sprite
     */
    private createSolLabel(text: string): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = 256;
        canvas.height = 64;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#7dd3fc";
        ctx.shadowBlur = 10;
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
            }),
        );
        sprite.position.set(0, 1.2, 0);
        sprite.scale.set(3, 0.75, 1);
        sprite.name = "sol-marker-label";
        return sprite;
    }

    /**
     * Set visibility of the Sol origin marker
     */
    setSolMarkerVisible(visible: boolean): void {
        if (this.solMarkerGroup) this.solMarkerGroup.visible = visible;
    }

    /**
     * Set visibility of the Sol origin marker label only (the core/ring
     * marker stays visible). Lazily creates the label on first enable when
     * enableSolLabel was false at init time, so the runtime toggle is never
     * a silent no-op — mirrors the lazy-create path in
     * setDistanceLinesVisible.
     */
    setSolLabelVisible(visible: boolean): void {
        if (!this.solMarkerGroup) return;
        let label = this.solMarkerGroup.getObjectByName("sol-marker-label");
        if (!label && visible) {
            label = this.createSolLabel(this.config.solMarkerLabel);
            this.solMarkerGroup.add(label);
        }
        if (label) label.visible = visible;
    }

    /**
     * Set visibility of all star glow halos at runtime.
     */
    setStarGlowVisible(visible: boolean): void {
        this.glowMeshes.forEach((mesh) => {
            mesh.visible = visible;
        });
    }

    /**
     * Create distance lines from the galactic origin (Sol) to every star
     * system. Each line is parented into its system's group so that
     * `updateVisibility` culls the line together with the system when the
     * group is hidden — preventing lines from floating to invisible
     * endpoints when the render-distance slider is lowered.
     */
    private createDistanceLines(starSystems: StarSystemData[]): void {
        const material = new THREE.LineBasicMaterial({
            color: 0x1b6b7a,
            transparent: true,
            opacity: 0.35,
        });
        this.distanceLinesMaterial = material;

        for (const s of starSystems) {
            const group = this.starSystemGroups.get(s.id);
            if (!group) continue;
            // Local-space vertices: (-system.position) → (0,0,0). Because the
            // group is positioned at system.position, these map to world-space
            // origin → system.position.
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(
                    [-s.position.x, -s.position.y, -s.position.z, 0, 0, 0],
                    3,
                ),
            );
            const line = new THREE.Line(geometry, material);
            line.name = "sol-distance-line";
            group.add(line);
            this.distanceLinesBySystem.set(s.id, line);
        }
    }

    /**
     * Set visibility of the distance lines. Lazily (re)creates the per-system
     * lines on first enable when enableDistanceIndicators was false at init
     * time, so the runtime toggle is never a silent no-op.
     */
    setDistanceLinesVisible(visible: boolean): void {
        if (
            visible &&
            this.distanceLinesBySystem.size === 0 &&
            this.starSystemsCache.length > 0
        ) {
            this.createDistanceLines(this.starSystemsCache);
        }
        this.distanceLinesBySystem.forEach((line) => {
            line.visible = visible;
        });
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
        // Sol ring pulse runs independently of the animations toggle (it is a
        // position indicator, not ambient motion) but is suppressed under
        // reduced-motion per the spec's accessibility note.
        this.tickSolPulse(deltaTime);

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
     * Animate the Sol marker ring with a subtle scale + opacity pulse so Sol
     * is distinguishable from the nearby-star meshes. No-op under
     * reduced-motion (ring stays at its base scale/opacity).
     */
    private tickSolPulse(deltaTime: number): void {
        if (!this.solRing) return;
        if (this.reducedMotion) return;
        this.solPulseTime += deltaTime;
        // 1.6s period sine wave; scale 0.9–1.15, opacity 0.45–0.85.
        const phase = (this.solPulseTime % 1.6) / 1.6; // 0..1
        const wave = Math.sin(phase * Math.PI * 2);
        const scale = 1 + wave * 0.125;
        this.solRing.scale.setScalar(scale);
        const mat = this.solRing.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.65 + wave * 0.2;
    }

    /**
     * Inform the manager of the user's reduced-motion preference. When true,
     * the Sol ring pulse is frozen at its base state.
     */
    setReducedMotion(reduced: boolean): void {
        this.reducedMotion = reduced;
        if (reduced && this.solRing) {
            this.solRing.scale.setScalar(1);
            (this.solRing.material as THREE.MeshBasicMaterial).opacity = 0.8;
        }
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

        // Dispose Sol origin marker
        if (this.solMarkerGroup) {
            this.solMarkerGroup.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const mat = mesh.material as THREE.Material | THREE.Material[];
                const disposeMaterial = (m: THREE.Material) => {
                    // Sprite materials carry a CanvasTexture map that is not
                    // auto-disposed by material.dispose() — release it
                    // explicitly to avoid a texture leak on the Sol label.
                    const spriteMat = m as THREE.SpriteMaterial;
                    if (spriteMat.map) spriteMat.map.dispose();
                    m.dispose();
                };
                if (Array.isArray(mat)) mat.forEach(disposeMaterial);
                else if (mat) disposeMaterial(mat);
            });
            this.scene.remove(this.solMarkerGroup);
            this.solMarkerGroup = null;
            this.solRing = null;
        }

        // Dispose distance lines (geometries are per-line; material is shared)
        this.distanceLinesBySystem.forEach((line) => {
            line.geometry.dispose();
        });
        this.distanceLinesMaterial?.dispose();
        this.distanceLinesMaterial = null;
        this.distanceLinesBySystem.clear();

        // Remove star system groups from the scene before clearing the map.
        // Without this, disposed groups remain in the scene graph and can
        // trigger WebGL warnings on the next render frame.
        this.starSystemGroups.forEach((group) => {
            this.scene.remove(group);
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
