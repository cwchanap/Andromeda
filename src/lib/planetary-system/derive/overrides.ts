import type { PlanetarySystem, OrbitAnchorData } from "../types";

const ALPHA_CENTAURI_AB_BARYCENTER_ID = "alpha-centauri-ab-barycenter";
const RELATIVE_AXIS = 25;
const A_MASS = 1.1055;
const B_MASS = 0.9373;
const TOTAL_MASS = A_MASS + B_MASS;
const A_AXIS = (RELATIVE_AXIS * B_MASS) / TOTAL_MASS;
const B_AXIS = (RELATIVE_AXIS * A_MASS) / TOTAL_MASS;
const AB_PERIOD_YEARS = 79.91;
const AB_ECCENTRICITY = 0.519;
const AB_INCLINATION = 79.2;

export function applyOverrides(sys: PlanetarySystem): PlanetarySystem {
    switch (sys.id) {
        case "alpha-centauri":
            return applyAlphaCentauriOverride(sys);
        default:
            return sys;
    }
}

function applyAlphaCentauriOverride(sys: PlanetarySystem): PlanetarySystem {
    const barycenter: OrbitAnchorData = {
        id: ALPHA_CENTAURI_AB_BARYCENTER_ID,
        name: "Alpha Centauri AB Barycenter",
        type: "barycenter",
        description:
            "The common center of mass shared by Alpha Centauri A and B.",
        overlay: {
            visibleByDefault: false,
            color: "#7dd3fc",
            label: "AB barycenter",
        },
    };

    const anchors = sys.systemData.orbitAnchors ?? [];
    if (!anchors.some((a) => a.id === ALPHA_CENTAURI_AB_BARYCENTER_ID)) {
        anchors.push(barycenter);
        sys.systemData.orbitAnchors = anchors;
    }

    sys.systemData.star.orbit = {
        ...sys.systemData.star.orbit,
        centerId: ALPHA_CENTAURI_AB_BARYCENTER_ID,
        semiMajorAxis: A_AXIS,
        eccentricity: AB_ECCENTRICITY,
        periodYears: AB_PERIOD_YEARS,
        inclinationDeg: AB_INCLINATION,
        argumentOfPeriapsisDeg: 231.6,
    };

    const starB = sys.systemData.celestialBodies.find(
        (b) => b.id === "alpha-centauri-b",
    );
    if (starB) {
        starB.orbit = {
            ...starB.orbit,
            centerId: ALPHA_CENTAURI_AB_BARYCENTER_ID,
            semiMajorAxis: B_AXIS,
            eccentricity: AB_ECCENTRICITY,
            periodYears: AB_PERIOD_YEARS,
            inclinationDeg: AB_INCLINATION,
            argumentOfPeriapsisDeg: 411.6,
        };
    }

    return sys;
}
