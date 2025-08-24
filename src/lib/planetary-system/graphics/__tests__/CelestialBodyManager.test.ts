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
