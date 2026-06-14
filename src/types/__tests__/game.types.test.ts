import { describe, it, expectTypeOf } from "vitest";
import type { CelestialBodyData } from "@/types/game";

describe("CelestialBodyData type", () => {
    it("accepts brown-dwarf type", () => {
        const b = { type: "brown-dwarf" } as CelestialBodyData;
        expectTypeOf(b.type).toEqualTypeOf<CelestialBodyData["type"]>();
    });
    it("accepts optional status field", () => {
        const b = { status: "controversial" } as Partial<CelestialBodyData>;
        expectTypeOf(b.status).toEqualTypeOf<
            "confirmed" | "candidate" | "controversial" | undefined
        >();
    });
    it("accepts optional equilibriumTemperature", () => {
        const b = {
            keyFacts: { equilibriumTemperature: "310 K (equilibrium)" },
        } as unknown as CelestialBodyData;
        expectTypeOf(b.keyFacts.equilibriumTemperature).toEqualTypeOf<
            string | undefined
        >();
    });
});
