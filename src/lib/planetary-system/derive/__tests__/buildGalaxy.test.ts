import { describe, it, expect } from "vitest";
import {
    radialToCartesian,
    galaxyVisual,
    BV_INDEX,
} from "@/lib/planetary-system/derive/buildGalaxy";

describe("radialToCartesian", () => {
    it("origin (d=0) is the zero vector", () => {
        const v = radialToCartesian(0, 0, 0);
        expect(v.x).toBeCloseTo(0);
        expect(v.y).toBeCloseTo(0);
        expect(v.z).toBeCloseTo(0);
    });
    it("known case: d=10, dec=0, ra=0 -> (+10, 0, 0)", () => {
        const v = radialToCartesian(10, 0, 0);
        expect(v.x).toBeCloseTo(10);
        expect(v.z).toBeCloseTo(0);
        expect(v.y).toBeCloseTo(0);
    });
    it("dec=90 points along +y axis", () => {
        const v = radialToCartesian(10, 0, 90);
        expect(v.y).toBeCloseTo(10);
        expect(v.x).toBeCloseTo(0);
        expect(v.z).toBeCloseTo(0);
    });
    it("ra=90 with dec=0 points along +z axis", () => {
        const v = radialToCartesian(10, 90, 0);
        expect(v.z).toBeCloseTo(10);
        expect(v.x).toBeCloseTo(0);
        expect(v.y).toBeCloseTo(0);
    });
});

describe("galaxyVisual", () => {
    it("Solar brightness is max, far systems dimmer", () => {
        expect(galaxyVisual(0).brightness).toBeGreaterThan(
            galaxyVisual(20).brightness,
        );
    });
    it("peaks at 2.0 for distance 0", () => {
        expect(galaxyVisual(0).brightness).toBeCloseTo(2.0);
    });
    it("floors at 0.15 for very distant systems", () => {
        expect(galaxyVisual(1000).brightness).toBeCloseTo(0.15);
    });
    it("is monotonically decreasing", () => {
        expect(galaxyVisual(1).brightness).toBeGreaterThan(
            galaxyVisual(5).brightness,
        );
        expect(galaxyVisual(5).brightness).toBeGreaterThan(
            galaxyVisual(30).brightness,
        );
    });
});

describe("BV_INDEX", () => {
    it("maps all seven main spectral classes", () => {
        const keys = Object.keys(BV_INDEX).sort();
        expect(keys).toEqual(["A", "B", "F", "G", "K", "M", "O"]);
    });
    it("is monotonically increasing O -> M", () => {
        const seq = [
            BV_INDEX.O,
            BV_INDEX.B,
            BV_INDEX.A,
            BV_INDEX.F,
            BV_INDEX.G,
            BV_INDEX.K,
            BV_INDEX.M,
        ];
        for (let i = 1; i < seq.length; i++) {
            expect(seq[i]).toBeGreaterThan(seq[i - 1]);
        }
    });
});
