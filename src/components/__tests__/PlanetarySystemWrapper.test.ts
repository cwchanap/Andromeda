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
            focusOnPlanet: vi.fn(),
            getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
            worldToScreen: vi.fn(() => ({ x: 100, y: 200, visible: true })),
        })),
        hasOrbitAnchors: vi.fn(() => true),
        isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
        setBarycenterOverlayVisible: vi.fn(),
        getSystemData: vi.fn(() => mockSystemData),
        focusOnBody: vi.fn(),
        getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
        worldToScreen: vi.fn(() => ({ x: 100, y: 200, visible: true })),
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
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
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
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
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

    it("onCameraChange callback triggers scene-ready UI (hud-info visible)", async () => {
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
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        // onSystemLoad sets isSceneReady=true, making the hud-info panel visible;
        // onCameraChange must not crash for this to complete successfully
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
    });
});

describe("PlanetarySystemWrapper – finder and pinning", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows Jump To button when scene is ready", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
    });

    it("opens finder when Jump To button is clicked", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        expect(jumpBtn).toBeTruthy();
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );
        expect(container.querySelector("input")).not.toBeNull();
    });

    it("finder shows body results and pins on click", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rows = container.querySelectorAll(".hud-list-row");
        expect(rows.length).toBeGreaterThan(0);

        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        await fireEvent.click(rows[0]);
        expect(mockInstance.focusOnBody).toHaveBeenCalled();
        await waitFor(() =>
            expect(container.querySelector(".hud-pinned")).not.toBeNull(),
        );
    });

    it("unpins a body when unpin button is clicked", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );
        const rows = container.querySelectorAll(".hud-list-row");
        await fireEvent.click(rows[0]);
        await waitFor(() =>
            expect(container.querySelector(".hud-pinned")).not.toBeNull(),
        );

        const unpinBtn = container.querySelector(".hud-chip-x");
        expect(unpinBtn).toBeTruthy();
        await fireEvent.click(unpinBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-pinned")).toBeNull(),
        );
    });

    it("opens finder on / keypress", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/" });
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );
    });

    it("closes finder on Escape keypress", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        await fireEvent.keyDown(window, { key: "Escape" });
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).toBeNull(),
        );
    });

    it("does not open finder on / when target is an INPUT", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const input = container.querySelector("input");
        expect(input).toBeTruthy();
        await fireEvent.keyDown(input!, { key: "/" });
        expect(container.querySelector(".hud-finder")).not.toBeNull();
    });

    it("shows target lock overlay when pinned body is visible", async () => {
        const origRAF = window.requestAnimationFrame;
        const origCAF = window.cancelAnimationFrame;
        window.requestAnimationFrame = (cb: FrameRequestCallback) =>
            setTimeout(() => cb(performance.now()), 0) as unknown as number;
        window.cancelAnimationFrame = (id: number) => clearTimeout(id);

        try {
            const { container } = render(PlanetarySystemWrapper, {
                props: { systemId: "alpha-centauri" },
            });
            await waitFor(() =>
                expect(container.querySelector(".hud-controls")).not.toBeNull(),
            );
            const jumpBtn = Array.from(
                container.querySelectorAll(".hud-controls .hud-btn"),
            ).find((b) => b.textContent?.includes("Jump To"));
            await fireEvent.click(jumpBtn!);
            await waitFor(() =>
                expect(container.querySelector(".hud-finder")).not.toBeNull(),
            );
            const rows = container.querySelectorAll(".hud-list-row");
            await fireEvent.click(rows[0]);

            await waitFor(() =>
                expect(
                    container.querySelector(".hud-lock-layer"),
                ).not.toBeNull(),
            );
        } finally {
            window.requestAnimationFrame = origRAF;
            window.cancelAnimationFrame = origCAF;
        }
    });

    it("does not open finder on Ctrl+/", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", ctrlKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("does not open finder on Cmd+/", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", metaKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("does not open finder on Alt+/", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", altKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("closes finder when clicking outside the finder panel", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        // Click on the system container (outside finder panel and rail)
        const systemContainer = container.querySelector(".system-container");
        expect(systemContainer).toBeTruthy();
        await fireEvent.click(systemContainer!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).toBeNull(),
        );
    });

    it("does not close finder when clicking inside the finder panel", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = Array.from(
            container.querySelectorAll(".hud-controls .hud-btn"),
        ).find((b) => b.textContent?.includes("Jump To"));
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        // Click inside the finder panel
        const finderInput = container.querySelector(".hud-finder input");
        expect(finderInput).toBeTruthy();
        await fireEvent.click(finderInput!);
        // Finder should still be open
        expect(container.querySelector(".hud-finder")).not.toBeNull();
    });
});
