import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OrbitResolver } from "../OrbitResolver";
import type { CelestialBodyData } from "@/types/game";
import type { OrbitAnchorData } from "@/lib/planetary-system/types";

const makeBody = (
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData => ({
    id: "planet",
    name: "Planet",
    type: "planet",
    description: "Test planet",
    keyFacts: {
        diameter: "1 km",
        orbitalPeriod: "1 year",
        composition: ["rock"],
        temperature: "300 K",
    },
    images: [],
    position: new THREE.Vector3(0, 0, 0),
    scale: 1,
    material: { color: "#fff" },
    ...overrides,
});

describe("OrbitResolver", () => {
    it("updates a body around an invisible anchor", () => {
        const resolver = new OrbitResolver();
        const anchor: OrbitAnchorData = {
            id: "barycenter",
            name: "Barycenter",
            type: "barycenter",
            position: new THREE.Vector3(10, 0, 0),
        };
        const group = new THREE.Group();
        const body = makeBody({
            orbit: {
                centerId: "barycenter",
                semiMajorAxis: 4,
                visualPeriodSeconds: 40,
            },
        });

        resolver.registerAnchors([anchor]);
        resolver.registerBody(body, group);
        resolver.update(10, 1);

        expect(group.position.x).toBeCloseTo(10, 5);
        expect(group.position.z).toBeCloseTo(4, 5);
    });

    it("updates a body around a moving visible body", () => {
        const resolver = new OrbitResolver();
        const starGroup = new THREE.Group();
        const planetGroup = new THREE.Group();

        resolver.registerAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: new THREE.Vector3(0, 0, 0),
            },
        ]);
        resolver.registerBody(
            makeBody({
                id: "star",
                type: "star",
                orbit: {
                    centerId: "barycenter",
                    semiMajorAxis: 10,
                    visualPeriodSeconds: 100,
                },
            }),
            starGroup,
        );
        resolver.registerBody(
            makeBody({
                id: "planet",
                orbit: {
                    centerId: "star",
                    semiMajorAxis: 2,
                    visualPeriodSeconds: 20,
                },
            }),
            planetGroup,
        );

        resolver.update(5, 1);

        expect(planetGroup.position.distanceTo(starGroup.position)).toBeCloseTo(
            2,
            5,
        );
    });

    it("warns and keeps fallback position for missing centers", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = new THREE.Group();
        const body = makeBody({
            position: new THREE.Vector3(3, 0, 7),
            orbit: {
                centerId: "missing",
                semiMajorAxis: 4,
                visualPeriodSeconds: 40,
            },
        });

        resolver.registerBody(body, group);
        resolver.update(10, 1);

        expect(group.position.x).toBe(3);
        expect(group.position.z).toBe(7);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("missing"),
        );
        warnSpy.mockRestore();
    });

    it("returns sampled orbit-line points for registered orbital bodies", () => {
        const resolver = new OrbitResolver();
        const group = new THREE.Group();
        resolver.registerBody(
            makeBody({
                orbit: {
                    centerId: "barycenter",
                    semiMajorAxis: 10,
                    eccentricity: 0.5,
                },
            }),
            group,
        );

        const points = resolver.getOrbitLinePositions("planet", 4);

        expect(points).toHaveLength(15);
        expect(points[0]).toBeCloseTo(5, 5);
        expect(points[6]).toBeCloseTo(-15, 5);
    });
});
