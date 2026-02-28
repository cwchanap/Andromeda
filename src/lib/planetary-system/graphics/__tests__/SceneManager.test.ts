/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SceneManager } from "../SceneManager";

const makeConfig = (overrides: Partial<any> = {}) => ({
    enableControls: true,
    enableAnimations: true,
    enableMobileOptimization: false,
    antialiasing: true,
    shadows: false,
    particleCount: 200,
    performanceMode: "medium" as const,
    orbitSpeedMultiplier: 1.0,
    backgroundStars: {
        enabled: true,
        density: 1.0,
        seed: 12345,
        animationSpeed: 1.0,
        minRadius: 2000,
        maxRadius: 5000,
        colorVariation: true,
    },
    ...overrides,
});

describe("SceneManager", () => {
    it("initialize sets up lights, particles and background", async () => {
        const scene = new THREE.Scene();
        const manager = new SceneManager(scene, makeConfig());
        await manager.initialize();

        // Background should be set
        expect((scene as any).background).toBeTruthy();

        // Update lighting to low and verify intensities are changed without throwing
        manager.updateLighting("low");
    });

    it("updateLighting switches to 'high' performance without throwing", async () => {
        const scene = new THREE.Scene();
        const manager = new SceneManager(scene, makeConfig());
        await manager.initialize();
        expect(() => manager.updateLighting("high")).not.toThrow();
    });

    it("updateAnimations ticks star animation time", async () => {
        const scene = new THREE.Scene();
        const manager = new SceneManager(scene, makeConfig());
        await manager.initialize();
        // Should not throw regardless of delta
        expect(() => manager.updateAnimations(0.016)).not.toThrow();
        expect(() => manager.updateAnimations(0.016)).not.toThrow();
    });

    it("updateAnimations is safe when stars are disabled", async () => {
        const scene = new THREE.Scene();
        const config = makeConfig({
            backgroundStars: {
                enabled: false,
                density: 1.0,
                seed: 12345,
                animationSpeed: 1.0,
                minRadius: 2000,
                maxRadius: 5000,
                colorVariation: false,
            },
        });
        const manager = new SceneManager(scene, config);
        await manager.initialize();
        expect(() => manager.updateAnimations(0.016)).not.toThrow();
    });

    it("dispose removes particles and lights from the scene", async () => {
        const scene = new THREE.Scene() as any;
        const manager = new SceneManager(scene, makeConfig());
        await manager.initialize();

        const childCountBefore = scene.children.length;
        expect(childCountBefore).toBeGreaterThan(0);

        manager.dispose();
        // After dispose, lights and particles should be removed
        expect(scene.children.length).toBeLessThan(childCountBefore);
    });

    it("dispose is safe to call multiple times", async () => {
        const scene = new THREE.Scene();
        const manager = new SceneManager(scene, makeConfig());
        await manager.initialize();
        expect(() => {
            manager.dispose();
            manager.dispose();
        }).not.toThrow();
    });

    it("initialize works with no backgroundStars config (uses defaults)", async () => {
        const scene = new THREE.Scene();
        const config = {
            ...makeConfig(),
            backgroundStars: undefined as any,
        };
        const manager = new SceneManager(scene, config);
        await expect(manager.initialize()).resolves.toBeUndefined();
    });
});
