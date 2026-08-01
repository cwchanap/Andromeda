import { describe, expect, it } from "vitest";
import {
    DIRECTION_DISTANCE_EPSILON_LIGHT_YEARS,
    POLE_HORIZONTAL_RATIO_EPSILON,
    equatorialToCartesian,
    radialToCartesian,
    subtractObserverPosition,
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
