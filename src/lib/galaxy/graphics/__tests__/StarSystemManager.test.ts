/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { StarSystemManager } from "../StarSystemManager";
import type { StarSystemData, GalaxyConfig } from "../../types";

describe("StarSystemManager", () => {
    let scene: THREE.Scene;
    let mockConfig: Required<GalaxyConfig>;
    let mockStarSystemData: StarSystemData;

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

        mockStarSystemData = {
            id: "sol",
            name: "Solar System",
            description: "Our solar system",
            systemType: "solar",
            position: new THREE.Vector3(0, 0, 0),
            distanceFromEarth: 0,
            stars: [
                {
                    id: "sun",
                    name: "Sun",
                    type: "star",
                    description: "The star at the center of our solar system",
                    keyFacts: {
                        diameter: "1,392,700 km",
                        distanceFromSun: "0 km",
                        orbitalPeriod: "N/A",
                        composition: ["Hydrogen", "Helium"],
                        temperature: "5,500°C",
                    },
                    images: ["/images/sun.jpg"],
                    scale: 1.0,
                    position: new THREE.Vector3(0, 0, 0),
                    material: {
                        color: "#FFFF00",
                        emissive: "#444400",
                    },
                },
            ],
            metadata: {
                spectralClass: "G2V",
                hasExoplanets: true,
                numberOfPlanets: 8,
                habitableZone: true,
            },
            visual: {
                brightness: 1.0,
                colorIndex: 0.65,
                scale: 1.0,
                glowIntensity: 0.5,
            },
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    it("initializes star systems successfully", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await expect(manager.initialize(starSystems)).resolves.toBeUndefined();

        // Check that star system was created
        expect((manager as any).starSystemGroups.size).toBe(1);
        expect((manager as any).starSystemGroups.has("sol")).toBe(true);
    });

    it("creates star system with correct properties", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const systemGroup = (manager as any).starSystemGroups.get("sol");
        expect(systemGroup).toBeDefined();
        expect(systemGroup.name).toBe("sol");
        expect(systemGroup.position.x).toBe(mockStarSystemData.position.x);
        expect(systemGroup.position.y).toBe(mockStarSystemData.position.y);
        expect(systemGroup.position.z).toBe(mockStarSystemData.position.z);
    });

    it("creates star with correct geometry and material", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = (manager as any).starMeshes.get("sun");
        expect(starMesh).toBeDefined();
        expect(starMesh.name).toBe("sun");
        expect(starMesh.castShadow).toBe(false);
        expect(starMesh.receiveShadow).toBe(false);
        expect(starMesh.geometry).toBeDefined();
        expect(starMesh.material).toBeDefined();
    });

    it("creates star material with correct properties", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMaterial = (manager as any).starMaterials.get("sun");
        expect(starMaterial).toBeDefined();
        expect(starMaterial.color.getHexString().toUpperCase()).toBe("FFFF00");
        expect(starMaterial.emissive.getHexString().toUpperCase()).toBe(
            "444400",
        );
        expect(starMaterial.emissiveIntensity).toBe(0.3);
        expect(starMaterial.roughness).toBe(1.0);
        expect(starMaterial.metalness).toBe(0.0);
        expect(starMaterial.fog).toBe(true);
    });

    it("creates glow effect when enabled", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const glowMesh = (manager as any).glowMeshes.get("sun");
        expect(glowMesh).toBeDefined();
        expect(glowMesh.castShadow).toBe(false);
        expect(glowMesh.receiveShadow).toBe(false);
        expect(glowMesh.geometry).toBeDefined();
        expect(glowMesh.material).toBeDefined();
    });

    it("does not create glow effect when disabled", async () => {
        const configWithoutGlow = { ...mockConfig, enableStarGlow: false };
        const manager = new StarSystemManager(scene, configWithoutGlow);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const glowMesh = (manager as any).glowMeshes.get("sun");
        expect(glowMesh).toBeUndefined();
    });

    it("creates glow shader material with correct uniforms", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const glowMaterial = (manager as any).glowMaterials.get("sun");
        expect(glowMaterial).toBeDefined();
        expect(glowMaterial.uniforms.c).toBeDefined();
        expect(glowMaterial.uniforms.p).toBeDefined();
        expect(glowMaterial.uniforms.glowColor).toBeDefined();
        expect(glowMaterial.uniforms.viewVector).toBeDefined();
        expect(glowMaterial.side).toBe(THREE.BackSide);
        expect(glowMaterial.blending).toBe(THREE.AdditiveBlending);
        expect(glowMaterial.transparent).toBe(true);
        expect(glowMaterial.depthWrite).toBe(false);
    });

    it("gets star system by ID", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const systemGroup = manager.getStarSystem("sol");
        expect(systemGroup).toBeDefined();

        const nonExistentSystem = manager.getStarSystem("nonexistent");
        expect(nonExistentSystem).toBeUndefined();
    });

    it("gets star mesh by ID", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = manager.getStarMesh("sun");
        expect(starMesh).toBeDefined();

        const nonExistentMesh = manager.getStarMesh("nonexistent");
        expect(nonExistentMesh).toBeUndefined();
    });

    it("highlights star system correctly", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMaterial = (manager as any).starMaterials.get("sun");

        // Highlight the system
        manager.highlightStarSystem("sol", true);
        expect(starMaterial.emissiveIntensity).toBe(0.6);

        // Remove highlight
        manager.highlightStarSystem("sol", false);
        expect(starMaterial.emissiveIntensity).toBe(0.3);
    });

    it("handles highlighting non-existent system gracefully", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        // Should not throw error
        expect(() => {
            manager.highlightStarSystem("nonexistent", true);
        }).not.toThrow();
    });

    it("updates visibility based on camera distance", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const systemGroup = (manager as any).starSystemGroups.get("sol");

        // Camera within range
        const closeCameraPosition = new THREE.Vector3(10, 10, 10);
        manager.updateVisibility(closeCameraPosition);
        expect(systemGroup.visible).toBe(true);

        // Camera beyond range
        const farCameraPosition = new THREE.Vector3(100, 100, 100);
        manager.updateVisibility(farCameraPosition);
        expect(systemGroup.visible).toBe(false);
    });

    it("updates animations when enabled", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = (manager as any).starMeshes.get("sun");
        const initialRotation = starMesh.rotation.y;

        const cameraPosition = new THREE.Vector3(10, 10, 10);
        manager.update(1.0, cameraPosition);

        expect(starMesh.rotation.y).toBeGreaterThan(initialRotation);
    });

    it("does not update animations when disabled", async () => {
        const configWithoutAnimations = {
            ...mockConfig,
            enableAnimations: false,
        };
        const manager = new StarSystemManager(scene, configWithoutAnimations);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = (manager as any).starMeshes.get("sun");
        const initialRotation = starMesh.rotation.y;

        const cameraPosition = new THREE.Vector3(10, 10, 10);
        manager.update(1.0, cameraPosition);

        expect(starMesh.rotation.y).toBe(initialRotation);
    });

    it("updates glow shader uniforms", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const glowMaterial = (manager as any).glowMaterials.get("sun");
        const cameraPosition = new THREE.Vector3(10, 10, 10);

        manager.update(1.0, cameraPosition);

        const expectedVector = cameraPosition.clone().normalize();
        expect(glowMaterial.uniforms.viewVector.value.x).toBe(expectedVector.x);
        expect(glowMaterial.uniforms.viewVector.value.y).toBe(expectedVector.y);
        expect(glowMaterial.uniforms.viewVector.value.z).toBe(expectedVector.z);
    });

    it("gets all star meshes for interaction detection", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMeshes = manager.getAllStarMeshes();
        expect(starMeshes).toHaveLength(1);
        expect(starMeshes[0].name).toBe("sun");
    });

    it("gets system ID from mesh", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = (manager as any).starMeshes.get("sun");
        const systemId = manager.getSystemIdFromMesh(starMesh);

        expect(systemId).toBe("sol");
    });

    it("returns null for unknown mesh", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const unknownMesh = new THREE.Mesh();
        const systemId = manager.getSystemIdFromMesh(unknownMesh);

        expect(systemId).toBeNull();
    });

    it("gets correct rendering statistics", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const stats = manager.getStats();

        expect(stats).toEqual({
            systemCount: 1,
            starCount: 1,
            glowCount: 1,
        });
    });

    it("disposes resources correctly", async () => {
        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData];

        await manager.initialize(starSystems);

        const starMesh = (manager as any).starMeshes.get("sun");
        const glowMesh = (manager as any).glowMeshes.get("sun");
        const starMaterial = (manager as any).starMaterials.get("sun");
        const glowMaterial = (manager as any).glowMaterials.get("sun");

        // Spy on dispose methods
        const starGeometryDisposeSpy = vi.spyOn(starMesh.geometry, "dispose");
        const starMaterialDisposeSpy = vi.spyOn(starMaterial, "dispose");
        const glowGeometryDisposeSpy = vi.spyOn(glowMesh.geometry, "dispose");
        const glowMaterialDisposeSpy = vi.spyOn(glowMaterial, "dispose");

        manager.dispose();

        // Check that geometries and materials were disposed
        expect(starGeometryDisposeSpy).toHaveBeenCalled();
        expect(starMaterialDisposeSpy).toHaveBeenCalled();
        expect(glowGeometryDisposeSpy).toHaveBeenCalled();
        expect(glowMaterialDisposeSpy).toHaveBeenCalled();

        // Check that maps were cleared
        expect((manager as any).starSystemGroups.size).toBe(0);
        expect((manager as any).starMeshes.size).toBe(0);
        expect((manager as any).glowMeshes.size).toBe(0);
        expect((manager as any).starMaterials.size).toBe(0);
        expect((manager as any).glowMaterials.size).toBe(0);
    });

    it("handles multiple star systems", async () => {
        const additionalStarSystem: StarSystemData = {
            ...mockStarSystemData,
            id: "alpha-centauri",
            name: "Alpha Centauri",
            position: new THREE.Vector3(4.24, 0, 0),
            stars: [
                {
                    ...mockStarSystemData.stars[0],
                    id: "alpha-centauri-a",
                    name: "Alpha Centauri A",
                },
            ],
        };

        const manager = new StarSystemManager(scene, mockConfig);
        const starSystems = [mockStarSystemData, additionalStarSystem];

        await manager.initialize(starSystems);

        expect((manager as any).starSystemGroups.size).toBe(2);
        expect((manager as any).starMeshes.size).toBe(2);

        const stats = manager.getStats();
        expect(stats.systemCount).toBe(2);
        expect(stats.starCount).toBe(2);
    });
});
