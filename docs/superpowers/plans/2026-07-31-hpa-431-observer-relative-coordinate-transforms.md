# HPA-431 Observer-Relative Coordinate Transforms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the pure observer-relative astronomy API, deterministic fixtures, and legacy galaxy-helper centralization defined by HPA-431.

**Architecture:** A dependency-free `observerTransform.ts` module owns equatorial/Cartesian conversion, observer translation, reverse conversion, typed failures, and the raw legacy radial formula. Tests use immutable hand-authored fixtures plus exhaustive validation matrices. `buildGalaxy.ts` keeps its galaxy-only visual helpers and re-exports the shared raw formula so existing imports remain valid.

**Tech Stack:** TypeScript 5.8, Vitest 3, Bun, Astro repository aliases (`@/`), existing ESLint/Prettier configuration.

## Global Constraints

- Add no Svelte, Astro, DOM, browser-global, Three.js, constellation-catalog, route-state, or `src/utils/astronomy.ts` dependency to `observerTransform.ts`.
- Add no third-party astronomy or result-type dependency.
- Use the existing Sol-centered, equatorial, Y-up frame: RA `0h` = `+X`, RA `6h` = `+Z`, Dec `+90°` = `+Y`.
- Use `DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS = 1e-12` as the inclusive absolute cutoff: norms `<= 1e-12 ly` return `undefined-direction`.
- Use `POLE_HORIZONTAL_RATIO_EPSILON = 1e-15` for scale-independent pole classification: `horizontal / distance <= 1e-15`.
- Normalize finite right ascension into `[0h, 24h)`.
- Accept declination only within `[-90°, +90°]` inclusive.
- Require `distanceLightYears > 0` for validated equatorial targets.
- Keep `transformToObserver()` limited to positive-distance equatorial targets.
- Construct synthetic Sol only through Cartesian-origin subtraction followed by `cartesianToEquatorial()`.
- Canonicalize negative zero only in new validated outputs; preserve raw IEEE-754 signed zero in legacy `radialToCartesian()`.
- Preserve legacy `radialToCartesian(d, raDeg, decDeg): { x: number; y: number; z: number }`, including mutable return type, zero-distance behavior, signed-zero behavior, and import path.
- Move only the radial formula. Keep `clamp()`, `galaxyVisual()`, and `BV_INDEX` in `buildGalaxy.ts`.
- Do not modify renderer placement, route state, catalog aggregation, Svelte components, or Earth `celestialToSphere()` behavior.
- HPA-434, not this implementation, owns fixed-equatorial renderer placement for alien/reference layers.

---

## File Structure

### Create

- `src/lib/astronomy/observerTransform.ts`
  - Public types, constants, typed result/error contracts, validated transforms, and raw legacy helper.
- `src/lib/astronomy/__tests__/observerTransform.fixtures.ts`
  - Immutable hand-authored axes, identity, Alpha Centauri, normalization, pole, and invalid-input fixtures.
- `src/lib/astronomy/__tests__/observerTransform.test.ts`
  - Unit tests for every public operation, validation order, numeric tolerances, immutability, signed zero, and synthetic-Sol primitives.

### Modify

- `src/lib/planetary-system/derive/buildGalaxy.ts`
  - Remove only the local `radialToCartesian()` body and re-export the astronomy helper.
- `src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts`
  - Retain existing behavior tests and pin the re-export and raw signed-zero contract.

### Explicitly unchanged

- `src/data/constellations.ts`
- `src/types/constellation.ts`
- `src/utils/astronomy.ts`
- `src/lib/constellation/observerRouteState.ts`
- `src/lib/constellation/ConstellationRenderer.ts`
- `src/components/ConstellationWrapper.svelte`
- `src/components/GalaxyWrapper.svelte`

---

### Task 1: Add the public contract, fixtures, raw helper, and forward conversion

**Files:**
- Create: `src/lib/astronomy/observerTransform.ts`
- Create: `src/lib/astronomy/__tests__/observerTransform.fixtures.ts`
- Create: `src/lib/astronomy/__tests__/observerTransform.test.ts`

**Interfaces:**
- Produces:
  - `CartesianLightYears`
  - `EquatorialPosition`
  - `ObserverRelativePosition`
  - `TransformResult<T>`
  - `CoordinateTransformError`
  - `DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS`
  - `POLE_HORIZONTAL_RATIO_EPSILON`
  - `radialToCartesian(d, raDeg, decDeg)`
  - `equatorialToCartesian(position)`
- Consumed later by Tasks 2–5.

- [ ] **Step 1: Create immutable fixture data**

Create `src/lib/astronomy/__tests__/observerTransform.fixtures.ts`:

```ts
import type {
    CartesianLightYears,
    EquatorialPosition,
} from "../observerTransform";

export interface AxisFixture {
    readonly name: string;
    readonly equatorial: EquatorialPosition;
    readonly rightAscensionDegrees: number;
    readonly expected: CartesianLightYears;
}

export const AXIS_FIXTURES: readonly AxisFixture[] = [
    {
        name: "RA 0h points along +X",
        equatorial: {
            rightAscensionHours: 0,
            declinationDegrees: 0,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 0,
        expected: { x: 10, y: 0, z: 0 },
    },
    {
        name: "RA 6h points along +Z",
        equatorial: {
            rightAscensionHours: 6,
            declinationDegrees: 0,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 90,
        expected: { x: 0, y: 0, z: 10 },
    },
    {
        name: "RA 12h points along -X",
        equatorial: {
            rightAscensionHours: 12,
            declinationDegrees: 0,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 180,
        expected: { x: -10, y: 0, z: 0 },
    },
    {
        name: "RA 18h points along -Z",
        equatorial: {
            rightAscensionHours: 18,
            declinationDegrees: 0,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 270,
        expected: { x: 0, y: 0, z: -10 },
    },
    {
        name: "Dec +90 points along +Y",
        equatorial: {
            rightAscensionHours: 0,
            declinationDegrees: 90,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 0,
        expected: { x: 0, y: 10, z: 0 },
    },
    {
        name: "Dec -90 points along -Y",
        equatorial: {
            rightAscensionHours: 0,
            declinationDegrees: -90,
            distanceLightYears: 10,
        },
        rightAscensionDegrees: 0,
        expected: { x: 0, y: -10, z: 0 },
    },
];

export const SOL_OBSERVER: CartesianLightYears = Object.freeze({
    x: 0,
    y: 0,
    z: 0,
});

export const ALPHA_CENTAURI_OBSERVER: CartesianLightYears = Object.freeze({
    x: -1.5873472912565585,
    y: -3.708309014350326,
    z: -1.327228345473596,
});

export const ALPHA_CENTAURI_SOURCE = Object.freeze({
    distanceLightYears: 4.2465,
    rightAscensionDegrees: 219.9,
    declinationDegrees: -60.84,
});

export const EXPECTED_SOL_FROM_ALPHA_CENTAURI: EquatorialPosition =
    Object.freeze({
        rightAscensionHours: 2.66,
        declinationDegrees: 60.84,
        distanceLightYears: 4.2465,
    });

export const IDENTITY_FIXTURES: readonly EquatorialPosition[] = [
    Object.freeze({
        rightAscensionHours: 1.5,
        declinationDegrees: 25,
        distanceLightYears: 12.5,
    }),
    Object.freeze({
        rightAscensionHours: 7.25,
        declinationDegrees: -40,
        distanceLightYears: 80,
    }),
    Object.freeze({
        rightAscensionHours: 13.75,
        declinationDegrees: 5,
        distanceLightYears: 245,
    }),
    Object.freeze({
        rightAscensionHours: 19.5,
        declinationDegrees: -65,
        distanceLightYears: 548,
    }),
    Object.freeze({
        rightAscensionHours: 23.999999,
        declinationDegrees: 12,
        distanceLightYears: 35.9,
    }),
];
```

- [ ] **Step 2: Write failing forward-conversion tests**

Create `src/lib/astronomy/__tests__/observerTransform.test.ts` with these shared helpers and forward tests:

```ts
import { describe, expect, it } from "vitest";
import {
    DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS,
    POLE_HORIZONTAL_RATIO_EPSILON,
    equatorialToCartesian,
    radialToCartesian,
    type CartesianLightYears,
    type EquatorialPosition,
} from "../observerTransform";
import {
    ALPHA_CENTAURI_OBSERVER,
    ALPHA_CENTAURI_SOURCE,
    AXIS_FIXTURES,
} from "./observerTransform.fixtures";

const CARTESIAN_TOLERANCE = 1e-10;
const NON_FINITE_VALUES = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
] as const;
const EQUATORIAL_COMPONENTS = [
    "rightAscensionHours",
    "declinationDegrees",
    "distanceLightYears",
] as const;

function expectCartesianClose(
    actual: CartesianLightYears,
    expected: CartesianLightYears,
): void {
    expect(actual.x).toBeCloseTo(expected.x, 10);
    expect(actual.y).toBeCloseTo(expected.y, 10);
    expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe("observerTransform constants", () => {
    it("pins the absolute direction and relative pole epsilons", () => {
        expect(DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS).toBe(1e-12);
        expect(POLE_HORIZONTAL_RATIO_EPSILON).toBe(1e-15);
    });
});

describe("equatorialToCartesian", () => {
    for (const fixture of AXIS_FIXTURES) {
        it(fixture.name, () => {
            const result = equatorialToCartesian(fixture.equatorial);

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expectCartesianClose(result.value, fixture.expected);
        });
    }

    it("wraps finite right ascension modulo 24", () => {
        const inputs = [-1, 23, 47].map((rightAscensionHours) =>
            equatorialToCartesian({
                rightAscensionHours,
                declinationDegrees: 10,
                distanceLightYears: 20,
            }),
        );

        for (const result of inputs) expect(result.ok).toBe(true);
        if (!inputs.every((result) => result.ok)) return;
        expectCartesianClose(inputs[0].value, inputs[1].value);
        expectCartesianClose(inputs[1].value, inputs[2].value);
    });

    for (const component of EQUATORIAL_COMPONENTS) {
        for (const invalidValue of NON_FINITE_VALUES) {
            it(`rejects non-finite ${component}: ${String(invalidValue)}`, () => {
                const base: EquatorialPosition = {
                    rightAscensionHours: 1,
                    declinationDegrees: 2,
                    distanceLightYears: 3,
                };
                const position = {
                    ...base,
                    [component]: invalidValue,
                } as EquatorialPosition;

                expect(equatorialToCartesian(position)).toEqual({
                    ok: false,
                    error: {
                        code: "non-finite-equatorial-input",
                        component,
                    },
                });
            });
        }
    }

    it("uses deterministic equatorial validation order", () => {
        expect(
            equatorialToCartesian({
                rightAscensionHours: Number.NaN,
                declinationDegrees: Number.POSITIVE_INFINITY,
                distanceLightYears: Number.NEGATIVE_INFINITY,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "non-finite-equatorial-input",
                component: "rightAscensionHours",
            },
        });
    });

    it.each([-90.000001, 90.000001])(
        "rejects out-of-range declination %s",
        (declinationDegrees) => {
            expect(
                equatorialToCartesian({
                    rightAscensionHours: 0,
                    declinationDegrees,
                    distanceLightYears: 1,
                }),
            ).toEqual({
                ok: false,
                error: {
                    code: "declination-out-of-range",
                    declinationDegrees,
                },
            });
        },
    );

    it.each([0, -1])("rejects non-positive distance %s", (distanceLightYears) => {
        expect(
            equatorialToCartesian({
                rightAscensionHours: 0,
                declinationDegrees: 0,
                distanceLightYears,
            }),
        ).toEqual({
            ok: false,
            error: {
                code: "invalid-distance",
                distanceLightYears,
            },
        });
    });

    it("canonicalizes validated zero components to positive zero", () => {
        const result = equatorialToCartesian({
            rightAscensionHours: 0,
            declinationDegrees: -0,
            distanceLightYears: 10,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(Object.is(result.value.y, -0)).toBe(false);
        expect(result.value.y).toBe(0);
    });

    it("does not mutate frozen input", () => {
        const position = Object.freeze({
            rightAscensionHours: 6,
            declinationDegrees: 45,
            distanceLightYears: 10,
        });

        expect(() => equatorialToCartesian(position)).not.toThrow();
        expect(position).toEqual({
            rightAscensionHours: 6,
            declinationDegrees: 45,
            distanceLightYears: 10,
        });
    });
});

describe("radialToCartesian raw compatibility helper", () => {
    it("matches the six axis fixtures using degree right ascension", () => {
        for (const fixture of AXIS_FIXTURES) {
            const result = radialToCartesian(
                fixture.equatorial.distanceLightYears,
                fixture.rightAscensionDegrees,
                fixture.equatorial.declinationDegrees,
            );
            expectCartesianClose(result, fixture.expected);
        }
    });

    it("reproduces the pinned Alpha Centauri galaxy fixture", () => {
        const result = radialToCartesian(
            ALPHA_CENTAURI_SOURCE.distanceLightYears,
            ALPHA_CENTAURI_SOURCE.rightAscensionDegrees,
            ALPHA_CENTAURI_SOURCE.declinationDegrees,
        );

        expectCartesianClose(result, ALPHA_CENTAURI_OBSERVER);
    });

    it("preserves raw signed zero", () => {
        expect(Object.is(radialToCartesian(0, 180, 0).x, -0)).toBe(true);
        expect(Object.is(radialToCartesian(10, 0, -0).y, -0)).toBe(true);
    });
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: FAIL because `src/lib/astronomy/observerTransform.ts` and its exports do not exist.

- [ ] **Step 4: Implement public contracts, the raw helper, and validated forward conversion**

Create `src/lib/astronomy/observerTransform.ts`:

```ts
export const DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS = 1e-12;
export const POLE_HORIZONTAL_RATIO_EPSILON = 1e-15;

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

export type TransformResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: CoordinateTransformError };

function success<T>(value: T): TransformResult<T> {
    return { ok: true, value };
}

function failure(error: CoordinateTransformError): TransformResult<never> {
    return { ok: false, error };
}

function positiveZero(value: number): number {
    return value === 0 ? 0 : value;
}

function normalizeRightAscensionHours(hours: number): number {
    return positiveZero(((hours % 24) + 24) % 24);
}

export function radialToCartesian(
    d: number,
    raDeg: number,
    decDeg: number,
): { x: number; y: number; z: number } {
    const ra = (raDeg * Math.PI) / 180;
    const dec = (decDeg * Math.PI) / 180;

    return {
        x: d * Math.cos(dec) * Math.cos(ra),
        y: d * Math.sin(dec),
        z: d * Math.cos(dec) * Math.sin(ra),
    };
}

export function equatorialToCartesian(
    position: EquatorialPosition,
): TransformResult<CartesianLightYears> {
    const {
        rightAscensionHours,
        declinationDegrees,
        distanceLightYears,
    } = position;

    if (!Number.isFinite(rightAscensionHours)) {
        return failure({
            code: "non-finite-equatorial-input",
            component: "rightAscensionHours",
        });
    }
    if (!Number.isFinite(declinationDegrees)) {
        return failure({
            code: "non-finite-equatorial-input",
            component: "declinationDegrees",
        });
    }
    if (!Number.isFinite(distanceLightYears)) {
        return failure({
            code: "non-finite-equatorial-input",
            component: "distanceLightYears",
        });
    }
    if (declinationDegrees < -90 || declinationDegrees > 90) {
        return failure({
            code: "declination-out-of-range",
            declinationDegrees,
        });
    }
    if (distanceLightYears <= 0) {
        return failure({
            code: "invalid-distance",
            distanceLightYears,
        });
    }

    const normalizedHours = normalizeRightAscensionHours(rightAscensionHours);
    const raw = radialToCartesian(
        distanceLightYears,
        normalizedHours * 15,
        declinationDegrees,
    );

    return success({
        x: positiveZero(raw.x),
        y: positiveZero(raw.y),
        z: positiveZero(raw.z),
    });
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: PASS for constants, axes, Alpha Centauri provenance, RA wrapping, all nine non-finite equatorial combinations, validation order, range/distance errors, positive zero, immutability, and legacy signed zero.

- [ ] **Step 6: Commit Task 1**

```bash
git add \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.fixtures.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts
git commit -m "feat(astronomy): add forward observer coordinates"
```

---

### Task 2: Add validated observer subtraction and Cartesian failure roles

**Files:**
- Modify: `src/lib/astronomy/observerTransform.ts`
- Modify: `src/lib/astronomy/__tests__/observerTransform.test.ts`

**Interfaces:**
- Consumes: `CartesianLightYears`, `TransformResult<T>`, `CoordinateTransformError`.
- Produces:
  - `subtractObserverPosition(target, observer)`
  - Internal deterministic Cartesian validation in `x`, `y`, `z` order.

- [ ] **Step 1: Add failing subtraction tests**

Add `subtractObserverPosition` to the module imports. Add these test constants and the describe block:

```ts
const CARTESIAN_COMPONENTS = ["x", "y", "z"] as const;

describe("subtractObserverPosition", () => {
    it("subtracts the observer from the target", () => {
        expect(
            subtractObserverPosition(
                { x: 10, y: -4, z: 3 },
                { x: 1, y: 2, z: -5 },
            ),
        ).toEqual({
            ok: true,
            value: { x: 9, y: -6, z: 8 },
        });
    });

    it("accepts the Sol origin as an observer", () => {
        const target = { x: 1, y: 2, z: 3 };
        expect(
            subtractObserverPosition(target, { x: 0, y: 0, z: 0 }),
        ).toEqual({ ok: true, value: target });
    });

    for (const component of CARTESIAN_COMPONENTS) {
        for (const invalidValue of NON_FINITE_VALUES) {
            it(`rejects non-finite target ${component}: ${String(invalidValue)}`, () => {
                const target = {
                    x: 1,
                    y: 2,
                    z: 3,
                    [component]: invalidValue,
                };

                expect(
                    subtractObserverPosition(target, { x: 0, y: 0, z: 0 }),
                ).toEqual({
                    ok: false,
                    error: {
                        code: "non-finite-cartesian-input",
                        role: "target",
                        component,
                    },
                });
            });
        }
    }

    it("reports target validation before observer validation", () => {
        expect(
            subtractObserverPosition(
                { x: Number.NaN, y: 0, z: 0 },
                { x: 0, y: Number.POSITIVE_INFINITY, z: 0 },
            ),
        ).toEqual({
            ok: false,
            error: {
                code: "non-finite-cartesian-input",
                role: "target",
                component: "x",
            },
        });
    });

    it("reports a non-finite observer component", () => {
        expect(
            subtractObserverPosition(
                { x: 1, y: 2, z: 3 },
                { x: Number.NaN, y: 0, z: 0 },
            ),
        ).toEqual({
            ok: false,
            error: {
                code: "non-finite-cartesian-input",
                role: "observer",
                component: "x",
            },
        });
    });

    it("reports overflow in the derived relative vector", () => {
        expect(
            subtractObserverPosition(
                { x: Number.MAX_VALUE, y: 0, z: 0 },
                { x: -Number.MAX_VALUE, y: 0, z: 0 },
            ),
        ).toEqual({
            ok: false,
            error: {
                code: "non-finite-cartesian-input",
                role: "vector",
                component: "x",
            },
        });
    });

    it("canonicalizes subtraction zero to positive zero", () => {
        const result = subtractObserverPosition(
            { x: -0, y: 1, z: 2 },
            { x: 0, y: 0, z: 0 },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(Object.is(result.value.x, -0)).toBe(false);
    });

    it("does not mutate frozen target or observer", () => {
        const target = Object.freeze({ x: 3, y: 4, z: 5 });
        const observer = Object.freeze({ x: 1, y: 1, z: 1 });

        expect(() => subtractObserverPosition(target, observer)).not.toThrow();
        expect(target).toEqual({ x: 3, y: 4, z: 5 });
        expect(observer).toEqual({ x: 1, y: 1, z: 1 });
    });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: FAIL because `subtractObserverPosition` is not exported.

- [ ] **Step 3: Implement deterministic Cartesian validation and subtraction**

Add to `observerTransform.ts`:

```ts
type CartesianRole = "target" | "observer" | "vector";
type CartesianComponent = "x" | "y" | "z";

function validateCartesian(
    vector: CartesianLightYears,
    role: CartesianRole,
): CoordinateTransformError | null {
    const components: readonly CartesianComponent[] = ["x", "y", "z"];

    for (const component of components) {
        if (!Number.isFinite(vector[component])) {
            return {
                code: "non-finite-cartesian-input",
                role,
                component,
            };
        }
    }

    return null;
}

export function subtractObserverPosition(
    target: CartesianLightYears,
    observer: CartesianLightYears,
): TransformResult<CartesianLightYears> {
    const targetError = validateCartesian(target, "target");
    if (targetError) return failure(targetError);

    const observerError = validateCartesian(observer, "observer");
    if (observerError) return failure(observerError);

    const relative = {
        x: target.x - observer.x,
        y: target.y - observer.y,
        z: target.z - observer.z,
    };

    const relativeError = validateCartesian(relative, "vector");
    if (relativeError) return failure(relativeError);

    return success({
        x: positiveZero(relative.x),
        y: positiveZero(relative.y),
        z: positiveZero(relative.z),
    });
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: PASS, including all nine target-component/value combinations, explicit observer failure, deterministic validation order, derived overflow, positive zero, and immutability.

- [ ] **Step 5: Commit Task 2**

```bash
git add \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts
git commit -m "feat(astronomy): add observer position subtraction"
```

---

### Task 3: Add reverse conversion, direction epsilon, and scale-independent pole handling

**Files:**
- Modify: `src/lib/astronomy/observerTransform.ts`
- Modify: `src/lib/astronomy/__tests__/observerTransform.test.ts`

**Interfaces:**
- Consumes: `validateCartesian`, both epsilon constants, `EquatorialPosition`.
- Produces:
  - `cartesianToEquatorial(vector)`
  - Output RA in `[0h, 24h)`.
  - `undefined-direction` at norm `<= 1e-12`.
  - Pole RA `0h` when `horizontal / distance <= 1e-15`.

- [ ] **Step 1: Add comparison helpers**

Add near the top of the test file:

```ts
const DISTANCE_TOLERANCE = 1e-10;
const DECLINATION_TOLERANCE = 1e-10;
const RIGHT_ASCENSION_TOLERANCE = 1e-10;

function circularRightAscensionDelta(
    actualHours: number,
    expectedHours: number,
): number {
    const delta = Math.abs(actualHours - expectedHours);
    return Math.min(delta, 24 - delta);
}
```

- [ ] **Step 2: Add failing reverse-conversion tests**

Add `cartesianToEquatorial` to the imports and append:

```ts
describe("cartesianToEquatorial", () => {
    for (const fixture of AXIS_FIXTURES) {
        it(`reverse converts ${fixture.name}`, () => {
            const result = cartesianToEquatorial(fixture.expected);

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.value.distanceLightYears).toBeCloseTo(
                fixture.equatorial.distanceLightYears,
                10,
            );
            expect(result.value.declinationDegrees).toBeCloseTo(
                fixture.equatorial.declinationDegrees,
                10,
            );
            const expectedHours =
                Math.abs(fixture.equatorial.declinationDegrees) === 90
                    ? 0
                    : fixture.equatorial.rightAscensionHours;
            expect(
                circularRightAscensionDelta(
                    result.value.rightAscensionHours,
                    expectedHours,
                ),
            ).toBeLessThanOrEqual(RIGHT_ASCENSION_TOLERANCE);
            expect(result.value.rightAscensionHours).toBeGreaterThanOrEqual(0);
            expect(result.value.rightAscensionHours).toBeLessThan(24);
        });
    }

    for (const component of CARTESIAN_COMPONENTS) {
        for (const invalidValue of NON_FINITE_VALUES) {
            it(`rejects non-finite vector ${component}: ${String(invalidValue)}`, () => {
                const vector = {
                    x: 1,
                    y: 2,
                    z: 3,
                    [component]: invalidValue,
                };

                expect(cartesianToEquatorial(vector)).toEqual({
                    ok: false,
                    error: {
                        code: "non-finite-cartesian-input",
                        role: "vector",
                        component,
                    },
                });
            });
        }
    }

    it.each([
        { x: 0, y: 0, z: 0 },
        { x: DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS, y: 0, z: 0 },
        {
            x: DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS / 2,
            y: 0,
            z: 0,
        },
    ])("rejects undefined direction for $x,$y,$z", (vector) => {
        const result = cartesianToEquatorial(vector);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe("undefined-direction");
        if (result.error.code !== "undefined-direction") return;
        expect(result.error.thresholdLightYears).toBe(
            DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS,
        );
    });

    it("accepts a vector safely above the direction epsilon", () => {
        expect(
            cartesianToEquatorial({
                x: DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS * 2,
                y: 0,
                z: 0,
            }).ok,
        ).toBe(true);
    });

    it("canonicalizes exact poles with arbitrary source RA", () => {
        for (const declinationDegrees of [-90, 90]) {
            const forward = equatorialToCartesian({
                rightAscensionHours: 8.75,
                declinationDegrees,
                distanceLightYears: 10,
            });
            expect(forward.ok).toBe(true);
            if (!forward.ok) continue;

            const reverse = cartesianToEquatorial(forward.value);
            expect(reverse.ok).toBe(true);
            if (!reverse.ok) continue;
            expect(reverse.value.rightAscensionHours).toBe(0);
            expect(reverse.value.declinationDegrees).toBe(declinationDegrees);
        }
    });

    it("canonicalizes an exact north-pole vector above the distance epsilon", () => {
        expect(cartesianToEquatorial({ x: 0, y: 1e-11, z: 0 })).toEqual({
            ok: true,
            value: {
                rightAscensionHours: 0,
                declinationDegrees: 90,
                distanceLightYears: 1e-11,
            },
        });
    });

    it("uses the same pole classification at multiple distances", () => {
        for (const distance of [1e-11, 1, 100]) {
            const horizontal =
                distance * POLE_HORIZONTAL_RATIO_EPSILON * 0.5;
            const y = Math.sqrt(distance * distance - horizontal * horizontal);
            const result = cartesianToEquatorial({ x: horizontal, y, z: 0 });

            expect(result.ok).toBe(true);
            if (!result.ok) continue;
            expect(result.value.rightAscensionHours).toBe(0);
            expect(result.value.declinationDegrees).toBe(90);
        }
    });

    it("keeps a near-pole vector outside the ratio and preserves RA", () => {
        const source = {
            rightAscensionHours: 7.125,
            declinationDegrees: 89.99999999999,
            distanceLightYears: 100,
        };
        const cartesian = equatorialToCartesian(source);

        expect(cartesian.ok).toBe(true);
        if (!cartesian.ok) return;
        const result = cartesianToEquatorial(cartesian.value);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
            circularRightAscensionDelta(
                result.value.rightAscensionHours,
                source.rightAscensionHours,
            ),
        ).toBeLessThanOrEqual(RIGHT_ASCENSION_TOLERANCE);
        expect(
            Math.abs(
                result.value.declinationDegrees - source.declinationDegrees,
            ),
        ).toBeLessThanOrEqual(DECLINATION_TOLERANCE);
    });

    it("normalizes reverse RA to positive zero", () => {
        const result = cartesianToEquatorial({ x: 1, y: 0, z: -0 });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.rightAscensionHours).toBe(0);
        expect(Object.is(result.value.rightAscensionHours, -0)).toBe(false);
    });

    it("does not mutate frozen vector input", () => {
        const vector = Object.freeze({ x: 1, y: 2, z: 3 });
        expect(() => cartesianToEquatorial(vector)).not.toThrow();
        expect(vector).toEqual({ x: 1, y: 2, z: 3 });
    });
});
```

- [ ] **Step 3: Run the focused tests to verify they fail**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: FAIL because `cartesianToEquatorial` is not exported.

- [ ] **Step 4: Implement reverse conversion in the required order**

Add to `observerTransform.ts`:

```ts
export function cartesianToEquatorial(
    vector: CartesianLightYears,
): TransformResult<EquatorialPosition> {
    const vectorError = validateCartesian(vector, "vector");
    if (vectorError) return failure(vectorError);

    const distanceLightYears = Math.hypot(vector.x, vector.y, vector.z);

    if (distanceLightYears <= DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS) {
        return failure({
            code: "undefined-direction",
            distanceLightYears,
            thresholdLightYears: DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS,
        });
    }

    const horizontal = Math.hypot(vector.x, vector.z);
    const horizontalRatio = horizontal / distanceLightYears;

    if (horizontalRatio <= POLE_HORIZONTAL_RATIO_EPSILON) {
        return success({
            rightAscensionHours: 0,
            declinationDegrees: vector.y > 0 ? 90 : -90,
            distanceLightYears,
        });
    }

    const rightAscensionRadians = Math.atan2(vector.z, vector.x);
    const declinationRadians = Math.atan2(vector.y, horizontal);

    return success({
        rightAscensionHours: normalizeRightAscensionHours(
            (rightAscensionRadians * 12) / Math.PI,
        ),
        declinationDegrees: (declinationRadians * 180) / Math.PI,
        distanceLightYears,
    });
}
```

Do not add a `y === 0` fallback in the pole branch. A meaningful vector with `y === 0` has `horizontal / distance === 1`, so it cannot enter the pole branch.

- [ ] **Step 5: Run the focused tests to verify they pass**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: PASS for all nine direct vector non-finite combinations, reverse axes, normalized RA range, arbitrary-RA exact poles, inclusive direction epsilon, scale-independent poles, near-pole RA, positive-zero RA, and immutability.

- [ ] **Step 6: Commit Task 3**

```bash
git add \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts
git commit -m "feat(astronomy): add reverse equatorial conversion"
```

---

### Task 4: Add the composite transform, Sol identity, and synthetic-Sol primitive path

**Files:**
- Modify: `src/lib/astronomy/observerTransform.ts`
- Modify: `src/lib/astronomy/__tests__/observerTransform.test.ts`

**Interfaces:**
- Consumes:
  - `equatorialToCartesian()`
  - `subtractObserverPosition()`
  - `cartesianToEquatorial()`
- Produces:
  - `transformToObserver(target, observer)`
  - `ObserverRelativePosition`
- Confirms the HPA-433 synthetic-Sol path without creating catalog records.

- [ ] **Step 1: Add failing composite and fixture tests**

Add these fixture imports:

```ts
import {
    ALPHA_CENTAURI_OBSERVER,
    EXPECTED_SOL_FROM_ALPHA_CENTAURI,
    IDENTITY_FIXTURES,
    SOL_OBSERVER,
} from "./observerTransform.fixtures";
```

Add `transformToObserver` to the module imports and append:

```ts
describe("transformToObserver", () => {
    it.each(IDENTITY_FIXTURES)(
        "round-trips a Sol-observer fixture",
        (source) => {
            const result = transformToObserver(source, SOL_OBSERVER);

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(
                circularRightAscensionDelta(
                    result.value.equatorial.rightAscensionHours,
                    source.rightAscensionHours,
                ),
            ).toBeLessThanOrEqual(RIGHT_ASCENSION_TOLERANCE);
            expect(
                Math.abs(
                    result.value.equatorial.declinationDegrees -
                        source.declinationDegrees,
                ),
            ).toBeLessThanOrEqual(DECLINATION_TOLERANCE);
            expect(
                Math.abs(
                    result.value.equatorial.distanceLightYears -
                        source.distanceLightYears,
                ),
            ).toBeLessThanOrEqual(DISTANCE_TOLERANCE);
        },
    );

    it("returns both relative Cartesian and equatorial output", () => {
        expect(
            transformToObserver(
                {
                    rightAscensionHours: 0,
                    declinationDegrees: 0,
                    distanceLightYears: 10,
                },
                { x: 1, y: 0, z: 0 },
            ),
        ).toEqual({
            ok: true,
            value: {
                relativeCartesian: { x: 9, y: 0, z: 0 },
                equatorial: {
                    rightAscensionHours: 0,
                    declinationDegrees: 0,
                    distanceLightYears: 9,
                },
            },
        });
    });

    it("rejects zero-distance Sol as an equatorial target", () => {
        expect(
            transformToObserver(
                {
                    rightAscensionHours: 0,
                    declinationDegrees: 0,
                    distanceLightYears: 0,
                },
                ALPHA_CENTAURI_OBSERVER,
            ),
        ).toEqual({
            ok: false,
            error: {
                code: "invalid-distance",
                distanceLightYears: 0,
            },
        });
    });

    it("constructs synthetic Sol through Cartesian primitives", () => {
        const relativeSol = subtractObserverPosition(
            { x: 0, y: 0, z: 0 },
            ALPHA_CENTAURI_OBSERVER,
        );

        expect(relativeSol.ok).toBe(true);
        if (!relativeSol.ok) return;
        expectCartesianClose(relativeSol.value, {
            x: -ALPHA_CENTAURI_OBSERVER.x,
            y: -ALPHA_CENTAURI_OBSERVER.y,
            z: -ALPHA_CENTAURI_OBSERVER.z,
        });

        const sol = cartesianToEquatorial(relativeSol.value);
        expect(sol.ok).toBe(true);
        if (!sol.ok) return;
        expect(
            circularRightAscensionDelta(
                sol.value.rightAscensionHours,
                EXPECTED_SOL_FROM_ALPHA_CENTAURI.rightAscensionHours,
            ),
        ).toBeLessThanOrEqual(RIGHT_ASCENSION_TOLERANCE);
        expect(sol.value.declinationDegrees).toBeCloseTo(
            EXPECTED_SOL_FROM_ALPHA_CENTAURI.declinationDegrees,
            10,
        );
        expect(sol.value.distanceLightYears).toBeCloseTo(
            EXPECTED_SOL_FROM_ALPHA_CENTAURI.distanceLightYears,
            10,
        );
    });

    it("returns the first stage failure without partial output", () => {
        expect(
            transformToObserver(
                {
                    rightAscensionHours: Number.NaN,
                    declinationDegrees: 0,
                    distanceLightYears: 10,
                },
                { x: Number.NaN, y: 0, z: 0 },
            ),
        ).toEqual({
            ok: false,
            error: {
                code: "non-finite-equatorial-input",
                component: "rightAscensionHours",
            },
        });
    });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: FAIL because `transformToObserver` is not exported.

- [ ] **Step 3: Implement the composite operation**

Add to `observerTransform.ts`:

```ts
export function transformToObserver(
    target: EquatorialPosition,
    observer: CartesianLightYears,
): TransformResult<ObserverRelativePosition> {
    const targetCartesian = equatorialToCartesian(target);
    if (!targetCartesian.ok) return targetCartesian;

    const relativeCartesian = subtractObserverPosition(
        targetCartesian.value,
        observer,
    );
    if (!relativeCartesian.ok) return relativeCartesian;

    const equatorial = cartesianToEquatorial(relativeCartesian.value);
    if (!equatorial.ok) return equatorial;

    return success({
        relativeCartesian: relativeCartesian.value,
        equatorial: equatorial.value,
    });
}
```

Do not special-case zero-distance Sol. HPA-433 must continue using the primitive path tested above.

- [ ] **Step 4: Run the focused tests to verify they pass**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
```

Expected: PASS for Sol identity, simple observer offset, first-failure propagation, zero-distance rejection, and Alpha Centauri synthetic Sol.

- [ ] **Step 5: Commit Task 4**

```bash
git add \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts
git commit -m "feat(astronomy): add observer-relative transform"
```

---

### Task 5: Centralize the legacy galaxy formula without changing galaxy visuals

**Files:**
- Modify: `src/lib/planetary-system/derive/buildGalaxy.ts:1-17`
- Modify: `src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts`
- Test: `src/lib/astronomy/__tests__/observerTransform.test.ts`

**Interfaces:**
- Consumes: `radialToCartesian()` from `@/lib/astronomy/observerTransform`.
- Preserves:
  - Existing `buildGalaxy.ts` export path.
  - `(d, raDeg, decDeg)` positional signature.
  - Mutable `{ x, y, z }` return type.
  - Raw signed-zero behavior.
  - `galaxyVisual()`, `BV_INDEX`, and file-local `clamp()`.

- [ ] **Step 1: Add re-export and compatibility assertions**

Modify the imports in `buildGalaxy.test.ts`:

```ts
import {
    radialToCartesian,
    galaxyVisual,
    BV_INDEX,
} from "@/lib/planetary-system/derive/buildGalaxy";
import { radialToCartesian as sharedRadialToCartesian } from "@/lib/astronomy/observerTransform";
```

Add to the `radialToCartesian` describe block:

```ts
it("re-exports the shared astronomy helper", () => {
    expect(radialToCartesian).toBe(sharedRadialToCartesian);
});

it("preserves raw signed-zero behavior", () => {
    expect(Object.is(radialToCartesian(0, 180, 0).x, -0)).toBe(true);
    expect(Object.is(radialToCartesian(10, 0, -0).y, -0)).toBe(true);
});
```

- [ ] **Step 2: Run the galaxy test before the refactor**

```bash
bun run test:run -- src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

Expected: FAIL only for the function-identity assertion because `buildGalaxy.ts` still owns a separate implementation. Existing numeric and signed-zero behavior should pass.

- [ ] **Step 3: Replace only the local radial formula with a re-export**

Change the top of `buildGalaxy.ts` to:

```ts
export { radialToCartesian } from "@/lib/astronomy/observerTransform";

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}
```

Leave `galaxyVisual()` and `BV_INDEX` unchanged below that block.

- [ ] **Step 4: Run both focused suites**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
bun run test:run -- src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

Expected: PASS. The old import path and new direct import refer to the same function, galaxy visual tests still pass, and raw signed zero remains unchanged.

- [ ] **Step 5: Run type-check before committing the compatibility refactor**

```bash
bun run type-check
```

Expected: PASS, proving `buildAll.ts` and all other callers accept the re-exported mutable return contract.

- [ ] **Step 6: Commit Task 5**

```bash
git add \
  src/lib/planetary-system/derive/buildGalaxy.ts \
  src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
git commit -m "refactor(galaxy): share observer coordinate formula"
```

---

### Task 6: Final verification and implementation self-review

**Files:**
- Review:
  - `src/lib/astronomy/observerTransform.ts`
  - `src/lib/astronomy/__tests__/observerTransform.fixtures.ts`
  - `src/lib/astronomy/__tests__/observerTransform.test.ts`
  - `src/lib/planetary-system/derive/buildGalaxy.ts`
  - `src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts`

**Interfaces:**
- Verifies all HPA-431 outputs and confirms no HPA-433/HPA-434 implementation leaked into this PR.

- [ ] **Step 1: Run formatting checks on changed files**

```bash
bunx prettier --check \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.fixtures.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts \
  src/lib/planetary-system/derive/buildGalaxy.ts \
  src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

Expected: PASS. When it fails, run the same command with `--write`, inspect the formatting-only diff, and commit it with:

```bash
git add \
  src/lib/astronomy/observerTransform.ts \
  src/lib/astronomy/__tests__/observerTransform.fixtures.ts \
  src/lib/astronomy/__tests__/observerTransform.test.ts \
  src/lib/planetary-system/derive/buildGalaxy.ts \
  src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
git commit -m "style: format observer transform changes"
```

- [ ] **Step 2: Run the focused unit suites**

```bash
bun run test:run -- src/lib/astronomy/__tests__/observerTransform.test.ts
bun run test:run -- src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

Expected: both PASS with zero failed tests.

- [ ] **Step 3: Run the complete repository verification**

```bash
bun run test:run
bun run type-check
bun run lint
bun run build
```

Expected: every command exits with status `0`.

- [ ] **Step 4: Check for whitespace and accidental scope expansion**

```bash
git diff --check
git diff main...HEAD -- \
  src/lib/astronomy \
  src/lib/planetary-system/derive/buildGalaxy.ts \
  src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
git diff --name-only main...HEAD
```

Expected changed implementation files:

```text
src/lib/astronomy/observerTransform.ts
src/lib/astronomy/__tests__/observerTransform.fixtures.ts
src/lib/astronomy/__tests__/observerTransform.test.ts
src/lib/planetary-system/derive/buildGalaxy.ts
src/lib/planetary-system/derive/__tests__/buildGalaxy.test.ts
```

The branch may also contain the previously approved design and implementation-plan documents. It must not contain renderer, route, Svelte, catalog-preparation, or Earth astronomy changes.

- [ ] **Step 5: Perform the requirements checklist**

Confirm each statement directly against code and tests:

```text
[ ] No Three.js/Svelte/DOM/browser dependency in observerTransform.ts
[ ] Forward formula matches legacy galaxy axes and Alpha Centauri
[ ] All three non-finite values are tested for every equatorial component
[ ] All three non-finite values are tested for every Cartesian component
[ ] Finite RA wraps to [0h, 24h)
[ ] Declination outside [-90, 90] fails
[ ] Validated distance <= 0 fails
[ ] Sol observer is an identity transform for positive-distance stars
[ ] Direction norm <= 1e-12 fails
[ ] Pole classification uses horizontal / distance <= 1e-15
[ ] Arbitrary-RA exact poles canonicalize to RA 0h
[ ] Near-pole RA stays within 1e-10h circular tolerance
[ ] Target, observer, and derived-vector errors are distinguished
[ ] Synthetic Sol uses Cartesian origin subtraction, not transformToObserver()
[ ] New validated outputs remove negative zero
[ ] Legacy radial helper preserves signed zero
[ ] Legacy buildGalaxy import path remains valid
[ ] clamp(), galaxyVisual(), and BV_INDEX remain in buildGalaxy.ts
[ ] No renderer or catalog-preparation implementation was added
```

- [ ] **Step 6: Record verification evidence in the implementation PR**

Use the implementation PR body or final implementation comment to record the exact commands and observed pass counts. Do not claim completion from code inspection alone.
