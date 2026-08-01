import { describe, expect, it } from "vitest";
import {
    DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS,
    POLE_HORIZONTAL_RATIO_EPSILON,
    cartesianToEquatorial,
    equatorialToCartesian,
    radialToCartesian,
    subtractObserverPosition,
    transformToObserver,
    type CartesianLightYears,
    type EquatorialPosition,
} from "../observerTransform";
import {
    ALPHA_CENTAURI_OBSERVER,
    ALPHA_CENTAURI_SOURCE,
    AXIS_FIXTURES,
    EXPECTED_SOL_FROM_ALPHA_CENTAURI,
    IDENTITY_FIXTURES,
    SOL_OBSERVER,
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
const CARTESIAN_COMPONENTS = ["x", "y", "z"] as const;

function expectCartesianClose(
    actual: CartesianLightYears,
    expected: CartesianLightYears,
): void {
    expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(
        CARTESIAN_TOLERANCE,
    );
    expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(
        CARTESIAN_TOLERANCE,
    );
    expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(
        CARTESIAN_TOLERANCE,
    );
}

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

    it.each([0, -1])(
        "rejects non-positive distance %s",
        (distanceLightYears) => {
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
        },
    );

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
        expect(subtractObserverPosition(target, { x: 0, y: 0, z: 0 })).toEqual({
            ok: true,
            value: target,
        });
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

describe("cartesianToEquatorial", () => {
    for (const fixture of AXIS_FIXTURES) {
        it(`reverse converts ${fixture.name}`, () => {
            const result = cartesianToEquatorial(fixture.expected);

            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(
                Math.abs(
                    result.value.distanceLightYears -
                        fixture.equatorial.distanceLightYears,
                ),
            ).toBeLessThanOrEqual(DISTANCE_TOLERANCE);
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
            const horizontal = distance * POLE_HORIZONTAL_RATIO_EPSILON * 0.5;
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

    it("does not mutate frozen target or observer", () => {
        const target = Object.freeze({
            rightAscensionHours: 6,
            declinationDegrees: 30,
            distanceLightYears: 20,
        });
        const observer = Object.freeze({ x: 1, y: 2, z: 3 });

        expect(() => transformToObserver(target, observer)).not.toThrow();
        expect(target).toEqual({
            rightAscensionHours: 6,
            declinationDegrees: 30,
            distanceLightYears: 20,
        });
        expect(observer).toEqual({ x: 1, y: 2, z: 3 });
    });
});
