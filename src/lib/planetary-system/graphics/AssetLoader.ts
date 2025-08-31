import * as THREE from "three";
import type { CelestialBodyData } from "../../../types/game";

interface AssetLoadingProgress {
    loaded: number;
    total: number;
    progress: number;
    currentItem?: string;
}

interface PreloadedAssets {
    textures: Map<string, THREE.Texture>;
    materials: Map<string, THREE.Material>;
    geometries: Map<string, THREE.BufferGeometry>;
}

/**
 * Asset loading and caching system for optimized performance
 * Handles preloading, lazy loading, and asset management
 */
export class AssetLoader {
    private loadingManager!: THREE.LoadingManager;
    private textureLoader!: THREE.TextureLoader;
    private preloadedAssets: PreloadedAssets;
    private loadingPromises = new Map<
        string,
        Promise<THREE.Texture | THREE.Material | THREE.BufferGeometry>
    >();
    private compressionSupport = {
        s3tc: false,
        pvrtc: false,
        etc1: false,
        etc2: false,
        astc: false,
    };

    constructor(
        private onProgress?: (progress: AssetLoadingProgress) => void,
        private onLoad?: () => void,
        private onError?: (error: Error) => void,
    ) {
        this.preloadedAssets = {
            textures: new Map(),
            materials: new Map(),
            geometries: new Map(),
        };

        this.setupLoadingManager();
        this.detectCompressionSupport();
    }

    /**
     * Setup Three.js loading manager with progress tracking
     */
    private setupLoadingManager(): void {
        this.loadingManager = new THREE.LoadingManager(
            // onLoad
            () => {
                this.onLoad?.();
            },
            // onProgress
            (url, itemsLoaded, itemsTotal) => {
                const progress = itemsTotal > 0 ? itemsLoaded / itemsTotal : 0;
                this.onProgress?.({
                    loaded: itemsLoaded,
                    total: itemsTotal,
                    progress,
                    currentItem: url,
                });
            },
            // onError
            (url) => {
                const error = new Error(`Failed to load asset: ${url}`);
                this.onError?.(error);
            },
        );

        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    }

    /**
     * Detect supported texture compression formats
     */
    private detectCompressionSupport(): void {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;

        if (!gl) return;

        // Check for S3TC (DXT) compression
        this.compressionSupport.s3tc = !!(
            gl.getExtension("WEBGL_compressed_texture_s3tc") ||
            gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
            gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
        );

        // Check for PVRTC compression (iOS)
        this.compressionSupport.pvrtc = !!gl.getExtension(
            "WEBGL_compressed_texture_pvrtc",
        );

        // Check for ETC1 compression (Android)
        this.compressionSupport.etc1 = !!gl.getExtension(
            "WEBGL_compressed_texture_etc1",
        );

        // Check for ETC2 compression
        this.compressionSupport.etc2 = !!gl.getExtension(
            "WEBGL_compressed_texture_etc",
        );

        // Check for ASTC compression
        this.compressionSupport.astc = !!gl.getExtension(
            "WEBGL_compressed_texture_astc",
        );
    }

    /**
     * Get the best texture format based on device capabilities
     */
    private getBestTextureFormat(baseName: string): string {
        // Priority order: ASTC > ETC2 > S3TC > PVRTC > ETC1 > fallback
        if (this.compressionSupport.astc) {
            return `${baseName}.astc`;
        } else if (this.compressionSupport.etc2) {
            return `${baseName}.etc2`;
        } else if (this.compressionSupport.s3tc) {
            return `${baseName}.dds`;
        } else if (this.compressionSupport.pvrtc) {
            return `${baseName}.pvr`;
        } else if (this.compressionSupport.etc1) {
            return `${baseName}.etc1`;
        }

        // Fallback to standard formats
        return `${baseName}.webp`;
    }

    /**
     * Preload all assets for celestial bodies
     */
    async preloadCelestialBodyAssets(
        celestialBodies: CelestialBodyData[],
    ): Promise<void> {
        const preloadPromises: Promise<void>[] = [];

        // Extract all unique texture URLs
        const textureUrls = new Set<string>();

        celestialBodies.forEach((body) => {
            if (body.material.texture) {
                textureUrls.add(body.material.texture);
            }
            if (body.material.normalMap) {
                textureUrls.add(body.material.normalMap);
            }
            if (body.material.roughnessMap) {
                textureUrls.add(body.material.roughnessMap);
            }
            if (body.material.emissiveMap) {
                textureUrls.add(body.material.emissiveMap);
            }
        });

        // Preload all textures
        textureUrls.forEach((url) => {
            preloadPromises.push(this.preloadTexture(url).then(() => {}));
        });

        // Wait for all assets to load
        await Promise.allSettled(preloadPromises);
    }

    /**
     * Preload a single texture with optimization
     */
    async preloadTexture(url: string): Promise<THREE.Texture> {
        // Check if already loading or loaded
        if (this.preloadedAssets.textures.has(url)) {
            return this.preloadedAssets.textures.get(url)!;
        }

        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url)!;
        }

        // Create loading promise
        const loadingPromise = new Promise<THREE.Texture>((resolve, reject) => {
            // Try to get the best format for this texture
            const optimizedUrl = this.getBestTextureFormat(
                url.replace(/\.[^/.]+$/, ""),
            );

            this.textureLoader.load(
                optimizedUrl,
                (texture) => {
                    // Configure texture for optimal performance
                    this.optimizeTexture(texture);
                    this.preloadedAssets.textures.set(url, texture);
                    this.loadingPromises.delete(url);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    // Fallback to original URL if optimized version fails
                    if (optimizedUrl !== url) {
                        this.textureLoader.load(
                            url,
                            (texture) => {
                                this.optimizeTexture(texture);
                                this.preloadedAssets.textures.set(url, texture);
                                this.loadingPromises.delete(url);
                                resolve(texture);
                            },
                            undefined,
                            () => {
                                this.loadingPromises.delete(url);
                                reject(
                                    new Error(`Failed to load texture: ${url}`),
                                );
                            },
                        );
                    } else {
                        this.loadingPromises.delete(url);
                        reject(error);
                    }
                },
            );
        });

        this.loadingPromises.set(url, loadingPromise);
        return loadingPromise;
    }

    /**
     * Optimize texture settings for performance
     */
    private optimizeTexture(texture: THREE.Texture): void {
        // Set optimal wrapping
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        // Set optimal filtering
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Enable anisotropic filtering (limited)
        texture.anisotropy = Math.min(4, this.getMaxAnisotropy());

        // Enable mipmaps for better performance at distance
        texture.generateMipmaps = true;

        // Set color space
        texture.colorSpace = THREE.SRGBColorSpace;

        // Flip Y for standard textures
        texture.flipY = false;
    }

    /**
     * Get maximum anisotropy from WebGL context
     */
    private getMaxAnisotropy(): number {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;

        if (!gl) return 1;

        const extension =
            gl.getExtension("EXT_texture_filter_anisotropic") ||
            gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
            gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

        return extension
            ? gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
            : 1;
    }

    /**
     * Get preloaded texture or load it lazily
     */
    async getTexture(url: string): Promise<THREE.Texture | null> {
        // Check if already preloaded
        if (this.preloadedAssets.textures.has(url)) {
            return this.preloadedAssets.textures.get(url)!;
        }

        // Load lazily if not preloaded
        try {
            return await this.preloadTexture(url);
        } catch (error) {
            console.warn(`Failed to load texture: ${url}`, error);
            return null;
        }
    }

    /**
     * Create and cache optimized material
     */
    async createOptimizedMaterial(
        id: string,
        config: {
            baseColor: string;
            textureUrl?: string;
            normalMapUrl?: string;
            roughnessMapUrl?: string;
            emissiveMapUrl?: string;
            emissiveColor?: string;
            metalness?: number;
            roughness?: number;
            materialType?: "standard" | "basic" | "emissive";
        },
    ): Promise<THREE.Material> {
        // Check if already cached
        if (this.preloadedAssets.materials.has(id)) {
            return this.preloadedAssets.materials.get(id)!;
        }

        const materialConfig: Record<string, unknown> = {
            color: new THREE.Color(config.baseColor),
        };

        // Load textures asynchronously
        const texturePromises: Promise<void>[] = [];

        if (config.textureUrl) {
            texturePromises.push(
                this.getTexture(config.textureUrl).then((texture) => {
                    if (texture) materialConfig.map = texture;
                }),
            );
        }

        if (config.normalMapUrl) {
            texturePromises.push(
                this.getTexture(config.normalMapUrl).then((texture) => {
                    if (texture) materialConfig.normalMap = texture;
                }),
            );
        }

        if (config.roughnessMapUrl) {
            texturePromises.push(
                this.getTexture(config.roughnessMapUrl).then((texture) => {
                    if (texture) materialConfig.roughnessMap = texture;
                }),
            );
        }

        if (config.emissiveMapUrl) {
            texturePromises.push(
                this.getTexture(config.emissiveMapUrl).then((texture) => {
                    if (texture) materialConfig.emissiveMap = texture;
                }),
            );
        }

        // Wait for all textures to load
        await Promise.allSettled(texturePromises);

        // Add emissive properties
        if (config.emissiveColor) {
            materialConfig.emissive = new THREE.Color(config.emissiveColor);
        }

        // Create material based on type
        let material: THREE.Material;
        const materialType = config.materialType || "standard";
        switch (materialType) {
            case "emissive":
                material = new THREE.MeshBasicMaterial({
                    ...materialConfig,
                    transparent: false,
                });
                break;
            case "basic":
                material = new THREE.MeshBasicMaterial(materialConfig);
                break;
            case "standard":
            default:
                material = new THREE.MeshStandardMaterial({
                    ...materialConfig,
                    metalness: config.metalness ?? 0.1,
                    roughness: config.roughness ?? 0.8,
                });
                break;
        }

        // Cache the material
        this.preloadedAssets.materials.set(id, material);
        return material;
    }

    /**
     * Lazy load assets for a specific celestial body
     */
    async loadCelestialBodyAssets(bodyData: CelestialBodyData): Promise<{
        textures: Map<string, THREE.Texture>;
        materials: Map<string, THREE.Material>;
    }> {
        const loadedTextures = new Map<string, THREE.Texture>();
        const loadedMaterials = new Map<string, THREE.Material>();

        // Load main material
        const materialId = `${bodyData.id}_material`;
        const material = await this.createOptimizedMaterial(materialId, {
            baseColor: bodyData.material.color,
            textureUrl: bodyData.material.texture,
            normalMapUrl: bodyData.material.normalMap,
            roughnessMapUrl: bodyData.material.roughnessMap,
            emissiveMapUrl: bodyData.material.emissiveMap,
            emissiveColor: bodyData.material.emissive,
            materialType: bodyData.type === "star" ? "emissive" : "standard",
        });

        loadedMaterials.set(materialId, material);

        return {
            textures: loadedTextures,
            materials: loadedMaterials,
        };
    }

    /**
     * Get asset loading statistics
     */
    getLoadingStats(): {
        preloadedTextures: number;
        preloadedMaterials: number;
        preloadedGeometries: number;
        activePromises: number;
        compressionSupport: {
            s3tc: boolean;
            pvrtc: boolean;
            etc1: boolean;
            etc2: boolean;
            astc: boolean;
        };
    } {
        return {
            preloadedTextures: this.preloadedAssets.textures.size,
            preloadedMaterials: this.preloadedAssets.materials.size,
            preloadedGeometries: this.preloadedAssets.geometries.size,
            activePromises: this.loadingPromises.size,
            compressionSupport: { ...this.compressionSupport },
        };
    }

    /**
     * Clear all cached assets and free memory
     */
    dispose(): void {
        // Dispose textures
        this.preloadedAssets.textures.forEach((texture) => {
            texture.dispose();
        });
        this.preloadedAssets.textures.clear();

        // Dispose materials
        this.preloadedAssets.materials.forEach((material) => {
            material.dispose();
        });
        this.preloadedAssets.materials.clear();

        // Dispose geometries
        this.preloadedAssets.geometries.forEach((geometry) => {
            geometry.dispose();
        });
        this.preloadedAssets.geometries.clear();

        // Clear loading promises
        this.loadingPromises.clear();
    }

    /**
     * Estimate memory usage of cached assets
     */
    estimateMemoryUsage(): number {
        let memoryUsage = 0;

        // Estimate texture memory
        this.preloadedAssets.textures.forEach((texture) => {
            if (texture.image) {
                const width = texture.image.width || 512;
                const height = texture.image.height || 512;
                memoryUsage += width * height * 4; // RGBA bytes
            }
        });

        // Estimate geometry memory
        this.preloadedAssets.geometries.forEach((geometry) => {
            const positionArray = geometry.getAttribute("position")
                ?.array as Float32Array;
            const normalArray = geometry.getAttribute("normal")
                ?.array as Float32Array;
            const uvArray = geometry.getAttribute("uv")?.array as Float32Array;

            if (positionArray) memoryUsage += positionArray.length * 4;
            if (normalArray) memoryUsage += normalArray.length * 4;
            if (uvArray) memoryUsage += uvArray.length * 4;
        });

        return memoryUsage;
    }
}
