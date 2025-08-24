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
});
