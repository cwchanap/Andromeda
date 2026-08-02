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
