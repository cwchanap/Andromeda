import * as THREE from "three";

export interface TerrainConfig {
    enabled: boolean;
    type: "rocky" | "gas" | "ice" | "volcanic" | "earth-like" | "desert";
    heightScale: number; // Multiplier for terrain height variations
    resolution: "low" | "medium" | "high"; // Controls geometry detail
    features: {
        craters?: {
            enabled: boolean;
            count: number;
            minRadius: number;
            maxRadius: number;
            depth: number;
        };
        mountains?: {
            enabled: boolean;
            count: number;
            minHeight: number;
            maxHeight: number;
            smoothness: number;
        };
        valleys?: {
            enabled: boolean;
            count: number;
            depth: number;
            width: number;
        };
        continents?: {
            enabled: boolean;
            count: number;
            seaLevel: number;
        };
    };
    textures?: {
        heightMap?: string;
        colorMap?: string;
        normalMap?: string;
        roughnessMap?: string;
    };
    colors: {
        low: string; // Color for lowest elevations
        mid: string; // Color for medium elevations
        high: string; // Color for highest elevations
        peak?: string; // Color for peaks (optional)
    };
    // Noise parameters for procedural generation
    noise?: {
        seed: number;
        octaves: number;
        frequency: number;
        amplitude: number;
        persistence: number;
        lacunarity: number;
    };
}

interface TerrainFeature {
    type: "crater" | "mountain" | "valley" | "continent";
    position: THREE.Vector3;
    radius: number;
    intensity: number;
    smoothness?: number;
    seaLevel?: number;
}

/**
 * Reusable 3D terrain renderer for planets
 * Generates realistic terrain based on planet type and configuration
 */
export class TerrainRenderer {
    private static readonly RESOLUTION_SETTINGS = {
        low: { widthSegments: 32, heightSegments: 32 },
        medium: { widthSegments: 64, heightSegments: 64 },
        high: { widthSegments: 128, heightSegments: 128 },
    };

    /**
     * Creates terrain geometry for a planet
     */
    static createTerrainGeometry(
        config: TerrainConfig,
        radius: number = 1,
    ): THREE.BufferGeometry {
        const resolution = this.RESOLUTION_SETTINGS[config.resolution];
        const geometry = new THREE.SphereGeometry(
            radius,
            resolution.widthSegments,
            resolution.heightSegments,
        );

        if (!config.enabled) {
            return geometry;
        }

        // Generate terrain features
        const features = this.generateTerrainFeatures(config);

        // Apply terrain modifications to the sphere
        this.applyTerrainToGeometry(geometry, config, features, radius);

        // Compute normals for proper lighting
        geometry.computeVertexNormals();

        return geometry;
    }

    /**
     * Creates terrain material for a planet
     */
    static createTerrainMaterial(
        config: TerrainConfig,
        baseColor: string,
    ): THREE.Material {
        if (!config.enabled) {
            return new THREE.MeshStandardMaterial({
                color: baseColor,
                metalness: 0.1,
                roughness: 0.8,
            });
        }

        // Create material based on terrain type
        return this.createTypedTerrainMaterial(config, baseColor);
    }

    /**
     * Generate terrain features based on configuration
     */
    private static generateTerrainFeatures(
        config: TerrainConfig,
    ): TerrainFeature[] {
        const features: TerrainFeature[] = [];

        // Generate craters
        if (config.features.craters?.enabled) {
            const craterConfig = config.features.craters;
            for (let i = 0; i < craterConfig.count; i++) {
                features.push({
                    type: "crater",
                    position: this.randomSpherePoint(),
                    radius: THREE.MathUtils.lerp(
                        craterConfig.minRadius,
                        craterConfig.maxRadius,
                        Math.random(),
                    ),
                    intensity: craterConfig.depth,
                });
            }
        }

        // Generate mountains
        if (config.features.mountains?.enabled) {
            const mountainConfig = config.features.mountains;
            for (let i = 0; i < mountainConfig.count; i++) {
                features.push({
                    type: "mountain",
                    position: this.randomSpherePoint(),
                    radius: 0.1 + Math.random() * 0.2,
                    intensity: THREE.MathUtils.lerp(
                        mountainConfig.minHeight,
                        mountainConfig.maxHeight,
                        Math.random(),
                    ),
                    smoothness: mountainConfig.smoothness,
                });
            }
        }

        // Generate valleys
        if (config.features.valleys?.enabled) {
            const valleyConfig = config.features.valleys;
            for (let i = 0; i < valleyConfig.count; i++) {
                features.push({
                    type: "valley",
                    position: this.randomSpherePoint(),
                    radius: valleyConfig.width,
                    intensity: -valleyConfig.depth, // Negative for depression
                });
            }
        }

        // Generate continents
        if (config.features.continents?.enabled) {
            const continentConfig = config.features.continents;
            for (let i = 0; i < continentConfig.count; i++) {
                features.push({
                    type: "continent",
                    position: this.randomSpherePoint(),
                    radius: 0.3 + Math.random() * 0.4,
                    intensity: 0.05 + Math.random() * 0.1,
                    seaLevel: continentConfig.seaLevel,
                });
            }
        }

        return features;
    }

    /**
     * Apply terrain modifications to sphere geometry
     */
    private static applyTerrainToGeometry(
        geometry: THREE.BufferGeometry,
        config: TerrainConfig,
        features: TerrainFeature[],
        radius: number,
    ): void {
        const positions = geometry.getAttribute(
            "position",
        ) as THREE.BufferAttribute;
        const positionArray = positions.array as Float32Array;

        // Add procedural noise if configured
        const noiseConfig = config.noise || {
            seed: 42,
            octaves: 4,
            frequency: 2,
            amplitude: 0.1,
            persistence: 0.5,
            lacunarity: 2,
        };

        for (let i = 0; i < positionArray.length; i += 3) {
            const vertex = new THREE.Vector3(
                positionArray[i],
                positionArray[i + 1],
                positionArray[i + 2],
            );

            // Normalize to get surface point on unit sphere
            const normalized = vertex.clone().normalize();

            // Start with base radius
            let heightOffset = 0;

            // Apply procedural noise
            heightOffset +=
                this.generateNoise(normalized, noiseConfig) *
                config.heightScale;

            // Apply terrain features
            for (const feature of features) {
                const influence = this.calculateFeatureInfluence(
                    normalized,
                    feature,
                );
                if (influence > 0) {
                    heightOffset += this.applyFeatureHeight(feature, influence);
                }
            }

            // Apply the height offset
            const finalVertex = normalized.multiplyScalar(
                radius + heightOffset,
            );
            positionArray[i] = finalVertex.x;
            positionArray[i + 1] = finalVertex.y;
            positionArray[i + 2] = finalVertex.z;
        }

        positions.needsUpdate = true;
    }

    /**
     * Generate procedural noise for terrain variation
     */
    private static generateNoise(
        point: THREE.Vector3,
        config: {
            seed: number;
            octaves: number;
            frequency: number;
            amplitude: number;
            persistence: number;
            lacunarity: number;
        },
    ): number {
        let value = 0;
        let amplitude = config.amplitude;
        let frequency = config.frequency;

        for (let i = 0; i < config.octaves; i++) {
            // Simple noise function (in a real implementation, you'd use proper noise)
            const noise = this.simplexNoise(
                point.x * frequency + config.seed,
                point.y * frequency + config.seed,
                point.z * frequency + config.seed,
            );
            value += noise * amplitude;
            amplitude *= config.persistence;
            frequency *= config.lacunarity;
        }

        return value;
    }

    /**
     * Simple noise function (simplified for demonstration)
     * In production, you'd use a proper noise library like simplex-noise
     */
    private static simplexNoise(x: number, y: number, z: number): number {
        // This is a very simplified noise function
        // For production use, implement proper simplex noise or use a library
        return (
            Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) *
            Math.sin(x * 93.989 + y * 17.212 + z * 53.491) *
            Math.sin(x * 47.853 + y * 89.732 + z * 31.421) *
            0.5
        );
    }

    /**
     * Calculate how much a terrain feature influences a point
     */
    private static calculateFeatureInfluence(
        point: THREE.Vector3,
        feature: TerrainFeature,
    ): number {
        const distance = point.distanceTo(feature.position);
        if (distance > feature.radius) return 0;

        // Smooth falloff using cosine interpolation
        const t = distance / feature.radius;
        return Math.cos(t * Math.PI * 0.5);
    }

    /**
     * Apply height modification based on feature type
     */
    private static applyFeatureHeight(
        feature: TerrainFeature,
        influence: number,
    ): number {
        switch (feature.type) {
            case "crater": {
                // Craters create depressions with raised rims
                const craterProfile = Math.sin(influence * Math.PI);
                return (
                    -feature.intensity * craterProfile * 0.7 +
                    feature.intensity * Math.pow(1 - influence, 8) * 0.3
                );
            }

            case "mountain": {
                // Mountains create elevated areas
                const mountainProfile = Math.pow(
                    influence,
                    feature.smoothness || 2,
                );
                return feature.intensity * mountainProfile;
            }

            case "valley": {
                // Valleys create gentle depressions
                return feature.intensity * Math.pow(influence, 0.5);
            }

            case "continent": {
                // Continents create large elevated areas
                return feature.intensity * Math.pow(influence, 1.5);
            }

            default:
                return 0;
        }
    }

    /**
     * Create material based on terrain type
     */
    private static createTypedTerrainMaterial(
        config: TerrainConfig,
        baseColor: string,
    ): THREE.Material {
        const materialProps: THREE.MeshStandardMaterialParameters = {
            color: baseColor,
        };

        switch (config.type) {
            case "rocky":
                materialProps.metalness = 0.1;
                materialProps.roughness = 0.9;
                break;

            case "gas":
                materialProps.metalness = 0.0;
                materialProps.roughness = 0.2;
                materialProps.transparent = true;
                materialProps.opacity = 0.8;
                break;

            case "ice":
                materialProps.metalness = 0.1;
                materialProps.roughness = 0.1;
                break;

            case "volcanic":
                materialProps.metalness = 0.2;
                materialProps.roughness = 0.8;
                materialProps.emissive = new THREE.Color(0x330000);
                break;

            case "earth-like":
                materialProps.metalness = 0.0;
                materialProps.roughness = 0.6;
                break;

            case "desert":
                materialProps.metalness = 0.0;
                materialProps.roughness = 0.8;
                break;
        }

        // Load custom textures if provided
        if (config.textures) {
            const textureLoader = new THREE.TextureLoader();

            if (config.textures.colorMap) {
                materialProps.map = textureLoader.load(
                    config.textures.colorMap,
                );
            }

            if (config.textures.normalMap) {
                materialProps.normalMap = textureLoader.load(
                    config.textures.normalMap,
                );
            }

            if (config.textures.roughnessMap) {
                materialProps.roughnessMap = textureLoader.load(
                    config.textures.roughnessMap,
                );
            }
        }

        return new THREE.MeshStandardMaterial(materialProps);
    }

    /**
     * Generate random point on unit sphere surface
     */
    private static randomSpherePoint(): THREE.Vector3 {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        return new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi),
        );
    }

    /**
     * Create gradient material for elevation-based coloring
     */
    static createElevationMaterial(
        config: TerrainConfig,
    ): THREE.ShaderMaterial {
        const vertexShader = `
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 lowColor;
            uniform vec3 midColor;
            uniform vec3 highColor;
            uniform vec3 peakColor;
            uniform float minElevation;
            uniform float maxElevation;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                float elevation = length(vPosition) - 1.0; // Assuming unit sphere base
                float t = clamp((elevation - minElevation) / (maxElevation - minElevation), 0.0, 1.0);
                
                vec3 color;
                if (t < 0.33) {
                    color = mix(lowColor, midColor, t * 3.0);
                } else if (t < 0.66) {
                    color = mix(midColor, highColor, (t - 0.33) * 3.0);
                } else {
                    color = mix(highColor, peakColor, (t - 0.66) * 3.0);
                }
                
                // Basic lighting
                vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                float lightIntensity = max(dot(vNormal, lightDirection), 0.1);
                
                gl_FragColor = vec4(color * lightIntensity, 1.0);
            }
        `;

        return new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                lowColor: { value: new THREE.Color(config.colors.low) },
                midColor: { value: new THREE.Color(config.colors.mid) },
                highColor: { value: new THREE.Color(config.colors.high) },
                peakColor: {
                    value: new THREE.Color(
                        config.colors.peak || config.colors.high,
                    ),
                },
                minElevation: { value: -0.1 },
                maxElevation: { value: 0.1 },
            },
        });
    }
}
