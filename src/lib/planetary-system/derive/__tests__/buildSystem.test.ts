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
    it("confirmedExoplanetCount comes from the column = 2", () => {
        expect(sys.systemData.metadata?.confirmedExoplanetCount).toBe(2);
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
});
