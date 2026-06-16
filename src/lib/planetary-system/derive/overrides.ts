import type { PlanetarySystem, OrbitAnchorData } from "../types";
import { visualPeriodSeconds } from "./visualFromAstronomy";

const ALPHA_CENTAURI_AB_BARYCENTER_ID = "alpha-centauri-ab-barycenter";
const RELATIVE_AXIS = 25;
const A_MASS = 1.1055;
const B_MASS = 0.9373;
const TOTAL_MASS = A_MASS + B_MASS;
const A_AXIS = (RELATIVE_AXIS * B_MASS) / TOTAL_MASS;
const B_AXIS = (RELATIVE_AXIS * A_MASS) / TOTAL_MASS;
const AB_PERIOD_YEARS = 79.91;
const AB_PERIOD_DAYS = AB_PERIOD_YEARS * 365.25;
// The renderer (getVisualPeriodSeconds) prioritizes visualPeriodSeconds over
// periodYears, so the real 79.91-year period would otherwise freeze the pair.
// A and B must share ONE visual period or the binary desyncs (one star orbiting
// a frozen partner). Derived via the same scaler buildBody uses for planets so
// the AB pair animates at a consistent on-screen cadence.
const AB_VISUAL_PERIOD_SECONDS = visualPeriodSeconds(AB_PERIOD_DAYS);
const AB_ECCENTRICITY = 0.519;
const AB_INCLINATION = 79.2;
// A and B share phaseDeg = 0; their 180° separation comes from
// argumentOfPeriapsisDeg (A_ARG vs B_ARG). Setting phaseDeg explicitly also
// overrides any generic phase the derive step attached to B, which would
// otherwise desync the pair.
const AB_PHASE_DEG = 0;
const A_ARG_OF_PERIAPSIS = 231.6;
const B_ARG_OF_PERIAPSIS = 411.6;

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
        visualPeriodSeconds: AB_VISUAL_PERIOD_SECONDS,
        phaseDeg: AB_PHASE_DEG,
        inclinationDeg: AB_INCLINATION,
        argumentOfPeriapsisDeg: A_ARG_OF_PERIAPSIS,
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
            visualPeriodSeconds: AB_VISUAL_PERIOD_SECONDS,
            phaseDeg: AB_PHASE_DEG,
            inclinationDeg: AB_INCLINATION,
            argumentOfPeriapsisDeg: B_ARG_OF_PERIAPSIS,
        };
    }

    return sys;
}
