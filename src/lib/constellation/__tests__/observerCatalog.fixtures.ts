import type { Constellation, Star } from "@/types/constellation";
import type { CartesianLightYears } from "@/lib/astronomy/observerTransform";

export const SOL_OBSERVER: CartesianLightYears = Object.freeze({
    x: 0,
    y: 0,
    z: 0,
});

// Positioned along Alpha Centauri's sky direction (RA 14.66h, Dec -60.834deg)
// at a Cartesian norm of ~4.2465 ly. This norm intentionally differs from
// ALPHA_CENTAURI_CATALOG_STAR's 4.37 ly catalog distance so the transformed
// observer-to-star distance is nonzero (~0.1235 ly); see the "pins the
// production Alpha Centauri distance mismatch" test.
export const ALPHA_CENTAURI_OBSERVER: CartesianLightYears = Object.freeze({
    x: -1.5873472912565585,
    y: -3.708309014350326,
    z: -1.327228345473596,
});

export function makeStar(overrides: Partial<Star> & Pick<Star, "id">): Star {
    return {
        id: overrides.id,
        name: overrides.name ?? overrides.id,
        rightAscension: overrides.rightAscension ?? 0,
        declination: overrides.declination ?? 0,
        magnitude: overrides.magnitude ?? 2,
        distance: overrides.distance ?? 10,
        spectralClass: overrides.spectralClass ?? "G2V",
        color: overrides.color ?? "#FFF4E8",
    };
}

export function makeConstellation(input: {
    readonly id: string;
    readonly stars: readonly Star[];
    readonly lines?: readonly (readonly number[])[];
    readonly hemisphere?: "northern" | "southern" | "both";
}): Constellation {
    return {
        id: input.id,
        name: input.id,
        abbreviation: input.id.slice(0, 3),
        description: `${input.id} description`,
        mythology: `${input.id} mythology`,
        stars: [...input.stars],
        lines: (input.lines ?? []).map((line) => [...line]),
        visibility: {
            hemisphere: input.hemisphere ?? "both",
            bestMonths: [1, 2, 3],
            minLatitude: -90,
            maxLatitude: 90,
        },
    };
}

export const ALPHA_CENTAURI_CATALOG_STAR = Object.freeze(
    makeStar({
        id: "alpha_cen",
        name: "Alpha Centauri",
        rightAscension: 14.66,
        declination: -60.834,
        magnitude: -0.27,
        distance: 4.37,
        spectralClass: "G2V",
    }),
);

export const BETA_CENTAURI_CATALOG_STAR = Object.freeze(
    makeStar({
        id: "beta_cen",
        name: "Hadar",
        rightAscension: 14.064,
        declination: -60.373,
        magnitude: 0.61,
        distance: 390,
        spectralClass: "B1III",
    }),
);

export const CENTAURUS_FIXTURE = makeConstellation({
    id: "centaurus",
    stars: [ALPHA_CENTAURI_CATALOG_STAR, BETA_CENTAURI_CATALOG_STAR],
    lines: [[0, 1]],
    hemisphere: "southern",
});
Object.freeze(CENTAURUS_FIXTURE.stars);
Object.freeze(CENTAURUS_FIXTURE.lines);
CENTAURUS_FIXTURE.lines.forEach((line) => Object.freeze(line));
Object.freeze(CENTAURUS_FIXTURE);
