// Utility functions for comparing celestial bodies
import type { CelestialBodyData } from "../types/game";
import { planetarySystemRegistry } from "../lib/planetary-system";

/**
 * Parse diameter string to numeric kilometers
 * Handles formats: "12,742 km", "1,392,700 km", "4,879 km"
 */
export function parseDiameter(diameterStr: string): number {
    const match = diameterStr.match(/[\d,]+/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/,/g, ""));
}

/**
 * Parse distance string to numeric kilometers
 * Handles formats: "150 million km", "57.9 million km", "384,400 km"
 */
export function parseDistance(distanceStr: string): number {
    if (!distanceStr) return 0;

    // Handle "million km" format
    const millionMatch = distanceStr.match(/([\d.]+)\s*million/i);
    if (millionMatch) {
        return parseFloat(millionMatch[1]) * 1_000_000;
    }

    // Handle plain km format
    const kmMatch = distanceStr.match(/[\d,]+/);
    if (kmMatch) {
        return parseFloat(kmMatch[0].replace(/,/g, ""));
    }

    return 0;
}

/**
 * Parse temperature string to numeric value (in Celsius or Kelvin)
 * Handles formats: "15°C", "-173°C to 427°C", "5,778 K"
 */
export function parseTemperature(
    tempStr: string,
): { value: number; unit: string } | null {
    if (!tempStr) return null;

    // Handle range format - take average
    const rangeMatch = tempStr.match(
        /([-\d,]+)\s*°?\s*([CK])?\s*(?:to|-)\s*([-\d,]+)\s*°?\s*([CK])?/i,
    );
    if (rangeMatch) {
        const low = parseFloat(rangeMatch[1].replace(/,/g, ""));
        const high = parseFloat(rangeMatch[3].replace(/,/g, ""));
        const unit = (rangeMatch[4] || rangeMatch[2] || "C").toUpperCase();
        return { value: (low + high) / 2, unit };
    }

    // Handle single value
    const singleMatch = tempStr.match(/([-\d,]+)\s*°?([CK])/i);
    if (singleMatch) {
        return {
            value: parseFloat(singleMatch[1].replace(/,/g, "")),
            unit: singleMatch[2].toUpperCase(),
        };
    }

    return null;
}

/**
 * Parse orbital period string to numeric days
 * Handles formats: "365.25 days", "88 days", "11.86 years"
 */
export function parseOrbitalPeriod(periodStr: string): number {
    if (!periodStr || periodStr === "N/A") return 0;

    // Handle years
    const yearsMatch = periodStr.match(/([\d.]+)\s*years?/i);
    if (yearsMatch) {
        return parseFloat(yearsMatch[1]) * 365.25;
    }

    // Handle days
    const daysMatch = periodStr.match(/([\d.]+)\s*days?/i);
    if (daysMatch) {
        return parseFloat(daysMatch[1]);
    }

    return 0;
}

/**
 * Calculate size ratios for an array of bodies
 * Returns ratios relative to the largest body (which will be 1.0)
 */
export function calculateSizeRatios(bodies: CelestialBodyData[]): number[] {
    if (bodies.length === 0) return [];

    const diameters = bodies.map((b) => parseDiameter(b.keyFacts.diameter));
    const maxDiameter = Math.max(...diameters);

    if (maxDiameter === 0) return bodies.map(() => 1);

    return diameters.map((d) => d / maxDiameter);
}

/**
 * Format size ratio as a readable string
 */
export function formatSizeRatio(ratio: number): string {
    if (ratio >= 1) {
        return "100%";
    }
    return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Get comparison value from a celestial body for a specific attribute
 */
export function getComparisonValue(
    body: CelestialBodyData,
    attribute: string,
): string {
    switch (attribute) {
        case "diameter":
            return body.keyFacts.diameter;
        case "distance":
            if (body.type === "moon") {
                return body.distanceFromParent?.formattedString || "-";
            }
            return body.keyFacts.distanceFromSun || "-";
        case "temperature":
            return body.keyFacts.temperature;
        case "orbitalPeriod":
            return body.keyFacts.orbitalPeriod;
        case "moons":
            return body.keyFacts.moons?.toString() || "-";
        case "type":
            return body.type;
        case "composition":
            return Array.isArray(body.keyFacts?.composition)
                ? body.keyFacts.composition.slice(0, 3).join(", ")
                : "";
        default:
            return "-";
    }
}

/**
 * Selectable body with system context
 */
export interface SelectableBody {
    body: CelestialBodyData;
    systemName: string;
    systemId: string;
}

/**
 * Get all celestial bodies from all registered systems
 */
export function getAllBodiesFromAllSystems(): SelectableBody[] {
    const systems = planetarySystemRegistry.getAllSystems();
    const allBodies: SelectableBody[] = [];

    for (const system of systems) {
        const systemName = system.systemData.name;
        const systemId = system.id;

        // Add star
        allBodies.push({
            body: system.systemData.star,
            systemName,
            systemId,
        });

        // Add all celestial bodies (planets and moons)
        for (const body of system.systemData.celestialBodies) {
            allBodies.push({
                body,
                systemName,
                systemId,
            });
        }
    }

    return allBodies;
}

/**
 * Search bodies by name
 */
export function searchBodies(
    bodies: SelectableBody[],
    query: string,
): SelectableBody[] {
    if (!query.trim()) return bodies;

    const lowerQuery = query.toLowerCase();
    return bodies.filter(
        ({ body, systemName }) =>
            body.name.toLowerCase().includes(lowerQuery) ||
            systemName.toLowerCase().includes(lowerQuery),
    );
}

/**
 * Filter bodies by type
 */
export function filterByType(
    bodies: SelectableBody[],
    type: "star" | "planet" | "moon" | "all",
): SelectableBody[] {
    if (type === "all") return bodies;
    return bodies.filter(({ body }) => body.type === type);
}

/**
 * Comparison attribute configuration
 */
export interface ComparisonAttribute {
    key: string;
    labelKey: string;
    getValue: (body: CelestialBodyData) => string;
}

/**
 * Default comparison attributes (8+)
 */
export const COMPARISON_ATTRIBUTES: ComparisonAttribute[] = [
    {
        key: "type",
        labelKey: "comparison.type",
        getValue: (body) => body.type.toUpperCase(),
    },
    {
        key: "diameter",
        labelKey: "modal.diameter",
        getValue: (body) => body.keyFacts.diameter,
    },
    {
        key: "sizeRatio",
        labelKey: "comparison.sizeRatio",
        getValue: () => "-", // Calculated separately
    },
    {
        key: "distance",
        labelKey: "modal.distanceFromSun",
        getValue: (body) =>
            body.type === "moon"
                ? body.distanceFromParent?.formattedString || "-"
                : body.keyFacts.distanceFromSun || "-",
    },
    {
        key: "orbitalPeriod",
        labelKey: "modal.orbitalPeriod",
        getValue: (body) => body.keyFacts.orbitalPeriod,
    },
    {
        key: "temperature",
        labelKey: "modal.temperature",
        getValue: (body) => body.keyFacts.temperature,
    },
    {
        key: "moons",
        labelKey: "modal.moons",
        getValue: (body) => body.keyFacts.moons?.toString() || "-",
    },
    {
        key: "composition",
        labelKey: "modal.composition",
        getValue: (body) =>
            Array.isArray(body.keyFacts?.composition)
                ? body.keyFacts.composition.slice(0, 3).join(", ")
                : "",
    },
];
