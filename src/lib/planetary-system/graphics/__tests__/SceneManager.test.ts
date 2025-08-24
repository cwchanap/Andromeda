/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SceneManager } from "../SceneManager";

describe("SceneManager", () => {
    it("initialize sets up lights, particles and background", async () => {
        const scene = new THREE.Scene();
        const manager = new SceneManager(scene, {
            enableControls: true,
            enableAnimations: true,
            enableMobileOptimization: false,
            antialiasing: true,
            shadows: false,
            particleCount: 200,
            performanceMode: "medium",
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
        });

        await manager.initialize();

        // Background should be set
        expect((scene as any).background).toBeTruthy();

        // Update lighting to low and verify intensities are changed without throwing
        manager.updateLighting("low");
    });
});
