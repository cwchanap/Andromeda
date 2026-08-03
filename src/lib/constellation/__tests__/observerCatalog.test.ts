import { describe, expect, it } from "vitest";
import {
    SYNTHETIC_SOL_COLOR,
    SYNTHETIC_SOL_RENDER_MAGNITUDE,
    SYNTHETIC_SOL_STAR_ID,
    createSyntheticSol,
    isSyntheticSolStar,
    prepareAlternateObserverCatalog,
    transformCatalogToObserver,
    type PreparedSourceStar,
    type SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import {
    ALPHA_CENTAURI_OBSERVER,
    CENTAURUS_FIXTURE,
    SOL_OBSERVER,
    makeConstellation,
    makeStar,
} from "./observerCatalog.fixtures";
import type { Constellation } from "@/types/constellation";
import { constellations as productionConstellations } from "@/data/constellations";

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
        deepFreeze(nested);
    }
    return Object.freeze(value);
}

describe("observerCatalog public contract", () => {
    it("uses a value-based synthetic-Sol discriminator", () => {
        const source = makeStar({ id: "source" }) as PreparedSourceStar;
        const sol: SyntheticSolStar = {
            ...makeStar({ id: SYNTHETIC_SOL_STAR_ID, name: "Sol" }),
            id: SYNTHETIC_SOL_STAR_ID,
            magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE,
            color: SYNTHETIC_SOL_COLOR,
            marker: { kind: "synthetic-sol" },
        };

        expect(isSyntheticSolStar(source)).toBe(false);
        expect(isSyntheticSolStar(sol)).toBe(true);
        expect(SYNTHETIC_SOL_STAR_ID).toBe("sol");
    });
});

function preparedStarById(
    stars: readonly PreparedSourceStar[],
    id: string,
): PreparedSourceStar {
    const star = stars.find((candidate) => candidate.id === id);
    expect(star).toBeDefined();
    return star!;
}

describe("transformCatalogToObserver happy path", () => {
    it("identity-transforms ordinary stars for a Sol observer", () => {
        const source = makeStar({
            id: "identity",
            rightAscension: 23.5,
            declination: -25,
            distance: 42,
            magnitude: 1.25,
        });
        const constellation = makeConstellation({
            id: "identity-constellation",
            stars: [source],
        });

        const result = transformCatalogToObserver(
            [constellation],
            SOL_OBSERVER,
            { includeReferenceCatalog: true },
        );
        const transformed = preparedStarById(
            result.transformedCatalog.stars as readonly PreparedSourceStar[],
            "identity",
        );

        expect(transformed.rightAscension).toBeCloseTo(23.5, 10);
        expect(transformed.declination).toBeCloseTo(-25, 10);
        expect(transformed.distance).toBeCloseTo(42, 10);
        expect(transformed.magnitude).toBe(1.25);
        expect(result.omittedStars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([source]);
        expect(result.referenceCatalog?.stars[0]).not.toBe(source);
        expect(result.referenceCatalog?.stars[0]).not.toBe(transformed);
    });

    it("uses first occurrence as canonical and preserves top-level order", () => {
        const firstA = makeStar({ id: "a", distance: 10, name: "first-a" });
        const conflictingA = makeStar({
            id: "a",
            distance: 20,
            name: "second-a",
        });
        const b = makeStar({ id: "b", rightAscension: 6, distance: 12 });
        const source = [
            makeConstellation({ id: "one", stars: [firstA, b] }),
            makeConstellation({ id: "two", stars: [conflictingA] }),
        ];

        const result = transformCatalogToObserver(source, SOL_OBSERVER);

        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "a",
            "b",
        ]);
        expect(result.transformedCatalog.stars[0].name).toBe("first-a");
        expect(result.transformedCatalog.stars[0].distance).toBeCloseTo(10, 10);
        expect(result.transformedCatalog.constellations[1].stars[0]).toBe(
            result.transformedCatalog.stars[0],
        );
    });

    it("transforms a nearby observer without changing magnitude", () => {
        const source = makeStar({
            id: "target",
            rightAscension: 0,
            declination: 0,
            distance: 10,
            magnitude: -1,
        });
        const result = transformCatalogToObserver(
            [makeConstellation({ id: "nearby", stars: [source] })],
            ALPHA_CENTAURI_OBSERVER,
        );
        const transformed = result.transformedCatalog.stars[0];

        expect(transformed.distance).not.toBe(source.distance);
        expect(transformed.rightAscension).toBeGreaterThanOrEqual(0);
        expect(transformed.rightAscension).toBeLessThan(24);
        expect(transformed.magnitude).toBe(-1);
    });
});

describe("coordinate omissions and line reconstruction", () => {
    it("remaps surviving lines without inventing a bridge", () => {
        const a = makeStar({ id: "a", distance: 10 });
        const b = makeStar({ id: "b", distance: 0 });
        const c = makeStar({ id: "c", rightAscension: 6, distance: 10 });
        const d = makeStar({ id: "d", rightAscension: 12, distance: 10 });
        const source = makeConstellation({
            id: "line-repair",
            stars: [a, b, c, d],
            lines: [
                [0, 1],
                [1, 2],
                [2, 3],
                [0, 3],
            ],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER, {
            includeReferenceCatalog: true,
        });

        expect(
            result.transformedCatalog.constellations[0].stars.map((s) => s.id),
        ).toEqual(["a", "c", "d"]);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([
            [1, 2],
            [0, 2],
        ]);
        expect(result.referenceCatalog?.constellations[0].lines).toEqual([
            [1, 2],
            [0, 2],
        ]);
        expect(result.omittedStars[0]).toMatchObject({
            starId: "b",
            reason: {
                code: "coordinate-transform-failed",
                error: { code: "invalid-distance", distanceLightYears: 0 },
            },
            referenceDisposition: "omitted",
        });
    });

    it("skips malformed lines before tuple narrowing", () => {
        const stars = [makeStar({ id: "a" }), makeStar({ id: "b" })];
        const source = makeConstellation({
            id: "malformed-lines",
            stars,
            lines: [[0, 1], [0], [0, 1, 0], [0.5, 1], [-1, 1], [0, 2]],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([
            [0, 1],
        ]);
    });

    it("retains a fully depleted constellation", () => {
        const source = makeConstellation({
            id: "depleted",
            stars: [makeStar({ id: "bad", distance: -1 })],
            lines: [[0, 0]],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER);

        expect(result.transformedCatalog.constellations).toHaveLength(1);
        expect(result.transformedCatalog.constellations[0]).toMatchObject({
            id: "depleted",
            stars: [],
            lines: [],
        });
        expect(result.transformedCatalog.constellations[0].visibility).not.toBe(
            source.visibility,
        );
    });

    it.each([
        {
            name: "negative distance",
            star: makeStar({ id: "negative", distance: -1 }),
            observer: SOL_OBSERVER,
            expected: { code: "invalid-distance", distanceLightYears: -1 },
        },
        {
            name: "out-of-range declination",
            star: makeStar({ id: "declination", declination: 100 }),
            observer: SOL_OBSERVER,
            expected: {
                code: "declination-out-of-range",
                declinationDegrees: 100,
            },
        },
        {
            name: "exact observer collision",
            star: makeStar({
                id: "collision",
                rightAscension: 0,
                declination: 0,
                distance: 1,
            }),
            observer: { x: 1, y: 0, z: 0 },
            expected: {
                code: "undefined-direction",
                distanceLightYears: 0,
                thresholdLightYears: 1e-12,
            },
        },
        {
            name: "subtraction overflow",
            star: makeStar({
                id: "vector-overflow",
                rightAscension: 0,
                declination: 0,
                distance: Number.MAX_VALUE,
            }),
            observer: { x: -Number.MAX_VALUE, y: 0, z: 0 },
            expected: {
                code: "non-finite-cartesian-input",
                role: "vector",
                component: "x",
            },
        },
        {
            name: "derived norm overflow",
            star: makeStar({
                id: "norm-overflow",
                rightAscension: 0,
                declination: 0,
                distance: 10,
            }),
            observer: {
                x: Number.MAX_VALUE,
                y: Number.MAX_VALUE,
                z: Number.MAX_VALUE,
            },
            expected: { code: "cartesian-distance-overflow" },
        },
    ])("preserves $name failures", ({ star, observer, expected }) => {
        const result = transformCatalogToObserver(
            [makeConstellation({ id: "errors", stars: [star] })],
            observer,
            { includeReferenceCatalog: true },
        );

        expect(result.transformedCatalog.stars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([]);
        expect(result.omittedStars[0].reason).toEqual({
            code: "coordinate-transform-failed",
            error: expected,
        });
    });

    it("returns one ordered diagnostic with every duplicate membership", () => {
        const invalid = makeStar({ id: "shared-invalid", distance: 0 });
        const source = [
            makeConstellation({ id: "first", stars: [invalid] }),
            makeConstellation({
                id: "second",
                stars: [makeStar({ id: "other" }), invalid],
            }),
        ];

        const result = transformCatalogToObserver(source, SOL_OBSERVER);

        expect(result.omittedStars).toHaveLength(1);
        expect(result.omittedStars[0].memberships).toEqual([
            { constellationId: "first", originalStarIndex: 0 },
            { constellationId: "second", originalStarIndex: 1 },
        ]);
    });
});

describe("observer-source exclusions", () => {
    it("pins the production Alpha Centauri distance mismatch", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
        );
        const alpha = result.transformedCatalog.stars.find(
            (star) => star.id === "alpha_cen",
        );

        expect(alpha?.distance).toBeCloseTo(0.1235008239, 9);
    });

    it("omits a valid observer source from primary and retains it in reference", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "beta_cen",
        ]);
        expect(
            result.transformedCatalog.constellations[0].stars.map(
                (star) => star.id,
            ),
        ).toEqual(["beta_cen"]);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([]);
        expect(result.referenceCatalog?.stars.map((star) => star.id)).toEqual([
            "alpha_cen",
            "beta_cen",
        ]);
        expect(result.referenceCatalog?.constellations[0].lines).toEqual([
            [0, 1],
        ]);
        expect(result.omittedStars).toEqual([
            {
                starId: "alpha_cen",
                starName: "Alpha Centauri",
                memberships: [
                    { constellationId: "centaurus", originalStarIndex: 0 },
                ],
                reason: { code: "observer-source-star-excluded" },
                referenceDisposition: "retained",
            },
        ]);
    });

    it("deduplicates option IDs and ignores unknown IDs", () => {
        const result = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                observerSourceStarIds: ["unknown", "alpha_cen", "alpha_cen"],
            },
        );

        expect(result.omittedStars.map((item) => item.starId)).toEqual([
            "alpha_cen",
        ]);
    });

    it("supports multiple exclusions and ignores option order", () => {
        const first = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["beta_cen", "alpha_cen"],
            },
        );
        const second = transformCatalogToObserver(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen", "beta_cen"],
            },
        );

        expect(first).toEqual(second);
        expect(first.transformedCatalog.stars).toEqual([]);
        expect(first.omittedStars.map((item) => item.starId)).toEqual([
            "alpha_cen",
            "beta_cen",
        ]);
        expect(first.referenceCatalog?.stars.map((star) => star.id)).toEqual([
            "alpha_cen",
            "beta_cen",
        ]);
    });

    it("omits an invalid excluded source from both roles", () => {
        const invalid = makeStar({ id: "invalid-local", distance: 0 });
        const source = makeConstellation({
            id: "invalid-local-constellation",
            stars: [invalid],
        });

        const result = transformCatalogToObserver(
            [source],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["invalid-local"],
            },
        );

        expect(result.transformedCatalog.stars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([]);
        expect(result.omittedStars[0]).toMatchObject({
            reason: {
                code: "coordinate-transform-failed",
                error: { code: "invalid-distance", distanceLightYears: 0 },
            },
            referenceDisposition: "omitted",
        });
    });
});

describe("synthetic Sol and alternate composition", () => {
    it("creates Sol through the Cartesian-origin primitive path", () => {
        const result = createSyntheticSol(ALPHA_CENTAURI_OBSERVER);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.id).toBe(SYNTHETIC_SOL_STAR_ID);
        expect(result.value.rightAscension).toBeCloseTo(2.66, 10);
        expect(result.value.declination).toBeCloseTo(60.84, 10);
        expect(result.value.distance).toBeCloseTo(4.2465, 10);
        expect(isSyntheticSolStar(result.value)).toBe(true);
    });

    it("rejects synthetic Sol for a Sol-origin observer", () => {
        expect(createSyntheticSol(SOL_OBSERVER)).toEqual({
            ok: false,
            error: {
                code: "undefined-direction",
                distanceLightYears: 0,
                thresholdLightYears: 1e-12,
            },
        });
    });

    it.each([
        {
            name: "non-finite observer",
            observer: { x: Number.NaN, y: 0, z: 0 },
            cause: {
                code: "non-finite-cartesian-input",
                role: "observer",
                component: "x",
            },
        },
        {
            name: "observer norm overflow",
            observer: {
                x: Number.MAX_VALUE,
                y: Number.MAX_VALUE,
                z: Number.MAX_VALUE,
            },
            cause: { code: "cartesian-distance-overflow" },
        },
    ])("fails before catalog preparation for $name", ({ observer, cause }) => {
        expect(
            prepareAlternateObserverCatalog([CENTAURUS_FIXTURE], observer, {
                includeReferenceCatalog: true,
            }),
        ).toEqual({
            ok: false,
            error: { code: "synthetic-sol-unavailable", cause },
        });
    });

    it("appends synthetic Sol once after canonical primary stars", () => {
        const result = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
            result.value.primaryCatalog.stars.map((star) => star.id),
        ).toEqual(["beta_cen", "sol"]);
        expect(
            result.value.primaryCatalog.constellations.some((constellation) =>
                constellation.stars.some((star) => star.id === "sol"),
            ),
        ).toBe(false);
        expect(
            result.value.referenceCatalog?.stars.map((star) => star.id),
        ).toEqual(["alpha_cen", "beta_cen"]);
    });

    it("returns no partial catalog for a Sol-origin observer", () => {
        expect(
            prepareAlternateObserverCatalog([CENTAURUS_FIXTURE], SOL_OBSERVER, {
                includeReferenceCatalog: true,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: {
                    code: "undefined-direction",
                    distanceLightYears: 0,
                    thresholdLightYears: 1e-12,
                },
            },
        });
    });

    it("returns only synthetic Sol for empty valid input", () => {
        const result = prepareAlternateObserverCatalog(
            [],
            ALPHA_CENTAURI_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
            result.value.primaryCatalog.stars.map((star) => star.id),
        ).toEqual(["sol"]);
        expect(result.value.primaryCatalog.constellations).toEqual([]);
        expect(result.value.referenceCatalog).toEqual({
            stars: [],
            constellations: [],
        });
        expect(result.value.omittedStars).toEqual([]);
    });
});

describe("observer catalog invariants", () => {
    it("reserves the synthetic Sol ID in production constellation members", () => {
        const sourceIds = productionConstellations.flatMap((constellation) =>
            constellation.stars.map((star) => star.id),
        );
        expect(sourceIds).not.toContain(SYNTHETIC_SOL_STAR_ID);
    });

    it("does not perform Earth visibility filtering", () => {
        const southern = makeConstellation({
            id: "southern-only",
            stars: [makeStar({ id: "south", declination: -70 })],
            hemisphere: "southern",
        });

        const result = transformCatalogToObserver([southern], SOL_OBSERVER);

        expect(
            result.transformedCatalog.constellations.map((item) => item.id),
        ).toEqual(["southern-only"]);
        expect(result.transformedCatalog.stars.map((star) => star.id)).toEqual([
            "south",
        ]);
    });

    it("keeps diagnostics in failed canonical first-appearance order", () => {
        const source = [
            makeConstellation({
                id: "first",
                stars: [
                    makeStar({ id: "valid-a" }),
                    makeStar({ id: "bad-a", distance: 0 }),
                ],
            }),
            makeConstellation({
                id: "second",
                stars: [
                    makeStar({ id: "excluded" }),
                    makeStar({ id: "bad-b", declination: 100 }),
                ],
            }),
        ];

        const result = transformCatalogToObserver(source, SOL_OBSERVER, {
            observerSourceStarIds: ["excluded"],
        });

        expect(result.omittedStars.map((item) => item.starId)).toEqual([
            "bad-a",
            "excluded",
            "bad-b",
        ]);
    });

    it("does not mutate deeply frozen inputs or option arrays", () => {
        const source = deepFreeze([
            makeConstellation({
                id: "frozen",
                stars: [makeStar({ id: "frozen-star" })],
                lines: [[0, 0]],
            }),
        ]);
        const observer = deepFreeze({ ...ALPHA_CENTAURI_OBSERVER });
        const observerSourceStarIds = deepFreeze(["frozen-star"]);

        expect(() =>
            transformCatalogToObserver(source, observer, {
                includeReferenceCatalog: true,
                observerSourceStarIds,
            }),
        ).not.toThrow();
        expect(source[0].stars[0].id).toBe("frozen-star");
        expect(observer).toEqual(ALPHA_CENTAURI_OBSERVER);
        expect(observerSourceStarIds).toEqual(["frozen-star"]);
    });

    it("returns independent primary and reference objects", () => {
        const source = makeConstellation({
            id: "independence",
            stars: [makeStar({ id: "independent" })],
            lines: [[0, 0]],
        });
        const result = transformCatalogToObserver(
            [source],
            ALPHA_CENTAURI_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(result.referenceCatalog).toBeDefined();
        expect(result.transformedCatalog.stars[0]).not.toBe(
            result.referenceCatalog!.stars[0],
        );
        expect(result.transformedCatalog.constellations[0]).not.toBe(
            result.referenceCatalog!.constellations[0],
        );
        expect(result.transformedCatalog.constellations[0].visibility).not.toBe(
            result.referenceCatalog!.constellations[0].visibility,
        );
        expect(result.transformedCatalog.constellations[0].lines[0]).not.toBe(
            result.referenceCatalog!.constellations[0].lines[0],
        );
    });

    it("is deterministic and preserves marker discrimination after JSON round trip", () => {
        const first = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );
        const second = prepareAlternateObserverCatalog(
            [CENTAURUS_FIXTURE],
            ALPHA_CENTAURI_OBSERVER,
            {
                includeReferenceCatalog: true,
                observerSourceStarIds: ["alpha_cen"],
            },
        );

        expect(second).toEqual(first);
        const parsed = JSON.parse(JSON.stringify(first)) as typeof first;
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const parsedSol = parsed.value.primaryCatalog.stars.at(-1)!;
        expect(isSyntheticSolStar(parsedSol)).toBe(true);
        expect(
            parsed.value.primaryCatalog.stars
                .slice(0, -1)
                .every((star) => !isSyntheticSolStar(star)),
        ).toBe(true);
    });

    it("serializes non-finite source failures without numeric nulls", () => {
        const result = transformCatalogToObserver(
            [
                makeConstellation({
                    id: "non-finite",
                    stars: [
                        makeStar({
                            id: "nan-ra",
                            rightAscension: Number.NaN,
                        }),
                    ],
                }),
            ],
            SOL_OBSERVER,
        );
        const json = JSON.stringify(result);

        expect(json).not.toContain('"rightAscension":null');
        expect(JSON.parse(json).omittedStars[0].reason).toEqual({
            code: "coordinate-transform-failed",
            error: {
                code: "non-finite-equatorial-input",
                component: "rightAscensionHours",
            },
        });
    });
});

describe("non-finite metadata and reserved-marker stripping", () => {
    it("omits a star with finite coordinates but non-finite magnitude", () => {
        const nanMagnitude = makeStar({
            id: "nan-magnitude",
            rightAscension: 6,
            declination: 30,
            distance: 12,
            magnitude: Number.NaN,
        });
        const infMagnitude = makeStar({
            id: "inf-magnitude",
            rightAscension: 6,
            declination: 30,
            distance: 12,
            magnitude: Number.POSITIVE_INFINITY,
        });
        const source = makeConstellation({
            id: "bad-magnitude",
            stars: [nanMagnitude, infMagnitude],
            lines: [[0, 1]],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER, {
            includeReferenceCatalog: true,
        });

        expect(result.transformedCatalog.stars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([]);
        expect(result.transformedCatalog.constellations[0].stars).toEqual([]);
        expect(result.transformedCatalog.constellations[0].lines).toEqual([]);
        expect(result.omittedStars).toEqual([
            {
                starId: "nan-magnitude",
                starName: "nan-magnitude",
                memberships: [
                    { constellationId: "bad-magnitude", originalStarIndex: 0 },
                ],
                reason: { code: "non-finite-metadata", field: "magnitude" },
                referenceDisposition: "omitted",
            },
            {
                starId: "inf-magnitude",
                starName: "inf-magnitude",
                memberships: [
                    { constellationId: "bad-magnitude", originalStarIndex: 1 },
                ],
                reason: { code: "non-finite-metadata", field: "magnitude" },
                referenceDisposition: "omitted",
            },
        ]);
        // Section 13: no NaN/Infinity reaches the JSON-safe output.
        const json = JSON.stringify(result);
        expect(json).not.toContain('"magnitude":null');
        expect(json).not.toContain("Infinity");
    });

    it("omits a non-finite-magnitude observer-source star from both roles", () => {
        const source = makeConstellation({
            id: "excluded-bad-magnitude",
            stars: [
                makeStar({
                    id: "excluded-nan",
                    magnitude: Number.NaN,
                }),
            ],
        });

        const result = transformCatalogToObserver([source], SOL_OBSERVER, {
            includeReferenceCatalog: true,
            observerSourceStarIds: ["excluded-nan"],
        });

        expect(result.transformedCatalog.stars).toEqual([]);
        expect(result.referenceCatalog?.stars).toEqual([]);
        expect(result.omittedStars[0]).toMatchObject({
            starId: "excluded-nan",
            reason: { code: "non-finite-metadata", field: "magnitude" },
            referenceDisposition: "omitted",
        });
    });

    it("drops a constellation with non-finite visibility but keeps its stars", () => {
        const shared = makeStar({ id: "shared-star", distance: 10 });
        const badVisibility: Constellation = {
            id: "bad-visibility",
            name: "bad-visibility",
            abbreviation: "bad",
            description: "description",
            mythology: "mythology",
            stars: [shared],
            lines: [],
            visibility: {
                hemisphere: "both",
                bestMonths: [1, Number.NaN, 3],
                minLatitude: -90,
                maxLatitude: Number.POSITIVE_INFINITY,
            },
        };
        const goodConstellation = makeConstellation({
            id: "good-sharer",
            stars: [shared],
            lines: [[0, 0]],
        });

        const result = transformCatalogToObserver(
            [badVisibility, goodConstellation],
            SOL_OBSERVER,
            { includeReferenceCatalog: true },
        );

        expect(
            result.transformedCatalog.constellations.map((c) => c.id),
        ).toEqual(["good-sharer"]);
        expect(
            result.referenceCatalog?.constellations.map((c) => c.id),
        ).toEqual(["good-sharer"]);
        // The shared star survives in the top-level stars array and in the
        // good constellation; only the bad-visibility constellation is dropped.
        expect(result.transformedCatalog.stars.map((s) => s.id)).toEqual([
            "shared-star",
        ]);
        expect(
            result.transformedCatalog.constellations[0].stars.map((s) => s.id),
        ).toEqual(["shared-star"]);
        expect(result.omittedStars).toEqual([]);
        // Section 13: no NaN/Infinity leaks via the dropped visibility.
        const json = JSON.stringify(result);
        expect(json).not.toContain('"maxLatitude":null');
        expect(json).not.toContain('"bestMonths":null');
        expect(json).not.toContain("Infinity");
    });

    it("strips a reserved synthetic-Sol marker from an ordinary source star", () => {
        const poisoned = {
            ...makeStar({ id: "ordinary-star", distance: 10 }),
            marker: { kind: "synthetic-sol" },
        } as unknown as ReturnType<typeof makeStar>;

        const result = transformCatalogToObserver(
            [makeConstellation({ id: "marker-strip", stars: [poisoned] })],
            SOL_OBSERVER,
            { includeReferenceCatalog: true },
        );

        const primary = result.transformedCatalog.stars[0];
        const reference = result.referenceCatalog!.stars[0];

        expect(isSyntheticSolStar(primary)).toBe(false);
        expect(isSyntheticSolStar(reference)).toBe(false);
        expect((primary as { marker?: unknown }).marker).toBeUndefined();
        expect((reference as { marker?: unknown }).marker).toBeUndefined();
        // A JSON round trip must not resurrect the marker.
        const parsed = JSON.parse(JSON.stringify(primary)) as {
            marker?: unknown;
        };
        expect(parsed.marker).toBeUndefined();
    });

    it("strips the reserved marker from the transformed (non-identity) path", () => {
        const poisoned = {
            ...makeStar({
                id: "transformed-marker",
                rightAscension: 0,
                declination: 0,
                distance: 10,
            }),
            marker: { kind: "synthetic-sol" },
        } as unknown as ReturnType<typeof makeStar>;

        const result = transformCatalogToObserver(
            [
                makeConstellation({
                    id: "transformed-marker-c",
                    stars: [poisoned],
                }),
            ],
            ALPHA_CENTAURI_OBSERVER,
        );

        const transformed = result.transformedCatalog.stars[0];
        expect(isSyntheticSolStar(transformed)).toBe(false);
        expect((transformed as { marker?: unknown }).marker).toBeUndefined();
    });
});
