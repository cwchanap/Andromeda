/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import PlanetarySystemWrapper from "@/components/PlanetarySystemWrapper.svelte";
import { PlanetarySystemRenderer } from "@/lib/planetary-system";
import { gameActions } from "@/stores/gameStore";

/**
 * Self-contained translation map so tests do not depend on en.ts string
 * values.  If a translation key changes in the real i18n files, these tests
 * remain stable because the component receives its own `translations` prop.
 */
const mockTranslations: Record<string, string> = {
    "controls.backToMenu": "Back",
    "controls.zoomIn": "Zoom In",
    "controls.zoomOut": "Zoom Out",
    "controls.resetView": "Reset View",
    "controls.showBarycenters": "Show barycenters",
    "controls.hideBarycenters": "Hide barycenters",
    "finder.title": "Jump To",
    "finder.placeholder": "Search bodies…",
    "finder.empty": "No bodies found",
    "finder.pinned": "Pinned",
    "finder.unpin": "Unpin",
    "finder.locked": "TARGET LOCKED",
    "planet.type.star": "STAR",
    "systems.alpha-centauri.name": "Alpha Centauri System",
    "systems.alpha-centauri.description":
        "The closest star system to our Solar System",
};

/** Lookup helper – mirrors the component's own fallback logic. */
const t = (key: string) => mockTranslations[key] || key;

/** Helper to find the "Jump To" button via its translated text. */
function findJumpBtn(container: HTMLElement): HTMLButtonElement | undefined {
    return Array.from(
        container.querySelectorAll<HTMLButtonElement>(".hud-controls .hud-btn"),
    ).find((b) => b.textContent?.includes(t("finder.title")));
}

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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });

        await waitFor(() =>
            expect(
                getByRole("button", { name: t("controls.showBarycenters") }),
            ).toBeTruthy(),
        );
    });

    it("toggles barycenter overlay visibility through the renderer", async () => {
        const { getByRole } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });

        await waitFor(() =>
            expect(
                getByRole("button", { name: t("controls.showBarycenters") }),
            ).toBeTruthy(),
        );

        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;

        await fireEvent.click(
            getByRole("button", { name: t("controls.showBarycenters") }),
        );

        expect(mockInstance.setBarycenterOverlayVisible).toHaveBeenCalledWith(
            true,
        );
        expect(
            getByRole("button", { name: t("controls.hideBarycenters") }),
        ).toBeTruthy();
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
        // and the error surface appears instead
        await waitFor(() =>
            expect(container.querySelector('[role="alert"]')).not.toBeNull(),
        );
        // Loading animation should be gone
        expect(container.querySelector(".loading-animation")).toBeNull();
    });

    it("onError callback shows error message to the user", async () => {
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
        // Error surface should appear with the error message
        await waitFor(() =>
            expect(container.querySelector('[role="alert"]')).not.toBeNull(),
        );
        expect(container.querySelector(".hud-error-msg")?.textContent).toBe(
            "system load failed",
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        expect(jumpBtn).toBeTruthy();
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );
        expect(container.querySelector("input")).not.toBeNull();
    });

    it("finder shows body results and pins on click", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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

    it("marks pinned body with aria-current on finder rows", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        // Before pinning, no row has aria-current
        const rowsBeforePin = container.querySelectorAll(".hud-list-row");
        rowsBeforePin.forEach((row) =>
            expect(row.getAttribute("aria-current")).toBeNull(),
        );

        // Pin the first body (this closes the finder)
        await fireEvent.click(rowsBeforePin[0]);
        await waitFor(() =>
            expect(container.querySelector(".hud-pinned")).not.toBeNull(),
        );

        // Re-open finder to check aria-current on the pinned row
        const jumpBtn2 = findJumpBtn(container);
        await fireEvent.click(jumpBtn2!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rowsAfterPin = container.querySelectorAll(".hud-list-row");
        expect(rowsAfterPin[0].getAttribute("aria-current")).toBe("true");
    });

    it("unpins a body when unpin button is clicked", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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
                props: {
                    systemId: "alpha-centauri",
                    translations: mockTranslations,
                },
            });
            await waitFor(() =>
                expect(container.querySelector(".hud-controls")).not.toBeNull(),
            );
            const jumpBtn = findJumpBtn(container);
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", ctrlKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("does not open finder on Cmd+/", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", metaKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("does not open finder on Alt+/", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-info")).not.toBeNull(),
        );
        await fireEvent.keyDown(window, { key: "/", altKey: true });
        expect(container.querySelector(".hud-finder")).toBeNull();
    });

    it("closes finder when clicking outside the finder panel", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
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

    it("renders finder list with ul/li semantics", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const list = container.querySelector(".hud-list");
        expect(list).not.toBeNull();
        expect(list?.tagName).toBe("UL");

        const items = list?.querySelectorAll("li");
        expect(items?.length).toBeGreaterThan(0);
    });

    it("pins body on Enter when finder list has focus", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;

        // Simulate pressing Enter on the list
        const list = container.querySelector(".hud-list")!;
        await fireEvent.keyDown(list, { key: "Enter" });
        expect(mockInstance.focusOnBody).toHaveBeenCalled();
    });

    it("moves DOM focus to the next row on ArrowDown in the list", async () => {
        // Add a second body so we have multiple rows to navigate
        const multiBodySystemData = {
            ...mockSystemData,
            celestialBodies: [
                {
                    id: "planet-b",
                    name: "Planet B",
                    type: "planet",
                    description: "A test planet",
                    keyFacts: {
                        diameter: "1000 km",
                        distanceFromSun: "1 AU",
                        orbitalPeriod: "365 days",
                        composition: ["Iron"],
                        temperature: "300 K",
                    },
                    images: [],
                    position: { x: 5, y: 0, z: 0 },
                    scale: 1,
                    material: { color: "#FF0000" },
                },
            ],
        };

        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onSystemLoad?.("alpha-centauri");
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
                    hasOrbitAnchors: vi.fn(() => false),
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => multiBodySystemData),
                    focusOnBody: vi.fn(),
                    getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
                    worldToScreen: vi.fn(() => ({
                        x: 100,
                        y: 200,
                        visible: true,
                    })),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rows = container.querySelectorAll(".hud-list-row");
        expect(rows.length).toBeGreaterThanOrEqual(2);

        // Focus the first row, then ArrowDown should move focus to the second row
        (rows[0] as HTMLElement).focus();
        const list = container.querySelector(".hud-list")!;
        await fireEvent.keyDown(list, { key: "ArrowDown" });

        // After ArrowDown, the second row should have received focus
        expect(document.activeElement).toBe(rows[1]);
    });

    it("resets focusedFinderIndex to 0 when opened via button click", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );

        // Open finder via button
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        // The first row should be the one that gets Enter-activated (index 0)
        const mockInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;

        const list = container.querySelector(".hud-list")!;
        await fireEvent.keyDown(list, { key: "Enter" });
        // Should pin the first (index 0) result, not some stale index
        expect(mockInstance.focusOnBody).toHaveBeenCalledWith(
            "alpha-centauri-a",
        );
    });

    it("populates finder results after async initialization", async () => {
        // Simulate the real timing: getSystemData returns null before initialize,
        // then returns data after onSystemLoad fires (which sets isSceneReady).
        let resolveInit: () => void;
        const initPromise = new Promise<void>((r) => {
            resolveInit = r;
        });

        let systemDataAvailable = false;

        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await initPromise;
                        systemDataAvailable = true;
                        evts.onSystemLoad?.("alpha-centauri");
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
                    hasOrbitAnchors: vi.fn(() => false),
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() =>
                        systemDataAvailable ? mockSystemData : null,
                    ),
                    focusOnBody: vi.fn(),
                    getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
                    worldToScreen: vi.fn(() => ({
                        x: 100,
                        y: 200,
                        visible: true,
                    })),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });

        // Before init completes, no HUD controls are visible
        expect(container.querySelector(".hud-controls")).toBeNull();

        // Resolve init — triggers onSystemLoad → isSceneReady → allBodies re-runs
        resolveInit!();

        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );

        // Open finder and verify it contains bodies (not "No bodies found")
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rows = container.querySelectorAll(".hud-list-row");
        expect(rows.length).toBeGreaterThan(0);
        expect(container.textContent).not.toContain(t("finder.empty"));
    });

    it("wraps focus to last row on ArrowUp from first row", async () => {
        const multiBodySystemData = {
            ...mockSystemData,
            celestialBodies: [
                {
                    id: "planet-b",
                    name: "Planet B",
                    type: "planet",
                    description: "A test planet",
                    keyFacts: {
                        diameter: "1000 km",
                        distanceFromSun: "1 AU",
                        orbitalPeriod: "365 days",
                        composition: ["Iron"],
                        temperature: "300 K",
                    },
                    images: [],
                    position: { x: 5, y: 0, z: 0 },
                    scale: 1,
                    material: { color: "#FF0000" },
                },
            ],
        };

        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onSystemLoad?.("alpha-centauri");
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
                    hasOrbitAnchors: vi.fn(() => false),
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => multiBodySystemData),
                    focusOnBody: vi.fn(),
                    getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
                    worldToScreen: vi.fn(() => ({
                        x: 100,
                        y: 200,
                        visible: true,
                    })),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rows = container.querySelectorAll(".hud-list-row");
        expect(rows.length).toBeGreaterThanOrEqual(2);

        // Focus the first row, then ArrowUp should wrap to the last row
        (rows[0] as HTMLElement).focus();
        const list = container.querySelector(".hud-list")!;
        await fireEvent.keyDown(list, { key: "ArrowUp" });

        expect(document.activeElement).toBe(rows[rows.length - 1]);
    });

    it("wraps focus to first row on ArrowDown from last row", async () => {
        const multiBodySystemData = {
            ...mockSystemData,
            celestialBodies: [
                {
                    id: "planet-b",
                    name: "Planet B",
                    type: "planet",
                    description: "A test planet",
                    keyFacts: {
                        diameter: "1000 km",
                        distanceFromSun: "1 AU",
                        orbitalPeriod: "365 days",
                        composition: ["Iron"],
                        temperature: "300 K",
                    },
                    images: [],
                    position: { x: 5, y: 0, z: 0 },
                    scale: 1,
                    material: { color: "#FF0000" },
                },
            ],
        };

        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onSystemLoad?.("alpha-centauri");
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
                    hasOrbitAnchors: vi.fn(() => false),
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => multiBodySystemData),
                    focusOnBody: vi.fn(),
                    getBodyWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
                    worldToScreen: vi.fn(() => ({
                        x: 100,
                        y: 200,
                        visible: true,
                    })),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const rows = container.querySelectorAll(".hud-list-row");
        expect(rows.length).toBe(2); // star + planet-b

        const list = container.querySelector(".hud-list")!;

        // Navigate to the last item: ArrowDown from index 0 → index 1 (last)
        await fireEvent.keyDown(list, { key: "ArrowDown" });
        // Now at last index (1), ArrowDown should wrap to index 0
        await fireEvent.keyDown(list, { key: "ArrowDown" });

        expect(document.activeElement).toBe(rows[0]);
    });

    it("stops propagation of Arrow keys handled by finder list", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const list = container.querySelector(".hud-list")!;
        const arrowDownEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
        });
        const spy = vi.spyOn(arrowDownEvent, "stopPropagation");
        list.dispatchEvent(arrowDownEvent);
        // The handler calls stopPropagation on handled keys
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("stops propagation of Enter key handled by finder list", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const list = container.querySelector(".hud-list")!;
        const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
        });
        const spy = vi.spyOn(enterEvent, "stopPropagation");
        list.dispatchEvent(enterEvent);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("stops propagation of ArrowUp key handled by finder list", async () => {
        const { container } = render(PlanetarySystemWrapper, {
            props: {
                systemId: "alpha-centauri",
                translations: mockTranslations,
            },
        });
        await waitFor(() =>
            expect(container.querySelector(".hud-controls")).not.toBeNull(),
        );
        const jumpBtn = findJumpBtn(container);
        await fireEvent.click(jumpBtn!);
        await waitFor(() =>
            expect(container.querySelector(".hud-finder")).not.toBeNull(),
        );

        const list = container.querySelector(".hud-list")!;
        const arrowUpEvent = new KeyboardEvent("keydown", {
            key: "ArrowUp",
            bubbles: true,
        });
        const spy = vi.spyOn(arrowUpEvent, "stopPropagation");
        list.dispatchEvent(arrowUpEvent);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe("PlanetarySystemWrapper – retry after failed initialization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("resets renderer on initialization failure so retry can succeed", async () => {
        let initCallCount = 0;
        let capturedEvents: any;

        (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mockImplementation(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                capturedEvents = events;
                initCallCount++;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        if (initCallCount === 1) {
                            throw new Error("WebGL context lost");
                        }
                        await Promise.resolve();
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
                    hasOrbitAnchors: vi.fn(() => false),
                    isBarycenterOverlayVisibleByDefault: vi.fn(() => false),
                    setBarycenterOverlayVisible: vi.fn(),
                    getSystemData: vi.fn(() => mockSystemData),
                };
            },
        );

        const { container } = render(PlanetarySystemWrapper, {
            props: { systemId: "alpha-centauri" },
        });

        // First initialization should fail — error surface appears
        await waitFor(() =>
            expect(container.querySelector('[role="alert"]')).not.toBeNull(),
        );
        expect(container.querySelector(".hud-error-msg")?.textContent).toBe(
            "WebGL context lost",
        );

        // The failed renderer should have been cleaned up
        const firstRendererInstance = (
            PlanetarySystemRenderer as ReturnType<typeof vi.fn>
        ).mock.results[0]?.value;
        expect(firstRendererInstance?.cleanup).toHaveBeenCalled();

        // Click retry
        const retryBtn = container.querySelector(".hud-error-retry");
        expect(retryBtn).toBeTruthy();
        await fireEvent.click(retryBtn!);

        // Second initialization should succeed
        await waitFor(() => expect(initCallCount).toBe(2));
    });
});
