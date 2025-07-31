// Solar System - converting existing data to new format
import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";
import type { PlanetarySystemData, PlanetarySystem } from "./types";

/**
 * Complete solar system data with accurate astronomical information
 * Real distances are scaled down for 3D visualization while maintaining relative proportions
 * Scale factor: 1 unit = 10 million km (1:10,000,000 scale) for better visualization
 */
export const solarSystemData: PlanetarySystemData = {
    id: "solar-system",
    name: "Solar System",
    description:
        "Our home planetary system, containing the Sun and eight planets",
    systemType: "solar",
    systemScale: 0.1, // Scale factor for rendering: 1 unit = 10 million km
    systemCenter: new THREE.Vector3(0, 0, 0),
    backgroundStars: {
        enabled: true,
        density: 1.0,
        seed: 42,
        animationSpeed: 1.0,
        minRadius: 5000, // Increased to be beyond Neptune
        maxRadius: 15000, // Much larger to provide proper backdrop
        colorVariation: true,
    },
    star: {
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
        realDistance: {
            kilometers: 0,
            astronomicalUnits: 0,
            formattedString: "0 km (system center)",
        },
        material: {
            color: "#FDB813",
            emissive: "#FFA500",
            texture:
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=512&h=512&fit=crop",
        },
        modalTheme: {
            primary: "#FFA500",
            secondary: "#FF6B35",
            accent: "#FFCC33",
            background:
                "linear-gradient(135deg, rgba(255, 165, 0, 0.15) 0%, rgba(255, 107, 53, 0.1) 50%, rgba(255, 204, 51, 0.15) 100%)",
            textColor: "#FFF8E1",
        },
    },
    celestialBodies: [
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
            position: new THREE.Vector3(5.79, 0, 0), // 57.9 million km with new scale
            scale: 0.38,
            realDistance: {
                kilometers: 57900000,
                astronomicalUnits: 0.387,
                formattedString: "57.9 million km (0.387 AU)",
            },
            material: {
                color: "#8C7853",
                roughness: 0.9,
                metalness: 0.3,
            },
            modalTheme: {
                primary: "#8C7853",
                secondary: "#A68B5B",
                accent: "#D4B896",
                background:
                    "linear-gradient(135deg, #1a1612 0%, #2d1810 50%, #1a1612 100%)",
                textColor: "#E5D5B8",
            },
            orbitRadius: 5.79,
            orbitSpeed: 0.048,
        },
        {
            id: "venus",
            name: "Venus",
            type: "planet",
            description:
                "The second planet from the Sun, similar in structure to Earth but with a thick, toxic atmosphere",
            keyFacts: {
                diameter: "12,104 km",
                distanceFromSun: "108.2 million km",
                orbitalPeriod: "225 days",
                composition: ["Iron core", "Silicate mantle", "Rocky crust"],
                temperature: "462°C",
                moons: 0,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(10.82, 0, 0), // 108.2 million km with new scale
            scale: 0.95,
            realDistance: {
                kilometers: 108200000,
                astronomicalUnits: 0.723,
                formattedString: "108.2 million km (0.723 AU)",
            },
            material: {
                color: "#D6CDAF",
                roughness: 0.7,
                metalness: 0.2,
            },
            modalTheme: {
                primary: "#D6CDAF",
                secondary: "#E2D6B9",
                accent: "#F0E68C",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#FFFFFF",
            },
            orbitRadius: 10.82,
            orbitSpeed: 0.035,
        },
        {
            id: "earth",
            name: "Earth",
            type: "planet",
            description:
                "The third planet from the Sun, and the only one known to support life",
            keyFacts: {
                diameter: "12,742 km",
                distanceFromSun: "149.6 million km",
                orbitalPeriod: "365.25 days",
                composition: [
                    "Iron core",
                    "Silicate mantle",
                    "Rocky crust",
                    "Water",
                ],
                temperature: "15°C (average)",
                moons: 1,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(14.96, 0, 0), // 149.6 million km with new scale
            scale: 1,
            realDistance: {
                kilometers: 149600000,
                astronomicalUnits: 1.0,
                formattedString: "149.6 million km (1.0 AU)",
            },
            material: {
                color: "#3E8EDE",
                roughness: 0.5,
                metalness: 0.1,
            },
            modalTheme: {
                primary: "#3E8EDE",
                secondary: "#4DA3E0",
                accent: "#A4D8E1",
                background:
                    "linear-gradient(135deg, #0d1b2a 0%, #1b2631 50%, #0d1b2a 100%)",
                textColor: "#FFFFFF",
            },
            orbitRadius: 14.96,
            orbitSpeed: 0.029,
        },
        {
            id: "mars",
            name: "Mars",
            type: "planet",
            description:
                "The fourth planet from the Sun, known as the Red Planet due to its iron oxide surface",
            keyFacts: {
                diameter: "6,779 km",
                distanceFromSun: "227.9 million km",
                orbitalPeriod: "687 days",
                composition: ["Iron core", "Silicate mantle", "Rocky crust"],
                temperature: "-65°C",
                moons: 2,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(22.79, 0, 0), // 227.9 million km with new scale
            scale: 0.53,
            realDistance: {
                kilometers: 227900000,
                astronomicalUnits: 1.524,
                formattedString: "227.9 million km (1.524 AU)",
            },
            material: {
                color: "#C1440E",
                roughness: 0.8,
                metalness: 0.3,
            },
            modalTheme: {
                primary: "#C1440E",
                secondary: "#D57E24",
                accent: "#F2A900",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#FFFFFF",
            },
            orbitRadius: 22.79,
            orbitSpeed: 0.024,
        },
        {
            id: "jupiter",
            name: "Jupiter",
            type: "planet",
            description:
                "The fifth planet from the Sun, and the largest in our solar system",
            keyFacts: {
                diameter: "139,822 km",
                distanceFromSun: "778.5 million km",
                orbitalPeriod: "11.86 years",
                composition: [
                    "Hydrogen (90%)",
                    "Helium (10%)",
                    "Trace metals (<0.1%)",
                ],
                temperature: "-110°C",
                moons: 79,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(77.85, 0, 0), // 778.5 million km with new scale
            scale: 11.2,
            realDistance: {
                kilometers: 778500000,
                astronomicalUnits: 5.204,
                formattedString: "778.5 million km (5.204 AU)",
            },
            material: {
                color: "#D9D9D9",
                roughness: 0.4,
                metalness: 0.1,
            },
            modalTheme: {
                primary: "#D9D9D9",
                secondary: "#E6E6E6",
                accent: "#FFFFFF",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#000000",
            },
            orbitRadius: 77.85,
            orbitSpeed: 0.0082,
        },
        {
            id: "saturn",
            name: "Saturn",
            type: "planet",
            description:
                "The sixth planet from the Sun, known for its prominent ring system",
            keyFacts: {
                diameter: "116,464 km",
                distanceFromSun: "1.434 billion km",
                orbitalPeriod: "29.46 years",
                composition: [
                    "Hydrogen (96%)",
                    "Helium (3%)",
                    "Trace metals (0.4%)",
                ],
                temperature: "-140°C",
                moons: 83,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(143.4, 0, 0), // 1434 million km with new scale
            scale: 9.45,
            realDistance: {
                kilometers: 1434000000,
                astronomicalUnits: 9.582,
                formattedString: "1.434 billion km (9.582 AU)",
            },
            material: {
                color: "#F2C94C",
                roughness: 0.3,
                metalness: 0.1,
            },
            modalTheme: {
                primary: "#F2C94C",
                secondary: "#F9D66D",
                accent: "#FFFFFF",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#000000",
            },
            orbitRadius: 143.4,
            orbitSpeed: 0.0037,
            rings: {
                enabled: true,
                innerRadius: 1.6, // Clear gap from Saturn's surface (about 2.4x Saturn's radius)
                outerRadius: 2.5, // Extends to about 4x Saturn's radius (more prominent rings)
                color: "#F2C94C",
                opacity: 0.8,
                segments: 64,
                thetaSegments: 128,
                rotationX: Math.PI * 0.1, // Slight tilt (18 degrees) for realism
                rotationY: 0,
                rotationZ: 0,
                particleSystem: {
                    enabled: true,
                    particleCount: 10000,
                    particleSize: 0.02, // Larger particles to be visible
                    particleVariation: 0.3,
                    densityVariation: 0.2,
                },
            },
        },
        {
            id: "uranus",
            name: "Uranus",
            type: "planet",
            description:
                "The seventh planet from the Sun, an ice giant with a faint ring system",
            keyFacts: {
                diameter: "50,724 km",
                distanceFromSun: "2.871 billion km",
                orbitalPeriod: "84.01 years",
                composition: ["Hydrogen (83%)", "Helium (15%)", "Methane (2%)"],
                temperature: "-195°C",
                moons: 27,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(287.1, 0, 0), // 2871 million km with new scale
            scale: 4.01,
            realDistance: {
                kilometers: 2871000000,
                astronomicalUnits: 19.191,
                formattedString: "2.871 billion km (19.191 AU)",
            },
            material: {
                color: "#A7C6ED",
                roughness: 0.5,
                metalness: 0.1,
            },
            modalTheme: {
                primary: "#A7C6ED",
                secondary: "#B7D3F1",
                accent: "#FFFFFF",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#000000",
            },
            orbitRadius: 287.1,
            orbitSpeed: 0.0022,
            rings: {
                enabled: true,
                innerRadius: 1.5, // Uranus rings are closer to the planet
                outerRadius: 2.0,
                color: "#A7C6ED",
                opacity: 0.3, // Very faint rings
                segments: 32,
                thetaSegments: 64,
                rotationX: Math.PI * 0.45, // Uranus is tilted on its side (98 degrees)
                rotationY: 0,
                rotationZ: 0,
                particleSystem: {
                    enabled: true,
                    particleCount: 500, // Fewer particles for fainter rings
                    particleSize: 0.01,
                    particleVariation: 0.4,
                    densityVariation: 0.3,
                },
            },
        },
        {
            id: "neptune",
            name: "Neptune",
            type: "planet",
            description:
                "The eighth and farthest planet from the Sun, known for its deep blue color",
            keyFacts: {
                diameter: "49,244 km",
                distanceFromSun: "4.495 billion km",
                orbitalPeriod: "164.8 years",
                composition: ["Hydrogen (80%)", "Helium (19%)", "Methane (1%)"],
                temperature: "-214°C",
                moons: 14,
            },
            images: [
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516882577034-7f6f3a7f3f3f?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(449.5, 0, 0), // 4495 million km with new scale
            scale: 3.88,
            realDistance: {
                kilometers: 4495000000,
                astronomicalUnits: 30.047,
                formattedString: "4.495 billion km (30.047 AU)",
            },
            material: {
                color: "#4B6FBA",
                roughness: 0.5,
                metalness: 0.1,
            },
            modalTheme: {
                primary: "#4B6FBA",
                secondary: "#6A9BD1",
                accent: "#FFFFFF",
                background:
                    "linear-gradient(135deg, #2a2a2a 0%, #3d3d3d 50%, #2a2a2a 100%)",
                textColor: "#000000",
            },
            orbitRadius: 449.5,
            orbitSpeed: 0.0015,
        },
    ],
    metadata: {
        discoveredBy: "Ancient civilizations",
        discoveryDate: "Prehistoric",
        distance: "0 light-years",
        constellation: "N/A",
        spectralClass: "G2V",
    },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getCelestialBodyById = (
    id: string,
): CelestialBodyData | undefined => {
    if (id === solarSystemData.star.id) {
        return solarSystemData.star;
    }
    return solarSystemData.celestialBodies.find((planet) => planet.id === id);
};

export const getAllCelestialBodies = (): CelestialBodyData[] => {
    return [solarSystemData.star, ...solarSystemData.celestialBodies];
};

export const getCelestialBodiesByType = (
    type: "star" | "planet" | "moon",
): CelestialBodyData[] => {
    const allBodies = getAllCelestialBodies();
    return allBodies.filter((body) => body.type === type);
};

export const sortByDistanceFromSun = (
    bodies: CelestialBodyData[],
): CelestialBodyData[] => {
    return [...bodies].sort((a, b) => {
        if (a.type === "star") return -1;
        if (b.type === "star") return 1;
        const aRadius = a.orbitRadius || 0;
        const bRadius = b.orbitRadius || 0;
        return aRadius - bRadius;
    });
};

export const calculateOrbitPosition = (
    orbitRadius: number,
    angle: number,
    systemScale: number = solarSystemData.systemScale,
): THREE.Vector3 => {
    const scaledRadius = orbitRadius * systemScale;
    const x = Math.cos(angle) * scaledRadius;
    const z = Math.sin(angle) * scaledRadius;
    return new THREE.Vector3(x, 0, z);
};

export const getRelativeScale = (
    actualDiameter: number,
    referenceDiameter: number = 12756,
): number => {
    return Math.max(0.1, actualDiameter / referenceDiameter);
};

export const formatDistance = (distanceKm: number): string => {
    const AU = 149597870.7;
    if (isNaN(distanceKm)) return "Invalid distance";
    if (distanceKm === 0) return "0 km";
    if (distanceKm >= AU) {
        return `${(distanceKm / AU).toFixed(2)} AU`;
    }
    return `${distanceKm.toLocaleString()} km`;
};

export const formatTemperature = (tempCelsius: number): string => {
    const kelvin = tempCelsius + 273.15;
    const fahrenheit = (tempCelsius * 9) / 5 + 32;
    if (tempCelsius >= 1000) {
        return `${tempCelsius.toLocaleString()}°C (${kelvin.toLocaleString()}K)`;
    }
    return `${tempCelsius}°C (${fahrenheit.toFixed(0)}°F, ${kelvin.toFixed(0)}K)`;
};

/**
 * Calculate the real distance from the Sun in kilometers
 */
export const getRealDistanceKm = (body: CelestialBodyData): number => {
    return body.realDistance?.kilometers || 0;
};

/**
 * Calculate the scaled position for rendering based on real distance
 */
export const getScaledPosition = (
    body: CelestialBodyData,
    systemScale: number = solarSystemData.systemScale,
): THREE.Vector3 => {
    const realDistance = getRealDistanceKm(body);
    if (realDistance === 0) {
        return new THREE.Vector3(0, 0, 0);
    }

    // Convert km to 10 millions of km, then apply system scale
    const scaledDistance = (realDistance / 10000000) * systemScale;
    return new THREE.Vector3(scaledDistance, 0, 0);
};

/**
 * Get formatted distance string for display
 */
export const getFormattedDistance = (body: CelestialBodyData): string => {
    return body.realDistance?.formattedString || "Unknown distance";
};

/**
 * Calculate astronomical units from kilometers
 */
export const kmToAU = (kilometers: number): number => {
    const AU = 149597870.7; // 1 AU in kilometers
    return kilometers / AU;
};

/**
 * Update position based on real distance data and system scale
 */
export const updatePositionsFromRealDistance = (
    systemData: PlanetarySystemData,
): PlanetarySystemData => {
    const updatedData = { ...systemData };

    // Update celestial body positions based on real distances
    updatedData.celestialBodies = systemData.celestialBodies.map((planet) => ({
        ...planet,
        position: getScaledPosition(planet, systemData.systemScale),
        orbitRadius: planet.realDistance
            ? (planet.realDistance.kilometers / 10000000) *
              systemData.systemScale
            : planet.orbitRadius,
    }));

    return updatedData;
};

// ============================================================================
// DATA VALIDATION FUNCTIONS
// ============================================================================

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

    // Check realDistance object (optional)
    if (obj.realDistance !== undefined) {
        if (typeof obj.realDistance !== "object") return false;
        const realDistance = obj.realDistance as Record<string, unknown>;
        if (typeof realDistance.kilometers !== "number") return false;
        if (
            realDistance.astronomicalUnits !== undefined &&
            typeof realDistance.astronomicalUnits !== "number"
        )
            return false;
        if (
            realDistance.lightYears !== undefined &&
            typeof realDistance.lightYears !== "number"
        )
            return false;
        if (typeof realDistance.formattedString !== "string") return false;
    }

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

export const validatePlanetarySystemData = (
    data: unknown,
): data is PlanetarySystemData => {
    if (!data || typeof data !== "object") return false;

    const obj = data as Record<string, unknown>;

    // Check required fields
    if (typeof obj.id !== "string") return false;
    if (typeof obj.name !== "string") return false;
    if (typeof obj.description !== "string") return false;
    if (
        !["solar", "binary", "multiple", "exotic"].includes(
            obj.systemType as string,
        )
    )
        return false;

    // Check star
    if (!validateCelestialBodyData(obj.star)) return false;
    const star = obj.star as CelestialBodyData;
    if (star.type !== "star") return false;

    // Check celestialBodies array
    if (!Array.isArray(obj.celestialBodies)) return false;
    for (const body of obj.celestialBodies) {
        if (!validateCelestialBodyData(body)) return false;
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

export const validateCurrentSolarSystemData = (): boolean => {
    return validatePlanetarySystemData(solarSystemData);
};

// Validate data on module load (development check)
if (process.env.NODE_ENV === "development") {
    if (!validateCurrentSolarSystemData()) {
        console.error("Solar system data validation failed!");
    } else {
        console.log("Solar system data validation passed ✓");
    }
}

/**
 * Solar System
 * The primary planetary system - our own solar system
 */
export const solarSystem: PlanetarySystem = {
    id: "solar",
    name: "Solar System",
    version: "1.0.0",
    description: "Our home solar system with all planets and the Sun",
    author: "Andromeda Team",

    systemData: solarSystemData,

    async initialize() {
        console.log("Solar System plugin initialized");
    },

    async cleanup() {
        console.log("Solar System plugin cleaned up");
    },
};
