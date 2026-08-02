import { describe, expect, it } from "vitest";
import {
    SYNTHETIC_SOL_COLOR,
    SYNTHETIC_SOL_RENDER_MAGNITUDE,
    SYNTHETIC_SOL_STAR_ID,
    isSyntheticSolStar,
    transformCatalogToObserver,
    type PreparedSourceStar,
    type SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import {
    ALPHA_CENTAURI_OBSERVER,
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
