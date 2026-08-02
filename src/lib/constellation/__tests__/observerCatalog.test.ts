import { describe, expect, it } from "vitest";
import {
    SYNTHETIC_SOL_COLOR,
    SYNTHETIC_SOL_RENDER_MAGNITUDE,
    SYNTHETIC_SOL_STAR_ID,
    isSyntheticSolStar,
    type PreparedSourceStar,
    type SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import { makeStar } from "./observerCatalog.fixtures";

describe("observerCatalog public contract", () => {
    it("uses a value-based synthetic-Sol discriminator", () => {
        const source = makeStar({ id: "source" }) as PreparedSourceStar;
        const sol: SyntheticSolStar = {
            ...makeStar({ id: SYNTHETIC_SOL_STAR_ID, name: "Sol" }),
            id: SYNTHETIC_SOL_STAR_ID,
            magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE,
            color: SYNTHETIC_SOL_COLOR,
            marker: { kind: "synthetic-sol" },
        };

        expect(isSyntheticSolStar(source)).toBe(false);
        expect(isSyntheticSolStar(sol)).toBe(true);
        expect(SYNTHETIC_SOL_STAR_ID).toBe("sol");
    });
});
