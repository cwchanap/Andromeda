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
