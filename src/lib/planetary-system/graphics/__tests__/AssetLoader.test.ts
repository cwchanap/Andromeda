/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { AssetLoader } from "../AssetLoader";

describe("AssetLoader", () => {
    beforeEach(() => {
        // Reset global texture outcomes
        (globalThis as any).__threeTextureLoadOutcome = {};
    });

    it("preloadTexture loads optimized webp and caches", async () => {
        const loader = new AssetLoader();
        // Compression support in detectCompressionSupport is false in mocks,
        // so optimized format becomes .webp
        (globalThis as any).__threeTextureLoadOutcome["earth.webp"] = "ok";

        const tex1 = await loader.preloadTexture("earth.jpg");
        // Our mock returns a plain object; just assert shape
        expect((tex1 as any).dispose).toBeTypeOf("function");

        const tex2 = await loader.preloadTexture("earth.jpg");
        expect(tex2).toBe(tex1); // cached

        const stats = loader.getLoadingStats();
        expect(stats.preloadedTextures).toBe(1);
    });

    it("preloadTexture falls back to original URL when optimized fails", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome["earth.webp"] = "error";
        (globalThis as any).__threeTextureLoadOutcome["earth.jpg"] = "ok";

        const tex = await loader.preloadTexture("earth.jpg");
        expect((tex as any).dispose).toBeTypeOf("function");
    });

    it("getTexture returns null when both optimized and original fail", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome["earth.webp"] = "error";
        (globalThis as any).__threeTextureLoadOutcome["earth.jpg"] = "error";

        const tex = await loader.getTexture("earth.jpg");
        expect(tex).toBeNull();
    });

    it("createOptimizedMaterial caches and returns MeshStandardMaterial by default", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome["tex.webp"] = "ok";

        const mat1 = await loader.createOptimizedMaterial("earth_mat", {
            baseColor: "#6B93D6",
            textureUrl: "tex.png",
        });
        const mat2 = await loader.createOptimizedMaterial("earth_mat", {
            baseColor: "#6B93D6",
        });

        expect(mat2).toBe(mat1); // cached
        // Our mock returns plain object for MeshStandardMaterial, not instance checks
        expect((mat1 as any).dispose).toBeTypeOf("function");
    });

    it("createOptimizedMaterial with normalMap, roughnessMap, emissiveMap, emissiveColor, basic, and emissive types", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome = {
            "normal.webp": "ok",
            "roughness.webp": "ok",
            "emissive.webp": "ok",
        };

        const mat = await loader.createOptimizedMaterial("multi_mat", {
            baseColor: "#ffffff",
            normalMapUrl: "normal.png",
            roughnessMapUrl: "roughness.png",
            emissiveMapUrl: "emissive.png",
            emissiveColor: "#ff0000",
            metalness: 0.5,
            roughness: 0.3,
        });
        expect((mat as any).dispose).toBeTypeOf("function");

        const basicMat = await loader.createOptimizedMaterial("basic_mat", {
            baseColor: "#aaaaaa",
            materialType: "basic",
        });
        expect((basicMat as any).dispose).toBeTypeOf("function");

        const emissiveMat = await loader.createOptimizedMaterial(
            "emissive_mat",
            {
                baseColor: "#ffff00",
                materialType: "emissive",
            },
        );
        expect((emissiveMat as any).dispose).toBeTypeOf("function");
    });

    it("loadCelestialBodyAssets returns materials map for planet and star", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome = {};

        const planetData = {
            id: "mars",
            name: "Mars",
            type: "planet" as const,
            description: "",
            keyFacts: {
                diameter: "",
                distanceFromSun: "",
                orbitalPeriod: "",
                composition: [],
                temperature: "",
                moons: 0,
            },
            images: [],
            position: new THREE.Vector3(0, 0, 0),
            scale: 1,
            material: { color: "#ff4500" },
        };
        const result = await loader.loadCelestialBodyAssets(planetData);
        expect(result.materials.has("mars_material")).toBe(true);

        const starData = { ...planetData, id: "sol", type: "star" as const };
        const starResult = await loader.loadCelestialBodyAssets(starData);
        expect(starResult.materials.has("sol_material")).toBe(true);
    });

    it("dispose clears all preloaded assets", async () => {
        const loader = new AssetLoader();
        (globalThis as any).__threeTextureLoadOutcome["tex.webp"] = "ok";

        await loader.preloadTexture("tex.png");
        expect(loader.getLoadingStats().preloadedTextures).toBe(1);

        loader.dispose();
        expect(loader.getLoadingStats().preloadedTextures).toBe(0);
        expect(loader.getLoadingStats().preloadedMaterials).toBe(0);
    });

    it("estimateMemoryUsage returns a number", async () => {
        const loader = new AssetLoader();
        const usage = loader.estimateMemoryUsage();
        expect(typeof usage).toBe("number");
        expect(usage).toBeGreaterThanOrEqual(0);
    });
});
