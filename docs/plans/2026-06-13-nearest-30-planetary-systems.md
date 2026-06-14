# Nearest 30 Planetary Systems — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Drive the 30 nearest planetary systems from a committed CSV through a build-time codegen pipeline into typed `PlanetarySystem` + galaxy records, with auto-derived 3D visuals, explicit confirmed/candidate status, and the Alpha Centauri accuracy fix.

**Architecture:** A pure, unit-tested derivation layer (`src/lib/planetary-system/derive/`) converts CSV astronomy facts → Three.js visual params. A `scripts/gen-systems.ts` codegen reads the CSV + a coordinates supplement, runs the derivation, and writes two standard modules in place (`systems.ts`, `LocalGalaxy.ts`) chained into `prebuild`. The Solar System + 4 curated systems (TRAPPIST-1, Wolf 359, Kepler-442/438) remain bespoke alongside the 30 generated ones.

**Tech Stack:** Astro 5, Svelte 5, Three.js 0.178, TypeScript (strict), Vitest + jsdom, Playwright, Bun.

**Reference design:** `docs/plans/2026-06-13-nearest-30-planetary-systems-design.md`

---

## Reconciliation with reality (read first)

The CSV (`src/data/nearest_30_planetary_systems.csv`, 103 object rows, 30 systems) differs from the design doc's assumptions in three ways. This plan is authoritative where they conflict:

1. **Solar System is NOT in the CSV** (rank 1 = Alpha Centauri). `src/lib/planetary-system/SolarSystem.ts` is **KEPT** bespoke as the home/reference origin. It is not deleted.
2. **Only 3 of the 7 existing exoplanet systems are in the CSV** (alpha-centauri, barnards-star, ross-128). The other 4 — TRAPPIST-1, Wolf 359, Kepler-442, Kepler-438 — are **KEPT** as curated bespoke entries (registered alongside the generated ones). They are Explore/page-only (40–1200 ly, outside the ~21 ly galaxy view).
3. **The CSV has no `brown-dwarf`/`satellite` rows and no RA/Dec.** The `brown-dwarf` type is added for completeness but unused by this dataset. RA/Dec come from a new supplement file `src/data/system_coordinates.csv`.

**Final registry = Solar System (bespoke) + 30 CSV-generated + 4 curated bespoke (TRAPPIST-1, Wolf 359, Kepler-442/438) = 35 systems.**

**Confirmed-count rule:** the system-level confirmed exoplanet count comes from the CSV's `number_of_known_exoplanets` column (authoritative). Per-body confirmation badges parse the free-text `status` column. The build WARNS (does not fail) when these disagree — this is what lets Alpha Centauri show 2 confirmed (column) while Proxima c still badges as disputed, and HD 219134 show 6 (column) while f/g badge as controversial.

**Files deleted** (superseded by generation): `AlphaCentauri.ts`, the barnards-star/ross-128 exports from `NearbyExoplanets.ts`. **Files kept bespoke:** `SolarSystem.ts`; a new `CuratedSystems.ts` holding trappist1/wolf359/kepler442/kepler438 (moved out of `NearbyExoplanets.ts`/`KeplerSystems.ts`, which are then deleted).

---

## Conventions for every task

- Run commands from the repo root. Tests: `bunx vitest <path> -t "<name>"`.
- Commit after each task with the message given. Never enable shadows (project-wide rule).
- Use `@/*` import aliases. Add NO comments unless a test name requires it.
- TDD: write the failing test first, run it (see it fail for the right reason), implement, run it (pass).

---

## Task 1: Widen `CelestialBodyData` type + add `status`

**Files:**

- Modify: `src/types/game.ts:33-113`
- Test: `src/types/__tests__/game.types.test.ts` (create)

**Step 1: Write the failing test**

```ts
// src/types/__tests__/game.types.test.ts
import { describe, it, expectTypeOf } from "vitest";
import type { CelestialBodyData } from "@/types/game";

describe("CelestialBodyData type", () => {
  it("accepts brown-dwarf type", () => {
    const b = { type: "brown-dwarf" } as CelestialBodyData;
    expectTypeOf(b.type).toEqualTypeOf<CelestialBodyData["type"]>();
  });
  it("accepts optional status field", () => {
    const b = { status: "controversial" } as Partial<CelestialBodyData>;
    expectTypeOf(b.status).toEqualTypeOf<
      "confirmed" | "candidate" | "controversial" | undefined
    >();
  });
  it("accepts optional equilibriumTemperature", () => {
    const b = {
      keyFacts: { equilibriumTemperature: "310 K (equilibrium)" },
    } as unknown as CelestialBodyData;
    expectTypeOf(b.keyFacts.equilibriumTemperature).toEqualTypeOf<
      string | undefined
    >();
  });
});
```

**Step 2: Run → FAIL** (`bunx vitest src/types/__tests__/game.types.test.ts`): type errors — `brown-dwarf` not assignable, no `status`/`equilibriumTemperature`.

**Step 3: Implement** in `src/types/game.ts`:

- Line 36: `type: "star" | "planet" | "brown-dwarf" | "moon";`
- After line 36 (inside the interface, before `description`): add `status?: "confirmed" | "candidate" | "controversial";`
- In `keyFacts` (after `temperature: string;` ~line 44): add `equilibriumTemperature?: string;`

**Step 4: Run → PASS.** Then `bun run type-check`.

**Step 5: Commit:** `feat(types): widen CelestialBodyData with brown-dwarf, status, equilibriumTemperature`

---

## Task 2: Add `confirmedExoplanetCount` to system metadata

**Files:**

- Modify: `src/lib/planetary-system/types.ts:32-42` (`PlanetarySystemData.metadata`)
- Modify: `src/types/universe.ts:19-29` (`StarSystemData.metadata`) — keep in sync
- Modify: `src/lib/galaxy/types.ts:24-32` — document `numberOfPlanets` = confirmed count (no field change, just sourcing)

**Step 1: Write failing test** (`src/lib/planetary-system/__tests__/metadata.test.ts`):

```ts
import { describe, it, expectTypeOf } from "vitest";
import type { PlanetarySystemData } from "@/lib/planetary-system/types";

describe("PlanetarySystemData.metadata", () => {
  it("has confirmedExoplanetCount", () => {
    const m = { confirmedExoplanetCount: 2 } as PlanetarySystemData["metadata"];
    expectTypeOf(m.confirmedExoplanetCount).toEqualTypeOf<number | undefined>();
  });
});
```

**Step 2: Run → FAIL** (no `confirmedExoplanetCount`).

**Step 3: Implement:** add `confirmedExoplanetCount?: number;` to the `metadata` object type in both `src/lib/planetary-system/types.ts` and `src/types/universe.ts`.

**Step 4: Run → PASS**, then `bun run type-check`.

**Step 5: Commit:** `feat(types): add confirmedExoplanetCount to system metadata`

---

## Task 3: CSV parser module

**Files:**

- Create: `src/lib/planetary-system/derive/parseCsv.ts`
- Test: `src/lib/planetary-system/derive/__tests__/parseCsv.test.ts`

The CSV has quoted fields with commas and `;` inside (e.g. composition, source_url). Use a proper field parser — do NOT split on raw commas.

**Step 1: Write failing test:**

```ts
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
```

**Step 2: Run → FAIL** (module missing).

**Step 3: Implement** `parseCsv.ts`:

- Export `interface SystemCsvRow` with all 26 columns typed (`system_rank: number`, numerics `number | undefined`, strings, `object_type` as raw string).
- Export `parseSystemsCsv(text: string): SystemCsvRow[]` using a hand-rolled RFC-4180 field parser (handle `"` quoting, `""` escapes, embedded newlines/commas). Skip the header row. Trim nothing inside quotes. Coerce numerics: `cell === "" || cell === "N/A" ? undefined : Number(cell)` (note `N/A` appears for star spectral fields). For `system_rank`/`distance`/counts always `Number`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): add RFC-4180 CSV parser for system data`

---

## Task 4: Status + object-type mapping

**Files:**

- Create: `src/lib/planetary-system/derive/mapObject.ts`
- Test: `src/lib/planetary-system/derive/__tests__/mapObject.test.ts`

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import {
  parseStatus,
  mapBodyType,
} from "@/lib/planetary-system/derive/mapObject";

describe("parseStatus", () => {
  it("planet_candidate object type -> candidate", () => {
    expect(
      parseStatus("candidate/disputed - not counted", "planet_candidate"),
    ).toBe("candidate");
  });
  it("confirmed -> confirmed", () => {
    expect(parseStatus("confirmed", "planet")).toBe("confirmed");
  });
  it("confirmed/controversial -> controversial", () => {
    expect(parseStatus("confirmed/controversial in some lists", "planet")).toBe(
      "controversial",
    );
  });
  it("confirmed (NASA overview); disputed -> controversial", () => {
    expect(
      parseStatus(
        "confirmed (NASA overview); disputed in some lists",
        "planet",
      ),
    ).toBe("controversial");
  });
  it("stellar component (star) -> confirmed", () => {
    expect(parseStatus("stellar component", "star")).toBe("confirmed");
  });
});
describe("mapBodyType", () => {
  it.each([
    ["star", "star"],
    ["planet", "planet"],
    ["planet_candidate", "planet"],
  ])("%s -> %s", (csv, mapped) =>
    expect(mapBodyType(csv as never)).toBe(mapped),
  );
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** `mapObject.ts`:

```ts
export type CsvObjectType =
  | "star"
  | "planet"
  | "planet_candidate"
  | "brown_dwarf"
  | "satellite";
export type BodyStatus = "confirmed" | "candidate" | "controversial";

export function mapBodyType(
  csvObjectType: CsvObjectType,
): "star" | "planet" | "brown-dwarf" | "moon" {
  switch (csvObjectType) {
    case "star":
      return "star";
    case "planet":
    case "planet_candidate":
      return "planet";
    case "brown_dwarf":
      return "brown-dwarf";
    case "satellite":
      return "moon";
  }
}

export function parseStatus(
  statusCell: string,
  csvObjectType: CsvObjectType,
): BodyStatus {
  if (csvObjectType === "planet_candidate") return "candidate";
  const s = (statusCell ?? "").toLowerCase();
  if (s.includes("disputed") || s.includes("controversial"))
    return "controversial";
  if (s.includes("candidate")) return "candidate";
  return "confirmed";
}
```

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): map CSV object types and fuzzy status strings`

---

## Task 5: Visual derivation — spectral color & diameter scale

**Files:**

- Create: `src/lib/planetary-system/derive/visualFromAstronomy.ts`
- Test: `src/lib/planetary-system/derive/__tests__/visualFromAstronomy.test.ts`

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import {
  spectralColor,
  planetScale,
  starScale,
} from "@/lib/planetary-system/derive/visualFromAstronomy";

describe("spectralColor", () => {
  it.each([
    ["G2V", "#FFF4EA"],
    ["M5.5Ve", "#FFA050"],
    ["K1V", "#FFD2A1"],
    ["A1V", "#CAD7FF"],
    ["O5V", "#9BB0FF"],
  ])("%s -> %s", (cls, hex) => expect(spectralColor(cls)).toBe(hex));
  it("unknown class falls back from temperature", () => {
    expect(spectralColor("unknown", 5790)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
describe("planetScale", () => {
  it("Earth diameter ~ 1.0", () =>
    expect(planetScale(12742)).toBeCloseTo(1.0, 1));
  it("is monotonic & clamped", () => {
    expect(planetScale(5000)).toBeGreaterThanOrEqual(0.4);
    expect(planetScale(5000)).toBeLessThanOrEqual(planetScale(12742));
    expect(planetScale(200000)).toBeLessThanOrEqual(3.5);
  });
});
describe("starScale", () => {
  it("red dwarf floor >= 1.0", () =>
    expect(starScale(214754)).toBeGreaterThanOrEqual(1.0));
  it("Sun-sized is mid-range", () =>
    expect(starScale(1392700)).toBeGreaterThan(1.0));
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** `visualFromAstronomy.ts` with these exact rules:

- `spectralColor(cls: string, tempK?: number)`: take first letter of `cls` (uppercase). Map: `O#9BB0FF B#AABFFF A#CAD7FF F#F8F7FF G#FFF4EA K#FFD2A1 M#FFA050 L#FFCC99 T#FF8866`. White-dwarf (`cls` starts `D` or contains `white dwarf`) → `#FFFFFF`. Unknown + temp provided → blackbody-ish interpolation between [3000K→#FFA050, 6000K→#FFF4EA, 10000K→#CAD7FF, 25000K→#9BB0FF]. Unknown & no temp → `#FFA050` (default warm).
- `planetScale(diameterKm)`: `clamp(1 + Math.log10(diameterKm / 12742), 0.4, 3.5)`.
- `starScale(diameterKm)`: `clamp(1.2 + 0.5 * Math.log10(diameterKm / 1392700), 1.0, 4.5)`.
- Also export `emissiveFromTemp(tempK)`: hotter → stronger; `clamp(0.3 + (tempK - 3000) / 12000, 0.3, 1.0)`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): spectral color and diameter-to-scale derivation`

---

## Task 6: Visual derivation — orbit geometry & period compression

**Files:** same module + test file as Task 5 (append).

**Step 1: Append failing tests:**

```ts
import {
  orbitVisualRadius,
  visualPeriodSeconds,
} from "@/lib/planetary-system/derive/visualFromAstronomy";

describe("orbitVisualRadius", () => {
  it("monotonic in semi-major axis", () => {
    expect(orbitVisualRadius(0.02)).toBeLessThan(orbitVisualRadius(1));
    expect(orbitVisualRadius(1)).toBeLessThan(orbitVisualRadius(50));
  });
  it("bounded for the full dataset range", () => {
    for (const au of [0.0163, 0.5, 5, 50]) {
      const r = orbitVisualRadius(au);
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(60);
    }
  });
});
describe("visualPeriodSeconds", () => {
  it("compresses 1.9-day and 60000-day orbits both into watchable range", () => {
    expect(visualPeriodSeconds(1.938)).toBeGreaterThanOrEqual(6);
    expect(visualPeriodSeconds(63400)).toBeLessThanOrEqual(120);
  });
  it("returns 0 for static/origin (0 days)", () => {
    expect(visualPeriodSeconds(0)).toBe(0);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement:**

- `orbitVisualRadius(au)`: `au = Math.max(au, 0); const v = 2 + (Math.log10(au * 1000 + 1) / Math.log10(50 * 1000 + 1)) * 38; return clamp(v, 2, 60);` (chosen so 0.016→~2, 50→~40). TUNE constants only if a test asserts otherwise.
- `visualPeriodSeconds(days)`: if `!days || days <= 0` return `0`; else `clamp(8 + (Math.log10(days + 1) / 5) * 82, 6, 120)`.
- Deterministic hash helper `seededFromId(id: string): number` (FNV-1a → [0,1)) used later for inclination/phase. Add it now + a test that same id → same value, different id → likely different.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): orbit-radius and period compression from real astronomy`

---

## Task 7: RA/Dec → Cartesian + galaxy visual

**Files:**

- Create: `src/lib/planetary-system/derive/buildGalaxy.ts`
- Test: `src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts`

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import {
  radialToCartesian,
  galaxyVisual,
} from "@/lib/planetary-system/derive/buildGalaxy";

describe("radialToCartesian", () => {
  it("origin (d=0) is the zero vector", () => {
    const v = radialToCartesian(0, 0, 0);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });
  it("known case: d=10, dec=0, ra=0 -> (+10, 0, 0)", () => {
    const v = radialToCartesian(10, 0, 0);
    expect(v.x).toBeCloseTo(10);
    expect(v.z).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
  });
});
describe("galaxyVisual", () => {
  it("Solar brightness is max, far systems dimmer", () => {
    expect(galaxyVisual(0).brightness).toBeGreaterThan(
      galaxyVisual(20).brightness,
    );
  });
});
```

**Step 2: Run → FAIL.** (No THREE in math: import `type { Vector3Like }` or return a plain `{x,y,z}` to keep it Three-free; the assembler converts.)

**Step 3: Implement** (return plain `{x,y,z}` — no `three` import, so it stays unit-testable in node):

- `radialToCartesian(d, raDeg, decDeg)`: `ra=raDeg*π/180, dec=decDeg*π/180; return { x: d*cos(dec)*cos(ra), y: d*sin(dec), z: d*cos(dec)*sin(ra) }`.
- `galaxyVisual(distanceLy)`: `brightness = clamp(2.0 / (1 + distanceLy / 5), 0.15, 2.0)`. (colorIndex computed in assembler from spectral class.)
- Export `BV_INDEX: Record<string, number>` = `{O:-0.33,B:-0.2,A:0.0,F:0.3,G:0.63,K:0.9,M:1.5}`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): RA/Dec to Cartesian and galaxy visual brightness`

---

## Task 8: Coordinates supplement for galaxy positions

**Files:**

- Create: `src/data/system_coordinates.csv`
- Create: `src/lib/planetary-system/derive/__tests__/coordinates.test.ts`

The CSV has no RA/Dec. Add a small companion keyed by `system_name` (must match the names in the main CSV exactly).

**Step 1: Write failing test** asserting every one of the 30 system names resolves to a coordinate row:

```ts
import { describe, it, expect } from "vitest";
import { loadCoordinates } from "@/lib/planetary-system/derive/buildSystem"; // re-exported here (Task 9)
import { SYSTEM_NAMES } from "@/lib/planetary-system/derive/systemNames";

describe("system_coordinates.csv", () => {
  it("has RA/Dec for all 30 systems", () => {
    const coords = loadCoordinates();
    for (const name of SYSTEM_NAMES) {
      expect(coords[name], `missing coords for ${name}`).toBeDefined();
      const { ra, dec } = coords[name];
      expect(ra).toBeGreaterThanOrEqual(0);
      expect(ra).toBeLessThanOrEqual(360);
      expect(dec).toBeGreaterThanOrEqual(-90);
      expect(dec).toBeLessThanOrEqual(90);
    }
  });
});
```

**Step 2: Run → FAIL** (files missing).

**Step 3: Implement:**

- Create `src/data/system_coordinates.csv` with header `system_name,ra_deg,dec_deg` and 30 rows sourced from SIMBAD/public catalogs. Use the EXACT `system_name` strings from the main CSV, e.g.:
  `Alpha Centauri / Proxima Centauri,219.90,-60.83` / `Barnard's Star,269.45,4.69` / `Lalande 21185,165.93,35.97` / `HD 219134,348.46,57.17` / … (executor fills all 30 from a reliable source; values are illustrative—verify each).
- Add `loadCoordinates()` (parse this file) and the `SYSTEM_NAMES` list (the 30 names) where `loadCoordinates` lives. (`buildSystem` re-exports it — created Task 9; if Task 9 not done yet, put `loadCoordinates` in `parseCsv.ts` for now and move it.)

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(data): add RA/Dec coordinate supplement for 30 systems`

---

## Task 9: `buildSystem` — assemble a `PlanetarySystem` from CSV rows

**Files:**

- Create: `src/lib/planetary-system/derive/buildSystem.ts`
- Test: `src/lib/planetary-system/derive/__tests__/buildSystem.test.ts`

**Step 1: Write failing test** (golden, using a 3-row Alpha Centauri snippet — Proxima b confirmed, Proxima c candidate, Proxima star):

```ts
import { describe, it, expect } from "vitest";
import { buildSystem } from "@/lib/planetary-system/derive/buildSystem";

const ROWS = [
    { system_rank:1, system_name:"Alpha Centauri / Proxima Centauri", distance_from_earth_ly:4.2465, number_of_stars:3, number_of_known_exoplanets:2, constellation:"Centaurus", object_name:"Proxima Centauri", object_type:"star" as const, host_object:"", status:"stellar component", spectral_classification:"M5.5Ve", diameter_km:214754, diameter_basis:"stellar radius × solar diameter", surface_temperature_K:3042, surface_temperature_C:2769, surface_temperature_basis:"stellar effective temperature", orbital_period_days:199775000, orbital_period_basis:"approx", composition:"Mostly hydrogen/helium plasma", distance_from_system_center_AU:8700, distance_basis:"approx", planet_mass_earth_masses:undefined, planet_radius_earth_radii:undefined, coordinate_frame:"system", notes:"", source_url:"x" },
    { ...object_name:"Proxima Centauri b", object_type:"planet", host_object:"Proxima Centauri", status:"confirmed", spectral_classification:"N/A", diameter_km:12997, surface_temperature_K:234, surface_temperature_C:-39, surface_temperature_basis:"catalog/reported equilibrium temperature; not measured surface temperature", orbital_period_days:11.186, composition:"Silicate rock plus iron/nickel core; atmosphere unknown", distance_from_system_center_AU:0.0485, planet_mass_earth_masses:1.055, planet_radius_earth_radii:1.02, ... },
    { ...object_name:"Proxima Centauri c", object_type:"planet_candidate", host_object:"Proxima Centauri", status:"candidate/disputed - not counted", diameter_km:20005, surface_temperature_K:39, orbital_period_days:1900, distance_from_system_center_AU:1.48, ... },
];

describe("buildSystem (Alpha Centauri golden)", () => {
    const sys = buildSystem(ROWS);
    it("id is alpha-centauri", () => expect(sys.id).toBe("alpha-centauri"));
    it("confirmedExoplanetCount comes from the column = 2", () => {
        expect(sys.systemData.metadata?.confirmedExoplanetCount).toBe(2);
    });
    it("Proxima c is type planet, status candidate", () => {
        const c = sys.systemData.celestialBodies.find(b => b.name === "Proxima Centauri c")!;
        expect(c.type).toBe("planet"); expect(c.status).toBe("candidate");
    });
    it("Proxima b status confirmed", () => {
        const b = sys.systemData.celestialBodies.find(b => b.name === "Proxima Centauri b")!;
        expect(b.status).toBe("confirmed");
    });
    it("planet orbits reference host star id", () => {
        const b = sys.systemData.celestialBodies.find(b => b.name === "Proxima Centauri b")!;
        expect(b.orbit?.centerId).toBe("proxima-centauri");
    });
    it("equilibrium temperature carries estimated label", () => {
        const b = sys.systemData.celestialBodies.find(b => b.name === "Proxima Centauri b")!;
        expect(b.keyFacts.equilibriumTemperature).toMatch(/equilibrium/i);
    });
    it("distanceFromSun uses host-relative wording", () => {
        const b = sys.systemData.celestialBodies.find(b => b.name === "Proxima Centauri b")!;
        expect(b.keyFacts.distanceFromSun).toMatch(/from Proxima Centauri/i);
    });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** `buildSystem(rows: SystemCsvRow[]): PlanetarySystem`:

- `id = slug(system_name before " / ")` → `alpha-centauri`. Object ids = `slug(object_name)`.
- Star = the row with `object_type==="star"` whose `host_object` is empty/`stellar component` (the first star); other star rows → secondary stars in `celestialBodies`.
- `systemType` from `number_of_stars`: 1→`solar`, 2→`binary`, ≥3→`multiple`.
- For each body: `mapBodyType`, `parseStatus`, `spectralColor`, `planetScale/starScale`, `emissiveFromTemp`, `orbitVisualRadius(distance_from_system_center_AU)`, `visualPeriodSeconds(orbital_period_days)`, seeded inclination/phase from object id.
- `keyFacts.temperature`: prefer `surface_temperature_C` formatted `"-39°C"`. If `surface_temperature_basis` contains "equilibrium"/"not measured", ALSO set `keyFacts.equilibriumTemperature = "… (equilibrium, estimated)"`.
- `keyFacts.distanceFromSun`: planet → `` `${au} AU from ${host_object}` ``; central star → `"0 (system center)"`.
- `keyFacts.composition` = split the composition string on `;`/`,` into array.
- `orbit.centerId` = `slug(host_object)` (or system barycenter id for multi-star, handled by overrides in Task 10). Star with `orbital_period_days===0` → no orbit (static at center).
- `metadata.confirmedExoplanetCount = number_of_known_exoplanets` (from any row — constant per system).
- `material` built from color/emissive/roughness/metalness (planets rocky: roughness 0.7, metalness 0.2; gas/brown: roughness 0.4). `position` set from a unit vector at the orbit radius (initial phase). `scale` from planetScale/starScale.

Provide a `slug(s)` helper: lowercase, replace non-alphanumeric with `-`, collapse, trim `-`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): buildSystem assembles PlanetarySystem from CSV rows`

---

## Task 10: Alpha Centauri AB barycenter override

**Files:**

- Create: `src/lib/planetary-system/derive/overrides.ts`
- Test: `src/lib/planetary-system/derive/__tests__/overrides.test.ts`

The CSV gives Alpha Cen A/B as two stars at barycentric distances 10.7/12.7 AU. The override wires them around an `alpha-centauri-ab-barycenter` anchor with the real 79.91 yr / e=0.519 orbit and mass-ratio axes (preserving the behavior the existing test asserts).

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import { applyOverrides } from "@/lib/planetary-system/derive/overrides";

describe("alpha-centauri override", () => {
  it("adds the AB barycenter anchor", () => {
    const sys =
      applyOverrides(/* a minimal built alpha-centauri PlanetarySystem */);
    expect(
      sys.systemData.orbitAnchors?.some(
        (a) => a.id === "alpha-centauri-ab-barycenter",
      ),
    ).toBe(true);
  });
  it("A & B orbit the barycenter with e=0.519, period 79.91 yr", () => {
    const sys = applyOverrides(built);
    const a = sys.systemData.star;
    const b = sys.systemData.celestialBodies.find(
      (x) => x.id === "alpha-centauri-b",
    )!;
    expect(a.orbit?.centerId).toBe("alpha-centauri-ab-barycenter");
    expect(b.orbit?.centerId).toBe("alpha-centauri-ab-barycenter");
    expect(a.orbit?.eccentricity).toBeCloseTo(0.519, 3);
    expect(a.orbit?.periodYears).toBeCloseTo(79.91, 2);
    // B axis larger than A axis (A is more massive) -> matches existing test
    expect(b.orbit!.semiMajorAxis).toBeGreaterThan(a.orbit!.semiMajorAxis);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** `overrides.ts`: `applyOverrides(sys: PlanetarySystem): PlanetarySystem` — a switch on `sys.id`. For `"alpha-centauri"`: push the barycenter `OrbitAnchorData`, set star A & B `orbit.centerId`, `eccentricity=0.519`, `periodYears=79.91`, `semiMajorAxis` from the real mass ratio (`A_AXIS=25*0.9373/2.0428`, `B_AXIS=25*1.1055/2.0428`), `argumentOfPeriapsisDeg` 180° apart, `inclinationDeg=79.2`. Re-anchor Proxima's planets to `proxima-centauri` (already done by buildSystem). Return the (mutated) system.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): Alpha Centauri AB barycenter orbit override`

---

## Task 11: `buildGalaxy` assembler + full pipeline

**Files:**

- Create: `src/lib/planetary-system/derive/buildAll.ts`
- Test: `src/lib/planetary-system/derive/__tests__/buildAll.test.ts`

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import {
  buildAllPlanetarySystems,
  buildLocalGalaxy,
} from "@/lib/planetary-system/derive/buildAll";

describe("buildAllPlanetarySystems", () => {
  const all = buildAllPlanetarySystems();
  it("returns 30 systems", () => expect(all).toHaveLength(30));
  it("ids are unique", () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(30);
  });
  it("alpha-centauri confirmedExoplanetCount is 2", () => {
    const ac = all.find((s) => s.id === "alpha-centauri")!;
    expect(ac.systemData.metadata?.confirmedExoplanetCount).toBe(2);
  });
  it("every system has a star and valid systemType", () => {
    for (const s of all) {
      expect(s.systemData.star.type).toBe("star");
      expect(["solar", "binary", "multiple", "exotic"]).toContain(
        s.systemData.systemType,
      );
    }
  });
});
describe("buildLocalGalaxy", () => {
  it("has 30 star systems, Solar not included (added separately by caller)", () => {
    expect(buildLocalGalaxy().starSystems).toHaveLength(30);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement** `buildAll.ts`:

- Read the CSV text via `import rawCsv from "@/data/nearest_30_planetary_systems.csv?raw"` (Vite/Astro supports `?raw`). Parse → group by `system_rank` → `buildSystem` each → `applyOverrides`.
- `buildAllPlanetarySystems(): PlanetarySystem[]` returns the 30.
- `buildLocalGalaxy(): GalaxyData`: for each system's star row, `radialToCartesian(distance, ra, dec)` (from coordinate supplement) → `THREE.Vector3`; `visual.brightness`/`colorIndex` from `galaxyVisual` + `BV_INDEX`. Wrap `THREE` import so the math above stays pure. `boundingRadius` = ceil(max distance) ≈ 22.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(derive): full pipeline builds 30 systems + local galaxy`

---

## Task 12: Codegen script + `prebuild` hook

**Files:**

- Create: `scripts/gen-systems.ts`
- Modify: `package.json` (scripts)

**Step 1:** No unit test (it's a script). Instead the script itself runs the pipeline and writes files; verification is Task 14.

**Step 2: Implement** `scripts/gen-systems.ts` (run with `bun`):

1. `import { buildAllPlanetarySystems, buildLocalGalaxy } from "../src/lib/planetary-system/derive/buildAll"`.
2. **Validation gate** (throw on hard error, console.warn on soft):
   - HARD: duplicate `id`; a system with no star; a body whose `orbit.centerId` references a non-existent id/barycenter.
   - SOFT (warn, continue): `confirmedExoplanetCount` (column) ≠ count of rows parsed `confirmed`; any body missing `diameter`/`temperature`.
3. Serialize the 30 `PlanetarySystem` objects to a TS string and write `src/lib/planetary-system/systems.ts`:
   ```ts
   /** @source src/data/nearest_30_planetary_systems.csv — run gen:systems to regenerate */
   import type { PlanetarySystem } from "./types";
   import * as THREE from "three";
   export const starSystems: PlanetarySystem[] = [
     /* ...literal objects, Vector3 inlined as new THREE.Vector3(x,y,z)... */
   ];
   ```
   Use `JSON.stringify` then a regex post-pass to turn `{"x":1,"y":2,"z":3}` into `new THREE.Vector3(1,2,3)` (match the existing hand-authored style). Run Prettier on output (`execSync("bunx prettier --write ...")`).
4. Write `src/lib/galaxy/LocalGalaxy.ts` similarly, exporting `localGalaxyData` with the 30 systems.
5. `console.log("Generated N systems")`.

**Step 3: Add scripts** to `package.json`:

```json
"gen:systems": "bun run scripts/gen-systems.ts",
"prebuild": "bun run gen:systems",
```

**Step 4: Run** `bun run gen:systems`. Confirm both files are written and `bun run type-check` passes (fix serializer bugs until it does).

**Step 5: Commit:** `feat(gen): codegen script writes systems.ts + LocalGalaxy.ts, prebuild hook`

---

## Task 13: Rewire registry — keep Solar + curated, drop superseded files

**Files:**

- Modify: `src/lib/planetary-system/index.ts`
- Create: `src/lib/planetary-system/CuratedSystems.ts` (move trappist1, wolf359, kepler442, kepler438 here)
- Delete: `src/lib/planetary-system/AlphaCentauri.ts`, `KeplerSystems.ts`, `NearbyExoplanets.ts`
- Keep: `SolarSystem.ts`, new `systems.ts`, new `CuratedSystems.ts`

**Step 1:** Move the 4 curated `PlanetarySystem` exports verbatim from `KeplerSystems.ts`/`NearbyExoplanets.ts` into `CuratedSystems.ts` (trappist1System, wolf359System, kepler442System, kepler438System — do NOT move barnardsStar/ross128, those are now CSV-generated).

**Step 2: Rewrite** `index.ts`:

```ts
export * from "./types";
export { PlanetarySystemRegistry } from "./PlanetarySystemRegistry";
export * from "./PlanetarySystemRenderer";
export * from "./DistanceRenderer";
export * from "./SolarSystem";
export * from "./CuratedSystems";
export { starSystems } from "./systems";

import { planetarySystemRegistry } from "./PlanetarySystemRegistry";
import { solarSystem } from "./SolarSystem";
import { starSystems } from "./systems";
import {
  trappist1System,
  wolf359System,
  kepler442System,
  kepler438System,
} from "./CuratedSystems";

planetarySystemRegistry.registerSystem(solarSystem);
for (const s of starSystems) planetarySystemRegistry.registerSystem(s);
planetarySystemRegistry.registerSystem(trappist1System);
planetarySystemRegistry.registerSystem(wolf359System);
planetarySystemRegistry.registerSystem(kepler442System);
planetarySystemRegistry.registerSystem(kepler438System);

export { planetarySystemRegistry };
```

**Step 3:** Delete the 3 superseded files. Run `bun run type-check` — fix any stale imports repo-wide (grep for `AlphaCentauri`, `KeplerSystems`, `NearbyExoplanets`, `barnardsStarSystem`, `ross128System`).

**Step 4: Verify** `bun run gen:systems && bun run type-check && bunx vitest run` (existing curated tests still pass; bespoke-import tests updated in Task 15).

**Step 5: Commit:** `refactor(planetary): rewire registry to generated + curated systems`

---

## Task 14: `CelestialBodyManager` — candidate/disputed rendering

**Files:**

- Modify: `src/lib/planetary-system/graphics/CelestialBodyManager.ts` (orbit line creation + body material)
- Test: `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts` (extend)

**Step 1: Write failing test:**

```ts
it("renders a candidate body's orbit dashed and body opaque", () => {
  const mgr = new CelestialBodyManager(scene, camera);
  mgr.createCelestialBody({ ...makeBody(), status: "candidate" });
  const line = mgr.getOrbitLine(makeBody().id);
  expect((line.material as any).dashed).toBe(true);
});
it("confirmed body orbit is solid", () => {
  mgr.createCelestialBody({ ...makeBody(), status: "confirmed" });
  expect((mgr.getOrbitLine(id).material as any).dashed).toBeFalsy();
});
```

(Add a small `getOrbitLine(id)` test accessor if not present.)

**Step 2: Run → FAIL.**

**Step 3: Implement:** where the orbit `LineMaterial` is constructed, if `body.status && body.status !== "confirmed"` set `material.dashed = true; material.dashSize = 0.5; material.gapSize = 0.3;` and call `line.computeLineDistances()`. Where the body mesh material is created, if not confirmed set `material.opacity = 0.6; material.transparent = true;`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(graphics): dashed orbit + reduced opacity for candidate/disputed bodies`

---

## Task 15: Explore modal — confirmed count + Unknown rendering

**Files:**

- Modify: `src/components/ExploreSystems.svelte:34-36` (`bodyCount`)
- Test: `src/components/__tests__/ExploreSystems.test.ts` (extend)

**Step 1: Write failing test** asserting a system with `confirmedExoplanetCount: 2` and 3 bodies shows "2", not 3.

**Step 2: Run → FAIL.**

**Step 3: Implement:** replace `bodyCount` with:

```ts
function confirmedCount(s: PlanetarySystem): number {
  return (
    s.systemData?.metadata?.confirmedExoplanetCount ??
    s.systemData?.celestialBodies?.filter((b) => b.type !== "star").length ??
    0
  );
}
```

Use it in the template's `readout-value`. Label key `explore.bodies` stays (or add `explore.confirmed`).

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(explore): show confirmed exoplanet count, not raw body count`

---

## Task 16: Info modal — status badge + Unknown fallback

**Files:**

- Modify: the body info modal component (locate via `grep -rl "keyFacts" src/components`) — add badge + `?? t("common.unknown")` guards
- Add i18n keys `common.unknown`, `status.candidate`, `status.controversial` to `src/i18n/ui/*`

**Step 1: Write failing test** (component test): a body with `status:"candidate"` renders a "Candidate" badge; a body missing `keyFacts.temperature` renders "Unknown" not "0" or "undefined".

**Step 2: Run → FAIL.**

**Step 3: Implement:** badge span (amber for candidate/controversial) next to the name, shown only when `status && status !== "confirmed"`. Every `keyFacts` field rendered with `value ?? t("common.unknown")`.

**Step 4: Run → PASS.**

**Step 5: Commit:** `feat(ui): candidate/disputed badge and Unknown fallback in info modal`

---

## Task 17: Rewrite the bespoke-import system tests

**Files:**

- Rewrite: `src/lib/planetary-system/__tests__/PlanetarySystems.test.ts`

The old file imported deleted modules. Rewrite to import from the new locations and assert on the unified registry.

**Step 1: Write the new tests:**

```ts
import { describe, it, expect } from "vitest";
import { planetarySystemRegistry } from "@/lib/planetary-system";
import { starSystems } from "@/lib/planetary-system/systems";

describe("registry", () => {
  it("has 35 systems (solar + 30 + 4 curated)", () => {
    expect(planetarySystemRegistry.getAllSystems()).toHaveLength(35);
  });
  it("alpha-centauri has 2 confirmed", () => {
    const ac = planetarySystemRegistry.getSystem("alpha-centauri")!;
    expect(ac.systemData.metadata?.confirmedExoplanetCount).toBe(2);
  });
  it("Proxima c is a candidate and excluded from count", () => {
    const ac = planetarySystemRegistry.getSystem("alpha-centauri")!;
    const c = ac.systemData.celestialBodies.find(
      (b) => b.name.includes("c") && b.name.includes("Proxima"),
    )!;
    expect(c.status).toBe("candidate");
  });
});
describe("generated starSystems", () => {
  it("every confirmed count matches the column", () => {
    for (const s of starSystems) {
      const confirmed = s.systemData.celestialBodies.filter(
        (b) => b.type === "planet" && (!b.status || b.status === "confirmed"),
      ).length;
      // column may exceed confirmed-row count for contested systems (HD 219134) -> warn only
      expect(
        s.systemData.metadata?.confirmedExoplanetCount,
      ).toBeGreaterThanOrEqual(confirmed);
    }
  });
});
```

Keep the TRAPPIST-1/Wolf 359/Kepler bespoke tests (repoint imports to `CuratedSystems`). Drop the Alpha Centauri barycenter/mass-ratio assertions OR keep them pointing at the registry's `alpha-centauri` (the override preserves those values — re-verify they still pass; if an exact value drifted, update the assertion to match the override's documented values, not the old bespoke file).

**Step 2: Run → fix until PASS.**

**Step 3: Commit:** `test(planetary): rewrite system tests for generated + curated registry`

---

## Task 18: New `systems.test.ts` — Unknown-rule guard

**Files:**

- Create: `src/lib/planetary-system/__tests__/systems.test.ts`

**Step 1: Write failing test:**

```ts
import { describe, it, expect } from "vitest";
import { starSystems } from "@/lib/planetary-system/systems";

describe("no zero-where-unknown", () => {
  for (const sys of starSystems) {
    const bodies = [sys.systemData.star, ...sys.systemData.celestialBodies];
    for (const b of bodies) {
      it(`${sys.id}/${b.id}: temperature not literal 0 unless star origin`, () => {
        const t = b.keyFacts.temperature;
        if (t !== undefined) expect(t).not.toBe("0");
      });
      it(`${sys.id}/${b.id}: diameter present`, () => {
        expect(b.keyFacts.diameter).toBeTruthy();
      });
    }
  }
});
```

**Step 2: Run → PASS** (derivation omits empties; if any fail, fix the derivation's empty-cell handling).

**Step 3: Commit:** `test(systems): guard against zero-where-unknown values`

---

## Task 19: E2E smoke test

**Files:**

- Modify/extend: `e2e/main-user-journeys.spec.ts` (or the `@smoke` file)

**Step 1: Write** a `@smoke` test:

- Visit `/` → galaxy view → assert at least 30 star-system points render (count rendered star markers, selector per existing `StarSystemManager` mesh naming).
- Visit `/planetary/alpha-centauri` → wait for `#solar-system-renderer` → assert HUD shows "2" confirmed and a "Candidate"/"Disputed" badge text is present for Proxima c (open the body list / info modal as the existing journey does).

**Step 2: Run** `bun run test:e2e:smoke`. Fix selectors/timing per `AGENTS.md` gotcha #6 (wait for renderer before interacting).

**Step 3: Commit:** `test(e2e): smoke test 30-system galaxy + Alpha Centauri candidate status`

---

## Task 20: Final verification & cleanup

**Step 1:** Run the full gate:

```
bun run gen:systems && bun run lint && bun run type-check && bun run test:run && bun run test:e2e:smoke
```

Fix anything red. Re-run `bun run format`.

**Step 2:** Remove now-dead code: confirm no remaining references to deleted files (`grep -r "AlphaCentauri.ts\|KeplerSystems\|NearbyExoplanets" src`). Confirm `localGalaxyData` still exported from `LocalGalaxy.ts` (GalaxyRenderer imports it).

**Step 3:** Manually sanity-check in the browser (`bun run dev`): galaxy shows 30 points; Alpha Centauri page shows 2 confirmed + Proxima c dashed orbit + badge; a system with a missing field shows "Unknown".

**Step 4: Commit:** `chore: final cleanup and formatting for 30-system pipeline`

---

## Acceptance criteria mapping (HPA-59)

| Criterion                                                                              | Tasks             |
| -------------------------------------------------------------------------------------- | ----------------- |
| All 30 systems shown in galaxy/system view                                             | 8, 11, 12, 13, 19 |
| Detail view: distance, star count, confirmed count, constellation                      | 2, 9, 15, 16      |
| Each object: classification, diameter, temp, period, composition, distance-from-center | 9                 |
| Unknown → "Unknown", not 0                                                             | 3, 9, 16, 18      |
| Confirmed vs candidate visually/textually clear                                        | 4, 9, 14, 16      |
| Alpha Centauri/Proxima corrected (Proxima c not confirmed, count 2)                    | 4, 9, 10, 17, 19  |
