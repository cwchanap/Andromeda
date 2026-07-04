/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import GalaxyWrapper from "@/components/GalaxyWrapper.svelte";
import { GalaxyRenderer } from "@/lib/galaxy";
import { settings, defaultSettings } from "@/stores/gameStore";

// Mock heavy dependencies – capture events so onSystemLoad can be triggered
vi.mock("@/lib/galaxy", () => {
    let capturedEvents: any;

    const mockRenderer = {
        initialize: vi.fn().mockImplementation(async () => {
            await Promise.resolve(); // yield so synchronous tests still see loading state
            capturedEvents?.onSystemLoad?.();
        }),
        dispose: vi.fn(),
        onResize: vi.fn(),
        focusOnStarSystem: vi.fn(),
        highlightStarSystem: vi.fn(),
        getCameraState: vi.fn(() => ({ zoom: 1 })),
        getStats: vi.fn(() => ({ fps: 60 })),
        updateConfig: vi.fn(),
        setDistanceLinesVisible: vi.fn(),
        setSolLabelVisible: vi.fn(),
        setStarGlowVisible: vi.fn(),
        setReducedMotion: vi.fn(),
    };

    return {
        GalaxyRenderer: vi
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
        localGalaxyData: {
            starSystems: [],
            metadata: { name: "Test Galaxy" },
        },
    };
});

describe("GalaxyWrapper", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(GalaxyWrapper)).not.toThrow();
    });

    it("renders a .galaxy-wrapper-container or similar root element", () => {
        const { container } = render(GalaxyWrapper);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("shows loading indicator initially", () => {
        render(GalaxyWrapper);
        expect(screen.getByText(/Initializing 3D engine/i)).toBeDefined();
    });

    it("does not show error overlay on initial render", () => {
        const { container } = render(GalaxyWrapper);
        expect(container.querySelector(".error-overlay")).toBeNull();
    });

    it("renders a back-to-menu control", () => {
        const { container } = render(GalaxyWrapper);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("constructs GalaxyRenderer on mount", async () => {
        render(GalaxyWrapper);
        await waitFor(() => expect(GalaxyRenderer).toHaveBeenCalled());
    });

    it("calls initialize on GalaxyRenderer", async () => {
        render(GalaxyWrapper);
        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        await waitFor(() =>
            expect(mockInstance?.initialize).toHaveBeenCalled(),
        );
    });

    it("shows shared HUD chrome after scene ready", async () => {
        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".view-hud")).not.toBeNull(),
        );
    });

    it("shows nearby-systems search after scene ready", async () => {
        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".galaxy-nearby")).not.toBeNull(),
        );
    });

    it("renders settings panel structure", async () => {
        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".view-hud")).not.toBeNull(),
        );
        expect(
            container.querySelector(".hud-top-right .hud-btn"),
        ).not.toBeNull();
    });

    it("unmounts cleanly", () => {
        const { unmount } = render(GalaxyWrapper);
        expect(() => unmount()).not.toThrow();
    });

    it("calls dispose on GalaxyRenderer during destroy", async () => {
        const { unmount } = render(GalaxyWrapper);
        await waitFor(() => expect(GalaxyRenderer).toHaveBeenCalled());
        unmount();
        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        await waitFor(() => expect(mockInstance?.dispose).toHaveBeenCalled());
    });
});

describe("GalaxyWrapper – event callbacks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function makeRendererMock(overrideInitialize: () => Promise<void>) {
        return {
            initialize: vi.fn().mockImplementation(overrideInitialize),
            dispose: vi.fn(),
            onResize: vi.fn(),
            focusOnStarSystem: vi.fn(),
            highlightStarSystem: vi.fn(),
            getCameraState: vi.fn(() => ({ zoom: 1 })),
            getStats: vi.fn(() => ({ fps: 60 })),
            updateConfig: vi.fn(),
            setDistanceLinesVisible: vi.fn(),
            setSolLabelVisible: vi.fn(),
            setStarGlowVisible: vi.fn(),
            setReducedMotion: vi.fn(),
        };
    }

    it("shows error overlay when onError event fires", async () => {
        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return makeRendererMock(async () => {
                    await Promise.resolve();
                    evts.onError?.(new Error("renderer error"));
                });
            },
        );

        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".error-overlay")).not.toBeNull(),
        );
    });

    it("does not call onClose when onError fires (no crash)", async () => {
        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return makeRendererMock(async () => {
                    await Promise.resolve();
                    evts.onError?.(new Error("another error"));
                });
            },
        );

        const { container } = render(GalaxyWrapper);
        // Component should still be mounted
        await waitFor(() => expect(container.firstElementChild).not.toBeNull());
    });

    it("fires onStarSystemSelect callback without throwing", async () => {
        const mockSystem = {
            id: "solar-system",
            name: "Solar System",
            description: "Our home system",
            distanceFromEarth: 0,
            systemType: "single",
            metadata: {
                spectralClass: "G2V",
                constellation: "N/A",
                hasExoplanets: false,
                numberOfPlanets: 8,
            },
            stars: [{ stellarType: "G", temperature: 5778, mass: 1 }],
        };

        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return makeRendererMock(async () => {
                    await Promise.resolve();
                    evts.onSystemLoad?.();
                    evts.onStarSystemSelect?.(mockSystem);
                });
            },
        );

        const { container } = render(GalaxyWrapper);
        // The system dialog should appear
        await waitFor(() =>
            expect(container.querySelector(".system-dialog")).not.toBeNull(),
        );
    });

    it("closeSystemDialog hides the dialog", async () => {
        const mockSystem = {
            id: "solar-system",
            name: "Solar System",
            description: "Our home system",
            distanceFromEarth: 0,
            systemType: "single",
            metadata: {
                spectralClass: null,
                constellation: null,
                hasExoplanets: false,
            },
            stars: [],
        };

        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return makeRendererMock(async () => {
                    await Promise.resolve();
                    evts.onSystemLoad?.();
                    evts.onStarSystemSelect?.(mockSystem);
                });
            },
        );

        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".system-dialog")).not.toBeNull(),
        );

        const closeBtn = container.querySelector(
            ".system-dialog .dialog-close-button",
        ) as HTMLElement;
        expect(closeBtn).not.toBeNull();
        await fireEvent.click(closeBtn);
        await waitFor(() =>
            expect(container.querySelector(".system-dialog")).toBeNull(),
        );
    });
});

describe("GalaxyWrapper – reduced-motion & dialog a11y", () => {
    let matchMediaSpy: any = null;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the shared settings store so reduced-motion state doesn't
        // leak between tests.
        settings.set({ ...defaultSettings });
    });

    afterEach(() => {
        if (matchMediaSpy) matchMediaSpy.mockRestore();
        matchMediaSpy = null;
        settings.set({ ...defaultSettings });
    });

    function makeRendererMock() {
        return {
            initialize: vi.fn().mockImplementation(async () => {
                await Promise.resolve();
                capturedEvents?.onSystemLoad?.();
            }),
            dispose: vi.fn(),
            onResize: vi.fn(),
            focusOnStarSystem: vi.fn(),
            highlightStarSystem: vi.fn(),
            getCameraState: vi.fn(() => ({ zoom: 1 })),
            getStats: vi.fn(() => ({ fps: 60 })),
            updateConfig: vi.fn(),
            setDistanceLinesVisible: vi.fn(),
            setSolLabelVisible: vi.fn(),
            setStarGlowVisible: vi.fn(),
            setReducedMotion: vi.fn(),
        };
    }

    let capturedEvents: any;

    // Default matchMedia mock returning a non-matching MQL so the
    // AccessibilityManager (rendered as a child) doesn't crash when it
    // calls window.matchMedia without optional chaining.
    function installDefaultMatchMedia(overrides: Partial<any> = {}) {
        const mql: any = {
            matches: false,
            media: "(prefers-reduced-motion: reduce)",
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            ...overrides,
        };
        matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue(mql);
        return mql;
    }

    it("forwards OS reduced-motion preference to the renderer", async () => {
        installDefaultMatchMedia({ matches: true });

        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_c: HTMLElement, _cfg: unknown, events: unknown) => {
                capturedEvents = events;
                return makeRendererMock();
            },
        );

        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".view-hud")).not.toBeNull(),
        );
        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        // The OS preference (matches=true) is OR'd with $settings.reducedMotion
        // (false by default) → reducedMotion=true → setReducedMotion(true).
        await waitFor(() =>
            expect(mockInstance?.setReducedMotion).toHaveBeenCalledWith(true),
        );
    });

    it("re-evaluates reduced-motion when the OS media query changes", async () => {
        const listeners: Record<string, ((e: any) => void)[]> = {};
        const mql: any = {
            matches: false,
            media: "(prefers-reduced-motion: reduce)",
            addEventListener: vi.fn((type: string, cb: (e: any) => void) => {
                (listeners[type] ||= []).push(cb);
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue(mql);

        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_c: HTMLElement, _cfg: unknown, events: unknown) => {
                capturedEvents = events;
                return makeRendererMock();
            },
        );

        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".view-hud")).not.toBeNull(),
        );
        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        // Initially matches=false → setReducedMotion(false).
        await waitFor(() =>
            expect(mockInstance?.setReducedMotion).toHaveBeenCalledWith(false),
        );

        // Simulate the OS toggling reduced-motion on mid-session. Invoke
        // every registered "change" listener (AccessibilityManager also
        // registers one) so GalaxyWrapper's handler fires.
        const changeCbs = listeners["change"] ?? [];
        expect(changeCbs.length).toBeGreaterThan(0);
        for (const cb of changeCbs)
            cb({ matches: true } as MediaQueryListEvent);
        await waitFor(() =>
            expect(mockInstance?.setReducedMotion).toHaveBeenCalledWith(true),
        );
    });

    it("closes the system dialog when Escape is pressed on the overlay", async () => {
        // Provide a default matchMedia so AccessibilityManager doesn't crash.
        installDefaultMatchMedia();

        const mockSystem = {
            id: "solar-system",
            name: "Solar System",
            description: "Our home system",
            distanceFromEarth: 0,
            systemType: "single",
            metadata: {
                spectralClass: null,
                constellation: null,
                hasExoplanets: false,
            },
            stars: [],
        };

        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_c: HTMLElement, _cfg: unknown, events: unknown) => {
                capturedEvents = events;
                return makeRendererMock();
            },
        );

        const { container } = render(GalaxyWrapper);
        await waitFor(() =>
            expect(container.querySelector(".view-hud")).not.toBeNull(),
        );
        // Trigger the system dialog via the select callback.
        capturedEvents.onSystemLoad?.();
        capturedEvents.onStarSystemSelect?.(mockSystem);
        await waitFor(() =>
            expect(container.querySelector(".system-dialog")).not.toBeNull(),
        );
        const overlay = container.querySelector(
            ".system-dialog-overlay",
        ) as HTMLElement;
        expect(overlay).toBeTruthy();
        // Escape on the overlay must close the dialog (on:keydown handler).
        await fireEvent.keyDown(overlay, { key: "Escape" });
        await waitFor(() =>
            expect(container.querySelector(".system-dialog")).toBeNull(),
        );
    });
});
