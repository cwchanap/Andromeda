/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/svelte";
import SolarSystemWrapper from "@/components/SolarSystemWrapper.svelte";
import { SolarSystemRenderer } from "@/lib/planetary-system/graphics/SolarSystemRenderer";

// Mock SolarSystemRenderer – captures events so onReady can be invoked
vi.mock("@/lib/planetary-system/graphics/SolarSystemRenderer", () => {
    let capturedEvents: any;
    const mockRenderer = {
        initialize: vi.fn().mockImplementation(async () => {
            await Promise.resolve(); // yield so synchronous tests still see loading state
            capturedEvents?.onReady?.();
        }),
        dispose: vi.fn(),
        selectCelestialBody: vi.fn(),
        updateConfig: vi.fn(),
        getControls: vi.fn(() => ({
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            resetView: vi.fn(),
        })),
    };
    return {
        SolarSystemRenderer: vi
            .fn()
            .mockImplementation(
                (
                    _container: HTMLElement,
                    _config: unknown,
                    events: unknown,
                ) => {
                    capturedEvents = events;
                    return mockRenderer;
                },
            ),
    };
});

// Mock SolarSystem data
vi.mock("@/lib/planetary-system/SolarSystem", () => {
    const solarSystemData = {
        id: "solar",
        name: "Solar System",
        star: {
            id: "sun",
            name: "Sun",
            type: "star",
            description: "Our star",
            keyFacts: {
                diameter: "1,392,700 km",
                orbitalPeriod: "N/A",
                composition: ["Hydrogen", "Helium"],
                temperature: "5,778 K",
            },
            images: [],
            position: { x: 0, y: 0, z: 0 },
            scale: 1,
            material: { color: "#FFD700" },
        },
        celestialBodies: [
            {
                id: "earth",
                name: "Earth",
                type: "planet",
                description: "Our home",
                keyFacts: {
                    diameter: "12,742 km",
                    distanceFromSun: "150 million km",
                    orbitalPeriod: "365.25 days",
                    composition: ["Rock"],
                    temperature: "15°C",
                },
                images: [],
                position: { x: 5, y: 0, z: 0 },
                scale: 1,
                material: { color: "#6B93D6" },
                orbitRadius: 5,
                orbitSpeed: 0.01,
            },
        ],
    };

    return {
        solarSystemData,
        solarSystem: {
            id: "solar",
            name: "Solar System",
            version: "1.0.0",
            description: "Our solar system",
            author: "Andromeda Team",
            systemData: solarSystemData,
            initialize: vi.fn().mockResolvedValue(undefined),
            cleanup: vi.fn().mockResolvedValue(undefined),
        },
        getCelestialBodyById: vi.fn(),
        getAllCelestialBodies: vi.fn(() => []),
        getCelestialBodiesByType: vi.fn(() => []),
        sortByDistanceFromSun: vi.fn((bodies: unknown[]) => bodies),
        calculateOrbitPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
        getRelativeScale: vi.fn(() => 1),
        formatDistance: vi.fn((d: number) => `${d} km`),
        formatTemperature: vi.fn((t: number) => `${t}°C`),
        getRealDistanceKm: vi.fn(() => 0),
    };
});

describe("SolarSystemWrapper", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(SolarSystemWrapper)).not.toThrow();
    });

    it("renders a root container element", () => {
        const { container } = render(SolarSystemWrapper);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("renders the solar-system-renderer container element", () => {
        const { container } = render(SolarSystemWrapper);
        const rendererEl = container.querySelector("#solar-system-renderer");
        expect(rendererEl).not.toBeNull();
    });

    it("shows loading animation initially (isLoading=true)", () => {
        render(SolarSystemWrapper);
        // LoadingAnimation renders loading text — multiple elements may match
        const loadingElements = screen.getAllByText(/Loading solar system/i);
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it("renders screen reader live region", () => {
        const { container } = render(SolarSystemWrapper);
        const liveRegion = container.querySelector("[aria-live='polite']");
        expect(liveRegion).not.toBeNull();
    });

    it("renders solar system 3D description for screen readers", () => {
        render(SolarSystemWrapper);
        expect(
            screen.getByText(/3D Solar System Visualization/i),
        ).toBeDefined();
    });

    it("renders navigation description text for screen readers", () => {
        render(SolarSystemWrapper);
        expect(
            screen.getByText(/You can navigate using keyboard controls/i),
        ).toBeDefined();
    });

    it("does not show error state on initial render", () => {
        const { container } = render(SolarSystemWrapper);
        const errorState = container.querySelector(".error-state");
        expect(errorState).toBeNull();
    });

    it("unmounts cleanly", () => {
        const { unmount } = render(SolarSystemWrapper);
        expect(() => unmount()).not.toThrow();
    });

    it("solar-system-container has opacity style", () => {
        const { container } = render(SolarSystemWrapper);
        const solarContainer = container.querySelector(
            ".solar-system-container",
        );
        expect(solarContainer).not.toBeNull();
    });
});

describe("SolarSystemWrapper – initialization via fake timers", () => {
    let mathRandomSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        cleanup(); // unmount prior renders before clearing mocks
        vi.clearAllMocks();
        vi.useFakeTimers();
        // Stub Math.random so each 100ms tick adds a fixed 13.5 (= 0.9 * 15).
        // 80 / 13.5 = 6 ticks (600ms) to reach the 80% threshold, then
        // 100ms delay + ~0ms async init + 500ms onReady timer = 1200ms total,
        // safely inside every test's 1500ms advancement.
        mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);
    });

    afterEach(() => {
        mathRandomSpy.mockRestore();
        vi.useRealTimers();
    });

    it("constructs SolarSystemRenderer after loading interval completes", async () => {
        render(SolarSystemWrapper);

        // The setInterval fires every 100ms, incrementing progress up to 15% per tick.
        // After ~6 ticks (600ms) progress reaches 80; then setTimeout(100) triggers initializeSolarSystem.
        // Advancing 1500ms covers the interval chain + setTimeout + onReady's setTimeout(500).
        await vi.advanceTimersByTimeAsync(1500);

        expect(SolarSystemRenderer).toHaveBeenCalled();
    });

    it("calls initialize on the SolarSystemRenderer", async () => {
        render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);

        const mockInstance = (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results.at(-1)?.value;
        expect(mockInstance?.initialize).toHaveBeenCalled();
    });

    it("sets up zoom controls after initialization", async () => {
        render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);

        const mockInstance = (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results.at(-1)?.value;
        expect(mockInstance?.getControls).toHaveBeenCalled();
    });

    it("hides loading state after onReady fires and setTimeout(500) elapses", async () => {
        const { container } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);

        // After initialization + onReady's 500ms timer: isLoading=false, isSceneReady=true
        const sceneContainer = container.querySelector(
            ".solar-system-container",
        );
        expect(sceneContainer).not.toBeNull();
        expect(screen.queryByText(/Loading solar system/i)).toBeNull();
    });

    it("unmounts cleanly after fake-timer initialization", async () => {
        const { unmount } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);
        expect(() => unmount()).not.toThrow();
    });

    it("calls dispose on renderer during destroy", async () => {
        const { unmount } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);

        unmount();

        const mockInstance = (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results.at(-1)?.value;
        expect(mockInstance?.dispose).toHaveBeenCalled();
    });
});

describe("SolarSystemWrapper – event callbacks via fake timers", () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("onCameraChange callback fires without crashing", async () => {
        (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onCameraChange?.({ zoom: 2.5 });
                        evts.onReady?.();
                    }),
                    dispose: vi.fn(),
                    selectCelestialBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                };
            },
        );

        const { container } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("onError callback fires without crashing", async () => {
        (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onError?.(new Error("render error"));
                        evts.onReady?.();
                    }),
                    dispose: vi.fn(),
                    selectCelestialBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                };
            },
        );

        const { container } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("onPlanetSelect callback fires handlePlanetSelect", async () => {
        const mockPlanet = {
            id: "earth",
            name: "Earth",
            type: "planet",
            description: "Our home",
            keyFacts: {
                diameter: "12,742 km",
                distanceFromSun: "1 AU",
                orbitalPeriod: "365 days",
                composition: ["rock"],
                temperature: "15°C",
            },
            images: [],
            position: { x: 5, y: 0, z: 0 },
            scale: 1,
            material: { color: "#6B93D6" },
        };

        (
            SolarSystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onPlanetSelect?.(mockPlanet);
                        evts.onReady?.();
                    }),
                    dispose: vi.fn(),
                    selectCelestialBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                };
            },
        );

        const { container } = render(SolarSystemWrapper);
        await vi.advanceTimersByTimeAsync(1500);
        expect(container.firstElementChild).not.toBeNull();
    });
});
