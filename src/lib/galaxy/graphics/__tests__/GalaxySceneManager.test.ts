/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { GalaxySceneManager } from "../GalaxySceneManager";
import type { GalaxyConfig } from "../../types";

describe("GalaxySceneManager", () => {
    let scene: THREE.Scene;
    let mockConfig: Required<GalaxyConfig>;

    beforeEach(() => {
        scene = new THREE.Scene();
        mockConfig = {
            enableControls: true,
            enableAnimations: true,
            enableMobileOptimization: false,
            antialiasing: true,
            performanceMode: "medium",
            starFieldDensity: 1.0,
            backgroundStarCount: 2000,
            enableStarLabels: true,
            enableDistanceIndicators: true,
            maxRenderDistance: 50,
            enableBloom: false,
            enableStarGlow: true,
            starGlowIntensity: 1.0,
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    it("initializes with correct scene and config", () => {
        const manager = new GalaxySceneManager(scene, mockConfig);

        expect(manager).toBeDefined();
        expect((manager as any).scene).toBe(scene);
        expect((manager as any).config).toBe(mockConfig);
    });

    it("initializes scene successfully", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);

        await expect(manager.initialize()).resolves.toBeUndefined();

        // Check that lighting was set up
        expect((manager as any).ambientLight).toBeDefined();
        expect((manager as any).directionalLight).toBeDefined();

        // Check that background stars were created
        expect((manager as any).backgroundStars).toBeDefined();
        expect((manager as any).starFieldGeometry).toBeDefined();
        expect((manager as any).starFieldMaterial).toBeDefined();
    });

    it("sets up lighting correctly", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const ambientLight = (manager as any).ambientLight;
        const directionalLight = (manager as any).directionalLight;

        expect(ambientLight).toBeDefined();
        expect(ambientLight.intensity).toBe(0.6);
        expect(ambientLight.castShadow).toBe(false);

        expect(directionalLight).toBeDefined();
        expect(directionalLight.intensity).toBe(0.4);
        expect(directionalLight.castShadow).toBe(false);
        expect(directionalLight.position.x).toBe(100);
        expect(directionalLight.position.y).toBe(100);
        expect(directionalLight.position.z).toBe(50);
    });

    it("creates background stars with correct properties", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const backgroundStars = (manager as any).backgroundStars;
        const starFieldGeometry = (manager as any).starFieldGeometry;
        const starFieldMaterial = (manager as any).starFieldMaterial;

        expect(backgroundStars).toBeDefined();
        expect(backgroundStars.geometry).toBeDefined();
        expect(backgroundStars.material).toBeDefined();
        expect(starFieldGeometry).toBeDefined();
        expect(starFieldGeometry.attributes).toBeDefined();
        expect(starFieldMaterial).toBeDefined();
        expect(starFieldMaterial.size).toBe(0.8);

        // Check star count
        expect(starFieldGeometry.attributes.position.count).toBe(
            mockConfig.backgroundStarCount,
        );

        // Check material properties
        expect(starFieldMaterial.size).toBe(0.8);
        expect(starFieldMaterial.sizeAttenuation).toBe(true);
        expect(starFieldMaterial.vertexColors).toBe(true);
        expect(starFieldMaterial.transparent).toBe(true);
        expect(starFieldMaterial.opacity).toBe(0.8);
        expect(starFieldMaterial.blending).toBe(THREE.AdditiveBlending);
    });

    it("sets up scene properties correctly", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        expect(scene.background).toBeDefined();
        expect((scene.background as any).getHexString).toBeDefined();
        expect((scene.background as any).getHexString()).toBe("000011");

        expect(scene.fog).toBeDefined();
        expect((scene.fog as any).color).toBeDefined();
        expect((scene.fog as any).near).toBe(50);
        expect((scene.fog as any).far).toBe(500);
    });

    it("updates background stars rotation when animations enabled", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const backgroundStars = (manager as any).backgroundStars;
        const initialRotationY = backgroundStars.rotation.y;
        const initialRotationX = backgroundStars.rotation.x;

        // Update with delta time
        manager.update(1.0);

        expect(backgroundStars.rotation.y).toBeGreaterThan(initialRotationY);
        expect(backgroundStars.rotation.x).toBeGreaterThan(initialRotationX);
    });

    it("does not update background stars rotation when animations disabled", async () => {
        const configWithoutAnimations = {
            ...mockConfig,
            enableAnimations: false,
        };
        const manager = new GalaxySceneManager(scene, configWithoutAnimations);
        await manager.initialize();

        const backgroundStars = (manager as any).backgroundStars;
        const initialRotationY = backgroundStars.rotation.y;
        const initialRotationX = backgroundStars.rotation.x;

        // Update with delta time
        manager.update(1.0);

        expect(backgroundStars.rotation.y).toBe(initialRotationY);
        expect(backgroundStars.rotation.x).toBe(initialRotationX);
    });

    it("updates lighting based on camera position", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const directionalLight = (manager as any).directionalLight;
        const cameraPosition = new THREE.Vector3(10, 20, 30);

        manager.updateLighting(cameraPosition);

        // The directional light should be positioned relative to camera
        const expectedPosition = cameraPosition
            .clone()
            .normalize()
            .multiplyScalar(100);
        expect(directionalLight.position.x).toBeCloseTo(expectedPosition.x);
        expect(directionalLight.position.y).toBeCloseTo(expectedPosition.y);
        expect(directionalLight.position.z).toBeCloseTo(expectedPosition.z);
    });

    it("handles zero camera position gracefully", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const directionalLight = (manager as any).directionalLight;
        const cameraPosition = new THREE.Vector3(0, 0, 0);

        manager.updateLighting(cameraPosition);

        // Should handle zero vector without error - zero vector normalized is still zero
        expect(directionalLight.position.length()).toBe(0);
    });

    it("disposes resources correctly", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const backgroundStars = (manager as any).backgroundStars;
        const starFieldGeometry = (manager as any).starFieldGeometry;
        const starFieldMaterial = (manager as any).starFieldMaterial;
        const ambientLight = (manager as any).ambientLight;
        const directionalLight = (manager as any).directionalLight;

        // Spy on dispose methods
        const geometryDisposeSpy = vi.spyOn(starFieldGeometry, "dispose");
        const materialDisposeSpy = vi.spyOn(starFieldMaterial, "dispose");

        manager.dispose();

        // Check that geometry and material were disposed
        expect(geometryDisposeSpy).toHaveBeenCalled();
        expect(materialDisposeSpy).toHaveBeenCalled();

        // Check that geometry and material dispose methods were called
        expect((backgroundStars as any).geometry.dispose).toHaveBeenCalled();
        expect((backgroundStars as any).material.dispose).toHaveBeenCalled();

        // Check that objects were removed from scene
        expect(scene.children).not.toContain(backgroundStars);
        expect(scene.children).not.toContain(ambientLight);
        expect(scene.children).not.toContain(directionalLight);
    });

    it("gets correct scene statistics", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const stats = manager.getStats();

        expect(stats).toEqual({
            starCount: mockConfig.backgroundStarCount,
            lightCount: 2, // ambient + directional
        });
    });

    it("handles different background star counts", async () => {
        const customConfig = { ...mockConfig, backgroundStarCount: 100 };
        const manager = new GalaxySceneManager(scene, customConfig);
        await manager.initialize();

        const starFieldGeometry = (manager as any).starFieldGeometry;
        expect(starFieldGeometry).toBeDefined();
        expect(starFieldGeometry.attributes.position.count).toBe(100);
    });

    it("creates stars with varied colors and sizes", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const starFieldGeometry = (manager as any).starFieldGeometry;

        // Check that position, color, and size attributes exist
        expect(starFieldGeometry.attributes.position).toBeDefined();
        expect(starFieldGeometry.attributes.color).toBeDefined();
        expect(starFieldGeometry.attributes.size).toBeDefined();

        // Check that arrays have the correct length
        const starCount = mockConfig.backgroundStarCount;
        expect(starFieldGeometry.attributes.position.array.length).toBe(
            starCount * 3,
        ); // x, y, z
        expect(starFieldGeometry.attributes.color.array.length).toBe(
            starCount * 3,
        ); // r, g, b
        expect(starFieldGeometry.attributes.size.array.length).toBe(starCount); // size
    });

    it("positions stars in a spherical distribution", async () => {
        const manager = new GalaxySceneManager(scene, mockConfig);
        await manager.initialize();

        const starFieldGeometry = (manager as any).starFieldGeometry;
        const positions = starFieldGeometry.attributes.position.array;

        // Check that stars are positioned within expected radius range
        for (let i = 0; i < mockConfig.backgroundStarCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            const distance = Math.sqrt(x * x + y * y + z * z);
            expect(distance).toBeGreaterThanOrEqual(100); // Min radius
            expect(distance).toBeLessThanOrEqual(500); // Max radius
        }
    });
});
