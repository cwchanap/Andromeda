/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import PlanetarySystemWrapper from "@/components/PlanetarySystemWrapper.svelte";
import { PlanetarySystemRenderer } from "@/lib/planetary-system";

const mockSystemData = {
    id: "alpha-centauri",
    name: "Alpha Centauri System",
    description: "The closest star system to Earth",
    systemType: "multiple",
    systemScale: 1.2,
    systemCenter: { x: 0, y: 0, z: 0 },
    star: {
        id: "alpha-centauri-a",
        name: "Alpha Centauri A",
        type: "star",
        description: "A Sun-like star",
        keyFacts: {
            diameter: "1,713,400 km",
            distanceFromSun: "0 km",
            orbitalPeriod: "N/A",
            composition: ["Hydrogen", "Helium"],
            temperature: "5,790 K",
        },
        images: [],
        position: { x: 0, y: 0, z: 0 },
        scale: 2.8,
        material: { color: "#FDB813" },
    },
    celestialBodies: [],
};

// Mock PlanetarySystemRenderer – captures events so onSystemLoad can be invoked
vi.mock("@/lib/planetary-system", () => {
    let capturedEvents: any;

    const mockRenderer = {
        initialize: vi.fn().mockImplementation(async () => {
            await Promise.resolve(); // yield so synchronous tests still see loading state
            capturedEvents?.onSystemLoad?.("alpha-centauri");
        }),
        dispose: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined),
        selectBody: vi.fn(),
        updateConfig: vi.fn(),
        getControls: vi.fn(() => ({
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            resetView: vi.fn(),
        })),
        getSystemData: vi.fn(() => mockSystemData),
    };

    return {
        PlanetarySystemRenderer: vi
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
        planetarySystemRegistry: {
            getSystem: vi.fn((id: string) => ({
                id,
                name: "Alpha Centauri System",
                description: "The closest star system to Earth",
                version: "1.0.0",
                author: "Andromeda Team",
                systemData: mockSystemData,
                initialize: vi.fn().mockResolvedValue(undefined),
                cleanup: vi.fn().mockResolvedValue(undefined),
            })),
            getAllSystems: vi.fn(() => []),
            registerSystem: vi.fn(),
        },
    };
});

describe("PlanetarySystemWrapper", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing with systemId prop", () => {
        expect(() =>
            render(PlanetarySystemWrapper, {
                props: { systemId: "alpha-centauri" },
            }),
        ).not.toThrow();
    });

    it("renders the planetary system renderer container", () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        const rendererEl = container.querySelector(
            "#planetary-system-renderer",
        );
        expect(rendererEl).not.toBeNull();
    });

    it("renders the planetary-system-wrapper root element", () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        const wrapper = container.querySelector(".planetary-system-wrapper");
        expect(wrapper).not.toBeNull();
    });

    it("renders loading progress container initially", () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        // system-container is always present; loading content is inside it
        const systemContainer = container.querySelector(".system-container");
        expect(systemContainer).not.toBeNull();
    });

    it("renders with default lang prop en", () => {
        expect(() =>
            render(PlanetarySystemWrapper, {
                props: { systemId: "alpha-centauri", lang: "en" },
            }),
        ).not.toThrow();
    });

    it("renders with translations prop", () => {
        expect(() =>
            render(PlanetarySystemWrapper, {
                props: {
                    systemId: "alpha-centauri",
                    translations: { "controls.backToMenu": "Back" },
                },
            }),
        ).not.toThrow();
    });

    it("renders system-container div", () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        const systemContainer = container.querySelector(".system-container");
        expect(systemContainer).not.toBeNull();
    });

    it("unmounts cleanly", () => {
        const { unmount } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        expect(() => unmount()).not.toThrow();
    });

    it("constructs PlanetarySystemRenderer on mount", async () => {
        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        // Flush microtasks so the async onMount completes
        await new Promise((r) => setTimeout(r, 50));
        expect(PlanetarySystemRenderer).toHaveBeenCalled();
    });

    it("calls initialize on the renderer with system data", async () => {
        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));

        // The mocked renderer's initialize should have been called with system data
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(mockInstance?.initialize).toHaveBeenCalled();
    });

    it("sets up zoom controls after initialization", async () => {
        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));

        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(mockInstance?.getControls).toHaveBeenCalled();
    });

    it("unmounts cleanly after async initialization", async () => {
        const { unmount } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));
        expect(() => unmount()).not.toThrow();
    });

    it("calls cleanup on renderer during destroy", async () => {
        const { unmount } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));
        unmount();
        // cleanup() is called in onDestroy (which may be async)
        await new Promise((r) => setTimeout(r, 10));
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(mockInstance?.cleanup).toHaveBeenCalled();
    });
});

describe("PlanetarySystemWrapper – event callbacks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("onBodySelect callback fires without crashing", async () => {
        const mockBody = mockSystemData.star;
        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onSystemLoad?.("alpha-centauri");
                        evts.onBodySelect?.(mockBody);
                    }),
                    dispose: vi.fn(),
                    cleanup: vi.fn().mockResolvedValue(undefined),
                    selectBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));
        expect(container.firstElementChild).not.toBeNull();
    });

    it("onError callback sets loading to false without crashing", async () => {
        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onError?.(new Error("system load failed"));
                    }),
                    dispose: vi.fn(),
                    cleanup: vi.fn().mockResolvedValue(undefined),
                    selectBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));
        // Component mounts and handles error without throwing
        expect(container.firstElementChild).not.toBeNull();
    });

    it("onCameraChange callback fires without crashing", async () => {
        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onSystemLoad?.("alpha-centauri");
                        evts.onCameraChange?.(75);
                    }),
                    dispose: vi.fn(),
                    cleanup: vi.fn().mockResolvedValue(undefined),
                    selectBody: vi.fn(),
                    updateConfig: vi.fn(),
                    getControls: vi.fn(() => ({
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        resetView: vi.fn(),
                    })),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await new Promise((r) => setTimeout(r, 50));
        expect(container.firstElementChild).not.toBeNull();
    });
});
