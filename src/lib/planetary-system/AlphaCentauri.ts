// Alpha Centauri System - adapted from ExamplePlugins
import type { PlanetarySystem } from "./types";
import * as THREE from "three";

/**
 * Alpha Centauri System
 * Adds the closest star system to our solar system
 */
export const alphaCentauriSystem: PlanetarySystem = {
    id: "alpha-centauri",
    name: "Alpha Centauri System",
    version: "1.0.0",
    description:
        "The closest star system to Earth, featuring a triple star system with potentially habitable exoplanets",
    author: "Andromeda Team",

    systemData: {
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
                parentId: "proxima-centauri", // Orbits Proxima Centauri
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
                parentId: "proxima-centauri", // Orbits Proxima Centauri
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

        // Background stars configuration for Alpha Centauri system
        backgroundStars: {
            enabled: true,
            density: 1.2, // Slightly denser star field for distant system
            seed: 4242, // Alpha Centauri system seed
            animationSpeed: 0.8, // Slightly slower animation
            minRadius: 2200,
            maxRadius: 5500,
            colorVariation: true,
        },
    },

    async initialize() {},

    async cleanup() {},
};
