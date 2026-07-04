/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { StarSystemManager } from "../StarSystemManager";
import type { StarSystemData, GalaxyConfig } from "../../types";

// Shared fixture factories — used by every describe block so the mock
// config and star-system data are defined once instead of triplicated.
function createMockConfig(): Required<GalaxyConfig> {
    return {
        enableControls: true,
        enableAnimations: true,
        enableMobileOptimization: false,
        antialiasing: true,
        performanceMode: "medium",
        starFieldDensity: 1.0,
        backgroundStarCount: 2000,
        enableSolLabel: true,
        enableDistanceIndicators: true,
        maxRenderDistance: 50,
        enableBloom: false,
        enableStarGlow: true,
        starGlowIntensity: 1.0,
        solMarkerLabel: "SOL · YOU ARE HERE",
    };
}

function createMockStarSystemData(): StarSystemData {
    return {
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
}

describe("StarSystemManager", () => {
    let scene: THREE.Scene;
    let mockConfig: Required<GalaxyConfig>;
    let mockStarSystemData: StarSystemData;

    beforeEach(() => {
        scene = new THREE.Scene();
        mockConfig = createMockConfig();
        mockStarSystemData = createMockStarSystemData();
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

describe("StarSystemManager — Sol marker", () => {
    let scene: THREE.Scene;
    let mockConfig: Required<GalaxyConfig>;
    let mockStarSystemData: StarSystemData;

    beforeEach(() => {
        scene = new THREE.Scene();
        mockConfig = createMockConfig();
        mockStarSystemData = createMockStarSystemData();
    });

    it("adds a sol-marker group at the origin on initialize", async () => {
        const manager = new StarSystemManager(scene, { ...mockConfig });
        await manager.initialize([mockStarSystemData]);
        const marker = scene.children.find((c: any) => c.name === "sol-marker");
        expect(marker).toBeTruthy();
        expect(marker!.position.x).toBe(0);
        expect(marker!.position.y).toBe(0);
        expect(marker!.position.z).toBe(0);
        const core = (marker as any).children.find(
            (c: any) => c.name === "sol-marker-core",
        );
        expect(core).toBeTruthy();
        // Shadow flags must be disabled per project-wide convention.
        expect(core.castShadow).toBe(false);
        expect(core.receiveShadow).toBe(false);
        const ring = (marker as any).children.find(
            (c: any) => c.name === "sol-marker-ring",
        );
        expect(ring).toBeTruthy();
        expect(ring.castShadow).toBe(false);
        expect(ring.receiveShadow).toBe(false);
    });

    it("adds the localized label sprite only when enableSolLabel is true", async () => {
        const sceneOn = new THREE.Scene();
        const mgrOn = new StarSystemManager(sceneOn, {
            ...mockConfig,
            enableSolLabel: true,
        });
        await mgrOn.initialize([mockStarSystemData]);
        const on = sceneOn.children.find((c: any) => c.name === "sol-marker");
        const labelOn = (on as any).children.find(
            (c: any) => c.name === "sol-marker-label",
        );
        expect(labelOn).toBeTruthy();

        const sceneOff = new THREE.Scene();
        const mgrOff = new StarSystemManager(sceneOff, {
            ...mockConfig,
            enableSolLabel: false,
        });
        await mgrOff.initialize([mockStarSystemData]);
        const off = sceneOff.children.find((c: any) => c.name === "sol-marker");
        const labelOff = (off as any).children.find(
            (c: any) => c.name === "sol-marker-label",
        );
        expect(labelOff).toBeUndefined();
    });
});

describe("StarSystemManager — distance lines", () => {
    let scene: THREE.Scene;
    let mockConfig: Required<GalaxyConfig>;
    let mockStarSystemData: StarSystemData;

    beforeEach(() => {
        scene = new THREE.Scene();
        mockConfig = createMockConfig();
        mockStarSystemData = createMockStarSystemData();
    });

    it("creates a distance line parented into each system group when enabled", async () => {
        const manager = new StarSystemManager(scene, {
            ...mockConfig,
            enableDistanceIndicators: true,
        });
        // Three distinct systems at non-origin positions so we can assert
        // that every system gets its own line from the origin.
        const systems: StarSystemData[] = [
            {
                ...mockStarSystemData,
                id: "alpha",
                position: new THREE.Vector3(3, 0, 0),
                distanceFromEarth: 3,
            },
            {
                ...mockStarSystemData,
                id: "beta",
                position: new THREE.Vector3(0, 4, 0),
                distanceFromEarth: 4,
            },
            {
                ...mockStarSystemData,
                id: "gamma",
                position: new THREE.Vector3(0, 0, 5),
                distanceFromEarth: 5,
            },
        ];
        await manager.initialize(systems);

        // Each line is a child of its system group (not a scene child), so
        // updateVisibility culls it together with the system.
        const groups = (manager as any).starSystemGroups as Map<
            string,
            THREE.Group
        >;
        for (const s of systems) {
            const group = groups.get(s.id);
            expect(group).toBeTruthy();
            const line = group!.children.find(
                (c: any) => c.name === "sol-distance-line",
            ) as THREE.Line | undefined;
            expect(
                line,
                `system ${s.id} should have a distance line`,
            ).toBeTruthy();

            // Local-space vertices: (-position) → (0,0,0). In world space
            // (group at system.position) these map to origin → system.position.
            const attr = line!.geometry.getAttribute(
                "position",
            ) as THREE.BufferAttribute;
            expect(attr.count).toBe(2);
            const arr = attr.array as Float32Array;
            expect(arr[0]).toBe(-s.position.x);
            expect(arr[1]).toBe(-s.position.y);
            expect(arr[2]).toBe(-s.position.z);
            expect(arr[3]).toBe(0);
            expect(arr[4]).toBe(0);
            expect(arr[5]).toBe(0);
        }
    });

    it("does not create distance lines when disabled", async () => {
        const manager = new StarSystemManager(scene, {
            ...mockConfig,
            enableDistanceIndicators: false,
        });
        await manager.initialize([mockStarSystemData]);
        const group = (manager as any).starSystemGroups.get("sol");
        const line = group.children.find(
            (c: any) => c.name === "sol-distance-line",
        );
        expect(line).toBeUndefined();
    });

    it("setDistanceLinesVisible toggles visibility of every distance line", async () => {
        const manager = new StarSystemManager(scene, {
            ...mockConfig,
            enableDistanceIndicators: true,
        });
        await manager.initialize([mockStarSystemData]);
        manager.setDistanceLinesVisible(false);
        const group = (manager as any).starSystemGroups.get("sol");
        const line = group.children.find(
            (c: any) => c.name === "sol-distance-line",
        ) as THREE.Line;
        expect(line.visible).toBe(false);
        manager.setDistanceLinesVisible(true);
        expect(line.visible).toBe(true);
    });

    it("distance lines are culled when updateVisibility hides the system group", async () => {
        const manager = new StarSystemManager(scene, {
            ...mockConfig,
            enableDistanceIndicators: true,
            maxRenderDistance: 10,
        });
        const near = {
            ...mockStarSystemData,
            id: "near",
            position: new THREE.Vector3(5, 0, 0),
            distanceFromEarth: 5,
        };
        const far = {
            ...mockStarSystemData,
            id: "far",
            position: new THREE.Vector3(50, 0, 0),
            distanceFromEarth: 50,
        };
        await manager.initialize([near, far]);

        // Camera at origin: near (5ly) is within 10ly, far (50ly) is not.
        manager.updateVisibility(new THREE.Vector3(0, 0, 0));
        const groups = (manager as any).starSystemGroups as Map<
            string,
            THREE.Group
        >;
        expect(groups.get("near")!.visible).toBe(true);
        expect(groups.get("far")!.visible).toBe(false);
        // The far system's line is hidden because it is parented to the
        // (now-invisible) group — no floating line to an invisible endpoint.
        const farLine = groups
            .get("far")!
            .children.find((c: any) => c.name === "sol-distance-line");
        expect(farLine).toBeTruthy();
        // Three.js effective visibility: child hidden when ancestor is hidden.
        expect(groups.get("far")!.visible).toBe(false);
    });
});
