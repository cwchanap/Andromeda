import { describe, it, expect } from "vitest";
import { validateSystems } from "@/lib/planetary-system/derive/validateSystems";
import type { PlanetarySystem } from "@/lib/planetary-system/types";
import type { CelestialBodyData, OrbitalElementsData } from "@/types/game";

const V = { x: 0, y: 0, z: 0 } as never;

function body(
    id: string,
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData {
    return {
        id,
        name: id,
        type: "planet",
        status: "confirmed",
        description: "",
        keyFacts: {
            diameter: "10000 km",
            orbitalPeriod: "365 days",
            composition: [],
            temperature: "288 K",
        },
        images: [],
        position: V,
        scale: 1,
        material: { color: "#fff" },
        ...overrides,
    };
}

function system(
    id: string,
    overrides: Partial<PlanetarySystem["systemData"]> = {},
): PlanetarySystem {
    const star = body(`${id}-star`, { type: "star", status: undefined });
    return {
        id,
        name: id,
        version: "1",
        description: "",
        systemData: {
            id,
            name: id,
            description: "",
            star,
            celestialBodies: [],
            systemScale: 1,
            systemCenter: V,
            systemType: "solar",
            metadata: { knownExoplanetCount: 0 },
            ...overrides,
        },
    };
}

describe("validateSystems", () => {
    it("returns no issues for a fully valid system", () => {
        const issues = validateSystems([system("solo")]);
        expect(issues).toHaveLength(0);
    });

    it("warns when knownExoplanetCount mismatches actual known bodies", () => {
        const sys = system("ac", {
            metadata: { knownExoplanetCount: 3 },
            celestialBodies: [
                body("p1", { status: "confirmed" }),
                body("p2", { status: "confirmed" }),
            ],
        });
        const issues = validateSystems([sys]);
        const mismatch = issues.find((i) =>
            i.message.includes("knownExoplanetCount"),
        );
        expect(mismatch).toBeDefined();
        expect(mismatch!.level).toBe("warn");
        // Declared 3, found 2 known (non-candidate)
        expect(mismatch!.message).toContain("knownExoplanetCount=3");
        expect(mismatch!.message).toContain("found 2");
    });

    it("does not warn when count matches known (non-candidate) non-star bodies", () => {
        const sys = system("ac", {
            metadata: { knownExoplanetCount: 2 },
            celestialBodies: [
                body("p1", { status: "confirmed" }),
                body("p2", { status: "confirmed" }),
                // candidate must NOT be counted
                body("p3", { status: "candidate" }),
            ],
        });
        const issues = validateSystems([sys]);
        expect(
            issues.find((i) => i.message.includes("knownExoplanetCount")),
        ).toBeUndefined();
    });

    it("counts controversial bodies as known (regression: HD 219134)", () => {
        // HD 219134 has 4 confirmed + 2 controversial planets; the CSV
        // known count is 6. Controversial bodies must count as known so the
        // validator does not emit a spurious warning on correct data.
        const sys = system("hd", {
            metadata: { knownExoplanetCount: 6 },
            celestialBodies: [
                body("b", { status: "confirmed" }),
                body("c", { status: "confirmed" }),
                body("d", { status: "confirmed" }),
                body("h", { status: "confirmed" }),
                body("f", { status: "controversial" }),
                body("g", { status: "controversial" }),
            ],
        });
        const issues = validateSystems([sys]);
        expect(
            issues.find((i) => i.message.includes("knownExoplanetCount")),
        ).toBeUndefined();
    });

    it("errors on duplicate system id", () => {
        const issues = validateSystems([system("dup"), system("dup")]);
        const dup = issues.find((i) => i.level === "error");
        expect(dup).toBeDefined();
        expect(dup!.message).toContain("Duplicate system id");
    });

    it("errors when a system has no star", () => {
        const issues = validateSystems([
            system("nostar", { star: undefined as never }),
        ]);
        const noStar = issues.find((i) => i.message.includes("has no star"));
        expect(noStar).toBeDefined();
        expect(noStar!.level).toBe("error");
    });

    it("errors when orbit.centerId references a non-existent id", () => {
        const orbit: OrbitalElementsData = {
            centerId: "ghost",
            semiMajorAxis: 1,
        };
        const sys = system("s", {
            celestialBodies: [body("planet", { orbit })],
        });
        const issues = validateSystems([sys]);
        const dangling = issues.find((i) =>
            i.message.includes("non-existent id"),
        );
        expect(dangling).toBeDefined();
        expect(dangling!.level).toBe("error");
    });

    it("errors when orbit.centerId is an empty string", () => {
        const orbit: OrbitalElementsData = {
            centerId: "",
            semiMajorAxis: 1,
        };
        const sys = system("s", {
            celestialBodies: [body("planet", { orbit })],
        });
        const issues = validateSystems([sys]);
        const empty = issues.find((i) =>
            i.message.includes("empty or whitespace-only centerId"),
        );
        expect(empty).toBeDefined();
        expect(empty!.level).toBe("error");
    });

    it("errors when orbit.centerId is whitespace-only", () => {
        const orbit: OrbitalElementsData = {
            centerId: "   ",
            semiMajorAxis: 1,
        };
        const sys = system("s", {
            celestialBodies: [body("planet", { orbit })],
        });
        const issues = validateSystems([sys]);
        const ws = issues.find((i) =>
            i.message.includes("empty or whitespace-only centerId"),
        );
        expect(ws).toBeDefined();
        expect(ws!.level).toBe("error");
    });

    it("does not error when a body has no orbit at all", () => {
        const sys = system("s", {
            celestialBodies: [body("planet", { orbit: undefined })],
        });
        const issues = validateSystems([sys]);
        expect(
            issues.find((i) => i.message.includes("centerId")),
        ).toBeUndefined();
    });

    it("errors when two celestial bodies share the same id", () => {
        const sys = system("dup-body", {
            celestialBodies: [body("same"), body("same")],
        });
        const issues = validateSystems([sys]);
        const dup = issues.find((i) =>
            i.message.includes('Duplicate body id "same"'),
        );
        expect(dup).toBeDefined();
        expect(dup!.level).toBe("error");
    });

    it("errors when a body id collides with the star id", () => {
        const sys = system("dup-star", {
            star: body("collision", { type: "star" }),
            celestialBodies: [body("collision")],
        });
        const issues = validateSystems([sys]);
        const dup = issues.find((i) => i.message.includes("Duplicate"));
        expect(dup).toBeDefined();
        expect(dup!.level).toBe("error");
    });

    it("errors when an orbit anchor id collides with a body id", () => {
        const sys = system("dup-anchor", {
            celestialBodies: [body("bary")],
            orbitAnchors: [
                {
                    id: "bary",
                    name: "Bary",
                    type: "barycenter",
                },
            ],
        });
        const issues = validateSystems([sys]);
        const dup = issues.find((i) =>
            i.message.includes('Duplicate anchor id "bary"'),
        );
        expect(dup).toBeDefined();
        expect(dup!.level).toBe("error");
    });

    it("warns when a body is missing diameter or temperature", () => {
        const sys = system("s", {
            celestialBodies: [
                body("p", {
                    keyFacts: {
                        diameter: "",
                        orbitalPeriod: "1 day",
                        composition: [],
                        temperature: "",
                    },
                }),
            ],
        });
        const issues = validateSystems([sys]);
        expect(
            issues.find((i) => i.message.includes("missing diameter")),
        ).toBeDefined();
        expect(
            issues.find((i) => i.message.includes("missing temperature")),
        ).toBeDefined();
    });
});
