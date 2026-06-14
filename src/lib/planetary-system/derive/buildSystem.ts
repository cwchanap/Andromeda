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

const DEFAULT_PLANET_COLOR = "#8B7355";

function slug(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function formatDiameter(km: number): string {
    return `${Math.round(km).toLocaleString("en-US")} km`;
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
): OrbitalElementsData {
    const orbit: OrbitalElementsData = {
        centerId: slug(row.host_object),
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

function buildBody(row: SystemCsvRow, isStar: boolean): CelestialBodyData {
    const id = slug(row.object_name);
    const name = row.object_name;
    const csvType = row.object_type as CsvObjectType;
    const type = mapBodyType(csvType);
    const status = parseStatus(row.status, csvType);

    const tempK = row.surface_temperature_K;
    const tempC = row.surface_temperature_C;
    const diameterKm = row.diameter_km;
    const au = row.distance_from_system_center_AU;
    const periodDays = row.orbital_period_days;

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

    if (isStar) {
        keyFacts.distanceFromSun = "0 (system center)";
    } else if (au !== undefined) {
        keyFacts.distanceFromSun = `${au} AU from ${row.host_object}`;
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

    const position = isStar
        ? new THREE.Vector3(0, 0, 0)
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

    if (!isStar && row.host_object) {
        body.orbit = buildOrbit(
            row,
            orbitRadius,
            visualPeriod,
            phaseDeg,
            inclinationDeg,
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
            star: buildBody(primaryStarRow, true),
            celestialBodies: otherRows.map((r) =>
                buildBody(r, r.object_type === "star"),
            ),
            metadata: {
                confirmedExoplanetCount: first.number_of_known_exoplanets,
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
