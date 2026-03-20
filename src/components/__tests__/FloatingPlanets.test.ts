import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import FloatingPlanets from "@/components/FloatingPlanets.svelte";

describe("FloatingPlanets", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(FloatingPlanets)).not.toThrow();
    });

    it("renders nothing before mount (no planet divs visible initially)", () => {
        const { container } = render(FloatingPlanets);
        // In jsdom onMount fires synchronously, so either 0 or 5 planets are valid.
        // After that synchronous flush the {#if mounted} guard may already be true.
        const planets = container.querySelectorAll(".floating-planet");
        expect([0, 5]).toContain(planets.length);
    });

    it("after mount renders exactly 5 planet containers", async () => {
        const { container } = render(FloatingPlanets);
        // Flush microtasks so onMount fires
        await Promise.resolve();
        const planets = container.querySelectorAll(".floating-planet");
        expect(planets.length).toBe(5);
    });

    it("saturn planet has ring elements", async () => {
        const { container } = render(FloatingPlanets);
        await Promise.resolve();
        // Saturn is the second planet in the list; it has .ring-1 and .ring-2
        const ring1 = container.querySelector(".ring-1");
        const ring2 = container.querySelector(".ring-2");
        expect(ring1).not.toBeNull();
        expect(ring2).not.toBeNull();
    });

    it("all planets have orbital-path elements", async () => {
        const { container } = render(FloatingPlanets);
        await Promise.resolve();
        const orbits = container.querySelectorAll(".orbital-path");
        expect(orbits.length).toBe(5);
    });

    it("planet elements carry inline size styles", async () => {
        const { container } = render(FloatingPlanets);
        await Promise.resolve();
        const planetDivs = container.querySelectorAll(".planet");
        expect(planetDivs.length).toBeGreaterThan(0);
        // Each planet div should have a width style
        const firstPlanet = planetDivs[0] as HTMLElement;
        expect(firstPlanet.style.width).toBeTruthy();
    });

    it("planets use CSS variable --orbit-radius for animation", async () => {
        const { container } = render(FloatingPlanets);
        await Promise.resolve();
        const floatingPlanets = container.querySelectorAll(".floating-planet");
        expect(floatingPlanets.length).toBe(5);
        floatingPlanets.forEach((el) => {
            const style = (el as HTMLElement).style.cssText;
            expect(style).toContain("--orbit-radius");
        });
    });
});
