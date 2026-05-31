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

    it("uses phase offsets as mean-anomaly offsets", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 6,
            visualPeriodSeconds: 80,
            phaseDeg: 180,
        };

        const position = positionFromOrbitalElements(
            orbit,
            0,
            new THREE.Vector3(0, 0, 0),
        );

        expect(position.x).toBeCloseTo(-6, 5);
        expect(position.z).toBeCloseTo(0, 5);
    });

    it("keeps eccentric binary components opposite by orbital orientation", () => {
        const starA: OrbitalElementsData = {
            centerId: "barycenter",
            semiMajorAxis: 4,
            eccentricity: 0.5,
            visualPeriodSeconds: 80,
            phaseDeg: 35,
            argumentOfPeriapsisDeg: 20,
        };
        const starB: OrbitalElementsData = {
            centerId: "barycenter",
            semiMajorAxis: 6,
            eccentricity: 0.5,
            visualPeriodSeconds: 80,
            phaseDeg: 35,
            argumentOfPeriapsisDeg: 200,
        };

        for (const elapsedSeconds of [0, 10, 25, 60]) {
            const a = positionFromOrbitalElements(
                starA,
                elapsedSeconds,
                new THREE.Vector3(0, 0, 0),
            );
            const b = positionFromOrbitalElements(
                starB,
                elapsedSeconds,
                new THREE.Vector3(0, 0, 0),
            );

            expect(a.x / 4 + b.x / 6).toBeCloseTo(0, 5);
            expect(a.z / 4 + b.z / 6).toBeCloseTo(0, 5);
        }
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

    it("clockwise reverses the orbit angle direction", () => {
        const counterClockwise: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 1,
            visualPeriodSeconds: 40,
        };
        const clockwise: OrbitalElementsData = {
            ...counterClockwise,
            clockwise: true,
        };

        expect(getOrbitAngle(counterClockwise, 10)).toBeCloseTo(Math.PI / 2, 5);
        expect(getOrbitAngle(clockwise, 10)).toBeCloseTo((Math.PI * 3) / 2, 5);
    });

    it("rotates the local orbit with argumentOfPeriapsisDeg", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0.5,
            argumentOfPeriapsisDeg: 90,
        };

        const position = positionFromOrbitalElements(
            orbit,
            0,
            new THREE.Vector3(0, 0, 0),
        );

        expect(position.x).toBeCloseTo(0, 5);
        expect(position.z).toBeCloseTo(5, 5);
    });

    it("rotates the already-inclined plane with longitudeOfAscendingNodeDeg", () => {
        const orbit: OrbitalElementsData = {
            centerId: "center",
            semiMajorAxis: 10,
            eccentricity: 0,
            phaseDeg: 45,
            inclinationDeg: 90,
            longitudeOfAscendingNodeDeg: 90,
        };

        const position = positionFromOrbitalElements(
            orbit,
            0,
            new THREE.Vector3(0, 0, 0),
        );

        expect(position.x).toBeCloseTo(0, 5);
        expect(position.y).toBeCloseTo(-Math.sqrt(50), 5);
        expect(position.z).toBeCloseTo(Math.sqrt(50), 5);
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
