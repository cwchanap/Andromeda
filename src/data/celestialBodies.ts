import type { CelestialBodyData, SolarSystemData } from "../types/game";
import * as THREE from "three";

/**
 * Complete solar system data with accurate astronomical information
 * Scales and positions are adjusted for 3D visualization while maintaining relative proportions
 */
export const solarSystemData: SolarSystemData = {
    systemScale: 1,
    systemCenter: new THREE.Vector3(0, 0, 0),

    sun: {
        id: "sun",
        name: "Sun",
        type: "star",
        description:
            "The star at the center of our solar system, containing 99.86% of the system's mass",
        keyFacts: {
            diameter: "1,392,700 km",
            distanceFromSun: "0 km",
            orbitalPeriod: "N/A",
            composition: [
                "Hydrogen (73%)",
                "Helium (25%)",
                "Other elements (2%)",
            ],
            temperature: "5,778 K (surface), 15 million K (core)",
        },
        images: [
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=600&fit=crop",
        ],
        position: new THREE.Vector3(0, 0, 0),
        scale: 2.5,
        material: {
            color: "#FDB813",
            emissive: "#FFA500",
            texture:
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=512&h=512&fit=crop",
        },
    },

    planets: [
        {
            id: "mercury",
            name: "Mercury",
            type: "planet",
            description:
                "The smallest planet and closest to the Sun, with extreme temperature variations",
            keyFacts: {
                diameter: "4,879 km",
                distanceFromSun: "57.9 million km",
                orbitalPeriod: "88 days",
                composition: ["Iron core", "Silicate mantle", "Thin crust"],
                temperature: "427°C (day), -173°C (night)",
                moons: 0,
            },
            images: [
                "https://images.unsplash.com/photo-1614728894747-a83421048a1c?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1614732414444-096040ec8c6d?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(4, 0, 0),
            scale: 0.38,
            material: {
                color: "#8C7853",
                roughness: 0.9,
                metalness: 0.3,
            },
            orbitRadius: 4,
            orbitSpeed: 0.048,
        },
        {
            id: "venus",
            name: "Venus",
            type: "planet",
            description:
                "The hottest planet with a thick, toxic atmosphere and retrograde rotation",
            keyFacts: {
                diameter: "12,104 km",
                distanceFromSun: "108.2 million km",
                orbitalPeriod: "225 days",
                composition: [
                    "Iron core",
                    "Rocky mantle",
                    "Thick CO₂ atmosphere",
                ],
                temperature: "462°C (surface)",
                moons: 0,
            },
            images: [
                "https://images.unsplash.com/photo-1614313909025-f5ad7017eae5?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1446776741262-4e5e1d2b4f1b?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(6, 0, 0),
            scale: 0.95,
            material: {
                color: "#FFC649",
                roughness: 0.8,
                metalness: 0.0,
                atmosphereColor: "#FFEB7A",
            },
            orbitRadius: 6,
            orbitSpeed: 0.035,
        },
        {
            id: "earth",
            name: "Earth",
            type: "planet",
            description:
                "The third planet from the Sun and the only known planet with life",
            keyFacts: {
                diameter: "12,756 km",
                distanceFromSun: "149.6 million km",
                orbitalPeriod: "365.25 days",
                composition: [
                    "Iron core",
                    "Silicate mantle",
                    "Water oceans",
                    "Nitrogen-oxygen atmosphere",
                ],
                temperature: "15°C (average)",
                moons: 1,
            },
            images: [
                "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1614732414444-096040ec8c6d?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(8, 0, 0),
            scale: 1.0,
            material: {
                color: "#6B93D6",
                roughness: 0.6,
                metalness: 0.0,
                atmosphereColor: "#87CEEB",
                texture:
                    "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=512&h=512&fit=crop",
            },
            orbitRadius: 8,
            orbitSpeed: 0.03,
        },
        {
            id: "mars",
            name: "Mars",
            type: "planet",
            description:
                "The red planet with polar ice caps, the largest volcano, and evidence of ancient water",
            keyFacts: {
                diameter: "6,792 km",
                distanceFromSun: "227.9 million km",
                orbitalPeriod: "687 days",
                composition: [
                    "Iron core",
                    "Basaltic mantle",
                    "Iron oxide surface",
                    "Thin CO₂ atmosphere",
                ],
                temperature: "-65°C (average)",
                moons: 2,
            },
            images: [
                "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1614732414444-096040ec8c6d?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(11, 0, 0),
            scale: 0.53,
            material: {
                color: "#CD5C5C",
                roughness: 0.9,
                metalness: 0.2,
                atmosphereColor: "#FFA07A",
            },
            orbitRadius: 11,
            orbitSpeed: 0.024,
        },
        {
            id: "jupiter",
            name: "Jupiter",
            type: "planet",
            description:
                "The largest planet, a gas giant with a Great Red Spot storm and many moons",
            keyFacts: {
                diameter: "142,984 km",
                distanceFromSun: "778.5 million km",
                orbitalPeriod: "12 years",
                composition: ["Hydrogen", "Helium", "Metallic hydrogen core"],
                temperature: "-110°C (cloud tops)",
                moons: 95,
            },
            images: [],
            position: new THREE.Vector3(16, 0, 0),
            scale: 2.2,
            material: {
                color: "#D8CA9D",
                roughness: 0.3,
                metalness: 0.0,
                transparent: true,
                opacity: 0.95,
                atmosphereColor: "#F4E6A1",
            },
            orbitRadius: 16,
            orbitSpeed: 0.013,
        },
        {
            id: "saturn",
            name: "Saturn",
            type: "planet",
            description:
                "The ringed planet, a gas giant with spectacular ring system and many moons",
            keyFacts: {
                diameter: "120,536 km",
                distanceFromSun: "1.43 billion km",
                orbitalPeriod: "29 years",
                composition: ["Hydrogen", "Helium", "Rocky core"],
                temperature: "-140°C (cloud tops)",
                moons: 146,
            },
            images: [],
            position: new THREE.Vector3(22, 0, 0),
            scale: 1.9,
            material: {
                color: "#FAD5A5",
                roughness: 0.3,
                metalness: 0.0,
                transparent: true,
                opacity: 0.95,
                atmosphereColor: "#F4E6A1",
            },
            orbitRadius: 22,
            orbitSpeed: 0.009,
            rings: {
                enabled: true,
                innerRadius: 1.3375, // 50% closer (was 2.675)
                outerRadius: 1.7125, // 50% closer (was 3.425)
                color: "#D4AF37",
                opacity: 0.7,
                segments: 64,
                thetaSegments: 128,
                particleSystem: {
                    enabled: true,
                    particleCount: 5000, // 5x denser (was 1000)
                    particleSize: 0.02,
                    particleVariation: 0.6,
                    densityVariation: 0.2,
                },
            },
        },
        {
            id: "uranus",
            name: "Uranus",
            type: "planet",
            description:
                "An ice giant tilted on its side with faint rings and a methane-rich atmosphere",
            keyFacts: {
                diameter: "51,118 km",
                distanceFromSun: "2.87 billion km",
                orbitalPeriod: "84 years",
                composition: ["Water", "Methane", "Ammonia ices", "Rocky core"],
                temperature: "-195°C (cloud tops)",
                moons: 27,
            },
            images: [],
            position: new THREE.Vector3(30, 0, 0),
            scale: 1.0,
            material: {
                color: "#4FD0E7",
                roughness: 0.3,
                metalness: 0.0,
                transparent: true,
                opacity: 0.95,
                atmosphereColor: "#7FEFFF",
            },
            orbitRadius: 30,
            orbitSpeed: 0.007,
        },
        {
            id: "neptune",
            name: "Neptune",
            type: "planet",
            description:
                "The farthest planet, an ice giant with the strongest winds in the solar system",
            keyFacts: {
                diameter: "49,528 km",
                distanceFromSun: "4.50 billion km",
                orbitalPeriod: "165 years",
                composition: ["Water", "Methane", "Ammonia ices", "Rocky core"],
                temperature: "-200°C (cloud tops)",
                moons: 16,
            },
            images: [],
            position: new THREE.Vector3(38, 0, 0),
            scale: 0.95,
            material: {
                color: "#4B70DD",
                roughness: 0.3,
                metalness: 0.0,
                transparent: true,
                opacity: 0.95,
                atmosphereColor: "#6A8FEF",
            },
            orbitRadius: 38,
            orbitSpeed: 0.005,
        },
    ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a celestial body by its ID
 */
export const getCelestialBodyById = (
    id: string,
): CelestialBodyData | undefined => {
    if (id === solarSystemData.sun.id) {
        return solarSystemData.sun;
    }
    return solarSystemData.planets.find((planet) => planet.id === id);
};

/**
 * Get all celestial bodies (sun + planets)
 */
export const getAllCelestialBodies = (): CelestialBodyData[] => {
    return [solarSystemData.sun, ...solarSystemData.planets];
};

/**
 * Get celestial bodies filtered by type
 */
export const getCelestialBodiesByType = (
    type: "star" | "planet" | "moon",
): CelestialBodyData[] => {
    const allBodies = getAllCelestialBodies();
    return allBodies.filter((body) => body.type === type);
};

/**
 * Sort celestial bodies by distance from the Sun
 */
export const sortByDistanceFromSun = (
    bodies: CelestialBodyData[],
): CelestialBodyData[] => {
    return [...bodies].sort((a, b) => {
        // Sun always comes first
        if (a.type === "star") return -1;
        if (b.type === "star") return 1;

        // Sort planets by orbit radius
        const aRadius = a.orbitRadius || 0;
        const bRadius = b.orbitRadius || 0;
        return aRadius - bRadius;
    });
};

/**
 * Calculate position on orbit given radius and angle
 */
export const calculateOrbitPosition = (
    orbitRadius: number,
    angle: number,
): THREE.Vector3 => {
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    return new THREE.Vector3(x, 0, z);
};

/**
 * Get relative scale based on actual diameter compared to Earth
 */
export const getRelativeScale = (
    actualDiameter: number,
    referenceDiameter: number = 12756,
): number => {
    return Math.max(0.1, actualDiameter / referenceDiameter);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
    const AU = 149597870.7;
    if (isNaN(distanceKm)) return "Invalid distance";
    if (distanceKm === 0) return "0 km";
    if (distanceKm >= AU) {
        return `${(distanceKm / AU).toFixed(2)} AU`;
    }
    return `${distanceKm.toLocaleString()} km`;
};

/**
 * Format temperature for display
 */
export const formatTemperature = (tempCelsius: number): string => {
    const kelvin = tempCelsius + 273.15;
    const fahrenheit = (tempCelsius * 9) / 5 + 32;

    if (tempCelsius >= 1000) {
        return `${tempCelsius.toLocaleString()}°C (${kelvin.toLocaleString()}K)`;
    }

    return `${tempCelsius}°C (${fahrenheit.toFixed(0)}°F, ${kelvin.toFixed(0)}K)`;
};

// ============================================================================
// DATA VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a CelestialBodyData object
 */
export const validateCelestialBodyData = (
    data: unknown,
): data is CelestialBodyData => {
    if (!data || typeof data !== "object") return false;

    const obj = data as Record<string, unknown>;

    // Check required string fields
    if (typeof obj.id !== "string" || obj.id.trim() === "") return false;
    if (typeof obj.name !== "string" || obj.name.trim() === "") return false;
    if (!["star", "planet", "moon"].includes(obj.type as string)) return false;
    if (typeof obj.description !== "string") return false;

    // Check keyFacts object
    if (!obj.keyFacts || typeof obj.keyFacts !== "object") return false;
    const keyFacts = obj.keyFacts as Record<string, unknown>;
    if (typeof keyFacts.diameter !== "string") return false;
    if (typeof keyFacts.distanceFromSun !== "string") return false;
    if (typeof keyFacts.orbitalPeriod !== "string") return false;
    if (!Array.isArray(keyFacts.composition)) return false;
    if (typeof keyFacts.temperature !== "string") return false;
    if (keyFacts.moons !== undefined && typeof keyFacts.moons !== "number")
        return false;

    // Check arrays
    if (!Array.isArray(obj.images)) return false;

    // Check position (Three.js Vector3)
    const position = obj.position as Record<string, unknown>;
    if (
        !obj.position ||
        typeof position.x !== "number" ||
        typeof position.y !== "number" ||
        typeof position.z !== "number"
    )
        return false;

    // Check numeric fields
    if (typeof obj.scale !== "number" || obj.scale <= 0) return false;

    // Check material object
    if (!obj.material || typeof obj.material !== "object") return false;
    const material = obj.material as Record<string, unknown>;
    if (typeof material.color !== "string") return false;
    if (
        material.emissive !== undefined &&
        typeof material.emissive !== "string"
    )
        return false;
    if (material.texture !== undefined && typeof material.texture !== "string")
        return false;

    // Check optional orbit fields
    if (obj.orbitRadius !== undefined && typeof obj.orbitRadius !== "number")
        return false;
    if (obj.orbitSpeed !== undefined && typeof obj.orbitSpeed !== "number")
        return false;

    return true;
};

/**
 * Validate a SolarSystemData object
 */
export const validateSolarSystemData = (
    data: unknown,
): data is SolarSystemData => {
    if (!data || typeof data !== "object") return false;

    const obj = data as Record<string, unknown>;

    // Check sun
    if (!validateCelestialBodyData(obj.sun)) return false;
    const sun = obj.sun as CelestialBodyData;
    if (sun.type !== "star") return false;

    // Check planets array
    if (!Array.isArray(obj.planets)) return false;
    for (const planet of obj.planets) {
        if (!validateCelestialBodyData(planet)) return false;
        const planetData = planet as CelestialBodyData;
        if (planetData.type !== "planet") return false;
    }

    // Check numeric fields
    if (typeof obj.systemScale !== "number" || obj.systemScale <= 0)
        return false;

    // Check systemCenter (Three.js Vector3)
    const systemCenter = obj.systemCenter as Record<string, unknown>;
    if (
        !obj.systemCenter ||
        typeof systemCenter.x !== "number" ||
        typeof systemCenter.y !== "number" ||
        typeof systemCenter.z !== "number"
    )
        return false;

    return true;
};

/**
 * Validate the current solar system data
 */
export const validateCurrentSolarSystemData = (): boolean => {
    return validateSolarSystemData(solarSystemData);
};

// Validate data on module load (development check)
if (process.env.NODE_ENV === "development") {
    if (!validateCurrentSolarSystemData()) {
        console.error("Solar system data validation failed!");
    } else {
        console.log("Solar system data validation passed ✓");
    }
}
