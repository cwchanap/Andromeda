import * as THREE from "three";
import type { CelestialBodyData } from "../../../types/game";

/**
 * Performance management system for optimizing 3D rendering
 * Handles geometry caching, LOD system, and asset optimization
 */
export class PerformanceManager {
    private geometryCache = new Map<string, THREE.BufferGeometry>();
    private textureCache = new Map<string, THREE.Texture>();
    private lodLevels = new Map<string, THREE.LOD>();
    private camera: THREE.Camera;
    private scene: THREE.Scene;

    // Performance settings
    private readonly LOD_DISTANCES = {
        HIGH: 50,
        MEDIUM: 150,
        LOW: 300,
    };

    private readonly GEOMETRY_CACHE_KEYS = {
        SPHERE_HIGH: "sphere_64_64",
        SPHERE_MEDIUM: "sphere_32_32",
        SPHERE_LOW: "sphere_16_16",
        SPHERE_VERY_LOW: "sphere_8_8",
        STAR_HIGH: "star_64_64",
        PLANET_LARGE: "planet_48_48",
        PLANET_MEDIUM: "planet_32_32",
        PLANET_SMALL: "planet_20_20",
        MOON: "moon_16_16",
    };

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;
        this.initializeGeometryCache();
    }

    /**
     * Pre-create and cache commonly used geometries
     */
    private initializeGeometryCache(): void {
        // High detail spheres
        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.SPHERE_HIGH,
            new THREE.SphereGeometry(1, 64, 64),
        );

        // Medium detail spheres
        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.SPHERE_MEDIUM,
            new THREE.SphereGeometry(1, 32, 32),
        );

        // Low detail spheres
        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.SPHERE_LOW,
            new THREE.SphereGeometry(1, 16, 16),
        );

        // Very low detail spheres for distant objects
        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.SPHERE_VERY_LOW,
            new THREE.SphereGeometry(1, 8, 8),
        );

        // Specialized geometries
        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.STAR_HIGH,
            new THREE.SphereGeometry(1, 64, 64),
        );

        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.PLANET_LARGE,
            new THREE.SphereGeometry(1, 48, 48),
        );

        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.PLANET_MEDIUM,
            new THREE.SphereGeometry(1, 32, 32),
        );

        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.PLANET_SMALL,
            new THREE.SphereGeometry(1, 20, 20),
        );

        this.geometryCache.set(
            this.GEOMETRY_CACHE_KEYS.MOON,
            new THREE.SphereGeometry(1, 16, 16),
        );
    }

    /**
     * Get cached geometry based on celestial body type and performance requirements
     */
    getCachedGeometry(
        data: CelestialBodyData,
        lodLevel: "high" | "medium" | "low" | "very_low" = "medium",
    ): THREE.BufferGeometry {
        let cacheKey: string;

        // Determine base geometry type
        if (data.type === "star") {
            cacheKey = this.GEOMETRY_CACHE_KEYS.STAR_HIGH;
        } else if (data.type === "planet") {
            if (["jupiter", "saturn"].includes(data.id)) {
                cacheKey = this.GEOMETRY_CACHE_KEYS.PLANET_LARGE;
            } else if (data.id === "earth") {
                cacheKey = this.GEOMETRY_CACHE_KEYS.PLANET_MEDIUM;
            } else {
                cacheKey = this.GEOMETRY_CACHE_KEYS.PLANET_SMALL;
            }
        } else if (data.type === "moon") {
            cacheKey = this.GEOMETRY_CACHE_KEYS.MOON;
        } else {
            cacheKey = this.GEOMETRY_CACHE_KEYS.SPHERE_MEDIUM;
        }

        // Override with LOD level for non-star objects
        if (data.type !== "star") {
            switch (lodLevel) {
                case "high":
                    cacheKey = this.GEOMETRY_CACHE_KEYS.SPHERE_HIGH;
                    break;
                case "medium":
                    cacheKey = this.GEOMETRY_CACHE_KEYS.SPHERE_MEDIUM;
                    break;
                case "low":
                    cacheKey = this.GEOMETRY_CACHE_KEYS.SPHERE_LOW;
                    break;
                case "very_low":
                    cacheKey = this.GEOMETRY_CACHE_KEYS.SPHERE_VERY_LOW;
                    break;
            }
        }

        const geometry = this.geometryCache.get(cacheKey);
        if (!geometry) {
            console.warn(`Geometry not found in cache: ${cacheKey}`);
            return new THREE.SphereGeometry(1, 16, 16); // Fallback
        }

        return geometry;
    }

    /**
     * Create LOD object for a celestial body
     */
    createLODObject(
        data: CelestialBodyData,
        materials: {
            high: THREE.Material;
            medium: THREE.Material;
            low: THREE.Material;
        },
    ): THREE.LOD {
        const lod = new THREE.LOD();

        // High detail mesh (closest)
        const highDetailGeometry = this.getCachedGeometry(data, "high");
        const highDetailMesh = new THREE.Mesh(
            highDetailGeometry,
            materials.high,
        );
        highDetailMesh.castShadow = false;
        highDetailMesh.receiveShadow = false;
        lod.addLevel(highDetailMesh, 0);

        // Medium detail mesh
        const mediumDetailGeometry = this.getCachedGeometry(data, "medium");
        const mediumDetailMesh = new THREE.Mesh(
            mediumDetailGeometry,
            materials.medium,
        );
        mediumDetailMesh.castShadow = false;
        mediumDetailMesh.receiveShadow = false;
        lod.addLevel(mediumDetailMesh, this.LOD_DISTANCES.HIGH);

        // Low detail mesh (farthest)
        const lowDetailGeometry = this.getCachedGeometry(data, "low");
        const lowDetailMesh = new THREE.Mesh(lowDetailGeometry, materials.low);
        lowDetailMesh.castShadow = false;
        lowDetailMesh.receiveShadow = false;
        lod.addLevel(lowDetailMesh, this.LOD_DISTANCES.MEDIUM);

        // Very low detail for very distant objects
        const veryLowDetailGeometry = this.getCachedGeometry(data, "very_low");
        const veryLowDetailMesh = new THREE.Mesh(
            veryLowDetailGeometry,
            materials.low,
        );
        veryLowDetailMesh.castShadow = false;
        veryLowDetailMesh.receiveShadow = false;
        lod.addLevel(veryLowDetailMesh, this.LOD_DISTANCES.LOW);

        // Set position and scale
        lod.position.copy(data.position);
        lod.scale.setScalar(data.scale);
        lod.userData = { celestialBodyData: data };
        lod.name = data.id;

        this.lodLevels.set(data.id, lod);
        return lod;
    }

    /**
     * Update LOD levels based on camera position
     */
    updateLOD(): void {
        this.lodLevels.forEach((lod) => {
            lod.update(this.camera);
        });
    }

    /**
     * Preload and cache textures with compression
     */
    async preloadTexture(url: string): Promise<THREE.Texture> {
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url)!;
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();

            loader.load(
                url,
                (texture) => {
                    // Configure texture for optimal performance
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;

                    // Enable anisotropic filtering for better quality at distance
                    texture.anisotropy = Math.min(4, this.getMaxAnisotropy());

                    // Generate mipmaps for better performance at distance
                    texture.generateMipmaps = true;

                    // Cache the texture
                    this.textureCache.set(url, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load texture: ${url}`, error);
                    reject(error);
                },
            );
        });
    }

    /**
     * Get maximum anisotropy supported by the renderer
     */
    private getMaxAnisotropy(): number {
        // Get renderer from the scene (assuming it's attached)
        const renderer = this.scene.userData.renderer as THREE.WebGLRenderer;
        return renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    }

    /**
     * Create optimized material with texture caching
     */
    async createOptimizedMaterial(
        baseColor: string,
        textureUrl?: string,
        materialType: "standard" | "basic" | "emissive" = "standard",
    ): Promise<THREE.Material> {
        interface MaterialConfig {
            color: THREE.Color;
            map?: THREE.Texture;
            transparent?: boolean;
            metalness?: number;
            roughness?: number;
        }

        const materialConfig: MaterialConfig = {
            color: new THREE.Color(baseColor),
        };

        // Load texture if provided
        if (textureUrl) {
            try {
                const texture = await this.preloadTexture(textureUrl);
                materialConfig.map = texture;
            } catch {
                console.warn(
                    `Failed to load texture ${textureUrl}, using base color`,
                );
            }
        }

        // Create appropriate material type
        switch (materialType) {
            case "emissive":
                return new THREE.MeshBasicMaterial({
                    ...materialConfig,
                    transparent: false,
                });
            case "basic":
                return new THREE.MeshBasicMaterial(materialConfig);
            case "standard":
            default:
                return new THREE.MeshStandardMaterial({
                    ...materialConfig,
                    metalness: 0.1,
                    roughness: 0.8,
                });
        }
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        // Dispose geometries
        this.geometryCache.forEach((geometry) => {
            geometry.dispose();
        });
        this.geometryCache.clear();

        // Dispose textures
        this.textureCache.forEach((texture) => {
            texture.dispose();
        });
        this.textureCache.clear();

        // Clear LOD references
        this.lodLevels.clear();
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        cachedGeometries: number;
        cachedTextures: number;
        lodObjects: number;
        memoryUsage: number;
    } {
        return {
            cachedGeometries: this.geometryCache.size,
            cachedTextures: this.textureCache.size,
            lodObjects: this.lodLevels.size,
            memoryUsage: this.estimateMemoryUsage(),
        };
    }

    /**
     * Estimate memory usage of cached assets
     */
    private estimateMemoryUsage(): number {
        let memoryUsage = 0;

        // Estimate geometry memory usage
        this.geometryCache.forEach((geometry) => {
            const positionArray = geometry.getAttribute("position")
                ?.array as Float32Array;
            const normalArray = geometry.getAttribute("normal")
                ?.array as Float32Array;
            const uvArray = geometry.getAttribute("uv")?.array as Float32Array;

            if (positionArray) memoryUsage += positionArray.length * 4; // 4 bytes per float
            if (normalArray) memoryUsage += normalArray.length * 4;
            if (uvArray) memoryUsage += uvArray.length * 4;
        });

        // Estimate texture memory usage (rough approximation)
        this.textureCache.forEach((texture) => {
            if (texture.image) {
                const width = texture.image.width || 512;
                const height = texture.image.height || 512;
                memoryUsage += width * height * 4; // Assuming RGBA
            }
        });

        return memoryUsage;
    }
}
