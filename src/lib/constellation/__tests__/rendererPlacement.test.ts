import { describe, expect, expectTypeOf, it } from "vitest";
import { celestialToSphere } from "@/utils/astronomy";
import type { SkyConfiguration } from "@/types/constellation";
import type { CatalogPlacementContext } from "@/lib/constellation/rendererPlacement";
import { placeCatalogCoordinate } from "@/lib/constellation/rendererPlacement";

function makeSkyConfig(
    overrides: Partial<SkyConfiguration> = {},
): SkyConfiguration {
    return {
        location: overrides.location ?? {
            latitude: 22.3,
            longitude: 114.17,
            timezone: "Asia/Hong_Kong",
        },
        dateTime: overrides.dateTime ?? new Date("2026-08-03T12:00:00Z"),
        fieldOfView: overrides.fieldOfView ?? 60,
        showConstellationLines: overrides.showConstellationLines ?? true,
        showStarNames: overrides.showStarNames ?? true,
        minimumMagnitude: overrides.minimumMagnitude ?? 6,
    };
}

function expectVectorClose(
    actual: readonly number[],
    expected: readonly number[],
): void {
    actual.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index], 10);
    });
}

describe("placeCatalogCoordinate", () => {
    it("delegates Earth-horizontal placement to celestialToSphere", () => {
        const skyConfig = makeSkyConfig();
        const star = { rightAscension: 6.75, declination: 16.72 };

        const result = placeCatalogCoordinate(
            star,
            { kind: "earth-horizontal", skyConfig },
            100,
        );

        const expected = celestialToSphere(
            star.rightAscension,
            star.declination,
            skyConfig.location,
            skyConfig.dateTime,
            100,
        );
        expect(result).toEqual({
            ok: true,
            position: { x: expected.x, y: expected.y, z: expected.z },
        });
    });

    it.each([
        [0, 0, [1, 0, 0]],
        [6, 0, [0, 0, 1]],
        [12, 0, [-1, 0, 0]],
        [18, 0, [0, 0, -1]],
        [0, 90, [0, 1, 0]],
        [0, -90, [0, -1, 0]],
    ])("places RA %sh Dec %s° on the HPA-431 axes", (ra, dec, expected) => {
        const result = placeCatalogCoordinate(
            { rightAscension: ra, declination: dec },
            { kind: "fixed-equatorial" },
            1,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expectVectorClose(
                [result.position.x, result.position.y, result.position.z],
                expected,
            );
        }
    });

    it.each([
        ["rightAscension", Number.NaN],
        ["rightAscension", Number.POSITIVE_INFINITY],
        ["declination", Number.NaN],
        ["declination", Number.NEGATIVE_INFINITY],
    ] as const)(
        "rejects non-finite %s in earth-horizontal context",
        (component, value) => {
            const skyConfig = makeSkyConfig();
            const star = { rightAscension: 6.75, declination: 16.72 };
            if (component === "rightAscension") {
                star.rightAscension = value;
            } else {
                star.declination = value;
            }

            const result = placeCatalogCoordinate(
                star,
                { kind: "earth-horizontal", skyConfig },
                100,
            );

            expect(result).toEqual({
                ok: false,
                error: { code: "non-finite-render-coordinate", component },
            });
        },
    );

    it.each([
        ["rightAscension", Number.NaN],
        ["rightAscension", Number.POSITIVE_INFINITY],
        ["declination", Number.NaN],
        ["declination", Number.NEGATIVE_INFINITY],
    ] as const)(
        "rejects non-finite %s in fixed-equatorial context",
        (component, value) => {
            const star = { rightAscension: 6.75, declination: 16.72 };
            if (component === "rightAscension") {
                star.rightAscension = value;
            } else {
                star.declination = value;
            }

            const result = placeCatalogCoordinate(
                star,
                { kind: "fixed-equatorial" },
                1,
            );

            expect(result).toEqual({
                ok: false,
                error: { code: "non-finite-render-coordinate", component },
            });
        },
    );

    it.each([91, -91])(
        "rejects fixed-equatorial declination %s°",
        (declination) => {
            const result = placeCatalogCoordinate(
                { rightAscension: 0, declination },
                { kind: "fixed-equatorial" },
                1,
            );

            expect(result).toEqual({
                ok: false,
                error: { code: "declination-out-of-range", declination },
            });
        },
    );

    it("delegates finite out-of-range declination 91° in earth-horizontal context", () => {
        const skyConfig = makeSkyConfig();
        const star = { rightAscension: 6.75, declination: 91 };

        const result = placeCatalogCoordinate(
            star,
            { kind: "earth-horizontal", skyConfig },
            100,
        );

        const expected = celestialToSphere(
            star.rightAscension,
            star.declination,
            skyConfig.location,
            skyConfig.dateTime,
            100,
        );
        expect(result).toEqual({
            ok: true,
            position: { x: expected.x, y: expected.y, z: expected.z },
        });
    });

    it.each([
        [24, 0, [1, 0, 0]],
        [-6, 0, [0, 0, -1]],
    ])(
        "wraps finite RA %sh geometrically on the HPA-431 axes",
        (ra, dec, expected) => {
            const result = placeCatalogCoordinate(
                { rightAscension: ra, declination: dec },
                { kind: "fixed-equatorial" },
                1,
            );

            expect(result.ok).toBe(true);
            if (result.ok) {
                expectVectorClose(
                    [result.position.x, result.position.y, result.position.z],
                    expected,
                );
            }
        },
    );

    it("accepts a fixed-equatorial context without any location or date inputs", () => {
        expectTypeOf<
            Extract<CatalogPlacementContext, { kind: "fixed-equatorial" }>
        >().toEqualTypeOf<{ readonly kind: "fixed-equatorial" }>();
        expectTypeOf<
            Extract<CatalogPlacementContext, { kind: "earth-horizontal" }>
        >().toEqualTypeOf<{
            readonly kind: "earth-horizontal";
            readonly skyConfig: Readonly<SkyConfiguration>;
        }>();
    });
});
