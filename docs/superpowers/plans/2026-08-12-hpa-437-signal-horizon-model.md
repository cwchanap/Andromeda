# HPA-437 Signal Horizon Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the pure HPA-437 Signal Horizon model for deterministic scenario normalization, light-travel timing, per-system state classification, and ordered 30-system batch classification.

**Architecture:** One feature-local `model.ts` owns the complete HPA-437 domain contract and imports no Galaxy, Three.js, Svelte, DOM, clock, or localization code. Callers normalize a paused scenario once, then pass that normalized scenario to single-system or batch classifiers; plain structural inputs allow existing `StarSystemData` objects to be consumed later without an adapter.

**Tech Stack:** TypeScript 5.8, Vitest 3, Bun, existing repository ESLint/type-check/coverage commands.

## Global Constraints

- Implement against `docs/superpowers/specs/2026-08-12-hpa-437-signal-horizon-model-design.md`.
- HPA-437 is one pure domain/test PR only.
- Create exactly one production module and one focused unit-test file unless a concrete repository blocker requires otherwise.
- Do not import `StarSystemData`, `localGalaxyData`, Three.js, Svelte, DOM/browser APIs, i18n, stores, or renderer code from the model.
- Do not call `Date`, `Date.now()`, timers, or any ambient clock. The caller supplies `fallbackLaunchYear`.
- A valid launch year is any `Number.isSafeInteger()` value; do not invent a calendar range.
- Invalid launch year uses a safe `fallbackLaunchYear`; if that fallback is also invalid, use `0`.
- A valid elapsed value is finite and `>= 0`; invalid or negative values normalize to `0`.
- Canonicalize signed zero to positive `0`.
- Classification uses full unrounded values with no epsilon: exact `d` is `reached`, exact `2d` is `reply-possible`.
- A usable system distance is numeric, finite, and `>= 0`; zero is valid.
- Missing, null, negative, non-finite, or derived-timing-overflow distance returns `data-unavailable` for only that system.
- Do not add formatting helpers, URL state, UI state, playback, caches, maps/indexes, generic result libraries, or shared frameworks.
- Preserve input order in batch classification and do not mutate inputs.
- All returned values must remain JSON-compatible and finite.
- Cover every introduced branch so the repository's 95% Codecov gate is not weakened.

---

## File Responsibility Map

- `src/lib/signal-horizon/model.ts`: public signal scenario/system types, deterministic normalization, one-system timing/state classification, and thin ordered batch mapping.
- `src/lib/signal-horizon/__tests__/model.test.ts`: normalization, exact/near boundaries, invalid distance isolation, 30-item batch, immutability, determinism, and JSON serialization.

---

### Task 1: Add deterministic scenario normalization

**Files:**

- Create: `src/lib/signal-horizon/model.ts`
- Create: `src/lib/signal-horizon/__tests__/model.test.ts`

**Interfaces:**

- Consumes: raw `{ launchYear, elapsedYears }` plus caller-supplied `fallbackLaunchYear`.
- Produces:

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

export function normalizeSignalScenario(
    input: SignalScenarioInput,
    fallbackLaunchYear: number,
): NormalizedSignalScenario;
```

- [ ] **Step 1: Create the focused test file with failing normalization tests**

Create `src/lib/signal-horizon/__tests__/model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSignalScenario } from "@/lib/signal-horizon/model";

describe("normalizeSignalScenario", () => {
    it("preserves a valid integer launch year and decimal elapsed years", () => {
        expect(
            normalizeSignalScenario(
                { launchYear: 2026, elapsedYears: 4.2465 },
                2030,
            ),
        ).toEqual({
            scenario: {
                launchYear: 2026,
                elapsedYears: 4.2465,
                wavefrontRadiusLightYears: 4.2465,
            },
            corrections: [],
        });
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, 2026.5])(
        "uses the caller fallback for invalid launch year %s",
        (launchYear) => {
            expect(
                normalizeSignalScenario(
                    { launchYear, elapsedYears: 5 },
                    2031,
                ),
            ).toEqual({
                scenario: {
                    launchYear: 2031,
                    elapsedYears: 5,
                    wavefrontRadiusLightYears: 5,
                },
                corrections: ["launch-year"],
            });
        },
    );

    it("uses zero when both launch year and fallback are invalid", () => {
        expect(
            normalizeSignalScenario(
                { launchYear: Number.NaN, elapsedYears: 1 },
                Number.NaN,
            ),
        ).toEqual({
            scenario: {
                launchYear: 0,
                elapsedYears: 1,
                wavefrontRadiusLightYears: 1,
            },
            corrections: ["launch-year"],
        });
    });

    it.each([
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        -0.001,
    ])("normalizes invalid elapsed years %s to zero", (elapsedYears) => {
        expect(
            normalizeSignalScenario(
                { launchYear: 2026, elapsedYears },
                2030,
            ),
        ).toEqual({
            scenario: {
                launchYear: 2026,
                elapsedYears: 0,
                wavefrontRadiusLightYears: 0,
            },
            corrections: ["elapsed-years"],
        });
    });

    it("canonicalizes signed zero without reporting a correction", () => {
        const result = normalizeSignalScenario(
            { launchYear: -0, elapsedYears: -0 },
            2030,
        );

        expect(result.corrections).toEqual([]);
        expect(Object.is(result.scenario.launchYear, -0)).toBe(false);
        expect(Object.is(result.scenario.elapsedYears, -0)).toBe(false);
        expect(Object.is(result.scenario.wavefrontRadiusLightYears, -0)).toBe(
            false,
        );
    });

    it("reports corrections in stable launch-then-elapsed order", () => {
        expect(
            normalizeSignalScenario(
                { launchYear: 2026.25, elapsedYears: -1 },
                2032,
            ).corrections,
        ).toEqual(["launch-year", "elapsed-years"]);
    });

    it("does not mutate frozen input", () => {
        const input = Object.freeze({ launchYear: 2026, elapsedYears: 10 });

        expect(() => normalizeSignalScenario(input, 2030)).not.toThrow();
        expect(input).toEqual({ launchYear: 2026, elapsedYears: 10 });
    });
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

```bash
bunx vitest run src/lib/signal-horizon/__tests__/model.test.ts
```

Expected: FAIL because `@/lib/signal-horizon/model` does not exist.

- [ ] **Step 3: Add the scenario types and minimal normalizer**

Create `src/lib/signal-horizon/model.ts`:

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

function positiveZero(value: number): number {
    return value === 0 ? 0 : value;
}

export function normalizeSignalScenario(
    input: SignalScenarioInput,
    fallbackLaunchYear: number,
): NormalizedSignalScenario {
    const corrections: SignalScenarioCorrection[] = [];

    const launchYearIsValid = Number.isSafeInteger(input.launchYear);
    const safeFallbackLaunchYear = Number.isSafeInteger(fallbackLaunchYear)
        ? positiveZero(fallbackLaunchYear)
        : 0;
    const launchYear = launchYearIsValid
        ? positiveZero(input.launchYear)
        : safeFallbackLaunchYear;

    if (!launchYearIsValid) corrections.push("launch-year");

    const elapsedYearsIsValid =
        Number.isFinite(input.elapsedYears) && input.elapsedYears >= 0;
    const elapsedYears = elapsedYearsIsValid
        ? positiveZero(input.elapsedYears)
        : 0;

    if (!elapsedYearsIsValid) corrections.push("elapsed-years");

    return {
        scenario: {
            launchYear,
            elapsedYears,
            wavefrontRadiusLightYears: elapsedYears,
        },
        corrections,
    };
}
```

- [ ] **Step 4: Run the focused tests and verify the green state**

```bash
bunx vitest run src/lib/signal-horizon/__tests__/model.test.ts
```

Expected: PASS for all normalization tests.

- [ ] **Step 5: Commit the independently reviewable scenario contract**

```bash
git add src/lib/signal-horizon/model.ts src/lib/signal-horizon/__tests__/model.test.ts
git commit -m "feat: add signal scenario normalization"
```

---

### Task 2: Add timing, classification, batch isolation, and final verification

**Files:**

- Modify: `src/lib/signal-horizon/model.ts`
- Modify: `src/lib/signal-horizon/__tests__/model.test.ts`

**Interfaces:**

- Consumes: `SignalScenario` from Task 1 and structural systems shaped like `{ id, distanceFromEarth }`.
- Produces:

```ts
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

export function classifySignalSystem(
    scenario: SignalScenario,
    system: SignalSystemInput,
): SignalSystemResult;

export function classifySignalSystems(
    scenario: SignalScenario,
    systems: readonly SignalSystemInput[],
): SignalSystemResult[];
```

- [ ] **Step 1: Extend the test imports and add failing timing/boundary tests**

Update the test import:

```ts
import {
    classifySignalSystem,
    classifySignalSystems,
    normalizeSignalScenario,
} from "@/lib/signal-horizon/model";
```

Append:

```ts
describe("classifySignalSystem", () => {
    const scenarioAt = (elapsedYears: number) =>
        normalizeSignalScenario(
            { launchYear: 2026, elapsedYears },
            2026,
        ).scenario;

    it("calculates decimal arrival and earliest reply years", () => {
        expect(
            classifySignalSystem(scenarioAt(1), {
                id: "alpha-centauri",
                distanceFromEarth: 4.2465,
            }),
        ).toEqual({
            kind: "available",
            systemId: "alpha-centauri",
            distanceLightYears: 4.2465,
            arrivalYear: 2030.2465,
            earliestReplyYear: 2034.493,
            state: "not-reached",
        });
    });

    it("treats zero distance as reply-possible at elapsed zero", () => {
        expect(
            classifySignalSystem(scenarioAt(0), {
                id: "origin-fixture",
                distanceFromEarth: 0,
            }),
        ).toEqual({
            kind: "available",
            systemId: "origin-fixture",
            distanceLightYears: 0,
            arrivalYear: 2026,
            earliestReplyYear: 2026,
            state: "reply-possible",
        });
    });

    it("moves to reached exactly at the one-way boundary", () => {
        expect(
            classifySignalSystem(scenarioAt(4.2465), {
                id: "alpha-centauri",
                distanceFromEarth: 4.2465,
            }),
        ).toMatchObject({ kind: "available", state: "reached" });
    });

    it("stays not-reached immediately below the one-way boundary", () => {
        expect(
            classifySignalSystem(scenarioAt(4.2465 - 1e-12), {
                id: "alpha-centauri",
                distanceFromEarth: 4.2465,
            }),
        ).toMatchObject({ kind: "available", state: "not-reached" });
    });

    it("moves to reply-possible exactly at the round-trip boundary", () => {
        const distance = 4.2465;

        expect(
            classifySignalSystem(scenarioAt(2 * distance), {
                id: "alpha-centauri",
                distanceFromEarth: distance,
            }),
        ).toMatchObject({ kind: "available", state: "reply-possible" });
    });

    it("stays reached immediately below the round-trip boundary", () => {
        const distance = 4.2465;

        expect(
            classifySignalSystem(scenarioAt(2 * distance - 1e-12), {
                id: "alpha-centauri",
                distanceFromEarth: distance,
            }),
        ).toMatchObject({ kind: "available", state: "reached" });
    });

    it("does not classify from rounded display values", () => {
        const distance = 4.2465;
        const elapsedYears = 4.24649;

        expect(distance.toFixed(2)).toBe(elapsedYears.toFixed(2));
        expect(
            classifySignalSystem(scenarioAt(elapsedYears), {
                id: "alpha-centauri",
                distanceFromEarth: distance,
            }),
        ).toMatchObject({ kind: "available", state: "not-reached" });
    });
});
```

- [ ] **Step 2: Run the focused test and verify classification is still red**

```bash
bunx vitest run src/lib/signal-horizon/__tests__/model.test.ts
```

Expected: FAIL because the classifier exports do not exist.

- [ ] **Step 3: Add failing invalid-distance, batch, determinism, and serialization tests**

Append:

```ts
describe("signal distance recovery and batch behavior", () => {
    const scenario = normalizeSignalScenario(
        { launchYear: 2026, elapsedYears: 20 },
        2026,
    ).scenario;

    it.each([
        ["missing", undefined],
        ["null", null],
        ["negative", -1],
        ["nan", Number.NaN],
        ["positive-infinity", Number.POSITIVE_INFINITY],
        ["negative-infinity", Number.NEGATIVE_INFINITY],
    ] as const)("returns data-unavailable for %s distance", (_name, distance) => {
        expect(
            classifySignalSystem(scenario, {
                id: "invalid-system",
                distanceFromEarth: distance,
            }),
        ).toEqual({
            kind: "data-unavailable",
            systemId: "invalid-system",
            reason: "invalid-distance",
        });
    });

    it("returns data-unavailable when a finite distance overflows reply timing", () => {
        expect(
            classifySignalSystem(scenario, {
                id: "overflow-system",
                distanceFromEarth: Number.MAX_VALUE,
            }),
        ).toEqual({
            kind: "data-unavailable",
            systemId: "overflow-system",
            reason: "invalid-distance",
        });
    });

    it("classifies thirty systems in order and isolates one invalid distance", () => {
        const systems = Array.from({ length: 30 }, (_, index) => ({
            id: `system-${index + 1}`,
            distanceFromEarth: index === 14 ? Number.NaN : index + 0.5,
        }));

        const results = classifySignalSystems(scenario, systems);

        expect(results).toHaveLength(30);
        expect(results.map((result) => result.systemId)).toEqual(
            systems.map((system) => system.id),
        );
        expect(results.filter((result) => result.kind === "data-unavailable"))
            .toEqual([
                {
                    kind: "data-unavailable",
                    systemId: "system-15",
                    reason: "invalid-distance",
                },
            ]);
        expect(results[13]).toMatchObject({
            kind: "available",
            systemId: "system-14",
        });
        expect(results[15]).toMatchObject({
            kind: "available",
            systemId: "system-16",
        });
    });

    it("is deterministic, JSON-compatible, and does not mutate frozen inputs", () => {
        const frozenScenario = Object.freeze({ ...scenario });
        const frozenSystems = Object.freeze([
            Object.freeze({ id: "a", distanceFromEarth: 4.5 }),
            Object.freeze({ id: "b", distanceFromEarth: 12.25 }),
        ]);

        const first = classifySignalSystems(frozenScenario, frozenSystems);
        const second = classifySignalSystems(frozenScenario, frozenSystems);

        expect(first).toEqual(second);
        expect(JSON.parse(JSON.stringify(first))).toEqual(first);
        expect(frozenScenario).toEqual(scenario);
        expect(frozenSystems).toEqual([
            { id: "a", distanceFromEarth: 4.5 },
            { id: "b", distanceFromEarth: 12.25 },
        ]);
    });
});
```

- [ ] **Step 4: Implement the structural system types and classifiers**

Append to `src/lib/signal-horizon/model.ts`:

```ts
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

function dataUnavailable(systemId: string): SignalSystemResult {
    return {
        kind: "data-unavailable",
        systemId,
        reason: "invalid-distance",
    };
}

export function classifySignalSystem(
    scenario: SignalScenario,
    system: SignalSystemInput,
): SignalSystemResult {
    const distanceLightYears = system.distanceFromEarth;

    if (
        typeof distanceLightYears !== "number" ||
        !Number.isFinite(distanceLightYears) ||
        distanceLightYears < 0
    ) {
        return dataUnavailable(system.id);
    }

    const normalizedDistance = positiveZero(distanceLightYears);
    const arrivalYear = scenario.launchYear + normalizedDistance;
    const earliestReplyYear = scenario.launchYear + 2 * normalizedDistance;

    if (!Number.isFinite(arrivalYear) || !Number.isFinite(earliestReplyYear)) {
        return dataUnavailable(system.id);
    }

    const state: SignalSystemState =
        scenario.elapsedYears >= 2 * normalizedDistance
            ? "reply-possible"
            : scenario.elapsedYears >= normalizedDistance
              ? "reached"
              : "not-reached";

    return {
        kind: "available",
        systemId: system.id,
        distanceLightYears: normalizedDistance,
        arrivalYear: positiveZero(arrivalYear),
        earliestReplyYear: positiveZero(earliestReplyYear),
        state,
    };
}

export function classifySignalSystems(
    scenario: SignalScenario,
    systems: readonly SignalSystemInput[],
): SignalSystemResult[] {
    return systems.map((system) => classifySignalSystem(scenario, system));
}
```

Do not export formula helpers or a cache. Keep `dataUnavailable()` private.

- [ ] **Step 5: Run the focused suite**

```bash
bunx vitest run src/lib/signal-horizon/__tests__/model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run type checking and linting**

```bash
bun run type-check
bun run lint
```

Expected: both commands exit successfully.

- [ ] **Step 7: Run full coverage validation**

```bash
bun run test:coverage
```

Expected: the full Vitest suite passes and the new model remains compatible with the repository's 95% Codecov gate.

If coverage reports an uncovered branch in `model.ts`, add a public-behavior test for that exact branch rather than excluding the file or weakening coverage configuration.

- [ ] **Step 8: Review the final diff for scope**

```bash
git diff --check
git status --short
```

Expected: only these implementation files are changed:

```text
src/lib/signal-horizon/model.ts
src/lib/signal-horizon/__tests__/model.test.ts
```

No Galaxy, renderer, Svelte, route, i18n, generated-data, dependency, or coverage-config files should be modified.

- [ ] **Step 9: Commit the completed HPA-437 model**

```bash
git add src/lib/signal-horizon/model.ts src/lib/signal-horizon/__tests__/model.test.ts
git commit -m "feat: add signal horizon timing model"
```

## Completion Check

HPA-437 is complete when:

- the pure model has no framework or ambient-clock dependency;
- invalid scenario inputs normalize deterministically and report corrected fields;
- exact one-way and round-trip boundaries are tested without epsilon or display rounding;
- zero/decimal/invalid distances behave as specified;
- a 30-item batch preserves order and isolates invalid data;
- repeated outputs are JSON-compatible and deterministic;
- focused tests, type-check, lint, and full coverage all pass;
- the implementation diff contains only the two HPA-437 files.