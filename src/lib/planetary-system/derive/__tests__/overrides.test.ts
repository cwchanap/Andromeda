import { describe, it, expect } from "vitest";
import { applyOverrides } from "@/lib/planetary-system/derive/overrides";
import { buildSystem } from "@/lib/planetary-system/derive/buildSystem";
import type { SystemCsvRow } from "@/lib/planetary-system/derive/parseCsv";

function makeRow(overrides: Partial<SystemCsvRow>): SystemCsvRow {
    return {
        system_rank: 1,
        system_name: "Alpha Centauri / Proxima Centauri",
        distance_from_earth_ly: 4.2465,
        number_of_stars: 3,
        number_of_known_exoplanets: 2,
        constellation: "Centaurus",
        object_name: "X",
        object_type: "star",
        host_object: "",
        status: "stellar component",
        spectral_classification: "G2V",
        diameter_km: 1703829,
        diameter_basis: "stellar",
        surface_temperature_K: 5790,
        surface_temperature_C: 5517,
        surface_temperature_basis: "stellar effective temperature",
        orbital_period_days: 29188,
        orbital_period_basis: "binary period",
        composition: "Hydrogen/helium plasma",
        distance_from_system_center_AU: 10.7,
        distance_basis: "barycentric",
        planet_mass_earth_masses: undefined,
        planet_radius_earth_radii: undefined,
        coordinate_frame: "system",
        notes: "",
        source_url: "x",
        ...overrides,
    };
}

const AC_ROWS: SystemCsvRow[] = [
    makeRow({
        object_name: "Alpha Centauri A",
        object_type: "star",
        spectral_classification: "G2V",
        diameter_km: 1703829,
        surface_temperature_K: 5790,
        distance_from_system_center_AU: 10.7,
    }),
    makeRow({
        object_name: "Alpha Centauri B",
        object_type: "star",
        spectral_classification: "K1V",
        diameter_km: 1202179,
        surface_temperature_K: 5260,
        distance_from_system_center_AU: 12.7,
    }),
    makeRow({
        object_name: "Proxima Centauri",
        object_type: "star",
        spectral_classification: "M5.5Ve",
        diameter_km: 214754,
        surface_temperature_K: 3042,
        distance_from_system_center_AU: 8700,
    }),
    makeRow({
        object_name: "Proxima Centauri d",
        object_type: "planet",
        host_object: "Proxima Centauri",
        status: "confirmed",
        diameter_km: 8817,
        surface_temperature_K: 310,
        surface_temperature_C: 37,
        orbital_period_days: 5.122,
        distance_from_system_center_AU: 0.0288,
    }),
];

const built = buildSystem(AC_ROWS);

describe("alpha-centauri override", () => {
    const sys = applyOverrides(built);

    it("adds the AB barycenter anchor", () => {
        expect(
            sys.systemData.orbitAnchors?.some(
                (a) => a.id === "alpha-centauri-ab-barycenter",
            ),
        ).toBe(true);
    });
    it("A orbits the barycenter", () => {
        expect(sys.systemData.star.orbit?.centerId).toBe(
            "alpha-centauri-ab-barycenter",
        );
    });
    it("B orbits the barycenter", () => {
        const b = sys.systemData.celestialBodies.find(
            (x) => x.id === "alpha-centauri-b",
        )!;
        expect(b.orbit?.centerId).toBe("alpha-centauri-ab-barycenter");
    });
    it("A eccentricity = 0.519", () => {
        expect(sys.systemData.star.orbit?.eccentricity).toBeCloseTo(0.519, 3);
    });
    it("A period = 79.91 years", () => {
        expect(sys.systemData.star.orbit?.periodYears).toBeCloseTo(79.91, 2);
    });
    it("B axis > A axis (A is more massive)", () => {
        const a = sys.systemData.star;
        const b = sys.systemData.celestialBodies.find(
            (x) => x.id === "alpha-centauri-b",
        )!;
        expect(b.orbit!.semiMajorAxis).toBeGreaterThan(a.orbit!.semiMajorAxis);
    });
    it("A and B share one visual period so the binary never desyncs", () => {
        // Regression: buildBody now attaches a generic orbit (with a visual
        // period) to secondary stars, and the override spreads it onto B. If A
        // kept only its real periodYears while B inherited a visualPeriodSeconds,
        // B would whip around a frozen A. Both stars must animate together.
        const a = sys.systemData.star.orbit!;
        const b = sys.systemData.celestialBodies.find(
            (x) => x.id === "alpha-centauri-b",
        )!.orbit!;
        expect(a.visualPeriodSeconds).toBeDefined();
        expect(b.visualPeriodSeconds).toBeDefined();
        expect(a.visualPeriodSeconds).toBe(b.visualPeriodSeconds);
    });
    it("A and B share a phase so argumentOfPeriapsis keeps them opposite", () => {
        const a = sys.systemData.star.orbit!;
        const b = sys.systemData.celestialBodies.find(
            (x) => x.id === "alpha-centauri-b",
        )!.orbit!;
        expect(a.phaseDeg).toBe(b.phaseDeg);
        // The 180° separation is encoded in argumentOfPeriapsis, not phase.
        expect(
            b.argumentOfPeriapsisDeg! - a.argumentOfPeriapsisDeg!,
        ).toBeCloseTo(180, 3);
    });
    it("non-alpha systems pass through unchanged", () => {
        const otherRows = [
            {
                ...AC_ROWS[0],
                system_name: "Barnard's Star",
                object_name: "Barnard's Star",
                number_of_stars: 1,
            },
        ];
        const otherBuilt = buildSystem(otherRows);
        const otherResult = applyOverrides(otherBuilt);
        expect(otherResult).toBe(otherBuilt);
    });
});
