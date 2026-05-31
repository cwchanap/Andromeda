import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OrbitResolver } from "../OrbitResolver";
import type { CelestialBodyData } from "@/types/game";
import type { OrbitAnchorData } from "@/lib/planetary-system/types";

const makeVector = (x = 0, y = 0, z = 0): THREE.Vector3 => {
    const vector = {
        x,
        y,
        z,
    } as THREE.Vector3;
    vector.set = (nextX = vector.x, nextY = vector.y, nextZ = vector.z) => {
        vector.x = nextX;
        vector.y = nextY;
        vector.z = nextZ;
        return vector;
    };
    vector.copy = (other: THREE.Vector3) => {
        vector.x = other.x;
        vector.y = other.y;
        vector.z = other.z;
        return vector;
    };
    vector.clone = () => makeVector(vector.x, vector.y, vector.z);
    vector.distanceTo = (other: THREE.Vector3) => {
        const dx = vector.x - other.x;
        const dy = vector.y - other.y;
        const dz = vector.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    return vector;
};

const makeObject = (): THREE.Object3D =>
    ({
        position: makeVector(),
        visible: true,
    }) as THREE.Object3D;

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
    position: makeVector(0, 0, 0),
    scale: 1,
    material: { color: "#fff" },
    ...overrides,
});

describe("OrbitResolver", () => {
    beforeEach(() => {
        vi.mocked(THREE.Vector3).mockImplementation((x = 0, y = 0, z = 0) =>
            makeVector(x, y, z),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("registers orbital bodies without resolving missing centers", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = makeObject();
        const body = makeBody({
            position: makeVector(3, 0, 7),
            orbit: {
                centerId: "future-parent",
                semiMajorAxis: 4,
                visualPeriodSeconds: 40,
            },
        });

        resolver.registerBody(body, group);

        expect(group.position.x).toBe(3);
        expect(group.position.z).toBe(7);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("updates a body around an invisible anchor", () => {
        const resolver = new OrbitResolver();
        const anchor: OrbitAnchorData = {
            id: "barycenter",
            name: "Barycenter",
            type: "barycenter",
            position: makeVector(10, 0, 0),
        };
        const group = makeObject();
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
        const starGroup = makeObject();
        const planetGroup = makeObject();

        resolver.registerAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: makeVector(0, 0, 0),
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

    it("resolves child bodies registered before their parent after update", () => {
        const resolver = new OrbitResolver();
        const planetGroup = makeObject();
        const starGroup = makeObject();

        resolver.registerAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: makeVector(0, 0, 0),
            },
        ]);
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

        resolver.update(5, 1);

        expect(planetGroup.position.distanceTo(starGroup.position)).toBeCloseTo(
            2,
            5,
        );
    });

    it("does not overwrite registered non-orbital body positions on update", () => {
        const resolver = new OrbitResolver();
        const legacyGroup = makeObject();
        resolver.registerBody(
            makeBody({
                id: "legacy",
                position: makeVector(1, 0, 1),
            }),
            legacyGroup,
        );
        legacyGroup.position.copy(makeVector(9, 0, 3));

        resolver.update(10, 1);

        expect(legacyGroup.position.x).toBe(9);
        expect(legacyGroup.position.z).toBe(3);
    });

    it("resolves orbital bodies around a non-orbital body's current position", () => {
        const resolver = new OrbitResolver();
        const legacyGroup = makeObject();
        const planetGroup = makeObject();
        resolver.registerBody(
            makeBody({
                id: "legacy",
                position: makeVector(0, 0, 0),
            }),
            legacyGroup,
        );
        resolver.registerBody(
            makeBody({
                id: "planet",
                orbit: {
                    centerId: "legacy",
                    semiMajorAxis: 2,
                    visualPeriodSeconds: 20,
                },
            }),
            planetGroup,
        );
        legacyGroup.position.copy(makeVector(10, 0, 3));

        resolver.update(5, 1);

        expect(legacyGroup.position.x).toBe(10);
        expect(legacyGroup.position.z).toBe(3);
        expect(planetGroup.position.x).toBeCloseTo(10, 5);
        expect(planetGroup.position.z).toBeCloseTo(5, 5);
    });

    it("warns and keeps fallback position for missing centers", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = makeObject();
        const body = makeBody({
            position: makeVector(3, 0, 7),
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
    });

    it("dedupes missing-center warnings across multiple updates", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = makeObject();
        const body = makeBody({
            position: makeVector(3, 0, 7),
            orbit: {
                centerId: "missing",
                semiMajorAxis: 4,
                visualPeriodSeconds: 40,
            },
        });

        resolver.registerBody(body, group);
        warnSpy.mockClear();

        resolver.update(10, 1);
        resolver.update(10, 1);

        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("warns once and keeps fallback position for orbit cycles", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = makeObject();
        resolver.registerBody(
            makeBody({
                id: "loop",
                position: makeVector(3, 0, 7),
                orbit: {
                    centerId: "loop",
                    semiMajorAxis: 4,
                    visualPeriodSeconds: 40,
                },
            }),
            group,
        );

        resolver.update(10, 1);
        resolver.update(10, 1);

        expect(group.position.x).toBe(3);
        expect(group.position.z).toBe(7);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cycle"));
    });

    it("returns sampled orbit-line points for registered orbital bodies", () => {
        const resolver = new OrbitResolver();
        const group = makeObject();
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

    it("samples orbit-line points without requiring a registered center", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resolver = new OrbitResolver();
        const group = makeObject();
        resolver.registerBody(
            makeBody({
                orbit: {
                    centerId: "unregistered-center",
                    semiMajorAxis: 10,
                    eccentricity: 0.5,
                },
            }),
            group,
        );

        const points = resolver.getOrbitLinePositions("planet", 4);

        expect(points).toHaveLength(15);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves orbiting anchors without stale registration-order positions", () => {
        const resolver = new OrbitResolver();
        resolver.registerAnchors([
            {
                id: "child-anchor",
                name: "Child Anchor",
                type: "barycenter",
                position: makeVector(0, 0, 0),
                orbit: {
                    centerId: "parent-anchor",
                    semiMajorAxis: 2,
                    visualPeriodSeconds: 20,
                },
            },
            {
                id: "parent-anchor",
                name: "Parent Anchor",
                type: "barycenter",
                position: makeVector(0, 0, 0),
                orbit: {
                    centerId: "root-anchor",
                    semiMajorAxis: 10,
                    visualPeriodSeconds: 100,
                },
            },
            {
                id: "root-anchor",
                name: "Root Anchor",
                type: "barycenter",
                position: makeVector(0, 0, 0),
            },
        ]);

        resolver.update(5, 1);

        const parentPosition = resolver.getCenterPosition("parent-anchor");
        const childPosition = resolver.getCenterPosition("child-anchor");

        expect(parentPosition).not.toBeNull();
        expect(childPosition).not.toBeNull();
        expect(childPosition!.distanceTo(parentPosition!)).toBeCloseTo(2, 5);
        expect(childPosition!.x).toBeCloseTo(parentPosition!.x, 5);
        expect(childPosition!.z).toBeCloseTo(parentPosition!.z + 2, 5);
    });

    it("applies stored overlay visibility to markers registered later", () => {
        const resolver = new OrbitResolver();
        const marker = makeObject();
        resolver.registerAnchors([
            {
                id: "barycenter",
                name: "Barycenter",
                type: "barycenter",
                position: makeVector(0, 0, 0),
            },
        ]);

        resolver.setAnchorOverlayVisible(true);
        resolver.registerAnchorMarker("barycenter", marker);

        expect(marker.visible).toBe(true);
    });
});
