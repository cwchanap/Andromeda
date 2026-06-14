import { describe, it, expect } from "vitest";
import { parseSystemsCsv } from "@/lib/planetary-system/derive/parseCsv";

const CSV = `system_rank,system_name,distance_from_earth_ly,number_of_stars,number_of_known_exoplanets,constellation,object_name,object_type,host_object,status,spectral_classification,diameter_km,diameter_basis,surface_temperature_K,surface_temperature_C,surface_temperature_basis,orbital_period_days,orbital_period_basis,composition,distance_from_system_center_AU,distance_basis,planet_mass_earth_masses,planet_radius_earth_radii,coordinate_frame,notes,source_url
1,Alpha Centauri / Proxima Centauri,4.2465,3,2,Centaurus,Proxima Centauri c,planet_candidate,Proxima Centauri,candidate/disputed - not counted,N/A,20005.0,catalog/reported radius or estimate,39,-234.0,catalog/reported equilibrium temperature; not measured surface temperature,1900,orbital period around host star,"Hydrogen/helium plus water/ammonia/methane ices; rocky core likely",1.48,planet semi-major axis from host star; use with host_object for multi-star systems,5.8,1.57,host-centric orbit; in unary systems this equals system-center orbit,"Included only to audit current app data: this should be marked candidate, not confirmed.",https://exoplanetarchive.ipac.caltech.edu/overview/alpha%20Cen
`;

describe("parseSystemsCsv", () => {
    it("parses one object row preserving quoted commas/semicolons", () => {
        const rows = parseSystemsCsv(CSV);
        expect(rows).toHaveLength(1);
        const r = rows[0];
        expect(r.system_rank).toBe(1);
        expect(r.object_name).toBe("Proxima Centauri c");
        expect(r.object_type).toBe("planet_candidate");
        expect(r.composition).toBe(
            "Hydrogen/helium plus water/ammonia/methane ices; rocky core likely",
        );
        expect(r.source_url).toBe(
            "https://exoplanetarchive.ipac.caltech.edu/overview/alpha%20Cen",
        );
        expect(r.distance_from_system_center_AU).toBe(1.48);
        expect(r.surface_temperature_K).toBe(39);
        expect(r.notes).toContain("candidate, not confirmed");
    });
    it("treats empty numeric cells as undefined, not 0 or NaN", () => {
        const rows = parseSystemsCsv(CSV.replace(",1900,", ",,"));
        expect(rows[0].orbital_period_days).toBeUndefined();
    });
});
