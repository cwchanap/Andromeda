import * as THREE from "three";
import rawCsv from "@/data/nearest_30_planetary_systems.csv?raw";
import { parseSystemsCsv, type SystemCsvRow } from "./parseCsv";
import { buildSystem } from "./buildSystem";
import { applyOverrides } from "./overrides";
import { loadCoordinates } from "./systemNames";
import { radialToCartesian, galaxyVisual, BV_INDEX } from "./buildGalaxy";
import type { PlanetarySystem } from "../types";
import type { GalaxyData, StarSystemData } from "@/lib/galaxy/types";

export function buildAllPlanetarySystems(): PlanetarySystem[] {
    const rows = parseSystemsCsv(rawCsv);
    const grouped = groupBySystemRank(rows);
    return grouped.map((group) => applyOverrides(buildSystem(group)));
}

export function buildLocalGalaxy(): GalaxyData {
    const rows = parseSystemsCsv(rawCsv);
    const grouped = groupBySystemRank(rows);
    const coords = loadCoordinates();

    const starSystems: StarSystemData[] = grouped.map((group) => {
        const sys = applyOverrides(buildSystem(group));
        const systemName = group[0].system_name;
        const distanceLy = group[0].distance_from_earth_ly;
        const coord = coords[systemName];
        const pos = coord
            ? radialToCartesian(distanceLy, coord.ra, coord.dec)
            : { x: 0, y: 0, z: 0 };

        const spectralClass = sys.systemData.metadata?.spectralClass ?? "M";
        const firstLetter = spectralClass.charAt(0).toUpperCase();

        return {
            id: sys.id,
            name: sys.systemData.name,
            description: sys.systemData.description,
            systemType: mapSystemType(
                sys.systemData.systemType,
                group[0].number_of_stars,
            ),
            position: new THREE.Vector3(pos.x, pos.y, pos.z),
            distanceFromEarth: distanceLy,
            stars: [sys.systemData.star],
            metadata: {
                constellation: sys.systemData.metadata?.constellation,
                spectralClass,
                hasExoplanets:
                    (sys.systemData.metadata?.confirmedExoplanetCount ?? 0) > 0,
                numberOfPlanets:
                    sys.systemData.metadata?.confirmedExoplanetCount,
            },
            visual: {
                brightness: galaxyVisual(distanceLy).brightness,
                colorIndex: BV_INDEX[firstLetter] ?? 1.5,
                scale: sys.systemData.star.scale ?? 1,
            },
        };
    });

    const maxDistance = Math.max(
        ...starSystems.map((s) => s.distanceFromEarth),
    );

    return {
        id: "local-galaxy",
        name: "Local Galaxy",
        description: "The 30 nearest star systems to Earth",
        starSystems,
        center: new THREE.Vector3(0, 0, 0),
        scale: 1,
        boundingRadius: Math.ceil(maxDistance),
    };
}

function groupBySystemRank(rows: SystemCsvRow[]): SystemCsvRow[][] {
    const map = new Map<number, SystemCsvRow[]>();
    for (const row of rows) {
        if (!map.has(row.system_rank)) map.set(row.system_rank, []);
        map.get(row.system_rank)!.push(row);
    }
    return Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, group]) => group);
}

function mapSystemType(
    t: string,
    starCount: number,
): "solar" | "binary" | "trinary" | "multiple" {
    if (t === "solar") return "solar";
    if (t === "binary") return "binary";
    if (starCount === 3) return "trinary";
    return "multiple";
}
