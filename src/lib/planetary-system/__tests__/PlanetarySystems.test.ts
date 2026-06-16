import { describe, it, expect } from "vitest";
import { planetarySystemRegistry } from "@/lib/planetary-system";
import { starSystems } from "@/lib/planetary-system/systems";
import {
    trappist1System,
    wolf359System,
    kepler442System,
    kepler438System,
} from "@/lib/planetary-system/CuratedSystems";

describe("registry", () => {
    it("has 35 systems (solar + 30 + 4 curated)", () => {
        expect(planetarySystemRegistry.getAllSystems()).toHaveLength(35);
    });
    it("alpha-centauri has 2 known", () => {
        const ac = planetarySystemRegistry.getSystem("alpha-centauri")!;
        expect(ac).toBeDefined();
        expect(ac.systemData.metadata?.knownExoplanetCount).toBe(2);
    });
    it("Proxima c is a candidate and excluded from count", () => {
        const ac = planetarySystemRegistry.getSystem("alpha-centauri")!;
        const c = ac.systemData.celestialBodies.find(
            (b) => b.name.includes("c") && b.name.includes("Proxima"),
        );
        expect(c).toBeDefined();
        expect(c!.status).toBe("candidate");
    });
    it("includes Solar System", () => {
        expect(planetarySystemRegistry.getSystem("solar")).toBeDefined();
    });
    it("includes curated TRAPPIST-1", () => {
        expect(planetarySystemRegistry.getSystem("trappist-1")).toBeDefined();
    });
    it("includes curated Wolf 359", () => {
        expect(planetarySystemRegistry.getSystem("wolf-359")).toBeDefined();
    });
    it("includes curated Kepler-442", () => {
        expect(planetarySystemRegistry.getSystem("kepler-442")).toBeDefined();
    });
    it("includes curated Kepler-438", () => {
        expect(planetarySystemRegistry.getSystem("kepler-438")).toBeDefined();
    });
});

describe("generated starSystems", () => {
    it("has exactly 30 systems", () => {
        expect(starSystems).toHaveLength(30);
    });
    it("every system has a star", () => {
        for (const s of starSystems) {
            expect(s.systemData.star.type).toBe("star");
        }
    });
    it("every known count is >= actual confirmed body count", () => {
        for (const s of starSystems) {
            const confirmedBodies = s.systemData.celestialBodies.filter(
                (b) =>
                    b.type === "planet" &&
                    (!b.status || b.status === "confirmed"),
            ).length;
            expect(
                s.systemData.metadata?.knownExoplanetCount ?? 0,
            ).toBeGreaterThanOrEqual(confirmedBodies);
        }
    });
    it("all ids are unique", () => {
        const ids = starSystems.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe("curated systems", () => {
    it("TRAPPIST-1 has correct id", () => {
        expect(trappist1System.id).toBe("trappist-1");
    });
    it("Wolf 359 has correct id", () => {
        expect(wolf359System.id).toBe("wolf-359");
    });
    it("Kepler-442 has correct id", () => {
        expect(kepler442System.id).toBe("kepler-442");
    });
    it("Kepler-438 has correct id", () => {
        expect(kepler438System.id).toBe("kepler-438");
    });
});
