import * as THREE from "three";
import type { CelestialBodyData, OrbitalElementsData } from "@/types/game";
import type { PlanetarySystem } from "@/lib/planetary-system/types";
import type { SystemCsvRow } from "./parseCsv";
import { mapBodyType, parseStatus, type CsvObjectType } from "./mapObject";
import {
    spectralColor,
    planetScale,
    starScale,
    emissiveFromTemp,
    orbitVisualRadius,
    visualPeriodSeconds,
    seededFromId,
} from "./visualFromAstronomy";

const VALID_CSV_OBJECT_TYPES = new Set<CsvObjectType>([
    "star",
    "planet",
    "planet_candidate",
    "brown_dwarf",
    "satellite",
]);

function isValidCsvObjectType(value: string): value is CsvObjectType {
    return VALID_CSV_OBJECT_TYPES.has(value as CsvObjectType);
}

const DEFAULT_PLANET_COLOR = "#8B7355";

function slug(s: string): string {
    return (
        s
            .toLowerCase()
            // Apostrophes in possessives ("Barnard's", "Luyten's") are part of
            // the word, not a separator. Strip them so "Barnard's Star" becomes
            // "barnards-star" (matching the legacy hand-authored id) instead of
            // the broken "barnard-s-star". Covers both ASCII ' and curly ’.
            .replace(/[''\u2019]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
    );
}

function formatDiameter(km: number): string {
    return `${Math.round(km).toLocaleString("en-US")} km`;
}

function formatDistanceAu(au: number): string {
    // Round to 4 decimals and strip trailing zeros (e.g. 0.0485, 1.48).
    // Unlike formatDiameter/formatOrbitalPeriod, this also strips trailing
    // zeros via parseFloat so small AU values stay compact.
    return `${parseFloat(au.toFixed(4))} AU`;
}

function formatOrbitalPeriod(days: number): string {
    if (days > 365) {
        return `${(days / 365).toFixed(1)} years`;
    }
    return `${days.toFixed(1)} days`;
}

function splitComposition(text: string): string[] {
    return text
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

function buildOrbit(
    row: SystemCsvRow,
    semiMajorAxis: number,
    visualPeriodSecondsValue: number,
    phaseDeg: number,
    inclinationDeg: number,
    centerIdOverride?: string,
): OrbitalElementsData {
    // Star rows carry an empty host_object, so slug("") would yield a broken
    // empty centerId. Callers that build an orbit for a secondary star pass the
    // primary star id explicitly; planets keep the host-derived default.
    const orbit: OrbitalElementsData = {
        centerId: centerIdOverride ?? slug(row.host_object),
        semiMajorAxis,
        visualPeriodSeconds: visualPeriodSecondsValue,
        phaseDeg,
        inclinationDeg,
    };
    const days = row.orbital_period_days;
    if (days !== undefined) {
        if (days > 365) {
            orbit.periodYears = days / 365;
        } else {
            orbit.periodDays = days;
        }
    }
    return orbit;
}

function buildBody(
    row: SystemCsvRow,
    isStar: boolean,
    isPrimary = false,
    primaryStarId = "",
): CelestialBodyData {
    const id = slug(row.object_name);
    const name = row.object_name;
    if (!isValidCsvObjectType(row.object_type)) {
        throw new Error(
            `Invalid object_type "${row.object_type}" for object "${row.object_name}" in system "${row.system_name}"`,
        );
    }
    const csvType = row.object_type;
    const type = mapBodyType(csvType);
    const status = parseStatus(row.status, csvType);

    const tempK = row.surface_temperature_K;
    const tempC = row.surface_temperature_C;
    const diameterKm = row.diameter_km;
    const au = row.distance_from_system_center_AU;
    // 0 is the CSV sentinel for a static origin star (see the
    // orbital_period_basis column), not a real period. Normalizing it to
    // undefined here stops it formatting as the impossible "0.0 days" in the
    // modal and keeps visualPeriodSeconds consistent (it already guards <= 0).
    const periodDays = row.orbital_period_days || undefined;

    const starColor = isStar
        ? spectralColor(row.spectral_classification, tempK)
        : DEFAULT_PLANET_COLOR;

    const scale = isStar
        ? starScale(diameterKm ?? 1392700)
        : planetScale(diameterKm ?? 12742);

    const emissiveStrength = isStar ? emissiveFromTemp(tempK ?? 3000) : 0;

    const seed = seededFromId(id);
    const phaseDeg = seed * 360;
    const inclinationDeg = seed * 20;

    const orbitRadius = au !== undefined ? orbitVisualRadius(au) : 0;
    const visualPeriod =
        periodDays !== undefined ? visualPeriodSeconds(periodDays) : 0;

    const keyFacts: CelestialBodyData["keyFacts"] = {
        diameter: diameterKm !== undefined ? formatDiameter(diameterKm) : "",
        orbitalPeriod:
            periodDays !== undefined ? formatOrbitalPeriod(periodDays) : "",
        composition: splitComposition(row.composition),
        temperature: tempC !== undefined ? `${tempC}°C` : "",
    };

    // Only the primary star is pinned to the origin, so only it reports
    // "0 (system center)". Non-primary stars carry a real projected separation
    // from the system center (distance_basis = barycentric approximation), and
    // reporting them as "0" mislabels companion stars like Gliese 725 B or
    // Proxima Centauri in the info modal. Planets keep host-relative wording.
    if (isPrimary) {
        keyFacts.distanceFromSun = "0 (system center)";
    } else if (isStar && au !== undefined) {
        keyFacts.distanceFromSun = `${formatDistanceAu(au)} from system center`;
    } else if (au !== undefined) {
        keyFacts.distanceFromSun = `${formatDistanceAu(au)} from ${row.host_object}`;
    }

    if (
        tempC !== undefined &&
        /equilibrium|not measured/i.test(row.surface_temperature_basis)
    ) {
        keyFacts.equilibriumTemperature = `${tempC}°C (equilibrium, estimated)`;
    }

    const material: CelestialBodyData["material"] = isStar
        ? {
              color: starColor,
              ...(emissiveStrength > 0 ? { emissive: starColor } : {}),
          }
        : {
              color: DEFAULT_PLANET_COLOR,
              roughness: 0.7,
              metalness: 0.2,
          };

    // The primary star is the visualization origin and stays pinned to (0,0,0)
    // even when the CSV gives it a barycentric distance (e.g. Alpha Centauri A
    // at 10.7 AU, or Gliese 338 A at 53 AU). Secondary stars are offset by
    // their projected separation so they don't overlap the primary, and planets
    // that list such a star as host_object orbit this offset via centerId.
    // orbitVisualRadius floors at 2 even for 0 AU, so only offset on a
    // genuinely positive separation. Overridden systems (Alpha Centauri A/B)
    // are unaffected — an assigned orbit supersedes `position`.
    const starOffset =
        isStar && !isPrimary && au !== undefined && au > 0 ? orbitRadius : 0;
    const position = isStar
        ? new THREE.Vector3(starOffset, 0, 0)
        : new THREE.Vector3(orbitRadius, 0, 0);

    const body: CelestialBodyData = {
        id,
        name,
        type,
        status,
        description: `${name} (${type})`,
        keyFacts,
        images: [],
        position,
        scale,
        material,
    };

    // Planets orbit their recorded host. A non-primary star that has both a
    // real separation (au > 0) and a real orbital period orbits the primary
    // star instead of freezing at a projected offset, so multi-star systems
    // (e.g. Proxima Centauri, Gliese 338 B) animate. The primary itself is the
    // pinned origin and never gets an orbit here. Per-system overrides (such as
    // Alpha Centauri's AB barycenter) run later and supersede this assignment.
    const hasStarOrbit =
        isStar &&
        !isPrimary &&
        au !== undefined &&
        au > 0 &&
        periodDays !== undefined &&
        primaryStarId !== "";
    if ((!isStar && row.host_object) || hasStarOrbit) {
        body.orbit = buildOrbit(
            row,
            orbitRadius,
            visualPeriod,
            phaseDeg,
            inclinationDeg,
            hasStarOrbit ? primaryStarId : undefined,
        );
    }

    return body;
}

function deriveSystemType(starCount: number): "solar" | "binary" | "multiple" {
    if (starCount <= 1) return "solar";
    if (starCount === 2) return "binary";
    return "multiple";
}

export function buildSystem(rows: SystemCsvRow[]): PlanetarySystem {
    const first = rows[0];
    const systemName = first.system_name.split(" / ")[0].trim();
    const id = slug(systemName);

    const starRows = rows.filter((r) => r.object_type === "star");
    const primaryStarRow = starRows[0] ?? rows[0];
    const otherRows = rows.filter((r) => r !== primaryStarRow);
    // Secondary stars orbit the primary, so its id is the orbit centerId for
    // any companion star that receives a generated orbit below.
    const primaryStarId = slug(primaryStarRow.object_name);

    const systemType = deriveSystemType(first.number_of_stars);

    return {
        id,
        name: `${systemName} System`,
        version: "1.0.0",
        description: `${systemName} system`,
        systemData: {
            id,
            name: `${systemName} System`,
            description: `${systemName} system`,
            systemType,
            systemScale: 1.2,
            systemCenter: new THREE.Vector3(0, 0, 0),
            star: buildBody(primaryStarRow, true, true, primaryStarId),
            celestialBodies: otherRows.map((r) =>
                buildBody(r, r.object_type === "star", false, primaryStarId),
            ),
            metadata: {
                knownExoplanetCount: first.number_of_known_exoplanets,
                distance: `${first.distance_from_earth_ly} light-years`,
                constellation: first.constellation,
                spectralClass: primaryStarRow.spectral_classification,
            },
            backgroundStars: {
                enabled: true,
                density: 1.0,
                seed: first.system_rank,
                animationSpeed: 0.8,
                minRadius: 2200,
                maxRadius: 5500,
                colorVariation: true,
            },
        },
    };
}
