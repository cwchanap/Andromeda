import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type {
    RendererCatalog,
    RendererCatalogSettings,
    RendererConstellation,
    RendererStar,
} from "@/lib/constellation/rendererCatalog";
import type { CatalogPlacementContext } from "@/lib/constellation/rendererPlacement";
import { placeCatalogCoordinate } from "@/lib/constellation/rendererPlacement";
import { magnitudeToSize } from "@/utils/astronomy";
import type { CatalogLayerBuildOptions } from "@/lib/constellation/ConstellationCatalogLayer";
import { ConstellationCatalogLayer } from "@/lib/constellation/ConstellationCatalogLayer";

/**
 * Shared builders for the constellation catalog layer suite. Kept test-local
 * because no other renderer suite needs them yet.
 */

function makeRendererStar(overrides: Partial<RendererStar> = {}): RendererStar {
    return {
        id: overrides.id ?? "star",
        name: overrides.name ?? overrides.id ?? "Star",
        rightAscension: overrides.rightAscension ?? 5,
        declination: overrides.declination ?? 20,
        magnitude: overrides.magnitude ?? 2,
        distance: overrides.distance ?? 10,
        spectralClass: overrides.spectralClass ?? "G2V",
        color: overrides.color ?? "#FFF4E8",
        marker: overrides.marker,
    };
}

function makeRendererConstellation(
    overrides: Partial<RendererConstellation> = {},
): RendererConstellation {
    return {
        id: overrides.id ?? "constellation",
        name: overrides.name ?? overrides.id ?? "Constellation",
        abbreviation: overrides.abbreviation ?? "CON",
        description: overrides.description ?? "Constellation description",
        mythology: overrides.mythology,
        stars: overrides.stars ?? [],
        lines: overrides.lines ?? [],
    };
}

function makeRendererCatalog(
    overrides: Partial<RendererCatalog> = {},
): RendererCatalog {
    return {
        stars: overrides.stars ?? [],
        constellations: overrides.constellations ?? [],
    };
}

function makeLayerOptions(
    overrides: Partial<Omit<CatalogLayerBuildOptions, "settings">> & {
        settings?: Partial<RendererCatalogSettings>;
    } = {},
): CatalogLayerBuildOptions {
    return {
        role: overrides.role ?? "primary",
        catalog: overrides.catalog ?? makeRendererCatalog(),
        placementContext:
            overrides.placementContext ??
            ({ kind: "fixed-equatorial" } as const),
        settings: {
            minimumMagnitude: overrides.settings?.minimumMagnitude ?? 6,
            showConstellationLines:
                overrides.settings?.showConstellationLines ?? true,
            showStarNames: overrides.settings?.showStarNames ?? true,
        },
        warn: overrides.warn,
    };
}

function getPositionCount(points: THREE.Points | null): number {
    if (points === null) return 0;
    const position = points.geometry.getAttribute("position");
    return position.count;
}

function getLineObject(
    layer: ConstellationCatalogLayer,
    index = 0,
): THREE.LineSegments {
    return layer.lineHitObjects[index] as THREE.LineSegments;
}

function getLineMaterial(
    layer: ConstellationCatalogLayer,
    index = 0,
): THREE.ShaderMaterial {
    return getLineObject(layer, index).material as THREE.ShaderMaterial;
}

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
        deepFreeze(nested);
    }
    return Object.freeze(value);
}

describe("ConstellationCatalogLayer authoritative ordinary-star points", () => {
    it("creates one point from one authoritative top-level star", () => {
        const shared = makeRendererStar({ id: "shared" });
        const catalog = makeRendererCatalog({
            stars: [shared],
            constellations: [
                makeRendererConstellation({ stars: [shared] }),
                makeRendererConstellation({ stars: [shared] }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog }),
        );

        expect(layer.renderedOrdinaryStars.map((star) => star.id)).toEqual([
            "shared",
        ]);
        expect(getPositionCount(layer.ordinaryStarPoints)).toBe(1);
    });

    it("preserves star object identity in renderedOrdinaryStars", () => {
        const alpha = makeRendererStar({ id: "alpha" });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({ stars: [alpha] }),
            }),
        );

        expect(layer.renderedOrdinaryStars[0]).toBe(alpha);
    });

    it("produces null points instead of procedural fallback points for an empty catalog", () => {
        const primaryLayer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog: makeRendererCatalog(),
            }),
        );
        const referenceLayer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog(),
            }),
        );

        expect(primaryLayer.ordinaryStarPoints).toBeNull();
        expect(primaryLayer.renderedOrdinaryStars).toEqual([]);
        expect(referenceLayer.ordinaryStarPoints).toBeNull();
        expect(referenceLayer.renderedOrdinaryStars).toEqual([]);
    });

    it("skips marker records so Task 4 can partition them", () => {
        const sol = makeRendererStar({
            id: "sol",
            marker: { kind: "synthetic-sol" },
        });
        const ordinary = makeRendererStar({ id: "ordinary" });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({
                    stars: [sol, ordinary],
                    constellations: [
                        makeRendererConstellation({ stars: [sol] }),
                    ],
                }),
            }),
        );

        expect(layer.renderedOrdinaryStars.map((star) => star.id)).toEqual([
            "ordinary",
        ]);
        expect(getPositionCount(layer.ordinaryStarPoints)).toBe(1);
    });

    it("keeps ordinaryStarPoints null when only marker records exist", () => {
        const sol = makeRendererStar({
            id: "sol",
            marker: { kind: "synthetic-sol" },
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({
                    stars: [sol],
                    constellations: [
                        makeRendererConstellation({ stars: [sol] }),
                    ],
                }),
            }),
        );

        expect(layer.ordinaryStarPoints).toBeNull();
        expect(layer.renderedOrdinaryStars).toEqual([]);
    });

    it("skips stars dimmer than minimumMagnitude", () => {
        const dim = makeRendererStar({ id: "dim", magnitude: 7 });
        const bright = makeRendererStar({ id: "bright", magnitude: 2 });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({ stars: [dim, bright] }),
                settings: { minimumMagnitude: 6 },
            }),
        );

        expect(layer.renderedOrdinaryStars.map((star) => star.id)).toEqual([
            "bright",
        ]);
    });

    it("skips top-level stars that fail placement and warns", () => {
        const warn = vi.fn();
        const bad = makeRendererStar({ id: "bad", rightAscension: Number.NaN });
        const good = makeRendererStar({ id: "good" });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({ stars: [bad, good] }),
                warn,
            }),
        );

        expect(layer.renderedOrdinaryStars.map((star) => star.id)).toEqual([
            "good",
        ]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                role: "primary",
                objectKind: "top-level-star",
                starId: "bad",
                error: {
                    code: "non-finite-render-coordinate",
                    component: "rightAscension",
                },
            }),
        );
    });

    it("builds position, color, size, and seed attributes in catalog order", () => {
        const alpha = makeRendererStar({
            id: "alpha",
            rightAscension: 3,
            declination: 10,
            magnitude: 1,
            color: "#FF0000",
        });
        const beta = makeRendererStar({
            id: "beta",
            rightAscension: 9,
            declination: -20,
            magnitude: 3,
            color: "#00FF00",
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog: makeRendererCatalog({ stars: [alpha, beta] }),
            }),
        );

        expect(layer.renderedOrdinaryStars).toEqual([alpha, beta]);
        const points = layer.ordinaryStarPoints!;
        const position = points.geometry.getAttribute("position")
            .array as Float32Array;
        const color = points.geometry.getAttribute("color")
            .array as Float32Array;
        const size = points.geometry.getAttribute("size").array as Float32Array;
        const seed = points.geometry.getAttribute("aSeed")
            .array as Float32Array;

        expect(position.length).toBe(6);
        expect(color.length).toBe(6);
        expect(size.length).toBe(2);
        expect(seed.length).toBe(2);

        [alpha, beta].forEach((star, starIndex) => {
            const placed = placeCatalogCoordinate(
                star,
                { kind: "fixed-equatorial" },
                100,
            );
            expect(placed.ok).toBe(true);
            if (!placed.ok) return;
            // Attributes are stored in Float32 buffers, so compare with a
            // tolerance that covers float32 rounding.
            expect(position[starIndex * 3]).toBeCloseTo(placed.position.x, 5);
            expect(position[starIndex * 3 + 1]).toBeCloseTo(
                placed.position.y,
                5,
            );
            expect(position[starIndex * 3 + 2]).toBeCloseTo(
                placed.position.z,
                5,
            );
            expect(size[starIndex]).toBeCloseTo(
                magnitudeToSize(star.magnitude) * 3,
                5,
            );
        });
    });

    it("derives deterministic FNV-1a seeds from the role-prefixed star id", () => {
        const star = makeRendererStar({ id: "star" });

        const primaryLayer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog: makeRendererCatalog({ stars: [star] }),
            }),
        );
        const referenceLayer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({ stars: [star] }),
            }),
        );

        const primarySeed =
            primaryLayer.ordinaryStarPoints!.geometry.getAttribute("aSeed")
                .array as Float32Array;
        const referenceSeed =
            referenceLayer.ordinaryStarPoints!.geometry.getAttribute("aSeed")
                .array as Float32Array;

        expect(primarySeed[0]).toBeCloseTo(0.7229176194, 7);
        expect(referenceSeed[0]).toBeCloseTo(0.5290323049, 7);
    });
});

describe("ConstellationCatalogLayer independent line topology and guards", () => {
    it("skips an out-of-range prepared line before endpoint dereference", () => {
        const warn = vi.fn();
        const catalog = makeRendererCatalog({
            constellations: [
                makeRendererConstellation({
                    id: "bad",
                    stars: [makeRendererStar({ id: "a" })],
                    lines: [[0, 2] as unknown as readonly [number, number]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                role: "primary",
                objectKind: "constellation-line",
                constellationId: "bad",
                lineIndex: 0,
            }),
        );
    });

    it("skips a non-tuple line before endpoint dereference", () => {
        const warn = vi.fn();
        const catalog = makeRendererCatalog({
            constellations: [
                makeRendererConstellation({
                    id: "malformed",
                    stars: [
                        makeRendererStar({ id: "a" }),
                        makeRendererStar({ id: "b" }),
                    ],
                    lines: [[0] as unknown as readonly [number, number]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                objectKind: "constellation-line",
                constellationId: "malformed",
                lineIndex: 0,
            }),
        );
    });

    it("skips non-integer indices", () => {
        const warn = vi.fn();
        const catalog = makeRendererCatalog({
            constellations: [
                makeRendererConstellation({
                    id: "floaty",
                    stars: [
                        makeRendererStar({ id: "a" }),
                        makeRendererStar({ id: "b" }),
                    ],
                    lines: [[0.5, 1] as unknown as readonly [number, number]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                objectKind: "constellation-line",
                constellationId: "floaty",
                lineIndex: 0,
            }),
        );
    });

    it("skips negative indices", () => {
        const warn = vi.fn();
        const catalog = makeRendererCatalog({
            constellations: [
                makeRendererConstellation({
                    id: "negative",
                    stars: [
                        makeRendererStar({ id: "a" }),
                        makeRendererStar({ id: "b" }),
                    ],
                    lines: [[-1, 0] as unknown as readonly [number, number]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                objectKind: "constellation-line",
                constellationId: "negative",
                lineIndex: 0,
            }),
        );
    });

    it("applies the same bounds guards to the reference role", () => {
        const warn = vi.fn();
        const catalog = makeRendererCatalog({
            constellations: [
                makeRendererConstellation({
                    id: "ref-bad",
                    stars: [makeRendererStar({ id: "a" })],
                    lines: [[0, 2] as unknown as readonly [number, number]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "reference", catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                role: "reference",
                objectKind: "constellation-line",
                constellationId: "ref-bad",
                lineIndex: 0,
            }),
        );
    });

    it("builds line geometry from local constellation stars, never top-level point indices", () => {
        // The top-level star order differs from the local constellation
        // order; resolving line endpoints against top-level point indices
        // would place the segment elsewhere.
        const topLevelX = makeRendererStar({
            id: "x",
            rightAscension: 10,
            declination: 40,
        });
        const topLevelY = makeRendererStar({
            id: "y",
            rightAscension: 20,
            declination: -30,
        });
        const localA = makeRendererStar({
            id: "a",
            rightAscension: 1,
            declination: 2,
        });
        const localB = makeRendererStar({
            id: "b",
            rightAscension: 3,
            declination: 4,
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                catalog: makeRendererCatalog({
                    stars: [topLevelX, topLevelY],
                    constellations: [
                        makeRendererConstellation({
                            id: "topo",
                            stars: [localA, localB],
                            lines: [[0, 1]],
                        }),
                    ],
                }),
            }),
        );

        const line = getLineObject(layer);
        const position = line.geometry.getAttribute("position")
            .array as Float32Array;
        const expectedStart = placeCatalogCoordinate(
            localA,
            { kind: "fixed-equatorial" },
            98,
        );
        const expectedEnd = placeCatalogCoordinate(
            localB,
            { kind: "fixed-equatorial" },
            98,
        );
        expect(expectedStart.ok).toBe(true);
        expect(expectedEnd.ok).toBe(true);
        if (!expectedStart.ok || !expectedEnd.ok) return;

        expect(position[0]).toBeCloseTo(expectedStart.position.x, 5);
        expect(position[1]).toBeCloseTo(expectedStart.position.y, 5);
        expect(position[2]).toBeCloseTo(expectedStart.position.z, 5);
        expect(position[3]).toBeCloseTo(expectedEnd.position.x, 5);
        expect(position[4]).toBeCloseTo(expectedEnd.position.y, 5);
        expect(position[5]).toBeCloseTo(expectedEnd.position.z, 5);
    });

    it("skips a line whose local endpoint star fails placement and warns", () => {
        const warn = vi.fn();
        const broken = makeRendererStar({
            id: "broken",
            rightAscension: Number.NaN,
        });
        const healthy = makeRendererStar({ id: "healthy" });
        const catalog = makeRendererCatalog({
            stars: [broken, healthy],
            constellations: [
                makeRendererConstellation({
                    id: "placement",
                    stars: [broken, healthy],
                    lines: [[0, 1]],
                }),
            ],
        });

        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog, warn }),
        );

        expect(layer.lineHitObjects).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({
                objectKind: "constellation-line",
                constellationId: "placement",
                lineIndex: 0,
            }),
        );
    });
});

describe("ConstellationCatalogLayer role styling and shaders", () => {
    it("renders reference points as hollow rings via gl_PointCoord", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({
                    stars: [makeRendererStar({ id: "a" })],
                }),
            }),
        );

        const material = layer.ordinaryStarPoints!
            .material as THREE.ShaderMaterial;
        expect(material.fragmentShader).toContain("gl_PointCoord");
        // Ring band and opacity constants appear in the fragment literally.
        expect(material.fragmentShader).toContain("0.28");
        expect(material.fragmentShader).toContain("0.48");
        expect(material.fragmentShader).toContain("0.35");
    });

    it("keeps the primary point shader as the twinkling disc", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog: makeRendererCatalog({
                    stars: [makeRendererStar({ id: "a" })],
                }),
            }),
        );

        const material = layer.ordinaryStarPoints!
            .material as THREE.ShaderMaterial;
        // A filled disc via smoothstep over the point coord, no ring band.
        expect(material.fragmentShader).toContain("smoothstep(0.5, 0.1, d)");
        expect(material.fragmentShader).toContain("uTime");
        expect(material.fragmentShader).not.toContain("0.48");
    });

    it("uses independent point geometries and materials per role", () => {
        const catalog = makeRendererCatalog({
            stars: [makeRendererStar({ id: "a" })],
        });
        const primary = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "primary", catalog }),
        );
        const reference = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "reference", catalog }),
        );

        expect(primary.ordinaryStarPoints).not.toBe(
            reference.ordinaryStarPoints,
        );
        expect(primary.ordinaryStarPoints!.geometry).not.toBe(
            reference.ordinaryStarPoints!.geometry,
        );
        expect(primary.ordinaryStarPoints!.material).not.toBe(
            reference.ordinaryStarPoints!.material,
        );
    });

    it("uses independent line geometries and materials per role", () => {
        const a = makeRendererStar({ id: "a" });
        const b = makeRendererStar({ id: "b" });
        const catalog = makeRendererCatalog({
            stars: [a, b],
            constellations: [
                makeRendererConstellation({
                    id: "c1",
                    stars: [a, b],
                    lines: [[0, 1]],
                }),
            ],
        });
        const primary = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "primary", catalog }),
        );
        const reference = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "reference", catalog }),
        );

        expect(primary.lineHitObjects[0]).not.toBe(reference.lineHitObjects[0]);
        expect(getLineObject(primary).geometry).not.toBe(
            getLineObject(reference).geometry,
        );
        expect(getLineMaterial(primary)).not.toBe(getLineMaterial(reference));
    });

    it("keeps the reference dash fragment verbatim", () => {
        const a = makeRendererStar({ id: "a" });
        const b = makeRendererStar({ id: "b" });
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({
                    stars: [a, b],
                    constellations: [
                        makeRendererConstellation({
                            id: "c1",
                            stars: [a, b],
                            lines: [[0, 1]],
                        }),
                    ],
                }),
            }),
        );

        const material = getLineMaterial(layer);
        expect(material.fragmentShader).toContain(
            "float phase = fract(vSegmentDistance / uDashPeriodWorld);",
        );
        expect(material.fragmentShader).toContain(
            "if (phase > uDashDutyCycle) discard;",
        );
        // REFERENCE_LINE_OPACITY appears as a literal in the fragment.
        expect(material.fragmentShader).toContain("0.28");
    });

    it("sets aSegmentDistance to [0, chordLength] per accepted reference segment", () => {
        const a = makeRendererStar({
            id: "a",
            rightAscension: 1,
            declination: 10,
        });
        const b = makeRendererStar({
            id: "b",
            rightAscension: 6,
            declination: -15,
        });
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({
                    stars: [a, b],
                    constellations: [
                        makeRendererConstellation({
                            id: "ref",
                            stars: [a, b],
                            lines: [[0, 1]],
                        }),
                    ],
                }),
            }),
        );

        const line = getLineObject(layer);
        const distance = line.geometry.getAttribute("aSegmentDistance")
            .array as Float32Array;
        expect(distance.length).toBe(2);
        expect(distance[0]).toBe(0);

        const placedStart = placeCatalogCoordinate(
            a,
            { kind: "fixed-equatorial" },
            97,
        );
        const placedEnd = placeCatalogCoordinate(
            b,
            { kind: "fixed-equatorial" },
            97,
        );
        expect(placedStart.ok).toBe(true);
        expect(placedEnd.ok).toBe(true);
        if (!placedStart.ok || !placedEnd.ok) return;
        const chordLength = Math.hypot(
            placedEnd.position.x - placedStart.position.x,
            placedEnd.position.y - placedStart.position.y,
            placedEnd.position.z - placedStart.position.z,
        );
        expect(distance[1]).toBeCloseTo(chordLength, 4);
    });

    it("uses the fixed dash period and duty cycle for short and long segments", () => {
        const shortA = makeRendererStar({
            id: "sa",
            rightAscension: 0,
            declination: 0,
        });
        const shortB = makeRendererStar({
            id: "sb",
            rightAscension: 0.001,
            declination: 0,
        });
        const longA = makeRendererStar({
            id: "la",
            rightAscension: 0,
            declination: 0,
        });
        const longB = makeRendererStar({
            id: "lb",
            rightAscension: 12,
            declination: 60,
        });
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({
                    stars: [shortA, shortB, longA, longB],
                    constellations: [
                        makeRendererConstellation({
                            id: "short",
                            stars: [shortA, shortB],
                            lines: [[0, 1]],
                        }),
                        makeRendererConstellation({
                            id: "long",
                            stars: [longA, longB],
                            lines: [[0, 1]],
                        }),
                    ],
                }),
            }),
        );

        const shortMaterial = getLineMaterial(layer, 0);
        const longMaterial = getLineMaterial(layer, 1);
        expect(shortMaterial.uniforms.uDashPeriodWorld.value).toBe(6);
        expect(longMaterial.uniforms.uDashPeriodWorld.value).toBe(6);
        expect(shortMaterial.uniforms.uDashDutyCycle.value).toBe(0.45);
        expect(longMaterial.uniforms.uDashDutyCycle.value).toBe(0.45);
    });

    it("creates no line geometry in either role when showConstellationLines is false", () => {
        const a = makeRendererStar({ id: "a" });
        const b = makeRendererStar({ id: "b" });
        const catalog = makeRendererCatalog({
            stars: [a, b],
            constellations: [
                makeRendererConstellation({
                    id: "c1",
                    stars: [a, b],
                    lines: [[0, 1]],
                }),
            ],
        });
        const primary = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog,
                settings: { showConstellationLines: false },
            }),
        );
        const reference = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog,
                settings: { showConstellationLines: false },
            }),
        );

        expect(primary.lineHitObjects).toEqual([]);
        expect(reference.lineHitObjects).toEqual([]);
        // The root still owns the ordinary-star points for both roles.
        expect(primary.root.children.length).toBe(1);
        expect(reference.root.children.length).toBe(1);
    });
});

describe("ConstellationCatalogLayer determinism and frozen inputs", () => {
    it("produces identical attribute arrays across repeated builds", () => {
        const a = makeRendererStar({
            id: "alpha",
            rightAscension: 3,
            declination: 10,
            magnitude: 1,
        });
        const b = makeRendererStar({
            id: "beta",
            rightAscension: 9,
            declination: -20,
            magnitude: 3,
        });
        const catalog = makeRendererCatalog({
            stars: [a, b],
            constellations: [
                makeRendererConstellation({
                    id: "c1",
                    stars: [a, b],
                    lines: [[0, 1]],
                }),
            ],
        });

        const readAttributes = (layer: ConstellationCatalogLayer) => ({
            position: Array.from(
                layer.ordinaryStarPoints!.geometry.getAttribute("position")
                    .array,
            ),
            color: Array.from(
                layer.ordinaryStarPoints!.geometry.getAttribute("color").array,
            ),
            size: Array.from(
                layer.ordinaryStarPoints!.geometry.getAttribute("size").array,
            ),
            seed: Array.from(
                layer.ordinaryStarPoints!.geometry.getAttribute("aSeed").array,
            ),
            distance: Array.from(
                getLineObject(layer).geometry.getAttribute("aSegmentDistance")
                    .array,
            ),
        });

        const first = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "reference", catalog }),
        );
        const second = new ConstellationCatalogLayer(
            makeLayerOptions({ role: "reference", catalog }),
        );

        expect(readAttributes(second)).toEqual(readAttributes(first));
    });

    it("leaves frozen catalog, settings, and context unchanged", () => {
        const a = makeRendererStar({ id: "alpha" });
        const b = makeRendererStar({ id: "beta" });
        const catalog = deepFreeze(
            makeRendererCatalog({
                stars: [a, b],
                constellations: [
                    makeRendererConstellation({
                        id: "c1",
                        stars: [a, b],
                        lines: [[0, 1]],
                    }),
                ],
            }),
        );
        const settings = deepFreeze({
            minimumMagnitude: 6,
            showConstellationLines: true,
            showStarNames: true,
        });
        const placementContext = deepFreeze({
            kind: "fixed-equatorial",
        } as CatalogPlacementContext);

        expect(
            () =>
                new ConstellationCatalogLayer(
                    makeLayerOptions({ catalog, settings, placementContext }),
                ),
        ).not.toThrow();

        expect(Object.isFrozen(catalog)).toBe(true);
        expect(Object.isFrozen(catalog.stars[0])).toBe(true);
        expect(Object.isFrozen(catalog.constellations[0])).toBe(true);
        expect(Object.isFrozen(settings)).toBe(true);
        expect(Object.isFrozen(placementContext)).toBe(true);
    });
});

describe("ConstellationCatalogLayer visibility, selection, and ticks", () => {
    function makeTwoConstellationCatalog(): RendererCatalog {
        const a = makeRendererStar({ id: "a" });
        const b = makeRendererStar({ id: "b" });
        const c = makeRendererStar({ id: "c" });
        const d = makeRendererStar({ id: "d" });
        return makeRendererCatalog({
            stars: [a, b, c, d],
            constellations: [
                makeRendererConstellation({
                    id: "c1",
                    stars: [a, b],
                    lines: [[0, 1]],
                }),
                makeRendererConstellation({
                    id: "c2",
                    stars: [c, d],
                    lines: [[0, 1]],
                }),
            ],
        });
    }

    it("setVisible toggles the root group", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );

        layer.setVisible(false);
        expect(layer.root.visible).toBe(false);
        layer.setVisible(true);
        expect(layer.root.visible).toBe(true);
    });

    it("selecting a constellation updates primary line uniforms only", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );
        const c1Material = getLineMaterial(layer, 0);
        const c2Material = getLineMaterial(layer, 1);

        layer.setSelectedConstellation("c1");
        expect(c1Material.uniforms.uIsSelected.value).toBe(1);
        expect(c1Material.uniforms.uIsDimmed.value).toBe(0);
        expect(c2Material.uniforms.uIsSelected.value).toBe(0);
        expect(c2Material.uniforms.uIsDimmed.value).toBe(1);

        layer.setSelectedConstellation(null);
        expect(c1Material.uniforms.uIsSelected.value).toBe(0);
        expect(c1Material.uniforms.uIsDimmed.value).toBe(0);
        expect(c2Material.uniforms.uIsSelected.value).toBe(0);
        expect(c2Material.uniforms.uIsDimmed.value).toBe(0);
    });

    it("setSelectedConstellation is a no-op for the reference role", () => {
        const a = makeRendererStar({ id: "a" });
        const b = makeRendererStar({ id: "b" });
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeRendererCatalog({
                    stars: [a, b],
                    constellations: [
                        makeRendererConstellation({
                            id: "c1",
                            stars: [a, b],
                            lines: [[0, 1]],
                        }),
                    ],
                }),
            }),
        );
        const material = getLineMaterial(layer);
        const periodBefore = material.uniforms.uDashPeriodWorld.value;
        const dutyBefore = material.uniforms.uDashDutyCycle.value;

        expect(() => layer.setSelectedConstellation("c1")).not.toThrow();
        expect(material.uniforms.uDashPeriodWorld.value).toBe(periodBefore);
        expect(material.uniforms.uDashDutyCycle.value).toBe(dutyBefore);
        expect(material.uniforms.uIsSelected).toBeUndefined();
    });

    it("tick advances point and line shader time uniforms", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );
        const pointMaterial = layer.ordinaryStarPoints!
            .material as THREE.ShaderMaterial;
        const lineMaterial = getLineMaterial(layer);

        expect(pointMaterial.uniforms.uTime.value).toBe(0);
        layer.tick(0.5);
        expect(pointMaterial.uniforms.uTime.value).toBe(0.5);
        expect(lineMaterial.uniforms.uTime.value).toBe(0.5);
        layer.tick(0.25);
        expect(pointMaterial.uniforms.uTime.value).toBe(0.75);
    });

    it("tick advances reference point time uniforms", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeTwoConstellationCatalog(),
            }),
        );
        const pointMaterial = layer.ordinaryStarPoints!
            .material as THREE.ShaderMaterial;

        layer.tick(0.1);
        expect(pointMaterial.uniforms.uTime.value).toBe(0.1);
    });

    it("getWorldPosition returns the placed position or null", () => {
        const a = makeRendererStar({
            id: "a",
            rightAscension: 5,
            declination: 20,
        });
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "primary",
                catalog: makeRendererCatalog({ stars: [a] }),
            }),
        );
        const placed = placeCatalogCoordinate(
            a,
            { kind: "fixed-equatorial" },
            100,
        );
        expect(placed.ok).toBe(true);
        if (!placed.ok) return;

        const world = layer.getWorldPosition("a");
        expect(world?.x).toBeCloseTo(placed.position.x, 5);
        expect(world?.y).toBeCloseTo(placed.position.y, 5);
        expect(world?.z).toBeCloseTo(placed.position.z, 5);
        expect(layer.getWorldPosition("missing")).toBeNull();
    });

    it("tags line hit objects with constellation ids and role render orders", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );

        expect(layer.lineHitObjects[0].userData.constellationId).toBe("c1");
        expect(layer.lineHitObjects[0].name).toBe("constellation-c1");
        expect(layer.lineHitObjects[1].userData.constellationId).toBe("c2");
        expect(layer.lineHitObjects[1].renderOrder).toBe(4);
        expect(layer.ordinaryStarPoints!.renderOrder).toBe(3);
    });

    it("uses reference render orders", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({
                role: "reference",
                catalog: makeTwoConstellationCatalog(),
            }),
        );

        expect(layer.lineHitObjects[0].renderOrder).toBe(1);
        expect(layer.ordinaryStarPoints!.renderOrder).toBe(2);
    });

    it("keeps marker hit objects empty until Task 4", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );

        expect(layer.markerHitObjects).toEqual([]);
    });

    it("dispose is callable until Task 4 owns disposal", () => {
        const layer = new ConstellationCatalogLayer(
            makeLayerOptions({ catalog: makeTwoConstellationCatalog() }),
        );

        expect(() => layer.dispose()).not.toThrow();
    });
});
