import { describe, it, expect } from "vitest";
import {
    buildAllPlanetarySystems,
    buildLocalGalaxy,
} from "@/lib/planetary-system/derive/buildAll";

describe("buildAllPlanetarySystems", () => {
    const all = buildAllPlanetarySystems();
    it("returns 30 systems", () => expect(all).toHaveLength(30));
    it("ids are unique", () => {
        expect(new Set(all.map((s) => s.id)).size).toBe(30);
    });
    it("alpha-centauri confirmedExoplanetCount is 2", () => {
        const ac = all.find((s) => s.id === "alpha-centauri")!;
        expect(ac.systemData.metadata?.confirmedExoplanetCount).toBe(2);
    });
    it("every system has a star and valid systemType", () => {
        for (const s of all) {
            expect(s.systemData.star.type).toBe("star");
            expect(["solar", "binary", "multiple", "exotic"]).toContain(
                s.systemData.systemType,
            );
        }
    });
});
describe("buildLocalGalaxy", () => {
    it("has 30 star systems, Solar not included", () => {
        expect(buildLocalGalaxy().starSystems).toHaveLength(30);
    });
});
