import type { StarSystemData, GalaxyData } from "./types";

/**
 * Local galaxy data containing nearby star systems
 * Distances and positions based on real astronomical data
 * Scale: 1 unit = 1 light-year for galaxy view
 */

// Our Solar System
const solarSystem: StarSystemData = {
    id: "solar-system",
    name: "Solar System",
    description: "Our home star system containing the Sun and eight planets",
    systemType: "solar",
    position: { x: 0, y: 0, z: 0 }, // Origin point
    distanceFromEarth: 0,
    stars: [
        {
            id: "sun",
            name: "Sun",
            type: "star",
            description: "Our home star, a G-type main-sequence star",
            keyFacts: {
                diameter: "1,392,700 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "5,778 K (surface)",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 0, y: 0, z: 0 },
            scale: 3.0,
            material: {
                color: "#FDB813",
                emissive: "#FF8C00",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
    ],
    metadata: {
        constellation: "N/A",
        spectralClass: "G2V",
        hasExoplanets: false,
        numberOfPlanets: 8,
        habitableZone: true,
    },
    visual: {
        brightness: 1.0,
        colorIndex: 0.63, // Sun's B-V color index
        scale: 3.0,
        glowIntensity: 1.2,
    },
};

// Alpha Centauri System (closest to Earth)
const alphaCentauriSystem: StarSystemData = {
    id: "alpha-centauri",
    name: "Alpha Centauri",
    description: "The closest star system to Earth, a triple star system",
    systemType: "trinary",
    position: { x: 4.37, y: -1.2, z: 0.8 }, // 4.37 ly from Earth
    distanceFromEarth: 4.37,
    stars: [
        {
            id: "alpha-centauri-a",
            name: "Alpha Centauri A",
            type: "star",
            description: "A G-type main-sequence star similar to our Sun",
            keyFacts: {
                diameter: "1,713,400 km",
                distanceFromSun: "4.37 light-years",
                orbitalPeriod: "79.91 years (binary orbit)",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "5,790 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: -0.5, y: 0, z: 0 },
            scale: 3.1,
            material: {
                color: "#FDB813",
                emissive: "#FF8C00",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
        {
            id: "alpha-centauri-b",
            name: "Alpha Centauri B",
            type: "star",
            description:
                "A K-type main-sequence star, smaller and cooler than Alpha Centauri A",
            keyFacts: {
                diameter: "1,209,600 km",
                distanceFromSun: "4.37 light-years",
                orbitalPeriod: "79.91 years (binary orbit)",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "5,260 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 0.5, y: 0, z: 0 },
            scale: 2.4,
            material: {
                color: "#FFB84D",
                emissive: "#FF6B35",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
        {
            id: "proxima-centauri",
            name: "Proxima Centauri",
            type: "star",
            description: "A red dwarf star and the closest star to Earth",
            keyFacts: {
                diameter: "214,000 km",
                distanceFromSun: "4.24 light-years",
                orbitalPeriod: "547,000 years (around AB pair)",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "3,042 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 2.5, y: -1.5, z: 0.3 },
            scale: 1.2,
            material: {
                color: "#FF6B6B",
                emissive: "#FF4444",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
    ],
    metadata: {
        constellation: "Centaurus",
        spectralClass: "G2V + K1V + M5.5Ve",
        discoveredBy: "Nicolas Louis de Lacaille",
        discoveryDate: "1751",
        hasExoplanets: true,
        numberOfPlanets: 3,
        habitableZone: true,
    },
    visual: {
        brightness: 0.85,
        colorIndex: 0.71,
        scale: 2.5,
        glowIntensity: 1.0,
    },
};

// Barnard's Star
const barnardsStarSystem: StarSystemData = {
    id: "barnards-star",
    name: "Barnard's Star",
    description: "A red dwarf star with the highest known proper motion",
    systemType: "solar",
    position: { x: -2.1, y: 5.8, z: -1.2 }, // 5.96 ly from Earth
    distanceFromEarth: 5.96,
    stars: [
        {
            id: "barnards-star",
            name: "Barnard's Star",
            type: "star",
            description: "A red dwarf star with high proper motion",
            keyFacts: {
                diameter: "196,000 km",
                distanceFromSun: "5.96 light-years",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "3,134 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.3,
            material: {
                color: "#FF5555",
                emissive: "#FF3333",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
    ],
    metadata: {
        constellation: "Ophiuchus",
        spectralClass: "M4.0Ve",
        discoveredBy: "Edward Emerson Barnard",
        discoveryDate: "1916",
        hasExoplanets: true,
        numberOfPlanets: 1,
        habitableZone: false,
    },
    visual: {
        brightness: 0.3,
        colorIndex: 1.74,
        scale: 1.3,
        glowIntensity: 0.8,
    },
};

// Wolf 359
const wolf359System: StarSystemData = {
    id: "wolf-359",
    name: "Wolf 359",
    description:
        "A red dwarf star known for its high proper motion and flare activity",
    systemType: "solar",
    position: { x: 6.2, y: 2.8, z: -3.1 }, // 7.86 ly from Earth
    distanceFromEarth: 7.86,
    stars: [
        {
            id: "wolf-359",
            name: "Wolf 359",
            type: "star",
            description: "A red dwarf flare star",
            keyFacts: {
                diameter: "222,000 km",
                distanceFromSun: "7.86 light-years",
                orbitalPeriod: "N/A",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "2,800 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 0, y: 0, z: 0 },
            scale: 1.4,
            material: {
                color: "#FF4444",
                emissive: "#FF2222",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
    ],
    metadata: {
        constellation: "Leo",
        spectralClass: "M6.0V",
        discoveredBy: "Max Wolf",
        discoveryDate: "1918",
        hasExoplanets: false,
        numberOfPlanets: 0,
        habitableZone: false,
    },
    visual: {
        brightness: 0.2,
        colorIndex: 2.0,
        scale: 1.4,
        glowIntensity: 0.9,
    },
};

// Sirius System (binary)
const siriusSystem: StarSystemData = {
    id: "sirius",
    name: "Sirius",
    description:
        "The brightest star in Earth's night sky, a binary star system",
    systemType: "binary",
    position: { x: -7.8, y: -3.2, z: 2.1 }, // 8.66 ly from Earth
    distanceFromEarth: 8.66,
    stars: [
        {
            id: "sirius-a",
            name: "Sirius A",
            type: "star",
            description:
                "A main-sequence star, the brightest star in Earth's night sky",
            keyFacts: {
                diameter: "2,380,000 km",
                distanceFromSun: "8.66 light-years",
                orbitalPeriod: "50.09 years (binary orbit)",
                composition: [
                    "Hydrogen (73%)",
                    "Helium (25%)",
                    "Other elements (2%)",
                ],
                temperature: "9,940 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: -0.3, y: 0, z: 0 },
            scale: 4.2,
            material: {
                color: "#9BB0FF",
                emissive: "#6699FF",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
        {
            id: "sirius-b",
            name: "Sirius B",
            type: "star",
            description: "A white dwarf companion star",
            keyFacts: {
                diameter: "11,680 km",
                distanceFromSun: "8.66 light-years",
                orbitalPeriod: "50.09 years (binary orbit)",
                composition: ["Carbon", "Oxygen", "trace elements"],
                temperature: "25,200 K",
            },
            images: [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            ],
            position: { x: 0.8, y: 0, z: 0 },
            scale: 0.8,
            material: {
                color: "#FFFFFF",
                emissive: "#BBBBFF",
                roughness: 1.0,
                metalness: 0.0,
            },
            orbitRadius: 0,
            orbitSpeed: 0,
        },
    ],
    metadata: {
        constellation: "Canis Major",
        spectralClass: "A1V + DA2",
        hasExoplanets: false,
        numberOfPlanets: 0,
        habitableZone: false,
    },
    visual: {
        brightness: 1.8,
        colorIndex: 0.0,
        scale: 3.5,
        glowIntensity: 1.5,
    },
};

/**
 * Local galaxy data containing nearby star systems within ~10 light-years
 */
export const localGalaxyData: GalaxyData = {
    id: "local-galaxy",
    name: "Local Stellar Neighborhood",
    description: "Star systems within 10 light-years of Earth",
    starSystems: [
        solarSystem,
        alphaCentauriSystem,
        barnardsStarSystem,
        wolf359System,
        siriusSystem,
    ],
    center: { x: 0, y: 0, z: 0 }, // Centered on Solar System
    scale: 1.0, // 1 unit = 1 light-year
    boundingRadius: 10, // 10 light-year radius
};
