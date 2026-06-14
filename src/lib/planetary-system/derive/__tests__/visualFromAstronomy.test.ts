import { describe, it, expect } from "vitest";
import {
    spectralColor,
    planetScale,
    starScale,
} from "@/lib/planetary-system/derive/visualFromAstronomy";

describe("spectralColor", () => {
    it.each([
        ["G2V", "#FFF4EA"],
        ["M5.5Ve", "#FFA050"],
        ["K1V", "#FFD2A1"],
        ["A1V", "#CAD7FF"],
        ["O5V", "#9BB0FF"],
    ])("%s -> %s", (cls, hex) => expect(spectralColor(cls)).toBe(hex));
    it("unknown class falls back from temperature", () => {
        expect(spectralColor("unknown", 5790)).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
describe("planetScale", () => {
    it("Earth diameter ~ 1.0", () =>
        expect(planetScale(12742)).toBeCloseTo(1.0, 1));
    it("is monotonic & clamped", () => {
        expect(planetScale(5000)).toBeGreaterThanOrEqual(0.4);
        expect(planetScale(5000)).toBeLessThanOrEqual(planetScale(12742));
        expect(planetScale(200000)).toBeLessThanOrEqual(3.5);
    });
});
describe("starScale", () => {
    it("red dwarf floor >= 1.0", () =>
        expect(starScale(214754)).toBeGreaterThanOrEqual(1.0));
    it("Sun-sized is mid-range", () =>
        expect(starScale(1392700)).toBeGreaterThan(1.0));
});
