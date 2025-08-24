/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { InteractionManager } from "../InteractionManager";
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

describe("InteractionManager", () => {
    it("hover and click dispatch events with body data and update cursor", async () => {
        const container = document.createElement("div");
        container.style.width = "300px";
        container.style.height = "150px";
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData();
        const group = await manager.createCelestialBody(data);
        const bodyMesh = (group as any).getObjectByName?.(`${data.id}_body`);

        const onHover = vi.fn();
        const onSelect = vi.fn();

        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            {
                onPlanetHover: onHover,
                onPlanetSelect: onSelect,
            },
        );
        interactions.initialize(manager);

        // Simulate raycaster intersection for hover
        (globalThis as any).__threeRaycasterIntersects = [{ object: bodyMesh }];

        // Mouse move (center of container)
        const rect = container.getBoundingClientRect();
        const evtMove = new MouseEvent("mousemove", {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            bubbles: true,
        });
        container.dispatchEvent(evtMove);

        expect(onHover).toHaveBeenCalledWith(
            expect.objectContaining({ id: data.id }),
        );
        expect(container.style.cursor).toBe("pointer");

        // Click selection
        const evtClick = new MouseEvent("click", {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            bubbles: true,
        });
        container.dispatchEvent(evtClick);

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ id: data.id }),
        );

        // Cleanup
        interactions.dispose();
        document.body.removeChild(container);
    });
});
