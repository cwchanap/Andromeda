import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { TerrainRenderer } from "../TerrainRenderer";
import type { TerrainConfig } from "../TerrainRenderer";

describe("TerrainRenderer", () => {
    it("should create basic sphere geometry when terrain is disabled", () => {
        const config: TerrainConfig = {
            enabled: false,
            type: "rocky",
            heightScale: 0.01,
            resolution: "medium",
            features: {
                craters: {
                    enabled: false,
                    count: 0,
                    minRadius: 0,
                    maxRadius: 0,
                    depth: 0,
                },
                mountains: {
                    enabled: false,
                    count: 0,
                    minHeight: 0,
                    maxHeight: 0,
                    smoothness: 1,
                },
                valleys: {
                    enabled: false,
                    count: 0,
                    depth: 0,
                    width: 0,
                },
                continents: {
                    enabled: false,
                    count: 0,
                    seaLevel: 0,
                },
            },
            colors: {
                low: "#000000",
                mid: "#888888",
                high: "#FFFFFF",
            },
        };

        const geometry = TerrainRenderer.createTerrainGeometry(config, 1);
        expect(geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    it("should create terrain geometry when enabled", () => {
        const config: TerrainConfig = {
            enabled: true,
            type: "rocky",
            heightScale: 0.02,
            resolution: "medium",
            features: {
                craters: {
                    enabled: true,
                    count: 5,
                    minRadius: 0.05,
                    maxRadius: 0.15,
                    depth: 0.02,
                },
                mountains: {
                    enabled: true,
                    count: 3,
                    minHeight: 0.03,
                    maxHeight: 0.08,
                    smoothness: 2,
                },
                valleys: {
                    enabled: false,
                    count: 0,
                    depth: 0,
                    width: 0,
                },
                continents: {
                    enabled: false,
                    count: 0,
                    seaLevel: 0,
                },
            },
            colors: {
                low: "#654321",
                mid: "#8B7355",
                high: "#A0906C",
            },
            noise: {
                seed: 42,
                octaves: 3,
                frequency: 2,
                amplitude: 0.01,
                persistence: 0.5,
                lacunarity: 2,
            },
        };

        const geometry = TerrainRenderer.createTerrainGeometry(config, 1);
        expect(geometry).toBeInstanceOf(THREE.BufferGeometry);

        // Check that geometry has been modified (should have position attributes)
        const positions = geometry.getAttribute("position");
        expect(positions).toBeDefined();
        expect(positions.count).toBeGreaterThan(0);
    });

    it("should create terrain material for rocky terrain", () => {
        const config: TerrainConfig = {
            enabled: true,
            type: "rocky",
            heightScale: 0.02,
            resolution: "medium",
            features: {
                craters: {
                    enabled: false,
                    count: 0,
                    minRadius: 0,
                    maxRadius: 0,
                    depth: 0,
                },
                mountains: {
                    enabled: false,
                    count: 0,
                    minHeight: 0,
                    maxHeight: 0,
                    smoothness: 1,
                },
                valleys: { enabled: false, count: 0, depth: 0, width: 0 },
                continents: { enabled: false, count: 0, seaLevel: 0 },
            },
            colors: {
                low: "#654321",
                mid: "#8B7355",
                high: "#A0906C",
            },
        };

        const material = TerrainRenderer.createTerrainMaterial(
            config,
            "#888888",
        );
        expect(material).toBeInstanceOf(THREE.Material);
        expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);

        const standardMaterial = material as THREE.MeshStandardMaterial;
        expect(standardMaterial.roughness).toBe(0.9);
        expect(standardMaterial.metalness).toBe(0.1);
    });

    it("should create different materials for different terrain types", () => {
        const baseConfig: TerrainConfig = {
            enabled: true,
            type: "rocky",
            heightScale: 0.02,
            resolution: "medium",
            features: {
                craters: {
                    enabled: false,
                    count: 0,
                    minRadius: 0,
                    maxRadius: 0,
                    depth: 0,
                },
                mountains: {
                    enabled: false,
                    count: 0,
                    minHeight: 0,
                    maxHeight: 0,
                    smoothness: 1,
                },
                valleys: { enabled: false, count: 0, depth: 0, width: 0 },
                continents: { enabled: false, count: 0, seaLevel: 0 },
            },
            colors: {
                low: "#654321",
                mid: "#8B7355",
                high: "#A0906C",
            },
        };

        const rockyMaterial = TerrainRenderer.createTerrainMaterial(
            { ...baseConfig, type: "rocky" },
            "#888888",
        ) as THREE.MeshStandardMaterial;

        const iceMaterial = TerrainRenderer.createTerrainMaterial(
            { ...baseConfig, type: "ice" },
            "#CCFFFF",
        ) as THREE.MeshStandardMaterial;

        const volcanicMaterial = TerrainRenderer.createTerrainMaterial(
            { ...baseConfig, type: "volcanic" },
            "#FF4500",
        ) as THREE.MeshStandardMaterial;

        // Different terrain types should have different material properties
        expect(rockyMaterial.roughness).toBe(0.9);
        expect(iceMaterial.roughness).toBe(0.1);
        expect(volcanicMaterial.roughness).toBe(0.8);

        expect(rockyMaterial.metalness).toBe(0.1);
        expect(iceMaterial.metalness).toBe(0.1);
        expect(volcanicMaterial.metalness).toBe(0.2);

        // Volcanic material should have emissive property
        expect(volcanicMaterial.emissive).toBeDefined();
        expect(volcanicMaterial.emissive.getHex()).toBeGreaterThan(0);
    });

    it("should create elevation-based shader material", () => {
        const config: TerrainConfig = {
            enabled: true,
            type: "earth-like",
            heightScale: 0.03,
            resolution: "high",
            features: {
                craters: {
                    enabled: false,
                    count: 0,
                    minRadius: 0,
                    maxRadius: 0,
                    depth: 0,
                },
                mountains: {
                    enabled: false,
                    count: 0,
                    minHeight: 0,
                    maxHeight: 0,
                    smoothness: 1,
                },
                valleys: { enabled: false, count: 0, depth: 0, width: 0 },
                continents: { enabled: false, count: 0, seaLevel: 0 },
            },
            colors: {
                low: "#1B4D72",
                mid: "#228B22",
                high: "#8B4513",
                peak: "#FFFFFF",
            },
        };

        const shaderMaterial = TerrainRenderer.createElevationMaterial(config);
        expect(shaderMaterial).toBeInstanceOf(THREE.ShaderMaterial);

        // Check that uniforms are properly set
        expect(shaderMaterial.uniforms.lowColor).toBeDefined();
        expect(shaderMaterial.uniforms.midColor).toBeDefined();
        expect(shaderMaterial.uniforms.highColor).toBeDefined();
        expect(shaderMaterial.uniforms.peakColor).toBeDefined();

        expect(shaderMaterial.uniforms.lowColor.value.getHexString()).toBe(
            "1b4d72",
        );
        expect(shaderMaterial.uniforms.midColor.value.getHexString()).toBe(
            "228b22",
        );
        expect(shaderMaterial.uniforms.highColor.value.getHexString()).toBe(
            "8b4513",
        );
        expect(shaderMaterial.uniforms.peakColor.value.getHexString()).toBe(
            "ffffff",
        );
    });
});
