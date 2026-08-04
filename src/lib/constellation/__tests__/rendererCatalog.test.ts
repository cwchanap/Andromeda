import { describe, expect, it } from "vitest";
import type { Constellation, Star } from "@/types/constellation";
import type {
    PreparedConstellationCatalog,
    PreparedSourceStar,
    SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import {
    adaptLegacyCatalog,
    adaptPreparedCatalog,
} from "@/lib/constellation/rendererCatalog";

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
        deepFreeze(nested);
    }
    return Object.freeze(value);
}

function makeLegacyStar(overrides: Partial<Star> = {}): Star {
    return {
        id: overrides.id ?? "legacy-star",
        name: overrides.name ?? overrides.id ?? "Legacy Star",
        rightAscension: overrides.rightAscension ?? 0,
        declination: overrides.declination ?? 0,
        magnitude: overrides.magnitude ?? 2,
        distance: overrides.distance ?? 10,
        spectralClass: overrides.spectralClass ?? "G2V",
        color: overrides.color ?? "#FFF4E8",
    };
}

function makeLegacyConstellation(
    overrides: Partial<Constellation> = {},
): Constellation {
    return {
        id: overrides.id ?? "legacy-constellation",
        name: overrides.name ?? overrides.id ?? "Legacy Constellation",
        abbreviation: overrides.abbreviation ?? "LEG",
        description:
            overrides.description ?? "Legacy constellation description",
        mythology: overrides.mythology,
        stars: overrides.stars ?? [],
        lines: overrides.lines ?? [],
        visibility: overrides.visibility ?? {
            hemisphere: "both",
            bestMonths: [1, 2, 3],
            minLatitude: -90,
            maxLatitude: 90,
        },
    };
}

function makePreparedCatalogWithSyntheticSol(): PreparedConstellationCatalog {
    const sourceStar: PreparedSourceStar = {
        ...makeLegacyStar({ id: "alpha", name: "Alpha" }),
        marker: undefined,
    };
    const syntheticSol: SyntheticSolStar = {
        id: "sol",
        name: "Sol",
        rightAscension: 1.5,
        declination: 10,
        magnitude: 0,
        distance: 4,
        spectralClass: "G2V",
        color: "#FFF4E8",
        marker: { kind: "synthetic-sol" },
    };
    const line: readonly [number, number] = [0, 1];

    return {
        stars: [sourceStar, syntheticSol],
        constellations: [
            {
                id: "prepared-constellation",
                name: "Prepared Constellation",
                abbreviation: "PRE",
                description: "Prepared constellation description",
                stars: [sourceStar],
                lines: [line],
                visibility: {
                    hemisphere: "both",
                    bestMonths: [1, 2, 3],
                    minLatitude: -90,
                    maxLatitude: 90,
                },
            },
        ],
    };
}

describe("adaptPreparedCatalog", () => {
    it("adapts a prepared catalog as a typed identity seam", () => {
        const catalog = makePreparedCatalogWithSyntheticSol();

        const adapted = adaptPreparedCatalog(catalog);

        expect(adapted).toBe(catalog);
        expect(adapted.stars.at(-1)?.marker?.kind).toBe("synthetic-sol");
        expect(adapted.constellations[0].lines[0]).toBe(
            catalog.constellations[0].lines[0],
        );
    });

    it("preserves the authoritative top-level star sequence and identity", () => {
        const catalog = makePreparedCatalogWithSyntheticSol();

        const adapted = adaptPreparedCatalog(catalog);

        expect(adapted.stars.map((star) => star.id)).toEqual(["alpha", "sol"]);
        expect(adapted.stars[0]).toBe(catalog.stars[0]);
        expect(adapted.stars[1]).toBe(catalog.stars[1]);
    });

    it("preserves local constellation stars without rebuilding them", () => {
        const catalog = makePreparedCatalogWithSyntheticSol();

        const adapted = adaptPreparedCatalog(catalog);

        expect(adapted.constellations[0].stars[0]).toBe(
            catalog.constellations[0].stars[0],
        );
        expect(adapted.constellations[0].stars[0]).toBe(catalog.stars[0]);
    });

    it("does not mutate a deeply frozen prepared catalog", () => {
        const catalog = deepFreeze(makePreparedCatalogWithSyntheticSol());

        const adapted = adaptPreparedCatalog(catalog);

        expect(adapted).toBe(catalog);
        expect(adapted.stars.at(-1)?.marker?.kind).toBe("synthetic-sol");
        expect(adapted.constellations[0].lines[0]).toBe(
            catalog.constellations[0].lines[0],
        );
    });
});

describe("adaptLegacyCatalog", () => {
    it("uses the supplied legacy top-level stars without membership flattening", () => {
        const shared = makeLegacyStar({ id: "shared" });
        const topLevelOnly = makeLegacyStar({ id: "top-level-only" });
        const constellation = makeLegacyConstellation({
            stars: [shared, shared],
            lines: [[0, 1]],
        });

        const adapted = adaptLegacyCatalog(
            [shared, topLevelOnly],
            [constellation],
        );

        expect(adapted.stars.map((star) => star.id)).toEqual([
            "shared",
            "top-level-only",
        ]);
    });

    it("drops malformed and out-of-range legacy lines once", () => {
        const constellation = makeLegacyConstellation({
            stars: [makeLegacyStar({ id: "a" }), makeLegacyStar({ id: "b" })],
            lines: [[0, 1], [0], [0, 1, 2], [0.5, 1], [-1, 1], [0, 2]],
        });

        const adapted = adaptLegacyCatalog([], [constellation]);

        expect(adapted.constellations[0].lines).toEqual([[0, 1]]);
    });

    it("skips a non-array runtime line value (null) before .length dereference", () => {
        const constellation = makeLegacyConstellation({
            stars: [makeLegacyStar({ id: "a" }), makeLegacyStar({ id: "b" })],
            // A deserialized runtime null must be skipped, not throw on
            // .length. Cast through unknown to inject the malformed value
            // past the typed lines field.
            lines: [null as unknown as number[], [0, 1]],
        });

        const adapted = adaptLegacyCatalog([], [constellation]);

        expect(adapted.constellations[0].lines).toEqual([[0, 1]]);
    });

    it("preserves legacy star object identity and top-level order", () => {
        const shared = makeLegacyStar({ id: "shared" });
        const constellation = makeLegacyConstellation({
            stars: [shared, makeLegacyStar({ id: "local-only" })],
            lines: [[0, 1]],
        });

        const adapted = adaptLegacyCatalog([shared], [constellation]);

        expect(adapted.stars[0]).toBe(shared);
        expect(adapted.constellations[0].stars[0]).toBe(shared);
        expect(adapted.constellations[0].stars[1]).toBe(constellation.stars[1]);
        expect(adapted.constellations[0]).not.toBe(constellation);
        expect(adapted.constellations[0].lines).not.toBe(constellation.lines);
    });

    it("does not mutate deeply frozen legacy inputs", () => {
        const shared = deepFreeze(makeLegacyStar({ id: "shared" }));
        const stars = deepFreeze([shared]);
        const constellation = deepFreeze(
            makeLegacyConstellation({
                stars: [shared, makeLegacyStar({ id: "b" })],
                lines: [[0, 1], [0], [0, 1, 2], [0.5, 1], [-1, 1], [0, 2]],
            }),
        );

        const adapted = adaptLegacyCatalog(stars, [constellation]);

        expect(adapted.stars[0]).toBe(shared);
        expect(adapted.constellations[0].lines).toEqual([[0, 1]]);
        expect(Object.isFrozen(stars)).toBe(true);
        expect(Object.isFrozen(constellation)).toBe(true);
        expect(Object.isFrozen(constellation.stars)).toBe(true);
        expect(Object.isFrozen(constellation.lines)).toBe(true);
        expect(Object.isFrozen(constellation.lines[0])).toBe(true);
    });
});
