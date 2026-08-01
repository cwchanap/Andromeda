# HPA-431 Implementation Plan Self-Review Corrections

This file is a mandatory companion to `2026-07-31-hpa-431-observer-relative-coordinate-transforms.md`. It records the two concrete corrections found during the required plan self-review. Apply these corrections while executing the corresponding tasks.

## Correction 1: Use the declared Cartesian tolerance

In Task 1, replace the `expectCartesianClose()` helper with this implementation so `CARTESIAN_TOLERANCE` is used and ESLint does not report an unused constant:

```ts
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
```

Do not remove `CARTESIAN_TOLERANCE`; the explicit absolute tolerance matches the design specification.

## Correction 2: Test composite-operation immutability directly

In Task 4, add this test inside `describe("transformToObserver", ...)`:

```ts
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
```

This supplements the primitive-operation immutability tests and satisfies the design requirement to pass frozen inputs through every validated public operation.

## Self-Review Result

After these corrections:

- every design requirement maps to an implementation task;
- all three non-finite values are tested for every equatorial and Cartesian component;
- all public validated operations have direct immutability coverage;
- names and signatures are consistent across tasks;
- no placeholder instructions remain;
- the plan retains HPA-431's pure-domain scope and does not absorb HPA-433 or HPA-434 implementation work.
