# Multi-Star Barycentric Orbits Design

## Summary

Introduce a deterministic orbital-elements layer for planetary systems that need realistic multi-body hierarchy, starting with Alpha Centauri. The current renderer treats unparented bodies as orbiting the fixed system origin and parented bodies as orbiting a visible parent body. That is enough for simple star/planet/moon scenes, but it makes Alpha Centauri A look like the fixed center while B and Proxima move around it.

The new model keeps existing systems stable while allowing bodies to orbit invisible barycenters, visible stars, planets, or other anchors. Alpha Centauri becomes the first migrated system: A and B orbit the AB barycenter, Proxima orbits the AB barycenter on a wide eccentric orbit, and Proxima's planets orbit Proxima.

## Goals

- Represent invisible barycenters as first-class system anchors.
- Represent migrated body motion with orbital elements: center, semi-major axis, eccentricity, period, phase, inclination, longitude of ascending node, and argument of periapsis.
- Support a hybrid time model: store real orbital periods for educational data and validation, while allowing visual period overrides when real periods are too slow to perceive.
- Show barycenter markers only through a user-controlled educational overlay. They are hidden by default and are not selectable bodies.
- Keep legacy `orbitRadius`, `orbitSpeed`, and `parentId` behavior for systems that are not migrated.
- Migrate only Alpha Centauri in the first implementation.
- Keep all shadow rendering disabled.

## Non-Goals

- Building a live n-body gravity simulator.
- Migrating the Solar System or every exoplanet system to orbital elements in the first pass.
- Making barycenters selectable in keyboard navigation, modals, comparison, or info panels.
- Adding a broad UI redesign.
- Rendering exact current ephemeris positions for a real date.
- Enabling shadows or changing lighting policy.

## Current System Behavior

`PlanetarySystemRenderer` adapts a `PlanetarySystemData` record into `[star, ...celestialBodies]` and passes that flat list to `SolarSystemRenderer`.

`CelestialBodyManager` currently owns:

- body groups in `bodies`
- source body records in `bodyData`
- circular orbit lines in `orbitLines`
- accumulated legacy orbit angles in `orbitAngles`
- parent-relative motion through `parentId`
- visual orbit-radius expansion for small moons

Bodies with no `parentId` orbit the system origin. Bodies with `parentId` orbit the parent body's current position. Alpha Centauri A is the system `star` at origin, so it stays fixed while other stars move around the origin.

## Data Model

Extend `PlanetarySystemData` with optional invisible anchors:

```ts
interface OrbitAnchorData {
    id: string;
    name: string;
    type: "barycenter";
    description?: string;
    position?: Vector3;
    orbit?: OrbitalElementsData;
    overlay?: {
        visibleByDefault?: boolean;
        color?: string;
        label?: string;
    };
}
```

Extend `CelestialBodyData` with optional orbital elements:

```ts
interface OrbitalElementsData {
    centerId: string;
    semiMajorAxis: number;
    eccentricity?: number;
    inclinationDeg?: number;
    longitudeOfAscendingNodeDeg?: number;
    argumentOfPeriapsisDeg?: number;
    phaseDeg?: number;
    periodDays?: number;
    periodYears?: number;
    visualPeriodSeconds?: number;
    clockwise?: boolean;
    line?: {
        visible?: boolean;
        color?: string;
        opacity?: number;
    };
}
```

Rules:

- `centerId` may reference an `OrbitAnchorData.id` or a visible `CelestialBodyData.id`.
- `semiMajorAxis` is in renderer visual units, just like existing `orbitRadius`.
- `eccentricity` defaults to `0`.
- angular fields default to `0`.
- `visualPeriodSeconds`, when present, drives visible animation speed.
- `periodDays` or `periodYears` remains the real educational period and should not be overwritten for visual tuning.
- Legacy fields remain valid for unmigrated systems.

For binary mass-ratio realism, Alpha Centauri stores explicit A and B semi-major axes derived from the real relative orbit and stellar masses. The renderer does not compute gravity or solve barycenters dynamically; tests validate that the authored A/B orbit radii match the intended mass ratio.

## Alpha Centauri Migration

Add an `alpha-centauri-ab-barycenter` anchor near the system center.

Alpha Centauri A:

- visible body remains the system `star`
- gains `orbit.centerId = "alpha-centauri-ab-barycenter"`
- uses the AB orbital period, eccentricity, and one phase
- uses a smaller semi-major axis than B because A is more massive

Alpha Centauri B:

- gains `orbit.centerId = "alpha-centauri-ab-barycenter"`
- uses the same AB period, eccentricity, inclination, and periapsis orientation as A
- uses the opposite phase from A
- uses the larger semi-major axis

Proxima Centauri:

- gains `orbit.centerId = "alpha-centauri-ab-barycenter"`
- uses its wide, eccentric, inclined orbit
- stores the real long orbital period
- uses a visual period override so motion is observable

Proxima b and Proxima c:

- gain `orbit.centerId = "proxima-centauri"`
- keep real period facts in `keyFacts`
- use orbital elements for rendered motion instead of legacy `parentId`

The first pass does not add hypothetical Alpha Centauri A or B planets.

## Architecture

Add a focused orbit layer under `src/lib/planetary-system/orbits/`:

- `orbitalElements.ts`: pure math for converting orbital elements and elapsed time into local positions.
- `OrbitResolver.ts`: runtime registry that resolves anchors, bodies, centers, visual period overrides, initial phases, and orbit-line sample points.

`CelestialBodyManager` remains the integration point for Three.js objects. It delegates new-orbit calculations to `OrbitResolver` while retaining existing legacy orbit code for bodies without `orbit`.

`SolarSystemRenderer.initialize` already receives optional `systemData`; it should pass anchor data into `CelestialBodyManager` before creating bodies. `PlanetarySystemRenderer` should continue to pass full `PlanetarySystemData` so no wrapper API change is needed.

## Data Flow

1. `PlanetarySystemWrapper.svelte` loads a system from `planetarySystemRegistry`.
2. `PlanetarySystemRenderer.initialize(systemData)` passes body data and full system data to `SolarSystemRenderer`.
3. `SolarSystemRenderer.initialize` configures scene environment, then asks `CelestialBodyManager` to register `systemData.orbitAnchors`.
4. `CelestialBodyManager.createCelestialBody` creates visible body groups as it does now and registers each group with `OrbitResolver`.
5. During animation:
   - bodies with `orbit` use `OrbitResolver`
   - bodies without `orbit` use the legacy `orbitRadius`/`orbitSpeed` path
6. Orbit-line geometry for `orbit` bodies is sampled as an ellipse after applying eccentricity and orbital-plane transforms.
7. Barycenter overlay markers follow anchor positions but remain hidden until the overlay is enabled.

## Renderer Behavior

`OrbitResolver` computes positions deterministically from elapsed simulation time. It should not call a numerical gravity integrator.

The position flow for an orbiting object is:

1. Resolve the center position.
2. Convert elapsed time into orbital phase using `visualPeriodSeconds` if present, otherwise real period fields if available.
3. Compute an elliptical orbit point from semi-major axis and eccentricity.
4. Apply argument of periapsis, inclination, and longitude of ascending node.
5. Add the center position.

If animations are disabled, bodies remain at their current resolved positions and do not advance phase. If orbit speed multiplier changes, the multiplier affects visual elapsed time without mutating source data.

## Overlay UI

Add a compact barycenter overlay toggle to the existing right-side planetary-system control area. It should appear only when the loaded system declares orbit anchors.

Behavior:

- Default state is off.
- When on, barycenter markers and labels are visible.
- Markers are not selectable by pointer, keyboard navigation, or comparison controls.
- The toggle state lives in `PlanetarySystemWrapper.svelte` for the first pass and is not persisted across page reloads.

The existing orbit-speed control remains responsible for global orbit speed.

## Error Handling And Validation

Validation should warn, not crash, for recoverable authoring issues:

- an orbit references a missing `centerId`
- an anchor references a missing center
- eccentricity is outside `[0, 1)`
- semi-major axis is non-positive
- period and visual period values are non-positive

Renderer fallback behavior:

- If a center cannot be resolved, keep the body or anchor at its authored `position`.
- Skip the invalid orbit line.
- Log a warning with the body or anchor id and missing center id.
- Continue scene initialization.

Hard failures should remain reserved for existing renderer creation errors such as WebGL or container setup failures.

## Testing

Add focused unit coverage for the new pure orbit math:

- circular orbit at zero inclination
- eccentric orbit periapsis and apoapsis sampling
- inclined orbit changes the expected transformed coordinates
- phase offset produces opposite A/B positions
- visual period override advances independent of real period

Add `CelestialBodyManager` coverage:

- body with `orbit.centerId` follows an invisible anchor
- body orbiting another visible body follows that moving body
- eccentric orbit line is an ellipse rather than a circle
- overlay markers are hidden by default and become visible when toggled
- legacy `parentId` and `orbitRadius` behavior still works
- invalid center references warn and do not crash

Add Alpha Centauri data tests:

- system declares the AB barycenter anchor
- A and B orbit the AB barycenter
- A and B phases differ by 180 degrees
- A/B semi-major axis ratio matches the inverse stellar mass ratio within a small tolerance
- Proxima orbits the AB barycenter
- Proxima b and Proxima c orbit Proxima with the new `orbit` field
- real periods remain present when visual overrides are present

Expected focused verification commands after implementation:

```bash
bunx vitest src/lib/planetary-system/orbits
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
```

Run `bun run type-check` if any shared type contracts are changed.

## References

- NASA describes Alpha Centauri A and B as orbiting a common center of gravity about every 80 years: https://science.nasa.gov/missions/hubble/hubbles-best-image-of-alpha-centauri-a-and-b/
- Feng and Jones describe Proxima as a wide companion orbiting the Alpha Centauri A/B barycenter with large eccentricity, inclination, and a long period: https://academic.oup.com/mnras/article-abstract/473/3/3185/4349757
- NASA Exoplanet Catalog lists Proxima b orbital radius, period, and eccentricity: https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/

## Open Decisions Resolved

- Use deterministic orbital elements, not n-body simulation.
- Use a generalized model, but migrate only Alpha Centauri first.
- Keep barycenters hidden by default and reveal them through a toggleable educational overlay.
- Preserve legacy orbit fields for unmigrated systems.
- Store real periods while allowing visual period overrides.
