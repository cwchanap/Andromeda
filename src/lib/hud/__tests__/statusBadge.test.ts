import { describe, it, expect } from "vitest";
import { getStatusBadge, factOrUnknown } from "@/lib/hud/statusBadge";
import type { CelestialBodyData } from "@/types/game";

function makeBody(status?: CelestialBodyData["status"]): CelestialBodyData {
    return {
        id: "x",
        name: "X",
        type: "planet",
        description: "",
        keyFacts: {
            diameter: "",
            orbitalPeriod: "",
            composition: [],
            temperature: "",
        },
        images: [],
        position: null as never,
        scale: 1,
        material: { color: "#fff" },
        status,
    };
}

describe("getStatusBadge", () => {
    it("returns null for confirmed status", () => {
        expect(getStatusBadge(makeBody("confirmed"))).toBeNull();
    });
    it("returns null for missing status", () => {
        expect(getStatusBadge(makeBody(undefined))).toBeNull();
    });
    it("returns candidate badge for candidate", () => {
        const badge = getStatusBadge(makeBody("candidate"));
        expect(badge).not.toBeNull();
        expect(badge!.label).toBe("status.candidate");
        expect(badge!.className).toContain("candidate");
    });
    it("returns controversial badge for controversial", () => {
        const badge = getStatusBadge(makeBody("controversial"));
        expect(badge).not.toBeNull();
        expect(badge!.label).toBe("status.controversial");
    });
});

describe("factOrUnknown", () => {
    it("returns value when present", () => {
        expect(factOrUnknown("123 km", "Unknown")).toBe("123 km");
    });
    it("returns Unknown label when undefined", () => {
        expect(factOrUnknown(undefined, "Unknown")).toBe("Unknown");
    });
});
