/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { CelestialBodyManager } from "../CelestialBodyManager";
import type { CelestialBodyData } from "../../../../types/game";

// BoxGeometry is not in the setup.ts Three.js mock; add it here
(THREE as any).BoxGeometry = vi
    .fn()
    .mockImplementation(() => ({
        dispose: vi.fn(),
        getAttribute: vi.fn(() => ({ array: new Float32Array(0) })),
    }));

// Particle rings call rockMaterial.clone() — extend MeshStandardMaterial mock to support it
const _origStdMatImpl = (
    THREE as any
).MeshStandardMaterial.getMockImplementation();
(THREE as any).MeshStandardMaterial.mockImplementation((cfg?: any) => {
    const mat = _origStdMatImpl?.(cfg) ?? { dispose: vi.fn(), userData: {} };
    if (!mat.clone) {
        mat.clone = vi.fn(() => ({
            dispose: vi.fn(),
            userData: {},
            emissive: {
                setHex: vi.fn(),
                clone: vi.fn(),
                getHex: vi.fn(() => 0),
                copy: vi.fn(),
                r: 0,
                g: 0,
                b: 0,
            },
        }));
    }
    return mat;
});

// Particle rings call rock.scale.set() and rock.rotation.set() — extend Mesh mock
const _origMeshImpl = (THREE as any).Mesh.getMockImplementation();
(THREE as any).Mesh.mockImplementation((geometry?: any, material?: any) => {
    const mesh = _origMeshImpl(geometry, material);
    if (mesh.scale && !mesh.scale.set) {
        mesh.scale.set = vi.fn();
    }
    if (mesh.rotation && !mesh.rotation.set) {
        mesh.rotation.set = vi.fn();
    }
    return mesh;
});

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
        orbitRadius: 10,
        orbitSpeed: 1,
        ...partial,
    };
}

describe("CelestialBodyManager", () => {
    it("creates a moon with parentId and positions orbit line at parent", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // First create the parent planet
        const parentData = makeBodyData({
            id: "earth",
            position: new THREE.Vector3(15, 0, 0),
            orbitRadius: 15,
            orbitSpeed: 0.5,
        });
        await manager.createCelestialBody(parentData);

        // Then create the moon with parentId
        const moonData = makeBodyData({
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            position: new THREE.Vector3(15.4, 0, 0), // Earth position + moon orbit radius
            orbitRadius: 0.4,
            orbitSpeed: 0.8,
            scale: 0.27,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        expect(moonGroup).toBeTruthy();
        expect(moonGroup.name).toBe("luna");

        // Verify the moon body mesh was created
        const moonMesh = (moonGroup as any).getObjectByName?.("luna_body");
        expect(moonMesh).toBeTruthy();

        // Verify moon userData contains the data
        expect(moonGroup.userData.celestialBodyData).toBeTruthy();
        expect(moonGroup.userData.celestialBodyData.type).toBe("moon");
        expect(moonGroup.userData.celestialBodyData.parentId).toBe("earth");

        // Verify the orbit line exists by searching the scene children
        const orbitLine = scene.children.find(
            (child: any) => child.name === "luna_orbit",
        );
        expect(orbitLine).toBeTruthy();

        // Get the parent planet group
        const parentGroup = manager.getCelestialBody("earth");
        expect(parentGroup).toBeTruthy();

        // Verify the orbit line's world position matches the parent planet's world position
        const orbitWorldPosition = new THREE.Vector3();
        const parentWorldPosition = new THREE.Vector3();

        if (orbitLine && parentGroup) {
            orbitLine.getWorldPosition(orbitWorldPosition);
            parentGroup.getWorldPosition(parentWorldPosition);

            expect(orbitWorldPosition.x).toBeCloseTo(parentWorldPosition.x, 5);
            expect(orbitWorldPosition.y).toBeCloseTo(parentWorldPosition.y, 5);
            expect(orbitWorldPosition.z).toBeCloseTo(parentWorldPosition.z, 5);
        }
    });

    it("moon orbits around parent body position, not system center", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Create parent planet at position (20, 0, 0)
        const parentData = makeBodyData({
            id: "jupiter",
            position: new THREE.Vector3(20, 0, 0),
            orbitRadius: 20,
            orbitSpeed: 0.1,
        });
        const parentGroup = await manager.createCelestialBody(parentData);

        // Create moon orbiting jupiter
        const moonData = makeBodyData({
            id: "io",
            name: "Io",
            type: "moon",
            parentId: "jupiter",
            position: new THREE.Vector3(20.5, 0, 0), // Jupiter + moon orbit
            orbitRadius: 0.5,
            orbitSpeed: 1.0,
            scale: 0.29,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        // Store initial positions
        const initialMoonX = moonGroup.position.x;
        const initialParentX = parentGroup.position.x;

        // Update animations - both should move
        manager.updateAnimations(1.0, 1.0);

        // Parent should have moved from its initial position
        expect(parentGroup.position.x).not.toBe(initialParentX);

        // Moon should be orbiting around the NEW parent position, not (0,0,0)
        const parentPos = parentGroup.position;
        const moonPos = moonGroup.position;

        // Distance from moon to parent should be approximately orbitRadius
        const distanceToParent = Math.sqrt(
            Math.pow(moonPos.x - parentPos.x, 2) +
                Math.pow(moonPos.z - parentPos.z, 2),
        );

        // Allow some floating point tolerance
        expect(distanceToParent).toBeCloseTo(0.5, 1);
    });

    it("createCelestialBody builds a group with body mesh, optional rings, and orbit line", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            rings: {
                enabled: true,
                innerRadius: 2,
                outerRadius: 4,
                color: "#CCCCCC",
                opacity: 0.5,
                segments: 1,
                thetaSegments: 8,
            },
        });

        const group = await manager.createCelestialBody(data);
        expect(group).toBeTruthy();

        const bodyMesh = (group as any).getObjectByName?.(`${data.id}_body`);
        expect(bodyMesh).toBeTruthy();

        const rings = (group as any).getObjectByName?.(`${data.id}_rings`);
        expect(rings).toBeTruthy();

        const fetched = manager.getCelestialBody(data.id);
        expect(fetched).toBe(group);
    });

    it("updateAnimations applies rotation and orbits using accumulated angle", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "test-planet",
            position: new THREE.Vector3(10, 0, 0),
            orbitRadius: 10,
            orbitSpeed: 1.0,
        });

        const group = await manager.createCelestialBody(data);
        const before = { x: group.position.x, z: group.position.z };

        manager.updateAnimations(1.0, 1.0);

        expect(group.position.x).not.toBe(before.x);
        expect(group.position.z).not.toBe(before.z);
    });

    it("preloadAssets calls through without throwing", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const bodies = [makeBodyData({ id: "preload-planet" })];
        await expect(manager.preloadAssets(bodies)).resolves.toBeUndefined();
    });

    it("getAllCelestialBodies and getCelestialBodyData return correct data", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        expect(manager.getAllCelestialBodies()).toHaveLength(0);

        const data = makeBodyData({ id: "mercury" });
        await manager.createCelestialBody(data);

        expect(manager.getAllCelestialBodies()).toHaveLength(1);
        expect(manager.getCelestialBodyData("mercury")).toBe(data);
        expect(manager.getCelestialBodyData("unknown")).toBeUndefined();
    });

    it("getBodyData retrieves data from mesh, parent, _body suffix, and name fallback", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({ id: "venus" });
        const group = await manager.createCelestialBody(data);

        // Via mesh userData
        const bodyMesh = (group as any).getObjectByName("venus_body");
        expect(manager.getBodyData(bodyMesh)).toMatchObject({ id: "venus" });

        // Via _body name fallback: create a mesh with _body suffix but no userData
        const bare = new THREE.Mesh();
        bare.name = "venus_body";
        expect(manager.getBodyData(bare)).toMatchObject({ id: "venus" });

        // Via name fallback: mesh named exactly as the body id
        const namedMesh = new THREE.Mesh();
        namedMesh.name = "venus";
        expect(manager.getBodyData(namedMesh)).toMatchObject({ id: "venus" });

        // Returns null when no data found
        const unknown = new THREE.Mesh();
        unknown.name = "no-such-body";
        expect(manager.getBodyData(unknown)).toBeNull();
    });

    it("toggleOrbitLines, updateLineResolution, setOrbitLineVisibility, updateOrbitLineOpacity all execute without error", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "saturn",
            orbitRadius: 9.5,
            orbitSpeed: 0.3,
        });
        await manager.createCelestialBody(data);

        expect(() => manager.toggleOrbitLines(false)).not.toThrow();
        expect(() => manager.toggleOrbitLines(true)).not.toThrow();
        expect(() => manager.updateLineResolution(1920, 1080)).not.toThrow();
        expect(() =>
            manager.setOrbitLineVisibility("saturn", false),
        ).not.toThrow();
        expect(() =>
            manager.setOrbitLineVisibility("missing", false),
        ).not.toThrow();
        expect(() =>
            manager.updateOrbitLineOpacity(new THREE.Vector3(0, 0, 0)),
        ).not.toThrow();
        // Far camera triggers opacity ramp-down
        expect(() =>
            manager.updateOrbitLineOpacity(new THREE.Vector3(1000, 0, 0)),
        ).not.toThrow();
    });

    it("updateLOD delegates to PerformanceManager without error", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        expect(() => manager.updateLOD()).not.toThrow();
    });

    it("getPerformanceStats returns expected shape", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        await manager.createCelestialBody(makeBodyData({ id: "uranus" }));

        const stats = manager.getPerformanceStats();
        expect(stats).toHaveProperty("totalBodies");
        expect(stats.totalBodies).toBe(1);
        expect(stats).toHaveProperty("performanceStats");
        expect(stats).toHaveProperty("assetStats");
    });

    it("dispose removes bodies and orbit lines and clears collections", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        await manager.createCelestialBody(
            makeBodyData({ id: "neptune", orbitRadius: 30, orbitSpeed: 0.1 }),
        );
        expect(manager.getAllCelestialBodies()).toHaveLength(1);

        manager.dispose();

        expect(manager.getAllCelestialBodies()).toHaveLength(0);
        expect(manager.getCelestialBody("neptune")).toBeUndefined();
    });

    it("updateAnimations with star type uses slower rotation", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "sol",
            type: "star",
            position: new THREE.Vector3(0, 0, 0),
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const group = await manager.createCelestialBody(data);
        const bodyMesh = (group as any).getObjectByName("sol_body");
        const before = bodyMesh?.rotation.y ?? 0;

        manager.updateAnimations(1.0, 1.0);

        // Star rotates at 0.005 per second vs planet 0.02 – just verify it moved
        if (bodyMesh) {
            expect(bodyMesh.rotation.y).not.toBe(before);
        }
    });

    it("updateAnimations warns when parent body is missing for a moon", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Create a moon with a parentId that was never added
        const moonData = makeBodyData({
            id: "orphan-moon",
            type: "moon",
            parentId: "non-existent-planet",
            orbitRadius: 0.5,
            orbitSpeed: 1.0,
        });
        await manager.createCelestialBody(moonData);
        manager.updateAnimations(0.016, 1.0);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("non-existent-planet"),
        );
        warnSpy.mockRestore();
    });

    it("createCelestialBody with particle rings creates a Group for rings", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "ringed",
            rings: {
                enabled: true,
                innerRadius: 1.5,
                outerRadius: 3.0,
                color: "#AAAAAA",
                opacity: 0.7,
                segments: 1,
                thetaSegments: 4,
                particleSystem: {
                    enabled: true,
                    particleCount: 5,
                    particleSize: 0.05,
                    particleVariation: 0.3,
                    densityVariation: 0.0,
                },
            },
        });

        const group = await manager.createCelestialBody(data);
        const ringsObj = (group as any).getObjectByName("ringed_rings");
        expect(ringsObj).toBeTruthy();
    });

    it("createCelestialBody warns when parentId is not found at creation time", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await manager.createCelestialBody(
            makeBodyData({
                id: "orphan",
                type: "moon",
                parentId: "missing-parent",
                orbitRadius: 0.5,
                orbitSpeed: 1.0,
            }),
        );

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("missing-parent"),
        );
        warnSpy.mockRestore();
    });
});
