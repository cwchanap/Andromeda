# HPA-437 Signal Horizon Model Design

**Issue:** HPA-437 — [Signal] Implement deterministic light-travel timing and system classification  
**Epic:** HPA-427 — Cosmic Signal Horizon  
**Status:** Draft planning spec  
**Date:** 2026-08-12

## Summary

Implement the first Cosmic Signal Horizon slice as one pure, feature-local TypeScript model. The model normalizes a paused signal scenario, calculates the Sol-centered light-speed wavefront radius, and classifies one or many nearby systems from their existing `distanceFromEarth` values.

This ticket remains deliberately independent of Svelte, Three.js, URL state, localization, and rendering. HPA-438, HPA-439, and HPA-440 will consume the model rather than reimplementing calendar or classification rules.

## Why this is the next task

The Andromeda project roadmap marks **Cosmic Signal Horizon** as the next candidate after the completed Sky From Another Star milestone. Within that milestone, HPA-437 is high priority, has no blockers, and blocks both the control slice (HPA-438) and the wavefront renderer slice (HPA-439).

No open GitHub pull request currently covers this work.

## Goals

- Provide one deterministic scenario-normalization contract for later UI callers.
- Calculate wavefront radius directly from elapsed years.
- Calculate one-way arrival and earliest immediate-reply years from light-year distance.
- Classify systems as `not-reached`, `reached`, or `reply-possible` without display rounding.
- Represent missing or unusable distance data as a serializable `data-unavailable` result rather than throwing.
- Support a 30-system batch through a thin ordered mapper without coupling the model to `localGalaxyData`.
- Keep all returned values plain JSON-compatible data.
- Make the branch behavior small enough to cover thoroughly under the repository's 95% Codecov gate.

## Non-goals

- Svelte state, controls, stores, or localization.
- Three.js, Galaxy renderer integration, shell geometry, or per-system visual overlays.
- URL/query parsing or shareable scenario state.
- Playback, presets, timers, or a clock owned by the model.
- Signal attenuation, transmitter/receiver physics, relativistic corrections, stellar proper motion, delayed replies, or arbitrary signal origins.
- A generic science-model framework, validation framework, result library, or Galaxy plugin abstraction.
- Formatting localized years, units, labels, or status copy.

## Existing architecture and reuse

The current repository already provides the pieces this model should consume later without importing them directly:

- `src/lib/galaxy/types.ts` defines `StarSystemData.distanceFromEarth` in light-years.
- `src/lib/galaxy/LocalGalaxy.ts` contains the current generated nearby-system dataset.
- `src/lib/astronomy/observerTransform.ts` demonstrates the preferred pattern for pure astronomy code: plain readonly data, discriminated results, deterministic validation, and no renderer dependency.
- HPA-438 will own the paused control state and provide the current year used as the launch-year fallback.
- HPA-439 will consume only the prepared `wavefrontRadiusLightYears` value.
- HPA-440 will consume the same normalized scenario plus the selected system's classification/timing result.

The signal model must not import `StarSystemData`, `localGalaxyData`, Three.js, Svelte, or browser APIs. Instead it uses a structural input containing only the fields it needs. A `StarSystemData` object is structurally compatible with that input, so later consumers do not need a new adapter layer.

## Approaches considered

### 1. Galaxy-aware batch model

A single function could import `localGalaxyData`, classify the entire catalog, and return a map keyed by system ID.

**Rejected:** it would make the domain model own a specific dataset and pull Galaxy/Three.js types toward the science boundary. It also creates unnecessary keyed-cache semantics for a 30-item paused calculation.

### 2. Feature-local structural model — selected

Keep one `model.ts` with scenario normalization, one-system classification, and a thin ordered batch mapper. The public inputs are plain structural types, and all outputs are plain serializable objects.

**Selected because:** it is the smallest boundary that directly serves HPA-438, HPA-439, and HPA-440 while preserving the project's pure-domain separation rule.

### 3. Many granular formula/validator helpers

Export separate validation, arrival-year, reply-year, boundary-comparison, and formatting helpers.

**Rejected:** those exports would create API surface without a second consumer. The formulas are simple enough to keep private inside the focused model.

## Public model contract

Create `src/lib/signal-horizon/model.ts` with the following semantic API:

```ts
export interface SignalScenarioInput {
    readonly launchYear: number;
    readonly elapsedYears: number;
}

export interface SignalScenario {
    readonly launchYear: number;
    readonly elapsedYears: number;
    readonly wavefrontRadiusLightYears: number;
}

export type SignalScenarioCorrection = "launch-year" | "elapsed-years";

export interface NormalizedSignalScenario {
    readonly scenario: SignalScenario;
    readonly corrections: readonly SignalScenarioCorrection[];
}

export interface SignalSystemInput {
    readonly id: string;
    readonly distanceFromEarth?: number | null;
}

export type SignalSystemState =
    | "not-reached"
    | "reached"
    | "reply-possible";

export type SignalSystemResult =
    | {
          readonly kind: "available";
          readonly systemId: string;
          readonly distanceLightYears: number;
          readonly arrivalYear: number;
          readonly earliestReplyYear: number;
          readonly state: SignalSystemState;
      }
    | {
          readonly kind: "data-unavailable";
          readonly systemId: string;
          readonly reason: "invalid-distance";
      };

export function normalizeSignalScenario(
    input: SignalScenarioInput,
    fallbackLaunchYear: number,
): NormalizedSignalScenario;

export function classifySignalSystem(
    scenario: SignalScenario,
    system: SignalSystemInput,
): SignalSystemResult;

export function classifySignalSystems(
    scenario: SignalScenario,
    systems: readonly SignalSystemInput[],
): SignalSystemResult[];
```

Names may be adjusted slightly during implementation, but the boundary and semantics above should remain intact.

## Scenario normalization

The model must not call `Date`, `Date.now()`, or any other clock. The UI owns the product default of "current year" and passes that year as `fallbackLaunchYear`.

Normalization rules:

1. A valid launch year is any `Number.isSafeInteger()` value. Do not invent an MVP calendar range.
2. If `input.launchYear` is invalid, use `fallbackLaunchYear` when it is a safe integer; otherwise use `0` as a deterministic last-resort fallback.
3. A valid elapsed value is finite and greater than or equal to `0`.
4. Invalid or negative elapsed values normalize to `0`.
5. Canonicalize signed zero to positive `0` in normalized output.
6. `wavefrontRadiusLightYears` equals the normalized `elapsedYears` exactly.
7. `corrections` contains `launch-year`, `elapsed-years`, or both when the corresponding user input was normalized. The fallback's validity is not exposed as user-facing correction metadata.
8. Preserve correction order as `launch-year` then `elapsed-years` so repeated inputs yield byte-for-byte stable JSON output.

The correction list gives HPA-438 enough information to announce recovery without pulling localized validation strings into the domain model.

## Distance validation and timing

A system distance is usable when `distanceFromEarth` is a number, finite, and greater than or equal to `0`.

Zero distance is intentionally valid. It is useful as a mathematical boundary fixture and means both one-way and round-trip boundaries have already been met at any non-negative elapsed time.

For usable distance `d`:

```text
wavefront radius = elapsedYears
arrival year = launchYear + d
earliest reply year = launchYear + 2d
```

Implementation uses ordinary JavaScript numbers. If either derived timing becomes non-finite, return the same `data-unavailable / invalid-distance` result so the output remains JSON-compatible. Do not introduce another error taxonomy for an unreachable synthetic extreme that does not exist in the current catalog.

Missing, `null`, `NaN`, infinite, negative, or timing-overflow distances affect only that system and never throw.

## Classification boundaries

Classification uses the normalized `elapsedYears` and the full unrounded distance value.

The order is:

```ts
if (elapsedYears >= 2 * distanceLightYears) {
    state = "reply-possible";
} else if (elapsedYears >= distanceLightYears) {
    state = "reached";
} else {
    state = "not-reached";
}
```

Boundary rules:

- exactly `elapsedYears === d` is `reached`;
- exactly `elapsedYears === 2d` is `reply-possible`;
- a representable value below either boundary remains in the preceding state;
- no fixed epsilon is added or subtracted;
- no display rounding occurs before classification.

This is the epsilon rule for HPA-437: **there is no domain tolerance**. The numbers supplied by the scenario and catalog are the authoritative values. UI formatting may round later, but must not feed rounded values back into classification.

## Batch behavior

`classifySignalSystems()` is intentionally a thin `map()` over `classifySignalSystem()`.

Required behavior:

- preserve input order;
- preserve one output per input;
- do not deduplicate IDs;
- do not create a `Map`, cache, index, or persistent derived store;
- one invalid system produces one `data-unavailable` result while all other systems still classify normally.

Thirty systems are trivial to recompute synchronously for a paused interaction, so no memoization or worker is justified.

## Serialization and mutation rules

All public outputs consist only of strings, finite numbers, arrays, and plain objects.

The implementation must:

- avoid `Date`, `Map`, `Set`, class instances, and Three.js objects in returned data;
- avoid returning `NaN` or infinity;
- not mutate the scenario input, fallback value, system input, or system arrays;
- produce deeply equivalent output when called repeatedly with the same arguments.

## Formatting boundary

HPA-437 should not add formatting helpers.

Arrival/reply values are numeric years and the model state is a locale-neutral machine string. HPA-438/HPA-440 can choose localized display precision and labels close to the UI. This avoids prematurely freezing a formatting contract that the product has not yet exercised.

## Error behavior

There are two intentionally different recovery paths:

- **Scenario input problems:** normalize to safe scenario values and report corrected field names.
- **System distance problems:** return `data-unavailable` for only that system.

No normal user/data error path throws.

The model assumes callers pass a `SignalScenario` created by `normalizeSignalScenario()` rather than hand-constructing invalid normalized scenarios. Duplicating scenario validation inside every classifier call is unnecessary for this slice.

## Testing strategy

Create `src/lib/signal-horizon/__tests__/model.test.ts` and cover the model through public behavior.

Required cases:

### Scenario normalization

- valid integer launch year and decimal elapsed years are preserved;
- invalid launch year uses the provided safe fallback;
- invalid fallback plus invalid launch year deterministically resolves to `0`;
- negative/non-finite elapsed values normalize to `0`;
- signed zero becomes positive zero;
- correction order is stable when both fields are repaired.

### System timing and state

- decimal distance produces exact numeric arrival/reply formulas;
- zero distance is `reply-possible` at elapsed `0`;
- exact one-way boundary is `reached`;
- exact round-trip boundary is `reply-possible`;
- a small representable amount below each boundary stays in the previous state;
- classification uses raw values even when display rounding would make two values look equal;
- missing, `null`, negative, `NaN`, and infinite distances return `data-unavailable`;
- an extreme finite distance that overflows derived timing also returns `data-unavailable`.

### Batch and determinism

- a generated 30-item plain-object fixture returns 30 results in the same order;
- one invalid member does not affect neighboring results;
- repeated calls with the same frozen inputs are deeply equal;
- `JSON.parse(JSON.stringify(result))` preserves representative normalized and classification outputs.

The unit test should use plain objects rather than importing `localGalaxyData`. HPA-437 tests the feature contract, not the generated catalog contents; existing Galaxy/data tests already cover that dataset.

## File responsibility map

Implementation should touch exactly these production/test files unless the code reveals a concrete blocker:

- `src/lib/signal-horizon/model.ts` — types, scenario normalization, single-system timing/classification, ordered batch mapping.
- `src/lib/signal-horizon/__tests__/model.test.ts` — deterministic boundary, invalid-data, batch, mutation, and serialization coverage.

Do not modify Galaxy, renderer, component, route, i18n, or generated-data files in HPA-437.

## Verification

Implementation is complete when these commands pass:

```bash
bunx vitest run src/lib/signal-horizon/__tests__/model.test.ts
bun run type-check
bun run lint
bun run test:coverage
```

The focused suite should cover every branch introduced by `model.ts`; the full coverage run confirms the repository remains compatible with the 95% Codecov gate.

## Follow-on contract

After HPA-437:

- HPA-438 supplies a current-year fallback, owns paused input state, and renders correction messages.
- HPA-439 consumes `scenario.wavefrontRadiusLightYears` only.
- HPA-440 passes the selected `StarSystemData` structurally to `classifySignalSystem()` and renders the numeric timing/state result.

Those tickets should not add new timing formulas or duplicate boundary logic.