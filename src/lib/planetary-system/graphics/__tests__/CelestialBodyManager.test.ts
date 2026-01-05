/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { CelestialBodyManager } from "../CelestialBodyManager";
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
});
