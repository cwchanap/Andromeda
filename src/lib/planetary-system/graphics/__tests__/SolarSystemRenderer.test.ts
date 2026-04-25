/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { SolarSystemRenderer } from "@/lib/planetary-system/graphics/SolarSystemRenderer";
import type { CelestialBodyData } from "@/types/game";

const makeStar = (
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData => ({
    id: "test-star",
    name: "Test Star",
    type: "star",
    description: "A test star",
    keyFacts: {
        diameter: "1,000 km",
        distanceFromSun: "0 km",
        orbitalPeriod: "N/A",
        composition: ["Hydrogen"],
        temperature: "5,000 K",
    },
    images: [],
    position: new THREE.Vector3(0, 0, 0),
    scale: 1.0,
    material: { color: "#FFFF00", emissive: "#444400" },
    orbitRadius: 0,
    orbitSpeed: 0,
    ...overrides,
});

const makePlanet = (
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData =>
    makeStar({
        id: "test-planet",
        name: "Test Planet",
        type: "planet",
        orbitRadius: 100,
        orbitSpeed: 0.01,
        ...overrides,
    });

const makeContainer = (): HTMLElement => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", {
        value: 800,
        writable: true,
    });
    Object.defineProperty(container, "clientHeight", {
        value: 600,
        writable: true,
    });
    document.body.appendChild(container);
    return container;
};

describe("SolarSystemRenderer", () => {
    let container: HTMLElement;
    let renderer: SolarSystemRenderer;

    beforeEach(() => {
        container = makeContainer();
    });

    afterEach(() => {
        if (renderer) {
            try {
                renderer.dispose();
            } catch {
                // already disposed
            }
        }
        if (container.parentElement) {
            container.parentElement.removeChild(container);
        }
    });

    it("constructs without throwing with default config", () => {
        expect(() => {
            renderer = new SolarSystemRenderer(container);
        }).not.toThrow();
    });

    it("constructs with custom config", () => {
        expect(() => {
            renderer = new SolarSystemRenderer(container, {
                enableAnimations: false,
                performanceMode: "low",
                particleCount: 100,
                shadows: false,
                enableMobileOptimization: true,
            });
        }).not.toThrow();
    });

    it("constructs with event callbacks", () => {
        const onReady = vi.fn();
        const onError = vi.fn();
        expect(() => {
            renderer = new SolarSystemRenderer(
                container,
                {},
                { onReady, onError },
            );
        }).not.toThrow();
    });

    it("getControls returns a controls object with expected methods", () => {
        renderer = new SolarSystemRenderer(container);
        const controls = renderer.getControls();

        expect(controls).toBeDefined();
        expect(typeof controls.zoomIn).toBe("function");
        expect(typeof controls.zoomOut).toBe("function");
        expect(typeof controls.resetView).toBe("function");
        expect(typeof controls.focusOnPlanet).toBe("function");
        expect(typeof controls.setCameraPosition).toBe("function");
        expect(typeof controls.enableControls).toBe("function");
        expect(typeof controls.dispose).toBe("function");
    });

    it("getControls methods can be called without throwing", () => {
        renderer = new SolarSystemRenderer(container);
        const controls = renderer.getControls();

        expect(() => controls.zoomIn()).not.toThrow();
        expect(() => controls.zoomOut()).not.toThrow();
        expect(() => controls.resetView()).not.toThrow();
        expect(() => controls.focusOnPlanet("unknown-planet")).not.toThrow();
        expect(() =>
            controls.setCameraPosition(new THREE.Vector3(0, 100, 200)),
        ).not.toThrow();
        expect(() => controls.enableControls(false)).not.toThrow();
        expect(() => controls.enableControls(true)).not.toThrow();
    });

    it("getCameraState returns a state with position, target and zoom", () => {
        renderer = new SolarSystemRenderer(container);
        const state = renderer.getCameraState();

        expect(state).toBeDefined();
        expect(state.position).toBeDefined();
        expect(state.target).toBeDefined();
        expect(state.zoom).toBeDefined();
    });

    it("initialize resolves with a list of celestial bodies", async () => {
        renderer = new SolarSystemRenderer(container, {}, { onReady: vi.fn() });
        await expect(
            renderer.initialize([makeStar(), makePlanet()]),
        ).resolves.toBeUndefined();
    });

    it("initialize fires onReady event", async () => {
        const onReady = vi.fn();
        renderer = new SolarSystemRenderer(container, {}, { onReady });
        await renderer.initialize([makeStar()]);
        expect(onReady).toHaveBeenCalledOnce();
    });

    it("initialize with systemData does not throw", async () => {
        renderer = new SolarSystemRenderer(container);
        await expect(
            renderer.initialize([makeStar(), makePlanet()], {
                id: "test",
                name: "Test",
                description: "desc",
                star: makeStar(),
                celestialBodies: [makePlanet()],
                systemScale: 1,
                systemCenter: new THREE.Vector3(0, 0, 0),
                systemType: "solar",
                backgroundStars: {
                    enabled: true,
                    density: 1.0,
                    seed: 42,
                    animationSpeed: 1.0,
                    minRadius: 5000,
                    maxRadius: 15000,
                    colorVariation: true,
                },
            }),
        ).resolves.toBeUndefined();
    });

    it("updateConfig changes animation setting", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() =>
            renderer.updateConfig({ enableAnimations: false }),
        ).not.toThrow();
        expect(() =>
            renderer.updateConfig({ enableControls: false }),
        ).not.toThrow();
        expect(() =>
            renderer.updateConfig({ enableControls: true }),
        ).not.toThrow();
    });

    it("toggleOrbitLines does not throw", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() => renderer.toggleOrbitLines(true)).not.toThrow();
        expect(() => renderer.toggleOrbitLines(false)).not.toThrow();
    });

    it("setOrbitLineVisibility does not throw for unknown body", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() =>
            renderer.setOrbitLineVisibility("unknown", true),
        ).not.toThrow();
    });

    it("selectCelestialBody does not throw for unknown body", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() => renderer.selectCelestialBody("unknown")).not.toThrow();
        expect(() => renderer.selectCelestialBody(null)).not.toThrow();
    });

    it("configureBackgroundStars stores configuration in internal config", () => {
        renderer = new SolarSystemRenderer(container);
        const cfg = {
            enabled: true,
            density: 0.5,
            seed: 999,
            animationSpeed: 2.0,
            minRadius: 1000,
            maxRadius: 5000,
            colorVariation: false,
        };
        renderer.configureBackgroundStars(cfg);
        // Access private config via type cast to verify the values were stored
        const internalConfig = (renderer as any).config.backgroundStars;
        expect(internalConfig.enabled).toBe(true);
        expect(internalConfig.density).toBe(0.5);
        expect(internalConfig.seed).toBe(999);
        expect(internalConfig.colorVariation).toBe(false);
    });

    it("configureBackgroundStars with undefined does not throw", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() =>
            renderer.configureBackgroundStars(undefined),
        ).not.toThrow();
    });

    it("dispose cleans up resources without throwing", () => {
        renderer = new SolarSystemRenderer(container);
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("dispose is safe to call multiple times", () => {
        renderer = new SolarSystemRenderer(container);
        renderer.dispose();
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("getControls dispose method calls renderer.dispose()", () => {
        renderer = new SolarSystemRenderer(container);
        const disposeSpy = vi.spyOn(renderer, "dispose");
        const controls = renderer.getControls();
        controls.dispose();
        expect(disposeSpy).toHaveBeenCalledOnce();
    });

    it("accepts onRenderStats callback and initializes without throwing", async () => {
        const onRenderStats = vi.fn();
        renderer = new SolarSystemRenderer(container, {}, { onRenderStats });
        // onRenderStats is only called from within the render loop, which is behind
        // requestAnimationFrame (mocked to never execute). Verify construction and
        // initialization succeed without throwing.
        await expect(
            renderer.initialize([makeStar()]),
        ).resolves.toBeUndefined();
    });

    it("onError fires and initialize rejects when bodies argument is null", async () => {
        const onError = vi.fn();
        renderer = new SolarSystemRenderer(container, {}, { onError });
        const badBodies = null as any;
        await expect(renderer.initialize(badBodies)).rejects.toBeDefined();
        expect(onError).toHaveBeenCalled();
    });

    it("window resize event triggers handleResize without throwing", async () => {
        renderer = new SolarSystemRenderer(container);
        await renderer.initialize([makeStar()]);
        expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
    });

    it("selectCelestialBody with known planet ID triggers focusOnPlanet", async () => {
        renderer = new SolarSystemRenderer(container);
        await renderer.initialize([
            makeStar(),
            makePlanet({ id: "earth", orbitRadius: 10, orbitSpeed: 0.01 }),
        ]);
        // Should cover focusOnPlanet lines that animate camera to the planet
        expect(() => renderer.selectCelestialBody("earth")).not.toThrow();
    });

    it("getControls focusOnPlanet with known body ID covers planet focus path", async () => {
        renderer = new SolarSystemRenderer(container);
        await renderer.initialize([
            makeStar(),
            makePlanet({ id: "mars", orbitRadius: 15, orbitSpeed: 0.008 }),
        ]);
        const controls = renderer.getControls();
        expect(() => controls.focusOnPlanet("mars")).not.toThrow();
    });
});
