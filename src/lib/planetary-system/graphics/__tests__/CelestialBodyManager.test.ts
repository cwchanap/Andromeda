/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as THREE from "three";
import { CelestialBodyManager } from "../CelestialBodyManager";
import type { CelestialBodyData } from "@/types/game";

let origBoxGeometry: any;
let origStdMatImpl: any;
let origMeshImpl: any;

beforeAll(() => {
    // BoxGeometry is not in the setup.ts Three.js mock; add it here
    try {
        origBoxGeometry = (THREE as any).BoxGeometry;
    } catch (e) {
        origBoxGeometry = undefined;
    }
    (THREE as any).BoxGeometry = vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
        getAttribute: vi.fn(() => ({ array: new Float32Array(0) })),
    }));

    // Particle rings call rockMaterial.clone() — extend MeshStandardMaterial mock to support it
    origStdMatImpl = (
        THREE as any
    ).MeshStandardMaterial.getMockImplementation();
    (THREE as any).MeshStandardMaterial.mockImplementation((cfg?: any) => {
        const mat = origStdMatImpl?.(cfg) ?? { dispose: vi.fn(), userData: {} };
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
    origMeshImpl = (THREE as any).Mesh.getMockImplementation();
    (THREE as any).Mesh.mockImplementation((geometry?: any, material?: any) => {
        const mesh = origMeshImpl?.(geometry, material) ?? {
            scale: { set: vi.fn() },
            rotation: { set: vi.fn() },
        };
        if (mesh.scale && !mesh.scale.set) {
            mesh.scale.set = vi.fn();
        }
        if (mesh.rotation && !mesh.rotation.set) {
            mesh.rotation.set = vi.fn();
        }
        return mesh;
    });
});

afterAll(() => {
    if (origBoxGeometry !== undefined) {
        (THREE as any).BoxGeometry = origBoxGeometry;
    } else {
        delete (THREE as any).BoxGeometry;
    }

    if (origStdMatImpl !== undefined) {
        (THREE as any).MeshStandardMaterial.mockImplementation(origStdMatImpl);
    }

    if (origMeshImpl !== undefined) {
        (THREE as any).Mesh.mockImplementation(origMeshImpl);
    }
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
        const initialParentX = parentGroup.position.x;

        // Update animations - both should move
        manager.updateAnimations(1.0, 1.0);

        // Parent should have moved from its initial position
        expect(parentGroup.position.x).not.toBe(initialParentX);

        // Moon should be orbiting around the NEW parent position, not (0,0,0)
        const parentPos = parentGroup.position;
        const moonPos = moonGroup.position;

        // Distance from moon to parent should be approximately the visual orbit radius
        const distanceToParent = Math.sqrt(
            Math.pow(moonPos.x - parentPos.x, 2) +
                Math.pow(moonPos.z - parentPos.z, 2),
        );

        // The visual orbit radius expands past the rendered parent radius.
        expect(distanceToParent).toBeCloseTo(1.44, 5);
    });

    it("expands a too-small moon orbit radius outside the rendered parent", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const parentData = makeBodyData({
            id: "earth",
            position: new THREE.Vector3(15, 0, 0),
            scale: 1.0,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const parentGroup = await manager.createCelestialBody(parentData);

        const moonData = makeBodyData({
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            position: new THREE.Vector3(15.4, 0, 0),
            scale: 0.27,
            orbitRadius: 0.4,
            orbitSpeed: 1.0,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        manager.updateAnimations(0, 1.0);

        const distanceToParent = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );

        expect(distanceToParent).toBeCloseTo(1.42, 5);
        expect(moonData.orbitRadius).toBe(0.4);
    });

    it("preserves an already-large moon orbit radius", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const parentData = makeBodyData({
            id: "jupiter",
            position: new THREE.Vector3(20, 0, 0),
            scale: 1.2,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const parentGroup = await manager.createCelestialBody(parentData);

        const moonData = makeBodyData({
            id: "ganymede",
            name: "Ganymede",
            type: "moon",
            parentId: "jupiter",
            position: new THREE.Vector3(22.5, 0, 0),
            scale: 0.3,
            orbitRadius: 2.5,
            orbitSpeed: 1.0,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        manager.updateAnimations(0, 1.0);

        const distanceToParent = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );

        expect(distanceToParent).toBeCloseTo(2.5, 5);
    });

    it("sets initial position at visual orbit radius coordinates at creation time", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const parentData = makeBodyData({
            id: "earth",
            position: new THREE.Vector3(15, 0, 0),
            scale: 1.0,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        await manager.createCelestialBody(parentData);

        // Moon's data.position places it at raw orbitRadius (0.4) from parent,
        // but visual orbit radius expands to ~1.42 to clear parent's rendered size.
        const moonData = makeBodyData({
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            position: new THREE.Vector3(15.4, 0, 0),
            scale: 0.27,
            orbitRadius: 0.4,
            orbitSpeed: 1.0,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        // Without calling updateAnimations, the position should already be at
        // the visual orbit coordinates, not the raw data.position.
        const parentGroup = manager.getCelestialBody("earth")!;
        const distanceToParent = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );

        expect(distanceToParent).toBeCloseTo(1.42, 5);

        // Verify a subsequent zero-delta animation doesn't shift the position
        manager.updateAnimations(0, 1.0);
        const distanceAfterAnimation = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );
        expect(distanceAfterAnimation).toBeCloseTo(1.42, 5);
    });

    it("keeps non-parented planet orbit radius unchanged", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "mars",
            position: new THREE.Vector3(5, 0, 0),
            scale: 0.7,
            orbitRadius: 5,
            orbitSpeed: 1.0,
        });
        const group = await manager.createCelestialBody(data);

        manager.updateAnimations(0, 1.0);

        const distanceToSystemCenter = Math.sqrt(
            Math.pow(group.position.x, 2) + Math.pow(group.position.z, 2),
        );

        expect(distanceToSystemCenter).toBeCloseTo(5, 5);
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

    it("updateOrbitLineOpacity uses visual orbit radius, not authored radius", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Create parent at origin with no orbit
        const parentData = makeBodyData({
            id: "earth",
            position: new THREE.Vector3(0, 0, 0),
            scale: 1.0,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        await manager.createCelestialBody(parentData);

        // Moon with authored orbitRadius 0.4 — getVisualOrbitRadius expands it
        // to ~1.42 (parent scale 1.0 → clearance 0.15 → min = 0.5+0.15+0.27*0.5+…)
        const moonData = makeBodyData({
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            position: new THREE.Vector3(0.4, 0, 0),
            scale: 0.27,
            orbitRadius: 0.4,
            orbitSpeed: 1.0,
        });
        await manager.createCelestialBody(moonData);

        // Pick a camera distance between the two fade thresholds:
        //   authored radius threshold: 0.4 * 3 = 1.2
        //   visual radius threshold:   ~1.42 * 3 ≈ 4.26
        // At distance 2.0:
        //   - If authored radius used → opacity would be ramped down (< 0.3)
        //   - If visual radius used  → still within threshold → opacity = 0.3
        manager.updateOrbitLineOpacity(new THREE.Vector3(2, 0, 0));

        const orbitLine = scene.children.find(
            (c) => c.name === "luna_orbit",
        ) as any;
        expect(orbitLine).toBeDefined();
        expect(orbitLine.material.opacity).toBe(0.3);
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

    it("dispose handles bodies and orbit lines with array materials", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Manually inject a Mesh with an array material into the bodies map
        const mat1 = { dispose: vi.fn() } as unknown as THREE.Material;
        const mat2 = { dispose: vi.fn() } as unknown as THREE.Material;
        const geo = { dispose: vi.fn() } as unknown as THREE.BufferGeometry;
        const meshWithArrayMat = new THREE.Mesh(geo, [mat1, mat2] as any);
        (manager as any).bodies.set("array-mat-body", meshWithArrayMat);

        // Also inject a Line with array material into orbitLines
        const lineMat1 = { dispose: vi.fn() } as unknown as THREE.Material;
        const lineMat2 = { dispose: vi.fn() } as unknown as THREE.Material;
        const lineGeo = { dispose: vi.fn() } as unknown as THREE.BufferGeometry;
        const lineWithArrayMat = {
            geometry: lineGeo,
            material: [lineMat1, lineMat2],
        } as unknown as THREE.Line;
        (manager as any).orbitLines.set("array-mat-line", lineWithArrayMat);

        manager.dispose();

        expect(mat1.dispose).toHaveBeenCalled();
        expect(mat2.dispose).toHaveBeenCalled();
        expect(lineMat1.dispose).toHaveBeenCalled();
        expect(lineMat2.dispose).toHaveBeenCalled();
    });

    it("dispose handles a Mesh with a single material (non-array) without throwing", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const singleMat = { dispose: vi.fn() } as unknown as THREE.Material;
        const geo = { dispose: vi.fn() } as unknown as THREE.BufferGeometry;
        const mesh = new THREE.Mesh(geo, singleMat as any);
        (manager as any).bodies.set("single-mat-body", mesh);

        // orbit line with single material
        const lineMat = { dispose: vi.fn() } as unknown as THREE.Material;
        const lineGeo = { dispose: vi.fn() } as unknown as THREE.BufferGeometry;
        const line = {
            geometry: lineGeo,
            material: lineMat,
        } as unknown as THREE.Line;
        (manager as any).orbitLines.set("single-mat-line", line);

        manager.dispose();

        expect(singleMat.dispose).toHaveBeenCalled();
        expect(lineMat.dispose).toHaveBeenCalled();
    });

    it("updateAnimations animates solid rings rotation", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "ringed-planet",
            rings: {
                enabled: true,
                innerRadius: 2,
                outerRadius: 4,
                color: "#CCCCCC",
                opacity: 0.5,
                segments: 1,
                thetaSegments: 8,
                // No particleSystem → solid ring path
            },
        });

        const group = await manager.createCelestialBody(data);
        const ringObject = (group as any).getObjectByName(
            "ringed-planet_rings",
        );

        // Record initial rotation before animation
        const initialRotationZ = ringObject?.rotation?.z ?? 0;

        // Animate — this should execute the solid ring rotation (rotation.z += deltaTime * 0.001)
        expect(() => manager.updateAnimations(1.0, 1.0)).not.toThrow();

        if (ringObject) {
            // rotation.z should have changed
            expect(ringObject.rotation.z).not.toBe(initialRotationZ);
        }
    });

    it("createFallbackGeometry uses default sphere for unknown body types", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // "asteroid" is not one of star/planet/moon — hits the default branch
        const data = makeBodyData({
            id: "ceres",
            type: "asteroid" as any,
        });

        const group = await manager.createCelestialBody(data);
        expect(group).toBeTruthy();
        const mesh = (group as any).getObjectByName("ceres_body");
        expect(mesh).toBeTruthy();
    });

    it("createSolidRings with texture loads texture loader without throwing", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "textured-ring",
            rings: {
                enabled: true,
                innerRadius: 1,
                outerRadius: 3,
                color: "#FFFFFF",
                opacity: 0.8,
                segments: 1,
                thetaSegments: 8,
                texture: "/textures/ring.png",
                // No particleSystem → solid ring with texture
            },
        });

        await expect(manager.createCelestialBody(data)).resolves.toBeTruthy();
    });

    it("updateAnimations animates particle ring group rotation when particleSystem.enabled=true", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "particle-ringed",
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

        await manager.createCelestialBody(data);

        // Covers lines 595-623: particle ring animation path in updateAnimations()
        expect(() => manager.updateAnimations(1.0, 1.0)).not.toThrow();
    });

    it("getBodyData returns data from parent.userData.celestialBodyData", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const bodyData = makeBodyData({ id: "test-body" });
        const mockMesh = {
            userData: {},
            parent: {
                userData: { celestialBodyData: bodyData },
            },
            name: "test-body",
        } as any;

        const result = manager.getBodyData(mockMesh);
        expect(result).toEqual(bodyData);
    });

    it("getBodyData returns null when no data found", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const mockMesh = { userData: {}, parent: null, name: "" } as any;
        expect(manager.getBodyData(mockMesh)).toBeNull();
    });

    it("highlightCelestialBody applies emissive to single material mesh", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(),
            new THREE.MeshStandardMaterial(),
        );
        (manager as any).bodies.set("highlight-body", mesh);

        expect(() =>
            manager.highlightCelestialBody("highlight-body"),
        ).not.toThrow();
    });

    it("highlightCelestialBody handles array material", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(), [
            new THREE.MeshStandardMaterial(),
        ] as any);
        (manager as any).bodies.set("array-mat-body", mesh);

        expect(() =>
            manager.highlightCelestialBody("array-mat-body"),
        ).not.toThrow();
    });

    it("unhighlightCelestialBody resets emissive on single material mesh", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(),
            new THREE.MeshStandardMaterial(),
        );
        (manager as any).bodies.set("unhighlight-body", mesh);

        expect(() =>
            manager.unhighlightCelestialBody("unhighlight-body"),
        ).not.toThrow();
    });

    it("unhighlightCelestialBody handles array material", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(), [
            new THREE.MeshStandardMaterial(),
        ] as any);
        (manager as any).bodies.set("array-unhighlight-body", mesh);

        expect(() =>
            manager.unhighlightCelestialBody("array-unhighlight-body"),
        ).not.toThrow();
    });

    it("createCelestialBody with rings using explicit rotationX covers the truthy branch", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "ring-rotx",
            rings: {
                enabled: true,
                innerRadius: 2,
                outerRadius: 4,
                color: "#AAAAAA",
                opacity: 0.7,
                segments: 1,
                thetaSegments: 8,
                rotationX: 0.5, // explicit non-undefined → covers line 241/287 truthy branch
            },
        });

        const group = await manager.createCelestialBody(data);
        expect(group).toBeTruthy();
    });

    it("createCelestialBody with orbitRadius=0 skips orbit line creation (covers early return)", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "no-orbit",
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const group = await manager.createCelestialBody(data);
        expect(group).toBeTruthy();
    });

    it("createOrbitLine early-return when called directly with orbitRadius=0", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        // Private method invoked directly to cover the early-return guard
        expect(() =>
            (manager as any).createOrbitLine(
                makeBodyData({ id: "zero-orbit", orbitRadius: 0 }),
                0,
            ),
        ).not.toThrow();
    });

    it("createParticleRings with rotationX set covers the truthy branch on line 241", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "particle-rotx",
            rings: {
                enabled: true,
                innerRadius: 2,
                outerRadius: 4,
                color: "#AAAAAA",
                opacity: 0.7,
                segments: 1,
                thetaSegments: 8,
                rotationX: 0.5,
                particleSystem: {
                    enabled: true,
                    particleCount: 2,
                    particleSize: 0.1,
                    densityVariation: 0,
                    particleVariation: 0.3,
                },
            },
        });

        const group = await manager.createCelestialBody(data);
        expect(group).toBeTruthy();
    });

    it("createParticleRings density variation skips particles (covers continue on line 202)", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Mock Math.random to always return 0 so densityVariation condition fires
        const randSpy = vi.spyOn(Math, "random").mockReturnValue(0);

        const data = makeBodyData({
            id: "density-skip",
            rings: {
                enabled: true,
                innerRadius: 1,
                outerRadius: 3,
                color: "#BBBBBB",
                opacity: 0.5,
                segments: 1,
                thetaSegments: 4,
                particleSystem: {
                    enabled: true,
                    particleCount: 2, // small count so we cross the 50% threshold quickly
                    particleSize: 0.1,
                    densityVariation: 0.5, // triggers the skip when random < 0.5
                    particleVariation: 0.3,
                },
            },
        });

        const group = await manager.createCelestialBody(data);
        randSpy.mockRestore();
        expect(group).toBeTruthy();
    });

    it("orbits a body around an invisible barycenter anchor", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        manager.registerOrbitAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: new THREE.Vector3(10, 0, 0),
            },
        ]);

        const body = await manager.createCelestialBody(
            makeBodyData({
                id: "orbiting-star",
                type: "star",
                position: new THREE.Vector3(14, 0, 0),
                orbit: {
                    centerId: "barycenter",
                    semiMajorAxis: 4,
                    visualPeriodSeconds: 40,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
            }),
        );

        manager.updateAnimations(10, 1);

        expect(body.position.x).toBeCloseTo(10, 5);
        expect(body.position.z).toBeCloseTo(4, 5);
    });

    it("orbits a body around another moving visible body with orbital elements", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        manager.registerOrbitAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: new THREE.Vector3(0, 0, 0),
            },
        ]);

        const star = await manager.createCelestialBody(
            makeBodyData({
                id: "proxima",
                type: "star",
                orbit: {
                    centerId: "barycenter",
                    semiMajorAxis: 10,
                    visualPeriodSeconds: 100,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
            }),
        );
        const planet = await manager.createCelestialBody(
            makeBodyData({
                id: "proxima-b",
                orbit: {
                    centerId: "proxima",
                    semiMajorAxis: 2,
                    visualPeriodSeconds: 20,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
                parentId: undefined,
            }),
        );

        manager.updateAnimations(5, 1);

        expect(planet.position.distanceTo(star.position)).toBeCloseTo(2, 5);
    });

    it("creates elliptical orbit-line geometry for orbital elements", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        manager.registerOrbitAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: new THREE.Vector3(0, 0, 0),
            },
        ]);

        await manager.createCelestialBody(
            makeBodyData({
                id: "eccentric",
                orbit: {
                    centerId: "barycenter",
                    semiMajorAxis: 10,
                    eccentricity: 0.5,
                    visualPeriodSeconds: 100,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
            }),
        );

        const orbitLine = scene.children.find(
            (child) => child.name === "eccentric_orbit",
        ) as any;

        expect(orbitLine).toBeTruthy();
        expect(orbitLine.geometry.positions[0]).toBeCloseTo(5, 5);
        expect(orbitLine.geometry.positions[192]).toBeCloseTo(-15, 5);
    });

    it("keeps barycenter overlay markers hidden until toggled", () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        manager.registerOrbitAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: new THREE.Vector3(0, 0, 0),
            },
        ]);

        const marker = scene.children.find(
            (child) => child.name === "barycenter_anchor",
        ) as any;

        expect(marker).toBeTruthy();
        expect(marker.visible).toBe(false);
        manager.setBarycenterOverlayVisible(true);
        expect(marker.visible).toBe(true);
    });

    it("warns and keeps authored position when orbital element center is missing", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const body = await manager.createCelestialBody(
            makeBodyData({
                id: "missing-center-body",
                position: new THREE.Vector3(3, 0, 7),
                orbit: {
                    centerId: "missing-center",
                    semiMajorAxis: 4,
                    visualPeriodSeconds: 40,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
            }),
        );

        manager.updateAnimations(10, 1);

        expect(body.position.x).toBe(3);
        expect(body.position.z).toBe(7);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("missing-center"),
        );
        warnSpy.mockRestore();
    });

    it("updates legacy bodies before resolving orbital-element children", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const legacyParent = await manager.createCelestialBody(
            makeBodyData({
                id: "legacy-parent",
                position: new THREE.Vector3(10, 0, 0),
                orbitRadius: 10,
                orbitSpeed: 1,
            }),
        );
        const child = await manager.createCelestialBody(
            makeBodyData({
                id: "element-child",
                position: new THREE.Vector3(12, 0, 0),
                orbit: {
                    centerId: "legacy-parent",
                    semiMajorAxis: 2,
                    visualPeriodSeconds: 20,
                },
                orbitRadius: undefined,
                orbitSpeed: undefined,
                parentId: undefined,
            }),
        );

        manager.updateAnimations(1, 1);

        expect(child.position.distanceTo(legacyParent.position)).toBeCloseTo(
            2,
            5,
        );
    });
});
