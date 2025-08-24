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
});
