# Moon Orbit Rendering Design

## Summary

Render existing moons visibly around their parent planets in the main 3D solar-system scene. The pass fixes the current visual-scale issue where authored moon orbit radii can be smaller than the rendered parent planet, causing moons and their orbit lines to appear inside or clipped by the parent.

The implementation stays inside the existing renderer model. It does not add new moon records, UI controls, labels, terrain detail, or a new parent-child scene graph.

## Goals

- Existing moon bodies render as selectable 3D meshes orbiting their `parentId` planet.
- Moon orbit lines are centered on the parent planet and match the visible moon path.
- Parent-relative moon orbits remain visually outside the rendered parent body.
- Existing planet/star orbits around the system center keep their current behavior.
- Astronomical data, modal content, keyboard navigation, comparison state, and selection behavior continue to use the existing `CelestialBodyData` records.
- Shadow rendering remains disabled project-wide.

## Non-Goals

- Adding new moons or changing the solar-system catalog.
- Adding labels, toggles, filters, mini-maps, or planet-specific moon UI.
- Reworking the renderer into a nested parent-child scene graph.
- Changing real distance facts, formatted distances, or modal copy.
- Enabling shadows.

## Architecture

The change belongs in `src/lib/planetary-system/graphics/CelestialBodyManager.ts`.

`CelestialBodyManager` already owns:

- created body groups in `bodies`
- source body records in `bodyData`
- orbit lines in `orbitLines`
- accumulated orbit angles in `orbitAngles`
- parent-relative orbit updates for bodies with `parentId`

Add a small renderer-only concept: an effective visual orbit radius for body placement and orbit-line geometry. For non-parented bodies, this is the authored `data.orbitRadius`. For parented bodies, it is the larger of the authored orbit radius and a minimum clear radius derived from rendered scale:

```text
clearance = max(0.15, parent.scale * 0.1)
effectiveRadius = max(data.orbitRadius, parent.scale + child.scale + clearance)
```

This clearance creates a visible gap without dramatically expanding already reasonable moon systems. It is deterministic and should be covered by tests.

This effective radius is renderer state only. It must not mutate `CelestialBodyData`.

## Data Flow

1. `SolarSystemWrapper.svelte` and `PlanetarySystemRenderer` continue passing `[star, ...celestialBodies]` into `SolarSystemRenderer.initialize`.
2. `SolarSystemRenderer.initialize` continues creating bodies through `CelestialBodyManager`.
3. When `CelestialBodyManager` creates a body with `orbitRadius > 0`, it computes the effective orbit radius.
4. `createOrbitLine` uses the effective radius for the line geometry. If `parentId` exists and the parent has already been created, the line is positioned at the parent body.
5. `updateAnimations` uses the same effective radius for parent-relative body positions.
6. `updateAnimations` keeps updating the orbit line position to follow the parent as the parent orbits.

Creation order remains important: parent bodies should be created before their moons. The existing solar-system data already follows that order.

## Error Handling

If a moon references a missing parent:

- Preserve the existing warning behavior.
- Fall back to the authored orbit radius.
- Do not throw during renderer initialization.

If a body lacks `orbitRadius` or has `orbitRadius <= 0`, keep the existing behavior and skip orbit-line creation.

## Testing

Add focused unit coverage in `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`:

- A moon with an authored orbit radius smaller than `parent.scale + moon.scale` is positioned outside the parent after an animation update.
- A moon with an authored orbit radius already larger than the minimum clear radius keeps that authored radius.
- A non-parented planet still uses its authored system-center orbit radius.
- Existing tests for parent-centered moon orbit lines and missing-parent warnings continue to pass.

The expected verification command after implementation is:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
```

Run broader checks if the implementation touches renderer initialization, interaction, or shared type contracts.

## Open Decisions Resolved

- Use renderer-level visual spacing rather than editing solar-system data.
- Keep body groups at scene level rather than attaching moons under parent groups.
- Keep scope to visible orbiting behavior for existing moons.
