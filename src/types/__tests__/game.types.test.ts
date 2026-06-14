import { describe, it, expectTypeOf } from "vitest";
import type { CelestialBodyData } from "@/types/game";

const VALID_BODY: CelestialBodyData = {
    id: "test-id",
    name: "Test Body",
    type: "planet",
    description: "Test description",
    keyFacts: {
        diameter: "100 km",
        orbitalPeriod: "1.0 days",
        composition: ["iron", "silicate"],
        temperature: "20°C",
    },
    images: [],
    position: { x: 0, y: 0, z: 0 } as never,
    scale: 1,
    material: {
        color: "#8B7355",
        roughness: 0.7,
        metalness: 0.2,
    },
};

describe("CelestialBodyData type", () => {
    it("accepts brown-dwarf type", () => {
        const b: CelestialBodyData = { ...VALID_BODY, type: "brown-dwarf" };
        expectTypeOf(b.type).toEqualTypeOf<CelestialBodyData["type"]>();
    });
    it("accepts optional status field", () => {
        const b: CelestialBodyData = {
            ...VALID_BODY,
            status: "controversial",
        };
        expectTypeOf(b.status).toEqualTypeOf<
            "confirmed" | "candidate" | "controversial" | undefined
        >();
    });
    it("accepts optional equilibriumTemperature", () => {
        const b: CelestialBodyData = {
            ...VALID_BODY,
            keyFacts: {
                ...VALID_BODY.keyFacts,
                equilibriumTemperature: "310 K (equilibrium)",
            },
        };
        expectTypeOf(b.keyFacts.equilibriumTemperature).toEqualTypeOf<
            string | undefined
        >();
    });
});
