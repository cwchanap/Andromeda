import { describe, it, expectTypeOf } from "vitest";
import type { PlanetarySystemData } from "@/lib/planetary-system/types";
import type { StarSystemData } from "@/types/universe";

describe("PlanetarySystemData.metadata", () => {
    it("has knownExoplanetCount", () => {
        const m = {
            knownExoplanetCount: 2,
        } as NonNullable<PlanetarySystemData["metadata"]>;
        expectTypeOf(m.knownExoplanetCount).toEqualTypeOf<number | undefined>();
    });
});

describe("StarSystemData (universe) metadata", () => {
    it("has knownExoplanetCount", () => {
        const m = {
            knownExoplanetCount: 2,
        } as NonNullable<StarSystemData["metadata"]>;
        expectTypeOf(m.knownExoplanetCount).toEqualTypeOf<number | undefined>();
    });
});
