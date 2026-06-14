import { describe, it, expect } from "vitest";
import {
    parseStatus,
    mapBodyType,
} from "@/lib/planetary-system/derive/mapObject";

describe("parseStatus", () => {
    it("planet_candidate object type -> candidate", () => {
        expect(
            parseStatus("candidate/disputed - not counted", "planet_candidate"),
        ).toBe("candidate");
    });
    it("confirmed -> confirmed", () => {
        expect(parseStatus("confirmed", "planet")).toBe("confirmed");
    });
    it("confirmed/controversial -> controversial", () => {
        expect(
            parseStatus("confirmed/controversial in some lists", "planet"),
        ).toBe("controversial");
    });
    it("confirmed (NASA overview); disputed -> controversial", () => {
        expect(
            parseStatus(
                "confirmed (NASA overview); disputed in some lists",
                "planet",
            ),
        ).toBe("controversial");
    });
    it("stellar component (star) -> confirmed", () => {
        expect(parseStatus("stellar component", "star")).toBe("confirmed");
    });
});
describe("mapBodyType", () => {
    it.each([
        ["star", "star"],
        ["planet", "planet"],
        ["planet_candidate", "planet"],
    ])("%s -> %s", (csv, mapped) =>
        expect(mapBodyType(csv as never)).toBe(mapped),
    );
});
