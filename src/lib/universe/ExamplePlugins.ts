// Example plugin demonstrating the extensibility architecture
import type {
    GamePlugin,
    StarSystemData,
    PluginContext,
} from "../../types/universe";
import * as THREE from "three";

/**
 * Alpha Centauri System Plugin
 * Adds the closest star system to our solar system
 */
export const alphaCentauriPlugin: GamePlugin = {
    id: "alpha-centauri-system",
    name: "Alpha Centauri System",
    version: "1.0.0",
    description:
        "Adds the Alpha Centauri star system with Proxima Centauri and potential exoplanets",
    author: "Andromeda Team",

    // Plugin lifecycle
    async initialize(context: PluginContext) {
        context.logger.info("Initializing Alpha Centauri System plugin");

        // Register event listeners
        context.eventBus.on("system-changed", (data) => {
            if (data.currentSystemId === "alpha-centauri") {
                context.logger.info("Welcome to the Alpha Centauri system!");
            }
        });
    },

    async activate() {
        console.log("Alpha Centauri system plugin activated");
    },

    async deactivate() {
        console.log("Alpha Centauri system plugin deactivated");
    },

    async cleanup() {
        console.log("Alpha Centauri system plugin cleaned up");
    },

    // Additional star systems
    systems: [createAlphaCentauriSystem()],

    // Plugin features
    features: [
        {
            id: "exoplanet-visualization",
            name: "Exoplanet Visualization",
            type: "3d-effect",
            configuration: {
                highlightHabitableZones: true,
                showOrbitUncertainty: true,
            },
        },
        {
            id: "comparative-analysis",
            name: "Comparative System Analysis",
            type: "educational-content",
            configuration: {
                compareWithSolarSystem: true,
                showDistanceScale: true,
            },
        },
    ],

    // Dependencies
    dependencies: [],
    compatibleVersions: ["1.0.0"],
    requiredFeatures: ["3d-rendering", "system-navigation"],
};

/**
 * Creates the Alpha Centauri star system data
 */
function createAlphaCentauriSystem(): StarSystemData {
    return {
        id: "alpha-centauri",
        name: "Alpha Centauri System",
        description:
            "The closest star system to Earth, featuring a triple star system with potentially habitable exoplanets",
        systemType: "multiple",
        systemScale: 1.2,
        systemCenter: new THREE.Vector3(0, 0, 0),

        // Primary star (Alpha Centauri A)
        star: {
            id: "alpha-centauri-a",
            name: "Alpha Centauri A",
            type: "star",
            description:
                "A Sun-like G-type main-sequence star, slightly larger and brighter than our Sun",
            keyFacts: {
                diameter: "1,713,400 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "5,790 K (surface)",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: new THREE.Vector3(0, 0, 0),
            scale: 2.8,
            material: {
                color: "#FDB813",
                emissive: "#FFA500",
            },
        },

        // Celestial bodies in the system
        celestialBodies: [
            // Alpha Centauri B (secondary star)
            {
                id: "alpha-centauri-b",
                name: "Alpha Centauri B",
                type: "star",
                description:
                    "A smaller, orange K-type main-sequence star orbiting Alpha Centauri A",
                keyFacts: {
                    diameter: "1,236,000 km",
                    distanceFromSun: "23 AU from Alpha Centauri A",
                    orbitalPeriod: "80 years",
                    composition: [
                        "Hydrogen (70%)",
                        "Helium (28%)",
                        "Other elements (2%)",
                    ],
                    temperature: "5,260 K (surface)",
                },
                images: [],
                position: new THREE.Vector3(25, 0, 0),
                scale: 2.2,
                material: {
                    color: "#FFA500",
                    emissive: "#FF8C00",
                },
                orbitRadius: 25,
                orbitSpeed: 0.004,
            },

            // Proxima Centauri (red dwarf)
            {
                id: "proxima-centauri",
                name: "Proxima Centauri",
                type: "star",
                description:
                    "A small red dwarf star, the closest individual star to the Sun",
                keyFacts: {
                    diameter: "215,000 km",
                    distanceFromSun: "13,000 AU from Alpha Centauri AB",
                    orbitalPeriod: "547,000 years",
                    composition: [
                        "Hydrogen (76%)",
                        "Helium (23%)",
                        "Other elements (1%)",
                    ],
                    temperature: "3,042 K (surface)",
                },
                images: [],
                position: new THREE.Vector3(150, 0, 0),
                scale: 1.2,
                material: {
                    color: "#FF6B47",
                    emissive: "#FF4500",
                },
                orbitRadius: 150,
                orbitSpeed: 0.001,
            },

            // Proxima Centauri b (potentially habitable exoplanet)
            {
                id: "proxima-b",
                name: "Proxima Centauri b",
                type: "planet",
                description:
                    "A potentially habitable rocky exoplanet in the habitable zone of Proxima Centauri",
                keyFacts: {
                    diameter: "~14,700 km (estimated)",
                    distanceFromSun: "0.05 AU from Proxima Centauri",
                    orbitalPeriod: "11.2 days",
                    composition: [
                        "Rocky composition (estimated)",
                        "Possible atmosphere",
                        "Unknown surface conditions",
                    ],
                    temperature: "-39°C to +30°C (estimated range)",
                    moons: 0,
                },
                images: [],
                position: new THREE.Vector3(152, 0, 0),
                scale: 1.1,
                material: {
                    color: "#8B7355",
                    roughness: 0.8,
                    metalness: 0.2,
                    atmosphereColor: "#87CEEB",
                },
                orbitRadius: 2,
                orbitSpeed: 0.2,
            },

            // Proxima Centauri c (outer exoplanet)
            {
                id: "proxima-c",
                name: "Proxima Centauri c",
                type: "planet",
                description:
                    "A cold super-Earth or mini-Neptune in the outer system of Proxima Centauri",
                keyFacts: {
                    diameter: "~20,000 km (estimated)",
                    distanceFromSun: "1.5 AU from Proxima Centauri",
                    orbitalPeriod: "5.2 years",
                    composition: [
                        "Rocky/icy core (estimated)",
                        "Possible thick atmosphere",
                        "Cold surface conditions",
                    ],
                    temperature: "-234°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: new THREE.Vector3(155, 0, 0),
                scale: 1.4,
                material: {
                    color: "#4A5D7A",
                    roughness: 0.3,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.9,
                },
                orbitRadius: 5,
                orbitSpeed: 0.05,
            },
        ],

        metadata: {
            discoveredBy: "Various astronomers",
            discoveryDate: "1915 (system), 2016 (Proxima b)",
            distance: "4.37 light-years",
            constellation: "Centaurus",
            spectralClass: "G2V + K1V + M5.5Ve",
            habitableZone: {
                inner: 1.2,
                outer: 2.1,
            },
        },
    };
}

/**
 * Kepler Exoplanet Systems Plugin
 * Adds famous exoplanet discoveries from the Kepler mission
 */
export const keplerSystemsPlugin: GamePlugin = {
    id: "kepler-systems",
    name: "Kepler Exoplanet Systems",
    version: "1.0.0",
    description:
        "Explore famous exoplanet systems discovered by the Kepler Space Telescope",
    author: "Andromeda Team",

    async initialize(context: PluginContext) {
        context.logger.info("Initializing Kepler Systems plugin");
    },

    async cleanup() {
        console.log("Kepler systems plugin cleaned up");
    },

    systems: [createKepler442System(), createKepler438System()],

    features: [
        {
            id: "transit-animation",
            name: "Exoplanet Transit Animation",
            type: "3d-effect",
            configuration: {
                showLightCurves: true,
                animateTransits: true,
            },
        },
    ],

    dependencies: [],
    compatibleVersions: ["1.0.0"],
};

function createKepler442System(): StarSystemData {
    return {
        id: "kepler-442",
        name: "Kepler-442 System",
        description:
            "A star system containing potentially habitable super-Earth exoplanets",
        systemType: "solar",
        systemScale: 1.0,
        systemCenter: new THREE.Vector3(0, 0, 0),

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
            position: new THREE.Vector3(0, 0, 0),
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
                position: new THREE.Vector3(8, 0, 0),
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
    };
}

function createKepler438System(): StarSystemData {
    return {
        id: "kepler-438",
        name: "Kepler-438 System",
        description:
            "Another potentially habitable exoplanet system discovered by Kepler",
        systemType: "solar",
        systemScale: 1.0,
        systemCenter: new THREE.Vector3(0, 0, 0),

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
            position: new THREE.Vector3(0, 0, 0),
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
                position: new THREE.Vector3(6, 0, 0),
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
    };
}
