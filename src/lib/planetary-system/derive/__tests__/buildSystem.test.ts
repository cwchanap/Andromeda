import { describe, it, expect } from "vitest";
import { buildSystem } from "@/lib/planetary-system/derive/buildSystem";
import type { SystemCsvRow } from "@/lib/planetary-system/derive/parseCsv";

function row(overrides: Partial<SystemCsvRow>): SystemCsvRow {
    return {
        system_rank: 1,
        system_name: "Alpha Centauri / Proxima Centauri",
        distance_from_earth_ly: 4.2465,
        number_of_stars: 3,
        number_of_known_exoplanets: 2,
        constellation: "Centaurus",
        object_name: "Test Object",
        object_type: "planet",
        host_object: "Proxima Centauri",
        status: "confirmed",
        spectral_classification: "N/A",
        diameter_km: 12997,
        diameter_basis: "catalog/reported radius or estimate",
        surface_temperature_K: 234,
        surface_temperature_C: -39,
        surface_temperature_basis:
            "catalog/reported equilibrium temperature; not measured surface temperature",
        orbital_period_days: 11.186,
        orbital_period_basis: "orbital period around host star",
        composition: "Silicate rock plus iron/nickel core; atmosphere unknown",
        distance_from_system_center_AU: 0.0485,
        distance_basis: "planet semi-major axis from host star",
        planet_mass_earth_masses: 1.055,
        planet_radius_earth_radii: 1.02,
        coordinate_frame: "host-centric orbit",
        notes: "",
        source_url: "https://example.com",
        ...overrides,
    };
}

const ALPHA_CEN_ROWS: SystemCsvRow[] = [
    row({
        object_name: "Proxima Centauri",
        object_type: "star",
        host_object: "",
        status: "stellar component",
        spectral_classification: "M5.5Ve",
        diameter_km: 214754,
        surface_temperature_K: 3042,
        surface_temperature_C: 2769,
        orbital_period_days: undefined,
        distance_from_system_center_AU: undefined,
        composition: "Mostly hydrogen/helium plasma",
    }),
    row({
        object_name: "Proxima Centauri b",
        object_type: "planet",
        host_object: "Proxima Centauri",
        status: "confirmed",
        diameter_km: 12997,
        surface_temperature_K: 234,
        surface_temperature_C: -39,
        orbital_period_days: 11.186,
        distance_from_system_center_AU: 0.0485,
        planet_mass_earth_masses: 1.055,
        planet_radius_earth_radii: 1.02,
    }),
    row({
        object_name: "Proxima Centauri c",
        object_type: "planet_candidate",
        host_object: "Proxima Centauri",
        status: "candidate/disputed - not counted",
        diameter_km: 20005,
        surface_temperature_K: 39,
        surface_temperature_C: -234,
        orbital_period_days: 1900,
        distance_from_system_center_AU: 1.48,
        planet_mass_earth_masses: 5.8,
        planet_radius_earth_radii: 1.57,
    }),
];

describe("buildSystem (Alpha Centauri golden)", () => {
    const sys = buildSystem(ALPHA_CEN_ROWS);

    it("id is alpha-centauri", () => {
        expect(sys.id).toBe("alpha-centauri");
    });
    it("knownExoplanetCount comes from the column = 2", () => {
        expect(sys.systemData.metadata?.knownExoplanetCount).toBe(2);
    });
    it("Proxima c is type planet, status candidate", () => {
        const c = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri c",
        )!;
        expect(c.type).toBe("planet");
        expect(c.status).toBe("candidate");
    });
    it("Proxima b status confirmed", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.status).toBe("confirmed");
    });
    it("planet orbits reference host star id", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.orbit?.centerId).toBe("proxima-centauri");
    });
    it("equilibrium temperature carries estimated label", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.keyFacts.equilibriumTemperature).toMatch(/equilibrium/i);
    });
    it("distanceFromSun uses host-relative wording", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.keyFacts.distanceFromSun).toMatch(/Proxima Centauri/i);
    });
    it("distanceFromSun formats AU value and strips trailing zeros", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        // 0.0485 AU -> formatted (no raw JS float, no trailing-zero padding)
        expect(b.keyFacts.distanceFromSun).toMatch(/^0\.0485 AU from /);
        // Proxima c at 1.48 AU should not render as "1.4800"
        const c = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri c",
        )!;
        expect(c!.keyFacts.distanceFromSun).toMatch(/^1\.48 AU from /);
    });
    it("diameter keyFact is populated", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.keyFacts.diameter).toBeTruthy();
    });
    it("orbitalPeriod keyFact is populated", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(b.keyFacts.orbitalPeriod).toBeTruthy();
    });
    it("composition is an array", () => {
        const b = sys.systemData.celestialBodies.find(
            (b) => b.name === "Proxima Centauri b",
        )!;
        expect(Array.isArray(b.keyFacts.composition)).toBe(true);
        expect(b.keyFacts.composition.length).toBeGreaterThan(0);
    });
    it("systemType is multiple for 3 stars", () => {
        expect(sys.systemData.systemType).toBe("multiple");
    });
    it("throws on invalid object_type", () => {
        const badRow = row({ object_type: "asteroid" });
        expect(() => buildSystem([badRow])).toThrow(/Invalid object_type/);
    });
});

// Multi-star positioning: secondary stars must not collapse onto the primary.
// Regression coverage for the buildSystem offset logic.
describe("buildSystem (multi-star offsets)", () => {
    const BINARY_ROWS: SystemCsvRow[] = [
        // Primary star, chosen as the visualization origin (au = 0).
        row({
            object_name: "Companion A",
            object_type: "star",
            host_object: "",
            status: "stellar component",
            spectral_classification: "K0V",
            diameter_km: 800000,
            surface_temperature_K: 3900,
            surface_temperature_C: 3600,
            orbital_period_days: 0,
            distance_from_system_center_AU: 0,
            composition: "Mostly hydrogen/helium plasma",
        }),
        // Secondary star with a projected barycentric separation of 53 AU.
        row({
            object_name: "Companion B",
            object_type: "star",
            host_object: "",
            status: "stellar component",
            spectral_classification: "K1V",
            diameter_km: 780000,
            surface_temperature_K: 3850,
            surface_temperature_C: 3550,
            orbital_period_days: undefined,
            distance_from_system_center_AU: 53,
            composition: "Mostly hydrogen/helium plasma",
        }),
    ];

    it("keeps the primary star pinned to the origin", () => {
        const sys = buildSystem(BINARY_ROWS);
        expect(sys.systemData.star.position.x).toBe(0);
    });

    it("offsets the secondary star away from the primary", () => {
        const sys = buildSystem(BINARY_ROWS);
        const starB = sys.systemData.celestialBodies.find(
            (b) => b.id === "companion-b",
        )!;
        // au=53 maps (via orbitVisualRadius) well past 0, so the two stars
        // no longer render on top of each other.
        expect(starB.position.x).toBeGreaterThan(0);
        expect(starB.position.y).toBe(0);
    });

    it("does not assign an orbit to a static secondary star", () => {
        const sys = buildSystem(BINARY_ROWS);
        const starB = sys.systemData.celestialBodies.find(
            (b) => b.id === "companion-b",
        )!;
        expect(starB.orbit).toBeUndefined();
    });
});

// The CSV encodes a static origin star with orbital_period_days = 0. That 0
// must surface as an unknown period, never the impossible "0.0 days".
describe("buildSystem (period-0 sentinel)", () => {
    it("treats orbital_period_days = 0 as unknown for the star", () => {
        const sys = buildSystem([
            row({
                object_name: "Static Star",
                object_type: "star",
                host_object: "",
                status: "stellar component",
                spectral_classification: "M4V",
                diameter_km: 272969,
                surface_temperature_K: 3192,
                surface_temperature_C: 2919,
                orbital_period_days: 0,
                distance_from_system_center_AU: 0,
                composition: "Mostly hydrogen/helium plasma",
            }),
        ]);
        expect(sys.systemData.star.keyFacts.orbitalPeriod).toBe("");
    });

    it("still formats a real period for planets", () => {
        const sys = buildSystem(ALPHA_CEN_ROWS);
        const b = sys.systemData.celestialBodies.find(
            (bb) => bb.name === "Proxima Centauri b",
        )!;
        expect(b.keyFacts.orbitalPeriod).not.toBe("");
        expect(b.keyFacts.orbitalPeriod).toMatch(/days/);
    });
});
