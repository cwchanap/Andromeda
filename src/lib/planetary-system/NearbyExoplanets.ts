// Nearby exoplanet systems - additional interesting nearby planetary systems
import type { PlanetarySystem } from "./types";

/**
 * TRAPPIST-1 System
 * A famous ultra-cool dwarf star system with seven Earth-sized planets
 */
export const trappist1System: PlanetarySystem = {
    id: "trappist-1",
    name: "TRAPPIST-1 System",
    version: "1.0.0",
    description:
        "A remarkable system of seven Earth-sized planets orbiting an ultra-cool dwarf star, with several in the habitable zone",
    author: "Andromeda Team",

    systemData: {
        id: "trappist-1",
        name: "TRAPPIST-1 System",
        description:
            "A remarkable system of seven Earth-sized planets orbiting an ultra-cool dwarf star, with several in the habitable zone",
        systemType: "solar",
        systemScale: 0.8,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "trappist-1",
            name: "TRAPPIST-1",
            type: "star",
            description:
                "An ultra-cool red dwarf star, much smaller and cooler than our Sun",
            keyFacts: {
                diameter: "124,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (76%)",
                    "Helium (23%)",
                    "Other elements (1%)",
                ],
                temperature: "2,566 K (surface)",
            },
            images: [
                "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=800&h=600&fit=crop",
            ],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.5,
            material: {
                color: "#CC4125",
                emissive: "#B22222",
            },
        },

        celestialBodies: [
            {
                id: "trappist-1b",
                name: "TRAPPIST-1b",
                type: "planet",
                description:
                    "The innermost planet, likely tidally locked with extreme temperatures",
                keyFacts: {
                    diameter: "~13,400 km",
                    distanceFromSun: "0.01111 AU",
                    orbitalPeriod: "1.51 days",
                    composition: ["Rocky", "No atmosphere (likely)"],
                    temperature: "~400°C (day side)",
                    moons: 0,
                },
                images: [],
                position: { x: 2, y: 0, z: 0 },
                scale: 1.05,
                material: {
                    color: "#8B3A3A",
                    roughness: 0.9,
                    metalness: 0.1,
                },
                orbitRadius: 2,
                orbitSpeed: 0.25,
            },
            {
                id: "trappist-1c",
                name: "TRAPPIST-1c",
                type: "planet",
                description:
                    "The second planet, also very hot and likely without atmosphere",
                keyFacts: {
                    diameter: "~13,300 km",
                    distanceFromSun: "0.01521 AU",
                    orbitalPeriod: "2.42 days",
                    composition: ["Rocky", "No atmosphere (likely)"],
                    temperature: "~340°C (day side)",
                    moons: 0,
                },
                images: [],
                position: { x: 2.8, y: 0, z: 0 },
                scale: 1.04,
                material: {
                    color: "#A0522D",
                    roughness: 0.9,
                    metalness: 0.1,
                },
                orbitRadius: 2.8,
                orbitSpeed: 0.18,
            },
            {
                id: "trappist-1d",
                name: "TRAPPIST-1d",
                type: "planet",
                description:
                    "The third planet, on the inner edge of the habitable zone",
                keyFacts: {
                    diameter: "~9,900 km",
                    distanceFromSun: "0.02144 AU",
                    orbitalPeriod: "4.05 days",
                    composition: ["Rocky", "Possible thin atmosphere"],
                    temperature: "~280°C to -100°C",
                    moons: 0,
                },
                images: [],
                position: { x: 3.8, y: 0, z: 0 },
                scale: 0.78,
                material: {
                    color: "#CD853F",
                    roughness: 0.7,
                    metalness: 0.2,
                },
                orbitRadius: 3.8,
                orbitSpeed: 0.12,
            },
            {
                id: "trappist-1e",
                name: "TRAPPIST-1e",
                type: "planet",
                description:
                    "The fourth planet, in the heart of the habitable zone - most likely to have liquid water",
                keyFacts: {
                    diameter: "~11,800 km",
                    distanceFromSun: "0.02817 AU",
                    orbitalPeriod: "6.10 days",
                    composition: ["Rocky", "Possible atmosphere and water"],
                    temperature: "~15°C to -65°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 4.8, y: 0, z: 0 },
                scale: 0.92,
                material: {
                    color: "#4682B4",
                    roughness: 0.5,
                    metalness: 0.1,
                    atmosphereColor: "#87CEEB",
                },
                orbitRadius: 4.8,
                orbitSpeed: 0.09,
            },
            {
                id: "trappist-1f",
                name: "TRAPPIST-1f",
                type: "planet",
                description:
                    "The fifth planet, also in the habitable zone with potential for water",
                keyFacts: {
                    diameter: "~13,000 km",
                    distanceFromSun: "0.03707 AU",
                    orbitalPeriod: "9.21 days",
                    composition: ["Rocky", "Possible atmosphere and water"],
                    temperature: "~0°C to -80°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 5.9, y: 0, z: 0 },
                scale: 1.02,
                material: {
                    color: "#6495ED",
                    roughness: 0.6,
                    metalness: 0.1,
                    atmosphereColor: "#B0E0E6",
                },
                orbitRadius: 5.9,
                orbitSpeed: 0.07,
            },
            {
                id: "trappist-1g",
                name: "TRAPPIST-1g",
                type: "planet",
                description:
                    "The sixth planet, on the outer edge of the habitable zone",
                keyFacts: {
                    diameter: "~14,100 km",
                    distanceFromSun: "0.04683 AU",
                    orbitalPeriod: "12.35 days",
                    composition: ["Rocky", "Possible thick atmosphere"],
                    temperature: "~-25°C to -95°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 7.2, y: 0, z: 0 },
                scale: 1.11,
                material: {
                    color: "#708090",
                    roughness: 0.7,
                    metalness: 0.1,
                    atmosphereColor: "#C0C0C0",
                },
                orbitRadius: 7.2,
                orbitSpeed: 0.05,
            },
            {
                id: "trappist-1h",
                name: "TRAPPIST-1h",
                type: "planet",
                description: "The outermost planet, cold and possibly icy",
                keyFacts: {
                    diameter: "~9,600 km",
                    distanceFromSun: "0.06193 AU",
                    orbitalPeriod: "18.77 days",
                    composition: ["Rocky/icy", "Possible ice caps"],
                    temperature: "~-55°C to -115°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 8.8, y: 0, z: 0 },
                scale: 0.75,
                material: {
                    color: "#B0C4DE",
                    roughness: 0.4,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.9,
                },
                orbitRadius: 8.8,
                orbitSpeed: 0.04,
            },
        ],

        metadata: {
            discoveredBy: "TRAPPIST telescope & Spitzer Space Telescope",
            discoveryDate: "2015-2017",
            distance: "40.7 light-years",
            constellation: "Aquarius",
            spectralClass: "M8V",
            habitableZone: {
                inner: 0.025,
                outer: 0.055,
            },
        },

        backgroundStars: {
            enabled: true,
            density: 1.5,
            seed: 1701,
            animationSpeed: 0.7,
            minRadius: 2500,
            maxRadius: 6200,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("TRAPPIST-1 System plugin initialized");
    },

    async cleanup() {
        console.log("TRAPPIST-1 System plugin cleaned up");
    },
};

/**
 * Wolf 359 System
 * A nearby red dwarf star with recently discovered planets
 */
export const wolf359System: PlanetarySystem = {
    id: "wolf-359",
    name: "Wolf 359 System",
    version: "1.0.0",
    description:
        "One of the nearest star systems to Earth, a red dwarf with recently discovered planetary companions",
    author: "Andromeda Team",

    systemData: {
        id: "wolf-359",
        name: "Wolf 359 System",
        description:
            "One of the nearest star systems to Earth, a red dwarf with recently discovered planetary companions",
        systemType: "solar",
        systemScale: 0.9,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "wolf-359",
            name: "Wolf 359",
            type: "star",
            description:
                "A nearby red dwarf star, one of the faintest known stars",
            keyFacts: {
                diameter: "217,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (76%)",
                    "Helium (23%)",
                    "Other elements (1%)",
                ],
                temperature: "2,800 K (surface)",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.3,
            material: {
                color: "#CD5C5C",
                emissive: "#A0522D",
            },
        },

        celestialBodies: [
            {
                id: "wolf-359b",
                name: "Wolf 359 b",
                type: "planet",
                description:
                    "A super-Earth exoplanet orbiting very close to its star",
                keyFacts: {
                    diameter: "~18,000 km (estimated)",
                    distanceFromSun: "0.018 AU",
                    orbitalPeriod: "2.69 days",
                    composition: ["Rocky/metallic", "No atmosphere (likely)"],
                    temperature: "~300°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 3.5, y: 0, z: 0 },
                scale: 1.4,
                material: {
                    color: "#8B4513",
                    roughness: 0.9,
                    metalness: 0.3,
                },
                orbitRadius: 3.5,
                orbitSpeed: 0.15,
            },
            {
                id: "wolf-359c",
                name: "Wolf 359 c",
                type: "planet",
                description:
                    "A smaller planet in the outer regions of the system",
                keyFacts: {
                    diameter: "~14,000 km (estimated)",
                    distanceFromSun: "0.045 AU",
                    orbitalPeriod: "7.86 days",
                    composition: ["Rocky", "Possible thin atmosphere"],
                    temperature: "~150°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 6.2, y: 0, z: 0 },
                scale: 1.1,
                material: {
                    color: "#A0522D",
                    roughness: 0.8,
                    metalness: 0.2,
                },
                orbitRadius: 6.2,
                orbitSpeed: 0.08,
            },
        ],

        metadata: {
            discoveredBy: "Radial velocity surveys",
            discoveryDate: "2019",
            distance: "7.86 light-years",
            constellation: "Leo",
            spectralClass: "M6V",
        },

        backgroundStars: {
            enabled: true,
            density: 1.1,
            seed: 359,
            animationSpeed: 1.1,
            minRadius: 2200,
            maxRadius: 5400,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("Wolf 359 System plugin initialized");
    },

    async cleanup() {
        console.log("Wolf 359 System plugin cleaned up");
    },
};

/**
 * Barnard's Star System
 * A nearby red dwarf with a super-Earth in its outer regions
 */
export const barnardsStarSystem: PlanetarySystem = {
    id: "barnards-star",
    name: "Barnard's Star System",
    version: "1.0.0",
    description:
        "The closest single star to the Sun, hosting a super-Earth exoplanet in its cold outer regions",
    author: "Andromeda Team",

    systemData: {
        id: "barnards-star",
        name: "Barnard's Star System",
        description:
            "The closest single star to the Sun, hosting a super-Earth exoplanet in its cold outer regions",
        systemType: "solar",
        systemScale: 1.1,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "barnards-star",
            name: "Barnard's Star",
            type: "star",
            description:
                "An ancient red dwarf star with the highest known proper motion",
            keyFacts: {
                diameter: "254,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (75%)",
                    "Helium (24%)",
                    "Other elements (1%)",
                ],
                temperature: "3,134 K (surface)",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.4,
            material: {
                color: "#DC143C",
                emissive: "#B22222",
            },
        },

        celestialBodies: [
            {
                id: "barnards-star-b",
                name: "Barnard's Star b",
                type: "planet",
                description:
                    "A cold super-Earth exoplanet beyond the snow line of its star",
                keyFacts: {
                    diameter: "~19,000 km (estimated)",
                    distanceFromSun: "0.404 AU",
                    orbitalPeriod: "233 days",
                    composition: ["Rocky/icy", "Possible ice surface"],
                    temperature: "-170°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 12, y: 0, z: 0 },
                scale: 1.5,
                material: {
                    color: "#4682B4",
                    roughness: 0.3,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.9,
                },
                orbitRadius: 12,
                orbitSpeed: 0.02,
            },
        ],

        metadata: {
            discoveredBy: "European Southern Observatory",
            discoveryDate: "2018",
            distance: "5.96 light-years",
            constellation: "Ophiuchus",
            spectralClass: "M4V",
        },

        backgroundStars: {
            enabled: true,
            density: 1.0,
            seed: 1916,
            animationSpeed: 1.3,
            minRadius: 2100,
            maxRadius: 5200,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("Barnard's Star System plugin initialized");
    },

    async cleanup() {
        console.log("Barnard's Star System plugin cleaned up");
    },
};

/**
 * Ross 128 System
 * A nearby red dwarf with a potentially habitable planet
 */
export const ross128System: PlanetarySystem = {
    id: "ross-128",
    name: "Ross 128 System",
    version: "1.0.0",
    description:
        "A quiet red dwarf star system with a potentially habitable Earth-sized exoplanet",
    author: "Andromeda Team",

    systemData: {
        id: "ross-128",
        name: "Ross 128 System",
        description:
            "A quiet red dwarf star system with a potentially habitable Earth-sized exoplanet",
        systemType: "solar",
        systemScale: 0.95,
        systemCenter: { x: 0, y: 0, z: 0 },

        star: {
            id: "ross-128",
            name: "Ross 128",
            type: "star",
            description: "A quiet red dwarf star with minimal flare activity",
            keyFacts: {
                diameter: "270,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (75%)",
                    "Helium (24%)",
                    "Other elements (1%)",
                ],
                temperature: "3,192 K (surface)",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.5,
            material: {
                color: "#FF6347",
                emissive: "#CD5C5C",
            },
        },

        celestialBodies: [
            {
                id: "ross-128b",
                name: "Ross 128 b",
                type: "planet",
                description:
                    "A potentially habitable Earth-sized exoplanet with temperate conditions",
                keyFacts: {
                    diameter: "~14,200 km",
                    distanceFromSun: "0.049 AU",
                    orbitalPeriod: "9.9 days",
                    composition: ["Rocky", "Possible atmosphere"],
                    temperature: "-60°C to +20°C (estimated)",
                    moons: 0,
                },
                images: [],
                position: { x: 7, y: 0, z: 0 },
                scale: 1.12,
                material: {
                    color: "#228B22",
                    roughness: 0.6,
                    metalness: 0.1,
                    atmosphereColor: "#87CEEB",
                },
                orbitRadius: 7,
                orbitSpeed: 0.06,
            },
        ],

        metadata: {
            discoveredBy: "European Southern Observatory",
            discoveryDate: "2017",
            distance: "11.03 light-years",
            constellation: "Virgo",
            spectralClass: "M4V",
            habitableZone: {
                inner: 0.04,
                outer: 0.08,
            },
        },

        backgroundStars: {
            enabled: true,
            density: 1.2,
            seed: 128,
            animationSpeed: 0.9,
            minRadius: 2300,
            maxRadius: 5600,
            colorVariation: true,
        },
    },

    async initialize() {
        console.log("Ross 128 System plugin initialized");
    },

    async cleanup() {
        console.log("Ross 128 System plugin cleaned up");
    },
};
