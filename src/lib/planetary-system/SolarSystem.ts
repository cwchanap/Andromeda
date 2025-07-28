// Solar System - converting existing data to new format
import { solarSystemData } from "../../data/celestialBodies";
import type { PlanetarySystem } from "./types";

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

    systemData: {
        id: "solar",
        name: "Solar System",
        description: "Our home solar system with the Sun and eight planets",
        systemType: "solar",
        systemScale: solarSystemData.systemScale,
        systemCenter: solarSystemData.systemCenter,

        // Convert sun data
        star: solarSystemData.sun,

        // Convert planets data
        celestialBodies: solarSystemData.planets,

        metadata: {
            discoveredBy: "Ancient civilizations",
            discoveryDate: "Prehistoric",
            distance: "0 light-years",
            constellation: "N/A",
            spectralClass: "G2V",
        },
    },

    async initialize() {
        console.log("Solar System plugin initialized");
    },

    async cleanup() {
        console.log("Solar System plugin cleaned up");
    },
};
