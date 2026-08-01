# HPA-431: Observer-Relative Coordinate Transforms Design

**Status:** Approved, revised after design review

**Issue:** HPA-431 — `[Sky] Define observer-relative coordinate transforms and astronomy fixtures`

**Parent:** HPA-426 — `Epic: Sky From Another Star`

**Downstream consumer:** HPA-433 — `[Sky] Prepare transformed constellation catalogs and synthetic Sol`

> This document is the approved design for HPA-431. Draft PR #33 contains the design only; implementation follows in a separate implementation plan and implementation PR.

## 1. Summary

Add a pure astronomy module that converts catalog stars from right ascension, declination, and light-year distance into the same Sol-centered Cartesian frame already used by the local-galaxy data, translates those positions into an arbitrary nearby-system observer frame, and converts the resulting relative vectors back into normalized observer-relative equatorial coordinates.

The module will:

- define and document one shared Cartesian axis convention;
- use plain serializable vector objects rather than `THREE.Vector3`;
- validate all public inputs and return discriminated typed failures;
- normalize finite right ascension values into `[0h, 24h)`;
- canonicalize right ascension to `0h` at exact declination poles;
- reject relative vectors whose direction is undefined at or below a documented near-zero threshold;
- preserve the existing `radialToCartesian()` import path, positional signature, and permissive zero-distance behavior for galaxy derivation;
- provide deterministic fixtures that prove compatibility with the existing galaxy coordinates.

The HPA-431 implementation remains a domain-and-test change only. It does not prepare constellation catalogs, create synthetic Sol records, modify renderer behavior, or integrate route/UI state.

## 2. Context

The current codebase has two coordinate paths with different responsibilities:

1. `src/lib/planetary-system/derive/buildGalaxy.ts` converts system-level right ascension and declination in degrees into Sol-centered Cartesian positions in light-years through `radialToCartesian()`.
2. `src/utils/astronomy.ts` converts a star's right ascension and declination into an Earth-surface horizontal frame using observer latitude, longitude, date, and sidereal time through `celestialToSphere()`.

HPA-431 must align with the first path and remain separate from the second.

Alien-sky mode is a system-barycenter celestial-sphere view. It translates the origin from Sol to a selected nearby system, but it does not model an exoplanet surface, horizon, atmosphere, axial tilt, day/night cycle, or local sidereal time.

HPA-433 will consume the resulting API to transform immutable constellation catalogs and create a synthetic Sol marker. Therefore, HPA-431 must define stable units, normalization behavior, failure semantics, and coordinate axes before renderer or catalog code relies on them.

## 3. Goals

- Establish a pure, framework-independent coordinate transformation module.
- Use the existing galaxy coordinate frame as the canonical Sol-centered frame.
- Convert equatorial star positions to Sol-centered Cartesian light-year positions.
- Translate target positions into an arbitrary observer-relative frame.
- Convert non-zero Cartesian vectors back to normalized right ascension, declination, and distance.
- Make every expected invalid-input condition inspectable through typed results.
- Provide deterministic fixtures for axes, identity, Alpha Centauri, wrap-around, poles, invalid data, and near-zero vectors.
- Keep existing galaxy derivation behavior and import paths compatible.

## 4. Non-goals

- Preparing transformed constellation or star records.
- Adding a synthetic Sol catalog entry.
- Mutating or replacing `src/data/constellations.ts`.
- Introducing `THREE.Vector3`, Svelte, Astro, DOM, or renderer dependencies.
- Changing `celestialToSphere()` or Earth geolocation/sidereal-time behavior.
- URL state, route parsing, Galaxy CTA behavior, HUD controls, localization, or accessibility UI.
- Proper motion, epoch conversion, precession, aberration, or relativistic effects.
- Surface-observer orientation or local horizon coordinates.
- Distance-adjusted apparent magnitude.
- Adding a third-party astronomy or result-type dependency.
- Adding public right-ascension hours/degrees conversion helpers.
- Adding an equatorial-observer overload to `transformToObserver()`.

## 5. Coordinate model

### 5.1 Reference frame

The canonical frame is:

> Sol-centered, equatorial, Y-up Cartesian coordinates measured in light-years.

The origin is Sol. The axes are fixed to the equatorial directions represented by the catalog's right ascension and declination values.

| Equatorial direction | Cartesian direction |
| --- | --- |
| RA `0h`, Dec `0°` | `+X` |
| RA `6h`, Dec `0°` | `+Z` |
| RA `12h`, Dec `0°` | `-X` |
| RA `18h`, Dec `0°` | `-Z` |
| Dec `+90°` | `+Y` |
| Dec `-90°` | `-Y` |

This is the existing `radialToCartesian()` convention. HPA-431 does not rotate the frame when the observer changes; it only translates the origin.

### 5.2 Units and source mapping

Public types encode units in property names:

- right ascension: hours;
- declination: degrees;
- Cartesian position and scalar distance: light-years.

The existing galaxy compatibility helper retains its current scalar signature of distance in light-years, right ascension in degrees, and declination in degrees.

| Source | Right ascension | Declination | Distance | HPA-431 mapping |
| --- | --- | --- | --- | --- |
| `src/data/constellations.ts` / `Star` | hours | degrees | light-years | `rightAscension` -> `rightAscensionHours`; `declination` -> `declinationDegrees`; `distance` -> `distanceLightYears` |
| `system_coordinates.csv` / `radialToCartesian()` | degrees | degrees | light-years | Legacy helper only; positional call remains `(d, raDeg, decDeg)` |

The unit relationship is `rightAscensionDegrees = rightAscensionHours × 15`, or conversely `rightAscensionHours = rightAscensionDegrees / 15`. HPA-431 documents this conversion but does not add a public unit-conversion helper.

### 5.3 Forward conversion

For right ascension `α` in hours, declination `δ` in degrees, and distance `d` in light-years:

```text
αrad = α × π / 12
δrad = δ × π / 180

x = d × cos(δrad) × cos(αrad)
y = d × sin(δrad)
z = d × cos(δrad) × sin(αrad)
```

Finite right ascension input is normalized modulo 24 before conversion:

```text
normalizedHours = ((hours % 24) + 24) % 24
```

Declination is not wrapped or clamped. Values outside `[-90°, +90°]` are invalid because silently reflecting or clamping them would hide malformed catalog data.

### 5.4 Observer translation

Given a target position and observer position in the same Sol-centered frame:

```text
relative = targetPosition - observerPosition
```

No rotation, scale, or time-dependent adjustment is applied.

A Sol observer is represented by `{ x: 0, y: 0, z: 0 }` and is valid.

### 5.5 Reverse conversion and required control flow

For a valid non-zero Cartesian vector `(x, y, z)`, normal reverse conversion is:

```text
distance = hypot(x, y, z)
horizontal = hypot(x, z)
rightAscensionRadians = atan2(z, x)
declinationRadians = atan2(y, horizontal)
```

Right ascension is converted to hours and normalized into `[0h, 24h)`.

Using `atan2(y, hypot(x, z))` for declination avoids a division by distance and remains stable near the poles.

The implementation must follow this order exactly:

1. validate finite `x`, `y`, and `z`;
2. compute `distance = hypot(x, y, z)`;
3. if `distance <= MIN_DIRECTION_DISTANCE_LIGHT_YEARS`, return `undefined-direction`;
4. compute `horizontal = hypot(x, z)`;
5. if `horizontal <= MIN_DIRECTION_DISTANCE_LIGHT_YEARS`, return the canonical pole representation;
6. otherwise use the normal `atan2` formulas and normalize RA.

The full-vector norm check must precede pole handling. This prevents `(0, 0, 0)`, including signed-zero variants, from entering a pole branch in which `y` is neither positive nor negative.

### 5.6 Pole canonicalization

At the north or south celestial pole, right ascension is geometrically undefined. Floating-point remnants in `x` and `z` must not produce arbitrary output values.

After the full-vector norm has been proven greater than the direction threshold, when the horizontal norm `hypot(x, z)` is at or below that same threshold, reverse conversion returns:

- `rightAscensionHours = 0`;
- `declinationDegrees = +90` when `y > 0`;
- `declinationDegrees = -90` when `y < 0`.

A `y === 0` pole case is unreachable: if `y` is zero and the horizontal norm is at or below the threshold, then the full norm is also at or below the threshold and step 3 returns `undefined-direction` first. The implementation must not add a fallback such as `else { declinationDegrees = 0 }` to the pole branch.

Round-trip tests at exact poles assert the canonical output rather than preservation of the input right ascension.

### 5.7 Near-zero vectors

A zero-length relative vector has a distance but no meaningful direction. Very small vectors also produce unstable direction values relative to the domain's light-year scale.

Define one exported threshold:

```ts
export const MIN_DIRECTION_DISTANCE_LIGHT_YEARS = 1e-12;
```

A Cartesian vector with norm less than or equal to this threshold returns an `undefined-direction` failure when converted to equatorial coordinates.

The same threshold is intentionally reused for the full-vector norm and the horizontal pole norm. Therefore:

- `(0, 1e-11, 0)` succeeds and canonicalizes to RA `0h`, Dec `+90°`, distance `1e-11 ly`;
- `(0, 1e-12, 0)` fails with `undefined-direction` because its full norm equals the threshold.

This is coherent domain behavior, not a malformed-catalog special case. The threshold is many orders of magnitude below all current catalog and nearby-system distances, so it protects numerical behavior without excluding real application data.

## 6. Module location and dependencies

Add:

```text
src/lib/astronomy/observerTransform.ts
```

The module may depend only on JavaScript/TypeScript standard math and local types defined in the same file. It must not import:

- `three`;
- Svelte or Astro APIs;
- browser globals;
- constellation catalog types;
- galaxy data;
- route state;
- `src/utils/astronomy.ts`.

Plain structural vector types allow existing `THREE.Vector3` instances to be passed by callers because they expose finite `x`, `y`, and `z` properties, while the astronomy module itself remains free of Three.js.

## 7. Public API

### 7.1 Data types

```ts
export interface CartesianLightYears {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface EquatorialPosition {
    readonly rightAscensionHours: number;
    readonly declinationDegrees: number;
    readonly distanceLightYears: number;
}

export interface ObserverRelativePosition {
    readonly relativeCartesian: CartesianLightYears;
    readonly equatorial: EquatorialPosition;
}
```

The functions never mutate input objects.

### 7.2 Result type

```ts
export type TransformResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: CoordinateTransformError };
```

Expected validation and geometry failures return this union. Programming defects are not converted into domain failures.

### 7.3 Error type

```ts
export type CoordinateTransformError =
    | {
          readonly code: "non-finite-equatorial-input";
          readonly component:
              | "rightAscensionHours"
              | "declinationDegrees"
              | "distanceLightYears";
      }
    | {
          readonly code: "non-finite-cartesian-input";
          readonly role: "target" | "observer" | "vector";
          readonly component: "x" | "y" | "z";
      }
    | {
          readonly code: "declination-out-of-range";
          readonly declinationDegrees: number;
      }
    | {
          readonly code: "invalid-distance";
          readonly distanceLightYears: number;
      }
    | {
          readonly code: "undefined-direction";
          readonly distanceLightYears: number;
          readonly thresholdLightYears: number;
      };
```

The error payload does not echo `NaN` or infinity. For non-finite failures, the component name identifies the bad input without making diagnostics non-serializable.

Finite invalid values, such as a negative distance or out-of-range declination, may be included directly in the error payload.

### 7.4 Validated operations

```ts
export function equatorialToCartesian(
    position: EquatorialPosition,
): TransformResult<CartesianLightYears>;

export function subtractObserverPosition(
    target: CartesianLightYears,
    observer: CartesianLightYears,
): TransformResult<CartesianLightYears>;

export function cartesianToEquatorial(
    vector: CartesianLightYears,
): TransformResult<EquatorialPosition>;

export function transformToObserver(
    target: EquatorialPosition,
    observer: CartesianLightYears,
): TransformResult<ObserverRelativePosition>;
```

`transformToObserver()` is the primary downstream API. It performs:

1. validated equatorial-to-Cartesian conversion;
2. validated observer subtraction;
3. validated Cartesian-to-equatorial conversion;
4. return of both the relative Cartesian vector and normalized equatorial result.

It returns the first failure encountered and does not partially succeed.

The observer argument is Cartesian by design because HPA-432 and local-galaxy data already expose system positions in the shared Cartesian frame. HPA-431 does not add an equatorial-observer overload. A caller that only has equatorial observer coordinates must call `equatorialToCartesian()` first, or use the already-derived galaxy position.

### 7.5 Galaxy compatibility helper

Move the existing implementation of:

```ts
export function radialToCartesian(
    d: number,
    raDeg: number,
    decDeg: number,
): CartesianLightYears;
```

into `observerTransform.ts` as the single raw formula source.

`src/lib/planetary-system/derive/buildGalaxy.ts` re-exports this helper so existing imports and tests remain valid:

```ts
export { radialToCartesian } from "@/lib/astronomy/observerTransform";
```

The compatibility helper intentionally preserves existing behavior:

- its positional signature and runtime behavior remain exactly `(d, raDeg, decDeg)`;
- parameter-name polish inside the implementation is optional and must not imply a call-site contract change;
- it does not return `TransformResult`;
- it accepts `d = 0` and returns the zero vector;
- it remains the low-level formula used by galaxy derivation;
- validated HPA-431 APIs do not delegate input policy to callers.

The validated `equatorialToCartesian()` API rejects star distances less than or equal to zero because a catalog star requires a positive physical distance.

This distinction avoids a breaking galaxy refactor while giving HPA-433 explicit invalid-star behavior.

## 8. Validation behavior

Validation order is deterministic so fixtures and downstream diagnostics remain stable.

### 8.1 Equatorial input

Validate in this order:

1. `rightAscensionHours` is finite;
2. `declinationDegrees` is finite;
3. `distanceLightYears` is finite;
4. declination is within `[-90, +90]` inclusive;
5. distance is greater than zero.

Finite right ascension values outside `[0, 24)` are accepted and normalized.

### 8.2 Cartesian input and reverse-conversion order

For each vector, validate components in `x`, `y`, `z` order and return the first non-finite component.

`subtractObserverPosition()` validates target first, then observer.

`cartesianToEquatorial()` follows the ordered algorithm in §5.5: finite components, full-norm threshold, horizontal pole threshold, then normal `atan2` conversion. The pole branch is unreachable for full norms at or below the threshold.

### 8.3 Derived relative vector

Subtraction of finite values can overflow to infinity for extreme numbers. After subtraction, validate the derived relative vector before reverse conversion and report it with role `vector`.

### 8.4 Negative zero

Public numeric outputs must canonicalize JavaScript negative zero to positive zero at these required sites:

- normalized `rightAscensionHours` returned by reverse conversion;
- every public Cartesian component whose computed result compares equal to zero, including axis fixtures, forward conversion, observer subtraction, and the compatibility helper.

Intermediate trigonometric values do not require negative-zero cleanup, and tiny non-zero floating-point remnants must not be rounded to zero except through the explicit pole/threshold rules.

Tests use `Object.is(value, -0)` for normalized RA and representative zero Cartesian components.

## 9. Data flow

```text
Star catalog equatorial position
    │
    ▼
equatorialToCartesian()
    │  Sol-centered Cartesian light-years
    ▼
subtractObserverPosition(target, observer)
    │  Observer-relative Cartesian light-years
    ▼
cartesianToEquatorial()
    │
    ▼
ObserverRelativePosition
```

The selected system position already exists in the same Sol-centered light-year frame because local-galaxy coordinates are produced by the shared `radialToCartesian()` formula.

HPA-433 will own iteration over stars, preservation of IDs and metadata, omission diagnostics, and synthetic Sol record construction. HPA-431 owns only individual coordinate transformations.

## 10. Deterministic fixtures

Add:

```text
src/lib/astronomy/__tests__/observerTransform.fixtures.ts
src/lib/astronomy/__tests__/observerTransform.test.ts
```

The fixture module contains only immutable input and expected-output data. It does not call the functions under test to derive expected values.

### 10.1 Axis fixtures

At a representative positive distance, verify:

- RA `0h`, Dec `0°` -> `+X`;
- RA `6h`, Dec `0°` -> `+Z`;
- RA `12h`, Dec `0°` -> `-X`;
- RA `18h`, Dec `0°` -> `-Z`;
- Dec `+90°` -> `+Y`;
- Dec `-90°` -> `-Y`.

The same cases also verify the compatibility `radialToCartesian()` helper using right ascension in degrees.

### 10.2 Sol identity fixtures

With observer `{ x: 0, y: 0, z: 0 }`, representative positions round-trip within tolerance:

- each RA quadrant;
- positive and negative declinations;
- a near-wrap right ascension such as `23.999999h`;
- representative current-catalog distances.

At exact poles, distance and declination round-trip while right ascension canonicalizes to `0h`.

### 10.3 Alpha Centauri fixture

Use the generated local-galaxy position as a hard-coded observer fixture:

```ts
{
    x: -1.5873472912565585,
    y: -3.708309014350326,
    z: -1.327228345473596,
}
```

This corresponds to the current source coordinate:

- distance: `4.2465 ly`;
- right ascension: `219.90°` / `14.66h`;
- declination: `-60.84°`.

For a synthetic Sol target at the Sol origin, the observer-relative vector is the negation of the observer vector. Its expected reverse conversion is:

- right ascension: `2.66h`;
- declination: `+60.84°`;
- distance: `4.2465 ly`.

This fixture establishes the exact mathematical contract needed by HPA-433 without creating the synthetic catalog record in HPA-431.

### 10.4 RA normalization fixtures

Verify:

- `-1h`, `23h`, and `47h` produce equivalent Cartesian vectors;
- reverse conversion always returns `0 <= RA < 24`;
- `24h` normalizes to `0h`;
- normalized right ascension is never negative zero.

### 10.5 Pole fixtures

Verify arbitrary input RA at both exact poles produces the expected Y-axis vector and reverse-converts to canonical RA `0h` with declination `±90°`.

Also include near-pole values that remain outside the pole-canonicalization branch and preserve their normalized right ascension within tolerance.

Verify the ordered threshold boundary explicitly:

- `(0, 1e-11, 0)` succeeds as canonical north pole;
- `(0, 1e-12, 0)` fails as `undefined-direction`;
- no full-norm failure reaches a `y === 0` pole case.

### 10.6 Near-zero fixtures

Verify:

- exact zero fails with `undefined-direction`;
- a norm equal to the threshold fails;
- a norm below the threshold fails;
- a norm safely above the threshold succeeds.

### 10.7 Invalid-input fixtures

Cover `NaN`, positive infinity, and negative infinity for every equatorial and Cartesian component.

Cover:

- declination just below `-90°` and just above `+90°`;
- zero star distance;
- negative star distance;
- finite observer origin as valid;
- overflow in a derived relative component as a typed non-finite vector failure.

### 10.8 Immutability fixtures

Pass frozen equatorial, target, and observer objects through each public operation and verify they remain unchanged.

## 11. Numeric comparison rules

Use explicit helpers in the test file rather than raw equality for trigonometric outputs.

Recommended absolute tolerances:

| Quantity | Tolerance |
| --- | --- |
| Cartesian component | `1e-10 ly` |
| Distance | `1e-10 ly` |
| Declination | `1e-10°` |
| Right ascension | `1e-10h` circular difference |

Right ascension assertions use circular distance:

```text
delta = abs(actual - expected)
circularDelta = min(delta, 24 - delta)
```

Exact range, error-code, canonical-zero, and immutability assertions do not use tolerances.

## 12. Error handling and downstream behavior

The module never returns `NaN` as a successful coordinate.

HPA-433 can safely map failures into omitted-star diagnostics:

- malformed catalog position -> omit that star and record the typed error;
- coincident target and observer -> omit that direction and record `undefined-direction`;
- valid remaining stars -> continue catalog preparation.

A near-observer polar vector above the full-norm threshold is valid and canonicalizes to a pole; HPA-433 must not classify that case as malformed catalog data.

HPA-431 does not log, warn, or throw for expected domain failures. Logging policy belongs to the downstream preparation or development-diagnostics layer.

## 13. Performance and determinism

The current named-star catalog is small, but the module should remain appropriate for a larger catalog:

- constant-time scalar math per star;
- no Three.js allocation;
- no date, locale, browser, random, or global-state dependency;
- deterministic output for the same numeric inputs;
- no mutation of caller-owned objects;
- transformation performed when observer state changes, not per animation frame.

No microbenchmark is required in HPA-431. Unit coverage and the pure API boundary are sufficient for this slice.

## 14. File changes

### Add

```text
src/lib/astronomy/observerTransform.ts
src/lib/astronomy/__tests__/observerTransform.fixtures.ts
src/lib/astronomy/__tests__/observerTransform.test.ts
```

### Narrowly modify

```text
src/lib/planetary-system/derive/buildGalaxy.ts
src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

`buildGalaxy.ts` removes the local formula body and re-exports the shared helper. Existing behavior, positional signature, and import paths remain unchanged.

### Do not modify

```text
src/data/constellations.ts
src/types/constellation.ts
src/utils/astronomy.ts
src/lib/constellation/observerRouteState.ts
src/lib/constellation/ConstellationRenderer.ts
src/components/ConstellationWrapper.svelte
src/components/GalaxyWrapper.svelte
```

No route, renderer, UI, or catalog integration belongs in the HPA-431 implementation PR.

## 15. Implementation verification — not this design-only PR

The separate implementation plan and implementation PR should require, at minimum:

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
bun run test:run -- src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
bun run test:run
bun run type-check
bun run lint
bun run build
```

These commands describe implementation verification. Draft PR #33 contains documentation only and does not yet contain the files or behavior exercised by these commands.

Formatting checks should follow the repository's normal workflow.

## 16. Acceptance criteria mapping

| HPA-431 criterion | Design response |
| --- | --- |
| No dependency on Svelte, DOM, or Three.js | Plain TypeScript module with structural vector objects |
| Sol observer reproduces input coordinates | Sol identity round-trip fixtures with circular RA comparison |
| Forward/reverse conversion round-trips representative fixtures | Axis, quadrant, wrap, pole, and catalog-scale fixtures |
| RA values normalize to documented range | Finite RA wraps; output is always `[0h, 24h)` |
| Invalid distance/non-finite input has explicit typed behavior | `TransformResult` and discriminated `CoordinateTransformError` |
| Zero-length relative vectors have explicit typed behavior | `undefined-direction` at or below `1e-12 ly` before pole handling |
| Relationship to galaxy coordinates is unambiguous | Shared raw formula, compatibility re-export, and Alpha Centauri fixture |
| One focused domain/test PR | Only astronomy module, tests, and narrow helper centralization in the implementation PR |

## 17. Risks and mitigations

### Axis mismatch

**Risk:** Future consumers could use a conventional Z-up or differently handed frame.

**Mitigation:** Document cardinal axes, share the exact galaxy formula, and assert all six basis directions plus Alpha Centauri.

### Duplicate formula drift

**Risk:** Galaxy and observer transformations could diverge after later edits.

**Mitigation:** Move the raw formula to one module and preserve the old import path through a re-export.

### Pole instability

**Risk:** Tiny `x/z` values at exact poles could generate arbitrary RA, or zero vectors could be misclassified as poles.

**Mitigation:** Check full norm before horizontal norm, canonicalize pole RA to `0h`, make the `y === 0` pole case unreachable, and test exact, threshold, and near-pole cases separately.

### Silent invalid data

**Risk:** `NaN`, infinity, negative distance, or out-of-range declination could propagate into renderer geometry.

**Mitigation:** Validate every public operation and never return a successful non-finite result.

### Over-broad abstraction

**Risk:** The module could grow into catalog, renderer, time, unit-helper, or surface-observer responsibilities.

**Mitigation:** Keep the API scalar and individual-position focused; defer aggregation and synthetic records to HPA-433.

### Legacy behavior regression

**Risk:** Centralizing `radialToCartesian()` could break existing galaxy origin fixtures, positional calls, or imports.

**Mitigation:** Preserve its `(d, raDeg, decDeg)` signature, zero-distance behavior, and import path; retain and extend existing galaxy tests.

## 18. Resolved decisions

- Use the existing galaxy Y-up equatorial frame.
- Share one raw coordinate formula between galaxy derivation and observer transforms.
- Preserve the legacy `radialToCartesian()` import path and positional `(d, raDeg, decDeg)` runtime contract.
- Keep the raw compatibility helper permissive for `distance = 0`.
- Require positive distance in validated star-equatorial input.
- Map constellation `Star.rightAscension` hours, `declination` degrees, and `distance` light-years directly into `EquatorialPosition`.
- Convert RA units with `degrees = hours × 15` and `hours = degrees / 15`; do not add a public conversion helper.
- Wrap all finite right ascension input modulo 24.
- Reject out-of-range declination rather than clamp or reflect it.
- Normalize output RA to `[0h, 24h)`.
- Check the full vector norm before pole canonicalization.
- Canonicalize RA to `0h` when the horizontal norm is at or below the threshold and the full norm is above it.
- Make a `y === 0` pole branch unreachable; full-norm failure wins first.
- Treat relative norms at or below `1e-12 ly` as undefined direction.
- Reuse the same `1e-12 ly` threshold for full-vector and horizontal pole checks.
- Require positive-zero output for normalized RA and public Cartesian components that compare equal to zero; leave intermediate trig values untouched.
- Accept Cartesian observers only in `transformToObserver()`; callers with equatorial observer coordinates convert first.
- Use plain structural vectors and discriminated result unions.
- Apply translation only; do not rotate into a local surface frame.

## 19. Completion boundary

HPA-431 is complete when the pure API, shared coordinate source, compatibility re-export, deterministic fixtures, and focused tests satisfy the mapped acceptance criteria in the separate implementation PR.

The next issue, HPA-433, may then consume `transformToObserver()` and `cartesianToEquatorial()` to prepare transformed catalogs and synthetic Sol while preserving its own catalog-level omission diagnostics and identity rules.
