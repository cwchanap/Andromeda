import * as THREE from "three";
import type { OrbitalElementsData } from "@/types/game";

const TWO_PI = Math.PI * 2;
const SECONDS_PER_DAY = 86400;
const DAYS_PER_YEAR = 365.25;

export function degToRad(degrees = 0): number {
    return (degrees * Math.PI) / 180;
}

export function getVisualPeriodSeconds(
    orbit: OrbitalElementsData,
): number | null {
    if (orbit.visualPeriodSeconds && orbit.visualPeriodSeconds > 0) {
        return orbit.visualPeriodSeconds;
    }

    if (orbit.periodDays && orbit.periodDays > 0) {
        return orbit.periodDays * SECONDS_PER_DAY;
    }

    if (orbit.periodYears && orbit.periodYears > 0) {
        return orbit.periodYears * DAYS_PER_YEAR * SECONDS_PER_DAY;
    }

    return null;
}

export function normalizeAngle(angle: number): number {
    return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function getOrbitAngle(
    orbit: OrbitalElementsData,
    elapsedSeconds: number,
): number {
    const phase = degToRad(orbit.phaseDeg ?? 0);
    const periodSeconds = getVisualPeriodSeconds(orbit);
    if (!periodSeconds) {
        return normalizeAngle(phase);
    }

    const direction = orbit.clockwise ? -1 : 1;
    return normalizeAngle(
        phase + direction * TWO_PI * (elapsedSeconds / periodSeconds),
    );
}

export function solveEccentricAnomaly(
    meanAnomaly: number,
    eccentricity: number,
): number {
    if (eccentricity === 0) {
        return meanAnomaly;
    }

    let eccentricAnomaly = meanAnomaly;
    for (let i = 0; i < 8; i += 1) {
        const numerator =
            eccentricAnomaly -
            eccentricity * Math.sin(eccentricAnomaly) -
            meanAnomaly;
        const denominator = 1 - eccentricity * Math.cos(eccentricAnomaly);
        eccentricAnomaly -= numerator / denominator;
    }
    return eccentricAnomaly;
}

function rotateAroundY(point: THREE.Vector3, radians: number): THREE.Vector3 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const x = point.x * cos - point.z * sin;
    const z = point.x * sin + point.z * cos;
    return new THREE.Vector3(x, point.y, z);
}

function rotateAroundX(point: THREE.Vector3, radians: number): THREE.Vector3 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const y = point.y * cos - point.z * sin;
    const z = point.y * sin + point.z * cos;
    return new THREE.Vector3(point.x, y, z);
}

export function localPositionFromOrbitalElements(
    orbit: OrbitalElementsData,
    elapsedSeconds: number,
): THREE.Vector3 {
    const eccentricity = orbit.eccentricity ?? 0;
    const meanAnomaly = getOrbitAngle(orbit, elapsedSeconds);
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
    const semiMajorAxis = orbit.semiMajorAxis;
    const semiMinorAxis =
        semiMajorAxis * Math.sqrt(Math.max(0, 1 - eccentricity ** 2));

    let point = new THREE.Vector3(
        semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity),
        0,
        semiMinorAxis * Math.sin(eccentricAnomaly),
    );

    point = rotateAroundY(point, degToRad(orbit.argumentOfPeriapsisDeg ?? 0));
    point = rotateAroundX(point, degToRad(orbit.inclinationDeg ?? 0));
    point = rotateAroundY(
        point,
        degToRad(orbit.longitudeOfAscendingNodeDeg ?? 0),
    );

    return point;
}

export function positionFromOrbitalElements(
    orbit: OrbitalElementsData,
    elapsedSeconds: number,
    center: THREE.Vector3,
): THREE.Vector3 {
    const local = localPositionFromOrbitalElements(orbit, elapsedSeconds);
    return new THREE.Vector3(
        center.x + local.x,
        center.y + local.y,
        center.z + local.z,
    );
}

export function sampleOrbitLinePositions(
    orbit: OrbitalElementsData,
    segments = 128,
): number[] {
    const points: number[] = [];
    const sampleOrbit: OrbitalElementsData = {
        ...orbit,
        visualPeriodSeconds: segments,
        periodDays: undefined,
        periodYears: undefined,
    };

    for (let i = 0; i <= segments; i += 1) {
        const point = localPositionFromOrbitalElements(sampleOrbit, i);
        points.push(point.x, point.y, point.z);
    }

    return points;
}
