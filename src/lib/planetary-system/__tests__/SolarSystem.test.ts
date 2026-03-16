import { describe, it, expect } from "vitest";
import {
    solarSystemData,
    solarSystem,
    validatePlanetarySystemData,
    validateCurrentSolarSystemData,
} from "../SolarSystem";

describe("solarSystemData", () => {
    it("has expected id and name", () => {
        expect(solarSystemData.id).toBe("solar-system");
        expect(solarSystemData.name).toBe("Solar System");
    });

    it("contains a star with id 'sun'", () => {
        expect(solarSystemData.star).toBeDefined();
        expect(solarSystemData.star.id).toBe("sun");
        expect(solarSystemData.star.type).toBe("star");
    });

    it("contains celestial bodies array", () => {
        expect(Array.isArray(solarSystemData.celestialBodies)).toBe(true);
        expect(solarSystemData.celestialBodies.length).toBeGreaterThan(0);
    });

    it("has valid systemScale", () => {
        expect(typeof solarSystemData.systemScale).toBe("number");
        expect(solarSystemData.systemScale).toBeGreaterThan(0);
    });

    it("has systemCenter with x, y, z properties", () => {
        const center = solarSystemData.systemCenter;
        expect(typeof center.x).toBe("number");
        expect(typeof center.y).toBe("number");
        expect(typeof center.z).toBe("number");
    });
});

describe("solarSystem", () => {
    it("has expected id and name", () => {
        expect(solarSystem.id).toBe("solar");
        expect(solarSystem.name).toBe("Solar System");
    });

    it("has systemData referencing solarSystemData", () => {
        expect(solarSystem.systemData).toBe(solarSystemData);
    });
});

describe("validatePlanetarySystemData", () => {
    it("returns true for the real solarSystemData", () => {
        expect(validatePlanetarySystemData(solarSystemData)).toBe(true);
    });

    it("returns false for null input", () => {
        expect(validatePlanetarySystemData(null)).toBe(false);
    });

    it("returns false for non-object input", () => {
        expect(validatePlanetarySystemData("string")).toBe(false);
        expect(validatePlanetarySystemData(42)).toBe(false);
    });

    it("returns false when id is missing", () => {
        const bad = { ...solarSystemData, id: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when name is missing", () => {
        const bad = { ...solarSystemData, name: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when description is missing", () => {
        const bad = { ...solarSystemData, description: undefined } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false for invalid systemType", () => {
        const bad = { ...solarSystemData, systemType: "invalid" } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when systemScale is not a positive number", () => {
        const bad = { ...solarSystemData, systemScale: -1 } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when systemCenter is missing", () => {
        const bad = { ...solarSystemData, systemCenter: null } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });

    it("returns false when celestialBodies is not an array", () => {
        const bad = {
            ...solarSystemData,
            celestialBodies: "not-an-array",
        } as unknown;
        expect(validatePlanetarySystemData(bad)).toBe(false);
    });
});

describe("validateCurrentSolarSystemData", () => {
    it("returns true for the bundled solar system data", () => {
        expect(validateCurrentSolarSystemData()).toBe(true);
    });
});
