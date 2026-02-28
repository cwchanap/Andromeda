/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeAll } from "vitest";
import * as THREE from "three";
import { InteractionManager } from "../InteractionManager";
import { CelestialBodyManager } from "../CelestialBodyManager";
import type { CelestialBodyData } from "../../../../types/game";

// Polyfill Touch for jsdom which doesn't define it
beforeAll(() => {
    if (typeof (globalThis as any).Touch === "undefined") {
        (globalThis as any).Touch = function Touch({
            identifier = 0,
            target,
            clientX = 0,
            clientY = 0,
        }: any) {
            this.identifier = identifier;
            this.target = target;
            this.clientX = clientX;
            this.clientY = clientY;
        };
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

    it("mousemove with no intersection resets cursor to default", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        await manager.createCelestialBody(makeBodyData());

        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            {},
        );
        interactions.initialize(manager);

        // No intersection
        (globalThis as any).__threeRaycasterIntersects = [];

        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        expect(container.style.cursor).toBe("default");

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("mousemove from one body to another resets previous and sets new hover", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const g1 = await manager.createCelestialBody(
            makeBodyData({ id: "p1" }),
        );
        const g2 = await manager.createCelestialBody(
            makeBodyData({ id: "p2" }),
        );
        const mesh1 = (g1 as any).getObjectByName("p1_body");
        const mesh2 = (g2 as any).getObjectByName("p2_body");

        // The makeStdMaterial() emissive mock lacks .copy; add it so resetMaterialHover works
        if (mesh1?.material?.emissive) mesh1.material.emissive.copy = vi.fn();
        if (mesh2?.material?.emissive) mesh2.material.emissive.copy = vi.fn();

        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            {},
        );
        interactions.initialize(manager);

        // Hover mesh1
        (globalThis as any).__threeRaycasterIntersects = [{ object: mesh1 }];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        // Hover mesh2 — should reset mesh1 and highlight mesh2
        (globalThis as any).__threeRaycasterIntersects = [{ object: mesh2 }];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        expect(container.style.cursor).toBe("pointer");

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("click with no intersection does not call onPlanetSelect", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        await manager.createCelestialBody(makeBodyData());

        const onSelect = vi.fn();
        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            { onPlanetSelect: onSelect },
        );
        interactions.initialize(manager);

        (globalThis as any).__threeRaycasterIntersects = [];
        container.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onSelect).not.toHaveBeenCalled();

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("touchmove with single touch updates hover state", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const data = makeBodyData();
        const group = await manager.createCelestialBody(data);
        const bodyMesh = (group as any).getObjectByName(`${data.id}_body`);

        const onHover = vi.fn();
        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            { onPlanetHover: onHover },
        );
        interactions.initialize(manager);

        (globalThis as any).__threeRaycasterIntersects = [{ object: bodyMesh }];

        const touchMove = new TouchEvent("touchmove", {
            bubbles: true,
            touches: [
                new Touch({
                    identifier: 1,
                    target: container,
                    clientX: 50,
                    clientY: 50,
                }),
            ],
        });
        container.dispatchEvent(touchMove);

        expect(onHover).toHaveBeenCalled();

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("touchend with single touch triggers onPlanetSelect", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const data = makeBodyData();
        const group = await manager.createCelestialBody(data);
        const bodyMesh = (group as any).getObjectByName(`${data.id}_body`);

        const onSelect = vi.fn();
        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            { onPlanetSelect: onSelect },
        );
        interactions.initialize(manager);

        (globalThis as any).__threeRaycasterIntersects = [{ object: bodyMesh }];

        const touchEnd = new TouchEvent("touchend", {
            bubbles: true,
            changedTouches: [
                new Touch({
                    identifier: 1,
                    target: container,
                    clientX: 50,
                    clientY: 50,
                }),
            ],
        });
        container.dispatchEvent(touchEnd);

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ id: data.id }),
        );

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("dispose cleans up hover state and removes event listeners", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);
        const data = makeBodyData();
        const group = await manager.createCelestialBody(data);
        const bodyMesh = (group as any).getObjectByName(`${data.id}_body`);

        const onHover = vi.fn();
        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            { onPlanetHover: onHover },
        );
        interactions.initialize(manager);

        // Establish hover state
        (globalThis as any).__threeRaycasterIntersects = [{ object: bodyMesh }];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        // Dispose with active hover
        interactions.dispose();

        // After dispose, events should not fire
        onHover.mockClear();
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
        expect(onHover).not.toHaveBeenCalled();

        document.body.removeChild(container);
    });

    it("hover over MeshBasicMaterial mesh adjusts opacity (and resets on un-hover)", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Create a mesh with MeshBasicMaterial (star-like material)
        const basicMesh = new THREE.Mesh(
            undefined,
            new THREE.MeshBasicMaterial(),
        );

        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            {},
        );
        interactions.initialize(manager);

        // Set opacity < 1.0 so the *1.2 multiplication produces a visible change
        basicMesh.material.opacity = 0.8;
        const initialOpacity = 0.8;

        // Hover over the basic-material mesh
        (globalThis as any).__threeRaycasterIntersects = [
            { object: basicMesh },
        ];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        // Opacity should be Math.min(1.0, 0.8 * 1.2) = 0.96
        expect(basicMesh.material.opacity).toBeCloseTo(
            Math.min(1.0, initialOpacity * 1.2),
            5,
        );
        // originalOpacity should have been stored in userData
        expect(basicMesh.material.userData.originalOpacity).toBe(
            initialOpacity,
        );

        // Un-hover (no intersects)
        (globalThis as any).__threeRaycasterIntersects = [];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        // Opacity should be restored to original
        expect(basicMesh.material.opacity).toBeCloseTo(initialOpacity, 5);

        interactions.dispose();
        document.body.removeChild(container);
    });

    it("hover over MeshPhongMaterial mesh calls emissive.setHex (set and reset)", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        // Create a mesh with MeshPhongMaterial
        const phongMesh = new THREE.Mesh(
            undefined,
            new THREE.MeshPhongMaterial(),
        );

        const interactions = new InteractionManager(
            container,
            camera as any,
            scene,
            {},
        );
        interactions.initialize(manager);

        // Hover over the phong-material mesh
        (globalThis as any).__threeRaycasterIntersects = [
            { object: phongMesh },
        ];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        expect(phongMesh.material.emissive.setHex).toHaveBeenCalledWith(
            0x333333,
        );

        // Un-hover to trigger resetMaterialHover
        (globalThis as any).__threeRaycasterIntersects = [];
        container.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

        expect(phongMesh.material.emissive.setHex).toHaveBeenCalledWith(
            0x000000,
        );

        interactions.dispose();
        document.body.removeChild(container);
    });
});
