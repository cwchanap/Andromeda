import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { PlanetarySystemRenderer } from "@/lib/planetary-system/PlanetarySystemRenderer";
import type { CelestialBodyData } from "@/types/game";
import type {
    PlanetarySystemConfig,
    PlanetarySystemEvents,
    PlanetarySystemData,
} from "@/lib/planetary-system/types";

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

const makeSystemData = (
    overrides: Partial<PlanetarySystemData> = {},
): PlanetarySystemData => ({
    id: "test-system",
    name: "Test System",
    description: "Test planetary system",
    star: makeStar(),
    celestialBodies: [makePlanet()],
    systemScale: 1.0,
    systemCenter: new THREE.Vector3(0, 0, 0),
    systemType: "solar",
    ...overrides,
});

const makeConfig = (
    overrides: Partial<PlanetarySystemConfig> = {},
): PlanetarySystemConfig => ({
    systemId: "test-system",
    performanceMode: "medium",
    enableAnimations: true,
    enableInteractions: true,
    particleCount: 200,
    shadowsEnabled: false,
    orbitSpeedMultiplier: 1.0,
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

describe("PlanetarySystemRenderer", () => {
    let container: HTMLElement;
    let renderer: PlanetarySystemRenderer;

    beforeEach(() => {
        container = makeContainer();
    });

    afterEach(async () => {
        if (renderer) {
            try {
                await renderer.cleanup();
            } catch {
                // already cleaned up
            }
        }
        if (container.parentElement) {
            container.parentElement.removeChild(container);
        }
    });

    it("constructs without throwing", () => {
        expect(() => {
            renderer = new PlanetarySystemRenderer(container, makeConfig());
        }).not.toThrow();
    });

    it("constructs with event callbacks", () => {
        const events: PlanetarySystemEvents = {
            onBodySelect: vi.fn(),
            onCameraChange: vi.fn(),
            onSystemLoad: vi.fn(),
            onError: vi.fn(),
        };
        expect(() => {
            renderer = new PlanetarySystemRenderer(
                container,
                makeConfig(),
                events,
            );
        }).not.toThrow();
    });

    it("getSystemData returns null before initialize", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(renderer.getSystemData()).toBeNull();
    });

    it("initialize stores system data", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        const systemData = makeSystemData();
        await renderer.initialize(systemData);
        expect(renderer.getSystemData()).toBe(systemData);
    });

    it("initialize calls onSystemLoad with systemId", async () => {
        const onSystemLoad = vi.fn();
        renderer = new PlanetarySystemRenderer(container, makeConfig(), {
            onSystemLoad,
        });
        await renderer.initialize(makeSystemData());
        // onSystemLoad is fired via the onReady callback from the underlying renderer
        // Verify it was called with the correct systemId
        expect(onSystemLoad).toHaveBeenCalledWith("test-system");
    });

    it("initialize with backgroundStars config does not throw", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await expect(
            renderer.initialize(
                makeSystemData({
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
            ),
        ).resolves.toBeUndefined();
    });

    it("updateConfig merges new config without throwing", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(() =>
            renderer.updateConfig({
                enableAnimations: false,
                performanceMode: "low",
                particleCount: 50,
            }),
        ).not.toThrow();
    });

    it("selectBody does not throw for unknown id", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(() => renderer.selectBody("unknown-body")).not.toThrow();
    });

    it("getControls returns controls or null before initialize", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        const controls = renderer.getControls();
        // May be null or a controls object; should not throw
        expect(controls === null || typeof controls === "object").toBe(true);
    });

    it("getControls returns controls after initialize", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        const controls = renderer.getControls();
        expect(controls).not.toBeNull();
    });

    it("focusOnBody does not throw for unknown id", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        expect(() => renderer.focusOnBody("unknown-body")).not.toThrow();
    });

    it("focusOnBody does not throw before initialize", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(() => renderer.focusOnBody("some-id")).not.toThrow();
    });

    it("reports whether the loaded system has orbit anchors", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(
            makeSystemData({
                orbitAnchors: [
                    {
                        id: "barycenter",
                        name: "Barycenter",
                        type: "barycenter",
                        position: new THREE.Vector3(0, 0, 0),
                    },
                ],
            }),
        );

        expect(renderer.hasOrbitAnchors()).toBe(true);
    });

    it("forwards barycenter overlay visibility to the underlying renderer", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(
            makeSystemData({
                orbitAnchors: [
                    {
                        id: "barycenter",
                        name: "Barycenter",
                        type: "barycenter",
                        position: new THREE.Vector3(0, 0, 0),
                    },
                ],
            }),
        );

        expect(() => renderer.setBarycenterOverlayVisible(true)).not.toThrow();
    });

    it("cleanup sets systemData to null", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        expect(renderer.getSystemData()).not.toBeNull();
        await renderer.cleanup();
        expect(renderer.getSystemData()).toBeNull();
    });

    it("cleanup is safe to call multiple times", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        await renderer.cleanup();
        await expect(renderer.cleanup()).resolves.toBeUndefined();
    });

    it("constructs without throwing when onCameraChange callback is provided (smoke test)", () => {
        const onCameraChange = vi.fn();
        expect(() => {
            renderer = new PlanetarySystemRenderer(container, makeConfig(), {
                onCameraChange,
            });
        }).not.toThrow();
    });

    it("constructs without throwing when onBodySelect callback is provided (smoke test)", () => {
        const onBodySelect = vi.fn();
        expect(() => {
            renderer = new PlanetarySystemRenderer(container, makeConfig(), {
                onBodySelect,
            });
        }).not.toThrow();
    });

    it("updateConfig with orbitSpeedMultiplier does not throw", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(() =>
            renderer.updateConfig({ orbitSpeedMultiplier: 2.5 }),
        ).not.toThrow();
    });

    it("onCameraChange adapter forwards zoom from internal CameraState to event callback", async () => {
        const onCameraChange = vi.fn();
        renderer = new PlanetarySystemRenderer(container, makeConfig(), {
            onCameraChange,
        });
        await renderer.initialize(makeSystemData());

        // Access the underlying SolarSystemRenderer's stored events and invoke onCameraChange
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solarRenderer = (renderer as any).solarSystemRenderer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internalEvents = (solarRenderer as any).events as any;
        const mockCameraState = {
            zoom: 3.7,
            position: new THREE.Vector3(),
            target: new THREE.Vector3(),
        };
        internalEvents.onCameraChange(mockCameraState);

        expect(onCameraChange).toHaveBeenCalledWith(3.7);
    });

    it("initialize throws and calls onError when the underlying renderer fails", async () => {
        const onError = vi.fn();
        renderer = new PlanetarySystemRenderer(container, makeConfig(), {
            onError,
        });

        // Force the underlying SolarSystemRenderer.initialize to reject
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solarRenderer = (renderer as any).solarSystemRenderer;
        vi.spyOn(solarRenderer, "initialize").mockRejectedValue(
            new Error("renderer init failed"),
        );

        await expect(renderer.initialize(makeSystemData())).rejects.toThrow(
            "renderer init failed",
        );
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("initialize wraps non-Error rejections in an Error before calling onError", async () => {
        const onError = vi.fn();
        renderer = new PlanetarySystemRenderer(container, makeConfig(), {
            onError,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solarRenderer = (renderer as any).solarSystemRenderer;
        vi.spyOn(solarRenderer, "initialize").mockRejectedValue(
            "string error value",
        );

        await expect(renderer.initialize(makeSystemData())).rejects.toThrow(
            "string error value",
        );
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("initialize throws when solarSystemRenderer is null", async () => {
        const onError = vi.fn();
        renderer = new PlanetarySystemRenderer(container, makeConfig(), {
            onError,
        });
        // Simulate missing renderer (e.g. after disposal)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).solarSystemRenderer = null;

        await expect(renderer.initialize(makeSystemData())).rejects.toThrow(
            "Solar system renderer not initialized",
        );
        // The null-check throws before the try/catch that would call onError
        expect(onError).not.toHaveBeenCalled();
    });

    it("getBodyWorldPosition returns position for known body after init", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        const pos = renderer.getBodyWorldPosition("test-star");
        expect(pos).not.toBeNull();
    });

    it("getBodyWorldPosition returns null for unknown body", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        expect(renderer.getBodyWorldPosition("nonexistent")).toBeNull();
    });

    it("getBodyWorldPosition returns null before initialize", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        expect(renderer.getBodyWorldPosition("any")).toBeNull();
    });

    it("worldToScreen returns visible result for point in front of camera", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        const result = renderer.worldToScreen(new THREE.Vector3(0, 0, 0));
        expect(result).toHaveProperty("visible");
        expect(typeof result.x).toBe("number");
        expect(typeof result.y).toBe("number");
    });

    it("worldToScreen returns default fallback before initialize", () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        const result = renderer.worldToScreen(new THREE.Vector3(0, 0, 0));
        expect(result).toEqual({ x: 0, y: 0, visible: false });
    });

    it("isBarycenterOverlayVisibleByDefault returns true when anchor has visibleByDefault", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(
            makeSystemData({
                orbitAnchors: [
                    {
                        id: "bary",
                        name: "Bary",
                        type: "barycenter" as const,
                        position: new THREE.Vector3(0, 0, 0),
                        overlay: { visibleByDefault: true },
                    },
                ],
            }),
        );
        expect(renderer.isBarycenterOverlayVisibleByDefault()).toBe(true);
    });

    it("isBarycenterOverlayVisibleByDefault returns false when anchors lack overlay", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(
            makeSystemData({
                orbitAnchors: [
                    {
                        id: "bary",
                        name: "Bary",
                        type: "barycenter" as const,
                        position: new THREE.Vector3(0, 0, 0),
                    },
                ],
            }),
        );
        expect(renderer.isBarycenterOverlayVisibleByDefault()).toBe(false);
    });

    it("isBarycenterOverlayVisibleByDefault returns false when no orbitAnchors", async () => {
        renderer = new PlanetarySystemRenderer(container, makeConfig());
        await renderer.initialize(makeSystemData());
        expect(renderer.isBarycenterOverlayVisibleByDefault()).toBe(false);
    });
});
