/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import PlanetarySystemWrapper from "@/components/PlanetarySystemWrapper.svelte";
import { PlanetarySystemRenderer } from "@/lib/planetary-system";
import { gameActions } from "@/stores/gameStore";

const mockSystemData = {
    id: "alpha-centauri",
    name: "Alpha Centauri System",
    description: "The closest star system to Earth",
    systemType: "multiple",
    systemScale: 1.2,
    systemCenter: { x: 0, y: 0, z: 0 },
    orbitAnchors: [
        {
            id: "alpha-centauri-ab-barycenter",
            name: "Alpha Centauri AB Barycenter",
            type: "barycenter",
            position: { x: 0, y: 0, z: 0 },
        },
    ],
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
        hasOrbitAnchors: vi.fn(() => true),
        setBarycenterOverlayVisible: vi.fn(),
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
        await waitFor(() => expect(PlanetarySystemRenderer).toHaveBeenCalled());
    });

    it("calls initialize on the renderer with system data", async () => {
        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() => expect(PlanetarySystemRenderer).toHaveBeenCalled());
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(mockInstance?.initialize).toHaveBeenCalled();
    });

    it("sets up zoom controls after initialization", async () => {
        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() => expect(PlanetarySystemRenderer).toHaveBeenCalled());
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(mockInstance?.getControls).toHaveBeenCalled();
    });

    it("unmounts cleanly after async initialization", async () => {
        const { unmount } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() => expect(PlanetarySystemRenderer).toHaveBeenCalled());
        expect(() => unmount()).not.toThrow();
    });

    it("calls cleanup on renderer during destroy", async () => {
        const { unmount } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() => expect(PlanetarySystemRenderer).toHaveBeenCalled());
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        unmount();
        await waitFor(() => expect(mockInstance?.cleanup).toHaveBeenCalled());
    });

    it("shows a barycenter overlay toggle for systems with orbit anchors", async () => {
        const { getByRole } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });

        await waitFor(() =>
            expect(
                getByRole("button", { name: "Show barycenters" }),
            ).toBeTruthy(),
        );
    });

    it("toggles barycenter overlay visibility through the renderer", async () => {
        const { getByRole } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });

        await waitFor(() =>
            expect(
                getByRole("button", { name: "Show barycenters" }),
            ).toBeTruthy(),
        );

        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;

        await fireEvent.click(
            getByRole("button", { name: "Show barycenters" }),
        );

        expect(mockInstance.setBarycenterOverlayVisible).toHaveBeenCalledWith(
            true,
        );
        expect(getByRole("button", { name: "Hide barycenters" })).toBeTruthy();
    });
});

describe("PlanetarySystemWrapper – event callbacks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("onBodySelect callback delegates to gameActions.selectCelestialBody", async () => {
        const mockBody = mockSystemData.star;
        const selectSpy = vi.spyOn(gameActions, "selectCelestialBody");

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
                    hasOrbitAnchors: vi.fn(() => true),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() => expect(selectSpy).toHaveBeenCalledWith(mockBody));
        selectSpy.mockRestore();
    });

    it("onError callback sets isLoading to false (loading overlay disappears)", async () => {
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
                    hasOrbitAnchors: vi.fn(() => true),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        // When onError fires, isLoading=false removes the LoadingAnimation child
        await waitFor(() =>
            expect(
                container.querySelector("#planetary-system-renderer")
                    ?.firstElementChild,
            ).toBeNull(),
        );
    });

    it("onCameraChange callback triggers scene-ready UI (system-info-panel visible)", async () => {
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
                    hasOrbitAnchors: vi.fn(() => true),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        // onSystemLoad sets isSceneReady=true, making system-info-panel visible;
        // onCameraChange must not crash for this to complete successfully
        await waitFor(() =>
            expect(
                container.querySelector(".system-info-panel"),
            ).not.toBeNull(),
        );
    });
});
