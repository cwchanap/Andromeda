import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
    getOrbitAngle,
    getVisualPeriodSeconds,
    positionFromOrbitalElements,
    sampleOrbitLinePositions,
} from "../orbitalElements";
import type { OrbitalElementsData } from "@/types/game";

describe("orbitalElements", () => {
    it("computes circular orbit positions in the XZ plane", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0,
            phaseDeg: 0,
            visualPeriodSeconds: 40,
        };

        const position = positionFromOrbitalElements(
            orbit,
            10,
            new THREE.Vector3(1, 0, 2),
        );

        expect(position.x).toBeCloseTo(1, 5);
        expect(position.y).toBeCloseTo(0, 5);
        expect(position.z).toBeCloseTo(12, 5);
    });

    it("computes eccentric periapsis and apoapsis positions", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0.5,
            visualPeriodSeconds: 100,
        };

        const periapsis = positionFromOrbitalElements(
            orbit,
            0,
            new THREE.Vector3(0, 0, 0),
        );
        const apoapsis = positionFromOrbitalElements(
            orbit,
            50,
            new THREE.Vector3(0, 0, 0),
        );

        expect(periapsis.x).toBeCloseTo(5, 5);
        expect(periapsis.z).toBeCloseTo(0, 5);
        expect(apoapsis.x).toBeCloseTo(-15, 5);
        expect(apoapsis.z).toBeCloseTo(0, 5);
    });

    it("applies inclination as vertical displacement", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0,
            visualPeriodSeconds: 40,
            inclinationDeg: 90,
        };

        const position = positionFromOrbitalElements(
            orbit,
            10,
            new THREE.Vector3(0, 0, 0),
        );

        expect(position.x).toBeCloseTo(0, 5);
        expect(position.y).toBeCloseTo(-10, 5);
        expect(position.z).toBeCloseTo(0, 5);
    });

    it("uses phase offsets for opposite binary positions", () => {
        const starA: OrbitalElementsData = {
            centerId: "barycenter",
            semiMajorAxis: 4,
            visualPeriodSeconds: 80,
            phaseDeg: 0,
        };
        const starB: OrbitalElementsData = {
            centerId: "barycenter",
            semiMajorAxis: 6,
            visualPeriodSeconds: 80,
            phaseDeg: 180,
        };

        const a = positionFromOrbitalElements(
            starA,
            0,
            new THREE.Vector3(0, 0, 0),
        );
        const b = positionFromOrbitalElements(
            starB,
            0,
            new THREE.Vector3(0, 0, 0),
        );

        expect(a.x).toBeCloseTo(4, 5);
        expect(b.x).toBeCloseTo(-6, 5);
    });

    it("uses visual period overrides before real periods", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 1,
            periodYears: 1000,
            visualPeriodSeconds: 20,
        };

        expect(getVisualPeriodSeconds(orbit)).toBe(20);
        expect(getOrbitAngle(orbit, 10)).toBeCloseTo(Math.PI, 5);
    });

    it("samples eccentric orbit line positions as a flat XYZ array", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0.5,
        };

        const points = sampleOrbitLinePositions(orbit, 4);

        expect(points).toHaveLength(15);
        expect(points[0]).toBeCloseTo(5, 5);
        expect(points[1]).toBeCloseTo(0, 5);
        expect(points[2]).toBeCloseTo(0, 5);
        expect(points[6]).toBeCloseTo(-15, 5);
    });
});
