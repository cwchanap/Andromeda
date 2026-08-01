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
    const { rightAscensionHours, declinationDegrees, distanceLightYears } =
        position;

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
