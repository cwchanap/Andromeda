import { describe, it, expectTypeOf } from "vitest";
import type { PlanetarySystemData } from "@/lib/planetary-system/types";
import type { StarSystemData } from "@/types/universe";

describe("PlanetarySystemData.metadata", () => {
    it("has confirmedExoplanetCount", () => {
        const m = {
            confirmedExoplanetCount: 2,
        } as NonNullable<PlanetarySystemData["metadata"]>;
        expectTypeOf(m.confirmedExoplanetCount).toEqualTypeOf<
            number | undefined
        >();
    });
});

describe("StarSystemData (universe) metadata", () => {
    it("has confirmedExoplanetCount", () => {
        const m = {
            confirmedExoplanetCount: 2,
        } as NonNullable<StarSystemData["metadata"]>;
        expectTypeOf(m.confirmedExoplanetCount).toEqualTypeOf<
            number | undefined
        >();
    });
});
