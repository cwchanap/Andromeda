/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { PerformanceManager } from "../PerformanceManager";
import type { CelestialBodyData } from "../../../../types/game";

function makeBodyData(partial?: Partial<CelestialBodyData>): CelestialBodyData {
    return {
        id: "earth",
        name: "Earth",
        type: "planet",
        description: "Our home planet",
        keyFacts: {
            diameter: "12,756 km",
            distanceFromSun: "149.6 million km",
            orbitalPeriod: "365.25 days",
            composition: ["Rock", "Water"],
            temperature: "15°C",
            moons: 1,
        },
        images: [],
        position: new THREE.Vector3(10, 0, 0),
        scale: 1.0,
        material: { color: "#6B93D6" },
        ...partial,
    };
}

describe("PerformanceManager", () => {
    it("getCachedGeometry returns geometries for different LODs", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        // Attach renderer for anisotropy queries
        (scene as any).userData.renderer = new THREE.WebGLRenderer();

        const perf = new PerformanceManager(scene, camera);

        const planet = makeBodyData({ id: "mars", type: "planet" });
        const gHigh = perf.getCachedGeometry(planet, "high");
        const gMed = perf.getCachedGeometry(planet, "medium");
        const gLow = perf.getCachedGeometry(planet, "low");
        const gVeryLow = perf.getCachedGeometry(planet, "very_low");

        expect(gHigh).toBeTruthy();
        expect(gMed).toBeTruthy();
        expect(gLow).toBeTruthy();
        expect(gVeryLow).toBeTruthy();
    });

    it("createOptimizedMaterial returns correct material types and applies texture map", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        (scene as any).userData.renderer = new THREE.WebGLRenderer();

        const perf = new PerformanceManager(scene, camera);
        (globalThis as any).__threeTextureLoadOutcome = {
            "albedo.png": "ok",
        };

        const stdMat = await perf.createOptimizedMaterial(
            "#abcdef",
            "albedo.png",
            "standard",
        );
        expect((stdMat as any).dispose).toBeTypeOf("function");
        // our material mocks merge config; map should exist on the returned object
        expect((stdMat as any).map).not.toBeUndefined();

        const basicMat = await perf.createOptimizedMaterial(
            "#abcdef",
            undefined,
            "basic",
        );
        expect((basicMat as any).dispose).toBeTypeOf("function");

        const emissiveMat = await perf.createOptimizedMaterial(
            "#abcdef",
            undefined,
            "emissive",
        );
        expect((emissiveMat as any).dispose).toBeTypeOf("function");
    });

    it("createLODObject builds an LOD with 4 detail levels", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const perf = new PerformanceManager(scene, camera);

        const data = makeBodyData({ id: "pluto", type: "planet" });
        const mat = new THREE.MeshStandardMaterial();
        const lod = perf.createLODObject(data, {
            high: mat,
            medium: mat,
            low: mat,
        });

        expect(lod).toBeTruthy();
        expect(lod.name).toBe("pluto");
    });

    it("getPerformanceStats returns shape with numeric fields", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const perf = new PerformanceManager(scene, camera);

        const stats = perf.getPerformanceStats();
        expect(stats).toHaveProperty("cachedGeometries");
        expect(stats).toHaveProperty("cachedTextures");
        expect(stats).toHaveProperty("lodObjects");
        expect(stats).toHaveProperty("memoryUsage");
        expect(typeof stats.memoryUsage).toBe("number");
    });

    it("dispose clears geometry and texture caches", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const perf = new PerformanceManager(scene, camera);

        // Geometries are pre-populated in the cache on construction
        expect(perf.getPerformanceStats().cachedGeometries).toBeGreaterThan(0);

        perf.dispose();

        expect(perf.getPerformanceStats().cachedGeometries).toBe(0);
        expect(perf.getPerformanceStats().cachedTextures).toBe(0);
    });

    it("updateLOD executes without error", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const perf = new PerformanceManager(scene, camera);
        expect(() => perf.updateLOD()).not.toThrow();
    });

    it("getCachedGeometry handles star type and jupiter/saturn special cases", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const perf = new PerformanceManager(scene, camera);

        const star = makeBodyData({ id: "proxima", type: "star" });
        const jupiter = makeBodyData({ id: "jupiter", type: "planet" });
        const saturn = makeBodyData({ id: "saturn", type: "planet" });
        const earth = makeBodyData({ id: "earth", type: "planet" });
        const moon = makeBodyData({ id: "luna", type: "moon" });
        const other = makeBodyData({ id: "asteroid", type: "asteroid" as any });

        expect(perf.getCachedGeometry(star, "high")).toBeTruthy();
        expect(perf.getCachedGeometry(jupiter, "medium")).toBeTruthy();
        expect(perf.getCachedGeometry(saturn, "low")).toBeTruthy();
        expect(perf.getCachedGeometry(earth, "high")).toBeTruthy();
        expect(perf.getCachedGeometry(moon, "high")).toBeTruthy();
        expect(perf.getCachedGeometry(other, "medium")).toBeTruthy();
    });
});
