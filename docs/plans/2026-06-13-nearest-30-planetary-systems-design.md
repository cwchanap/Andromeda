# Design: Add data for 30 nearest planetary systems

- **Linear issue:** [HPA-59](https://linear.app/cwchanap/issue/HPA-59/add-data-for-30-nearest-planetary-systems)
- **Status:** Approved
- **Date:** 2026-06-13

## Goal

Add structured astronomical data for the 30 nearest known planetary systems and unify the app's two parallel system representations into a single CSV-driven data pipeline. Every system gets a full 3D scene, a galaxy-map point, and an Explore/detail entry, with confirmed-vs-candidate status made explicit.

## Decisions (from brainstorming)

1. **All 30 systems get full 3D** — not just a summary list.
2. **Auto-derive Three.js visuals from astronomy** (no per-system hand-tuning of color/scale/orbit beyond a few overrides).
3. **Widen `CelestialBodyData.type` + add a `status` field** to express candidates/disputed and brown dwarfs.
4. **All 30 populate the 3D galaxy map**, positioned from real right-ascension/declination.
5. **Commit the CSV to the repo** as the human-editable source of truth.
6. **Unify all systems (including the 8 existing hand-authored ones) into the data pipeline.**

## Architecture: build-time codegen (Approach A)

The CSV is the source of truth. A codegen script reads it, runs pure derivation functions, and emits standard typed modules in place. Runtime pays zero parse cost; `tsc` catches typos; SSR is unaffected.

- `src/data/nearest_30_planetary_systems.csv` — one row per object (~103 rows across 30 systems), human-editable.
- `scripts/gen-systems.ts` — parses, validates, derives, and writes the two modules below.
- `bun run gen:systems` chained into `prebuild` (before `astro build`) so deploys never ship stale data. `dev` is unchanged because the modules are committed and hot-reload on edit.

Developer workflow: edit the CSV → run `gen:systems` → commit both.

### CSV columns

`system_id, system_name, object_id, object_name, object_kind, status, parent_id, star_count, confirmed_planet_count, constellation, distance_ly, ra_deg, dec_deg, spectral_class, diameter_km, temperature_k, orbital_period_days, orbital_period_years, semi_major_axis_au, composition`

Missing cells are **empty** (never `0` unless scientifically 0, e.g. a unary central star's distance-from-center).

### Output modules (standard names, written in place)

- `src/lib/planetary-system/systems.ts` — `export const starSystems: PlanetarySystem[]`. Replaces the four hand-authored files (`SolarSystem.ts`, `AlphaCentauri.ts`, `KeplerSystems.ts`, `NearbyExoplanets.ts`, which are deleted). `index.ts` imports from here and registers every system.
- `src/lib/galaxy/LocalGalaxy.ts` — keeps its existing name and `localGalaxyData` export (already imported everywhere), repopulated with all 30 systems.

Each file carries a single unobtrusive top JSDoc so edits route to the CSV:
`/** @source src/data/nearest_30_planetary_systems.csv — run gen:systems to regenerate */`

## Data model changes

### `src/types/game.ts` — `CelestialBodyData`

```ts
export interface CelestialBodyData {
  type: "star" | "planet" | "brown-dwarf" | "moon"; // + "brown-dwarf"
  status?: "confirmed" | "candidate" | "controversial"; // NEW, optional
  keyFacts: {
    // distanceFromSun field NAME kept for back-compat; semantics corrected:
    //   unary central star -> "0 (system center)"
    //   planet             -> "X AU from <host>"
    //   moon               -> uses distanceFromParent
    distanceFromSun?: string;
    equilibriumTemperature?: string; // NEW: labeled estimated/equilibrium
    // ...existing fields unchanged
  };
  // ...rest unchanged
}
```

### `src/lib/planetary-system/types.ts` — `PlanetarySystemData.metadata`

Add `confirmedExoplanetCount: number`. This makes the count explicit rather than inferred from array length, which is what lets Proxima c be excluded from Alpha Centauri's "2 confirmed".

### `src/lib/galaxy/types.ts` — `StarSystemData.metadata`

`numberOfPlanets` is populated from the confirmed count (excludes candidates).

### Object-kind → type/status mapping

| CSV `object_kind`        | `type`        | `status`                              |
| ------------------------ | ------------- | ------------------------------------- |
| star                     | `star`        | `confirmed` (default)                 |
| planet                   | `planet`      | from `status` col (default confirmed) |
| planet candidate         | `planet`      | `candidate` / `controversial`         |
| brown dwarf / substellar | `brown-dwarf` | from `status` col                     |
| satellite                | `moon`        | `confirmed`                           |

Empty numeric cells → field omitted entirely; rendered as "Unknown" at the UI layer (never `0`).

## Derivation layer (`src/lib/planetary-system/derive/`)

Pure functions, no Three.js math in the astronomy calculators (only in assembly). Fully unit-testable.

### `visualFromAstronomy.ts`

- **Star color** ← spectral-class lookup table: `O #9BB0FF, B #AABFFF, A #CAD7FF, F #F8F7FF, G #FFF4EA, K #FFD2A1, M #FFA050, L/T(y dwarf) #FF8866, white-dwarf #FFFFFF, brown-dwarf #8B4513`. Fallback from temperature via blackbody-ish interpolation.
- **Render scale** ← real diameter: `scale = clamp(log10(diameter_km / 12742) * k + base, min, max)` (Earth = 12,742 km). Stars floored higher so red dwarfs don't vanish.
- **Emissive intensity** ← temperature (hotter = brighter).
- **Orbit semi-major axis (scene units)** ← real `semi_major_axis_au` scaled by a per-system `systemScale` so the outermost body fits a target radius.
- **Orbit period** ← `orbital_period_days/years` directly; `visualPeriodSeconds` via logarithmic compression (a 1.5-day and a 5-year orbit both stay watchable), capped to a sane range.
- **Eccentricity** ← `0.0` when unknown (low circular default).
- **Inclination / phase** ← randomized-but-deterministic from a stable `object_id` hash (layouts stable across reloads, not all coplanar).
- **Composition** ← CSV `composition` split into `keyFacts.composition[]`.
- **Temperature label** ← if a planet has no surface temp, set `equilibriumTemperature` with an "(equilibrium, estimated)" suffix.

### `buildSystem.ts`

Assembles a system-group into a `PlanetarySystem`: star(s) + bodies, wires `orbit.centerId` to `parent_id` (or system barycenter/center for a unary star, where distance-from-center = 0). Sets `systemType` from `star_count` (1 → `solar`, 2 → `binary`, ≥3 → `multiple`).

### `buildGalaxy.ts`

RA/Dec/distance → Cartesian (1 unit = 1 ly, matching the current scale):

```
x = d · cos(dec) · cos(ra)
y = d · sin(dec)
z = d · cos(dec) · sin(ra)
```

`visual.brightness` ← inverse-square of distance; `visual.colorIndex` ← spectral-class B-V lookup.

### `overrides.ts`

A small typed map keyed by `system_id`, applied **after** derivation, for the few systems needing hand-tuned visuals (e.g. Alpha Centauri's AB-barycenter orbit). Everything else is pure derivation.

## Integration & UI

**Replaced by generation** (hand-authored → deleted, re-exported from `systems.ts`): `SolarSystem.ts`, `AlphaCentauri.ts`, `KeplerSystems.ts`, `NearbyExoplanets.ts`. `index.ts` registers every system from the array; `LocalGalaxy.ts` is regenerated.

**No changes required** to `ExploreSystems.svelte` (reads `getAllSystems()`), `[systemId].astro`, or `PlanetarySystemWrapper.svelte` — they consume the registry/galaxy interfaces unchanged. That is the main benefit of unification.

### Candidate / disputed rendering (acceptance: visually & textually clear)

- `CelestialBodyManager` (graphics): if `body.status !== "confirmed"`, draw the orbit line **dashed** and lower body opacity to ~0.6.
- Info modal: a badge next to the name — "Candidate" / "Disputed" (amber). Temperature shown via `equilibriumTemperature` with "(estimated)" where applicable.
- `ExploreSystems.svelte` body count: switch from `celestialBodies.length` to `metadata.confirmedExoplanetCount`.

### Unknown values (acceptance: "Unknown", not 0)

- Derivation omits a `keyFacts` sub-field when the CSV cell is empty.
- Info modal renders `value ?? t("common.unknown")`; the existing falsy-safe `readout-row` pattern is reused for the body modal.

### Alpha Centauri fix (acceptance criterion)

Proxima c row carries `status:controversial` → derived as `type:"planet", status:"controversial"`, dashed orbit. `confirmedExoplanetCount: 2` (Proxima b + d). Its ~1.5 AU / 5.2 yr / ~39 K values are preserved but now labeled equilibrium/estimated. Galaxy summary `numberOfPlanets` → 2.

### Distance labeling (acceptance: "distance from host star / system center")

`keyFacts.distanceFromSun` populated as `"0 (system center)"` for a unary star, `"X AU from <host>"` for planets, and the existing `distanceFromParent` for moons. Field name kept; display strings corrected.

## Codegen validation gate

`scripts/gen-systems.ts` fails the build on hard errors:

- duplicate `object_id` / `system_id`,
- a system with no central star / barycenter,
- a candidate counted toward `confirmedExoplanetCount`,
- `confirmedExoplanetCount` not matching the count of confirmed-planet rows.

Warnings (e.g. missing temperature) are non-fatal. This is what catches a future Alpha-Centauri-style error at build time.

## Testing

- `derive/__tests__/visualFromAstronomy.test.ts` — pure functions: spectral→color table, diameter→scale monotonic & clamped, RA/Dec→Cartesian known case (Sirius), period-compression range.
- `derive/__tests__/buildSystem.test.ts` — golden: feed a 3-row Alpha Centauri CSV snippet → assert Proxima c `status:"controversial"`, `confirmedExoplanetCount === 2`, AB-barycenter orbit applied via override.
- `__tests__/PlanetarySystems.test.ts` (exists) — update to assert registry has ≥30 systems, all ids unique, every system has a star + valid `systemType`.
- `__tests__/systems.test.ts` — no body has `0` where "Unknown" is required; every confirmed count equals confirmed-planet rows.
- `graphics/__tests__/CelestialBodyManager.test.ts` — candidate body gets dashed-orbit / opacity flag.
- E2E (`@smoke`): galaxy view renders 30 points; `/planetary/alpha-centauri` shows "2 confirmed" and a "Disputed" badge on Proxima c.

## Quality gates before "done"

```
bun run gen:systems && bun run lint && bun run type-check && bun run test:run
```

## Out of scope (YAGNI)

- No live astronomical API integration — data is static, CSV-sourced.
- No new plugin system features; pipeline is internal.
- No 3D texture/normal maps for the new systems (color + emissive only), unless a future issue adds assets.
- Galaxy bounding radius stays illustrative; only positions are real.
