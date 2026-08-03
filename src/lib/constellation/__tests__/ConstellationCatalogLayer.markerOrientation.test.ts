import { describe, expect, it, vi } from "vitest";

// This suite exercises the synthetic-Sol marker against the REAL Three.js
// implementation: the marker's reticle plane must be oriented toward the
// origin camera (a perfect billboard), which the mocked Group cannot verify
// because it records `lookAt` calls instead of applying orientation math.
// `vi.unmock` must run before the "three" import so this file's module graph
// (including ConstellationCatalogLayer) resolves the real classes.
vi.unmock("three");

import * as THREE from "three";
import { ConstellationCatalogLayer } from "@/lib/constellation/ConstellationCatalogLayer";
import type { RendererStar } from "@/lib/constellation/rendererCatalog";

function makeSyntheticSolStar(
    overrides: Partial<RendererStar> = {},
): RendererStar {
    return {
        id: "sol",
        name: "Sol",
        rightAscension: overrides.rightAscension ?? 5,
        declination: overrides.declination ?? 20,
        magnitude: 0,
        distance: 10,
        spectralClass: "G2V",
        color: "#FFF4E8",
        marker: { kind: "synthetic-sol" },
        ...overrides,
    };
}

function makePrimarySolLayer(star: RendererStar): ConstellationCatalogLayer {
    return new ConstellationCatalogLayer({
        role: "primary",
        catalog: { stars: [star], constellations: [] },
        placementContext: { kind: "fixed-equatorial" },
        settings: {
            minimumMagnitude: 6,
            showConstellationLines: false,
            showStarNames: false,
        },
    });
}

/**
 * Marker hit objects are `THREE.Group`s; the reticle ring mesh is the first
 * child and the crosshair rays the second.
 */
function getMarkerGroup(layer: ConstellationCatalogLayer): THREE.Group {
    const marker = layer.markerHitObjects[0] as THREE.Group;
    expect(marker).toBeInstanceOf(THREE.Group);
    expect(marker.children).toHaveLength(2);
    return marker;
}

function getReticleNormal(reticle: THREE.Mesh): THREE.Vector3 {
    const quaternion = new THREE.Quaternion();
    reticle.getWorldQuaternion(quaternion);
    // RingGeometry lies in its local XY plane, so the +Z axis is the plane
    // normal before the group orientation is applied.
    return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
}

/**
 * Builds a ray from the origin through a point on the ring band (world
 * radius 6.0 — the band spans 5.1..6.9 for the scaled ring). The lateral
 * offset is rotated 0.4 rad around the radial axis so the ray never passes
 * exactly through a RingGeometry seam/segment edge: a ray that lands
 * precisely on a duplicated seam vertex is a floating-point boundary case
 * where both adjacent triangles can reject it, which says nothing about the
 * marker orientation.
 */
function buildBandRay(
    markerPosition: THREE.Vector3,
    bandRadius: number,
): THREE.Raycaster {
    const radial = markerPosition.clone().normalize();
    const up =
        Math.abs(radial.y) > 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);
    const baseLateral = new THREE.Vector3()
        .crossVectors(markerPosition, up)
        .normalize();
    const inPlaneSecond = new THREE.Vector3()
        .crossVectors(markerPosition, baseLateral)
        .normalize();
    const phi = 0.4;
    const lateral = baseLateral
        .clone()
        .multiplyScalar(Math.cos(phi))
        .addScaledVector(inPlaneSecond, Math.sin(phi));
    const bandPoint = markerPosition
        .clone()
        .addScaledVector(lateral, bandRadius);
    return new THREE.Raycaster(
        new THREE.Vector3(0, 0, 0),
        bandPoint.clone().normalize(),
    );
}

describe("ConstellationCatalogLayer synthetic-Sol marker orientation (real Three)", () => {
    it.each([0, 6, 12, 18])(
        "orients the reticle plane radially toward the origin camera at RA %d",
        (rightAscension) => {
            const layer = makePrimarySolLayer(
                makeSyntheticSolStar({ rightAscension, declination: 0 }),
            );
            try {
                layer.root.updateMatrixWorld(true);
                const marker = getMarkerGroup(layer);

                // The reticle plane normal must be parallel to the
                // marker-to-origin direction: with the camera pinned at the
                // origin, the ring is a perfect billboard and can never be
                // viewed edge-on. three's lookAt orients a non-camera
                // object's +Z toward the target, so the normal points
                // exactly toward the origin (dot == +1).
                const markerPosition = new THREE.Vector3();
                marker.getWorldPosition(markerPosition);
                const towardOrigin = new THREE.Vector3()
                    .subVectors(new THREE.Vector3(0, 0, 0), markerPosition)
                    .normalize();
                const normal = getReticleNormal(
                    marker.children[0] as THREE.Mesh,
                );
                expect(normal.dot(towardOrigin)).toBeCloseTo(1, 5);
            } finally {
                layer.dispose();
            }
        },
    );

    it("is geometrically hittable: a center ray from the origin hits the marker", () => {
        // The previously-weak "marker visible" assertion only checked the
        // group's logical visibility; a marker can be logically visible
        // while its reticle is geometrically edge-on and unhittable. A
        // center ray from the origin camera must intersect the marker group
        // (the crosshair rays cross the ring center, so the recursive hit
        // resolves to the ray children even though the ring itself has a
        // hole).
        const layer = makePrimarySolLayer(
            makeSyntheticSolStar({ rightAscension: 12, declination: 0 }),
        );
        try {
            layer.root.updateMatrixWorld(true);
            const marker = getMarkerGroup(layer);

            const markerPosition = new THREE.Vector3();
            marker.getWorldPosition(markerPosition);
            const raycaster = new THREE.Raycaster(
                new THREE.Vector3(0, 0, 0),
                markerPosition.clone().normalize(),
            );
            const hits = raycaster.intersectObject(marker, true);
            expect(hits.length).toBeGreaterThan(0);
        } finally {
            layer.dispose();
        }
    });

    it("renders the ring band on the line of sight: an off-center ray hits the reticle mesh", () => {
        // A ray through a point on the ring band (between the inner and
        // outer radii) must hit the reticle mesh itself, proving the ring
        // is not hidden behind its own plane or clipped by the orientation.
        const layer = makePrimarySolLayer(
            makeSyntheticSolStar({ rightAscension: 12, declination: 0 }),
        );
        try {
            layer.root.updateMatrixWorld(true);
            const marker = getMarkerGroup(layer);
            const reticle = marker.children[0] as THREE.Mesh;

            const markerPosition = new THREE.Vector3();
            marker.getWorldPosition(markerPosition);
            const raycaster = buildBandRay(markerPosition, 6.0);
            const hits = raycaster.intersectObject(reticle, false);
            expect(hits.length).toBeGreaterThan(0);
            expect(hits[0].object).toBe(reticle);
        } finally {
            layer.dispose();
        }
    });

    it("keeps the ring hittable from a non-axis direction", () => {
        // Covers directions where the marker is not on a world axis (e.g.
        // high declination), so the orientation is not accidentally correct
        // only for the axis-aligned test directions.
        const layer = makePrimarySolLayer(
            makeSyntheticSolStar({ rightAscension: 3.7, declination: 62 }),
        );
        try {
            layer.root.updateMatrixWorld(true);
            const marker = getMarkerGroup(layer);
            const reticle = marker.children[0] as THREE.Mesh;

            const markerPosition = new THREE.Vector3();
            marker.getWorldPosition(markerPosition);
            const raycaster = buildBandRay(markerPosition, 6.0);
            const hits = raycaster.intersectObject(reticle, false);
            expect(hits.length).toBeGreaterThan(0);
        } finally {
            layer.dispose();
        }
    });
});
