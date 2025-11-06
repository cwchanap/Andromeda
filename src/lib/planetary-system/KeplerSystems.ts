// Kepler exoplanet systems - adapted from ExamplePlugins
import type { PlanetarySystem } from "./types";

/**
 * Kepler-442 System
 */
export const kepler442System: PlanetarySystem = {
    id: "kepler-442",
    name: "Kepler-442 System",
    version: "1.0.0",
    description:
        "A star system containing potentially habitable super-Earth exoplanets",
    author: "Andromeda Team",

    systemData: {
        id: "kepler-442",
        name: "Kepler-442 System",
        description:
            "A star system containing potentially habitable super-Earth exoplanets",
        systemType: "solar",
        systemScale: 1.0,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "kepler-442",
            name: "Kepler-442",
            type: "star",
            description:
                "A K-type main-sequence star smaller and cooler than our Sun",
            keyFacts: {
                diameter: "970,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: ["Hydrogen", "Helium"],
                temperature: "4,402 K (surface)",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 2.0,
            material: {
                color: "#FFB347",
                emissive: "#FF8C00",
            },
        },

        celestialBodies: [
            {
                id: "kepler-442b",
                name: "Kepler-442b",
                type: "planet",
                description:
                    "A potentially habitable super-Earth in the habitable zone",
                keyFacts: {
                    diameter: "~16,000 km (estimated)",
                    distanceFromSun: "0.41 AU",
                    orbitalPeriod: "112.3 days",
                    composition: ["Rocky (estimated)", "Possible atmosphere"],
                    temperature: "-2°C to +15°C (estimated)",
                },
                images: [],
                position: { x: 8, y: 0, z: 0 },
                scale: 1.3,
                material: {
                    color: "#6B8E5A",
                    roughness: 0.7,
                    metalness: 0.1,
                },
                orbitRadius: 8,
                orbitSpeed: 0.03,
            },
        ],

        metadata: {
            discoveredBy: "Kepler Space Telescope",
            discoveryDate: "2015",
            distance: "1,206 light-years",
            constellation: "Lyra",
            spectralClass: "K5V",
        },

        // Background stars configuration for Kepler-442 system
        backgroundStars: {
            enabled: true,
            density: 1.4, // Denser star field for this distant system
            seed: 442, // System-specific seed based on Kepler number
            animationSpeed: 1.2, // Slightly faster animation
            minRadius: 2400,
            maxRadius: 6000,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("Kepler-442 System plugin initialized");
    },

    async cleanup() {
        console.log("Kepler-442 System plugin cleaned up");
    },
};

/**
 * Kepler-438 System Plugin
 */
export const kepler438System: PlanetarySystem = {
    id: "kepler-438",
    name: "Kepler-438 System",
    version: "1.0.0",
    description:
        "Another potentially habitable exoplanet system discovered by Kepler",
    author: "Andromeda Team",

    systemData: {
        id: "kepler-438",
        name: "Kepler-438 System",
        description:
            "Another potentially habitable exoplanet system discovered by Kepler",
        systemType: "solar",
        systemScale: 1.0,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "kepler-438",
            name: "Kepler-438",
            type: "star",
            description:
                "A red dwarf star hosting a potentially habitable planet",
            keyFacts: {
                diameter: "680,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: ["Hydrogen", "Helium"],
                temperature: "3,970 K (surface)",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.8,
            material: {
                color: "#FF6B47",
                emissive: "#FF4500",
            },
        },

        celestialBodies: [
            {
                id: "kepler-438b",
                name: "Kepler-438b",
                type: "planet",
                description:
                    "A potentially habitable rocky planet similar to Earth in size",
                keyFacts: {
                    diameter: "~15,200 km",
                    distanceFromSun: "0.166 AU",
                    orbitalPeriod: "35.2 days",
                    composition: ["Rocky", "Possible thin atmosphere"],
                    temperature: "-12°C to +8°C (estimated)",
                },
                images: [],
                position: { x: 6, y: 0, z: 0 },
                scale: 1.2,
                material: {
                    color: "#8B4513",
                    roughness: 0.8,
                    metalness: 0.2,
                },
                orbitRadius: 6,
                orbitSpeed: 0.04,
            },
        ],

        metadata: {
            discoveredBy: "Kepler Space Telescope",
            discoveryDate: "2015",
            distance: "640 light-years",
            constellation: "Lyra",
            spectralClass: "M0V",
        },

        // Background stars configuration for Kepler-438 system
        backgroundStars: {
            enabled: true,
            density: 1.3, // Dense star field for this M-dwarf system
            seed: 438, // System-specific seed based on Kepler number
            animationSpeed: 0.9, // Slightly slower animation for M-dwarf system
            minRadius: 2300,
            maxRadius: 5800,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("Kepler-438 System plugin initialized");
    },

    async cleanup() {
        console.log("Kepler-438 System plugin cleaned up");
    },
};
