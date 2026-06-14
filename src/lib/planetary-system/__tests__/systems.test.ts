import { describe, it, expect } from "vitest";
import { starSystems } from "@/lib/planetary-system/systems";

describe("no zero-where-unknown", () => {
    for (const sys of starSystems) {
        const bodies = [sys.systemData.star, ...sys.systemData.celestialBodies];
        for (const b of bodies) {
            it(`${sys.id}/${b.id}: temperature not literal "0"`, () => {
                const t = b.keyFacts.temperature;
                if (t !== undefined) expect(t).not.toBe("0");
            });
            it(`${sys.id}/${b.id}: diameter present`, () => {
                expect(b.keyFacts.diameter).toBeTruthy();
            });
        }
    }
});
