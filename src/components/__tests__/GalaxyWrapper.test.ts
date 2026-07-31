/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import GalaxyWrapper from "@/components/GalaxyWrapper.svelte";
import { GalaxyRenderer } from "@/lib/galaxy";
import { settings, defaultSettings } from "@/stores/gameStore";

// Hoisted shared harness so individual tests can drive the mocked
// GalaxyRenderer events, swap star-system fixtures, and stub observer
// eligibility without reaching into module-private closures.
const galaxyHarness = vi.hoisted(() => ({
    capturedEvents: null as any,
    starSystems: [] as any[],
    eligibility: vi.fn(),
}));

vi.mock("@/lib/constellation/observerRouteState", async () => {
    const actual = await vi.importActual<
        typeof import("@/lib/constellation/observerRouteState")
    >("@/lib/constellation/observerRouteState");

    return {
        ...actual,
        isObserverCandidateEligible: galaxyHarness.eligibility,
    };
});

// Mock heavy dependencies – capture events so onSystemLoad can be triggered
vi.mock("@/lib/galaxy", () => {
    const mockRenderer = {
        initialize: vi.fn().mockImplementation(async () => {
            await Promise.resolve(); // yield so synchronous tests still see loading state
            galaxyHarness.capturedEvents?.onSystemLoad?.();
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
                    galaxyHarness.capturedEvents = events;
                    return mockRenderer;
                },
            ),
        localGalaxyData: {
            starSystems: galaxyHarness.starSystems,
            metadata: { name: "Test Galaxy" },
        },
    };
});

beforeEach(() => {
    galaxyHarness.starSystems.splice(0);
    galaxyHarness.capturedEvents = null;
    galaxyHarness.eligibility.mockReset();
    galaxyHarness.eligibility.mockReturnValue({ eligible: true });
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

// Deterministic fixtures and helpers for the observer-sky action tests.
// `sigma-draconis` is intentionally NOT registered in
// planetarySystemRegistry (it is not part of the nearest-30 set), so
// canExplore is false and the Explore CTA reads "Coming Soon" — making the
// independent View Sky action the focus of these tests. Eligibility itself
// is MOCKED via galaxyHarness.eligibility, so the fixture's position values
// are never evaluated by the real helper.
const baseSystem = {
    id: "sigma-draconis",
    name: "Sigma Draconis System",
    description: "Sigma Draconis system",
    distanceFromEarth: 18.8,
    systemType: "solar" as const,
    position: { x: -0.05, y: 0.48, z: -5.94 },
    metadata: {
        spectralClass: "K0V",
        constellation: "Draco",
        hasExoplanets: true,
        numberOfPlanets: 4,
    },
    stars: [],
};

const galaxyTranslations = {
    "action.close": "Close",
    "action.explore": "Explore",
    "action.viewSkyFromHere": "View sky from here",
    "common.comingSoon": "Coming Soon",
    "galaxy.skyUnavailable": "Sky view is unavailable for this system.",
    "galaxy.comingSoonNotice": "This planetary experience is coming soon.",
};

async function openSystemDialog(
    system: any = baseSystem,
    props: { lang?: "en" | "zh" | "ja" } = {},
) {
    galaxyHarness.starSystems.splice(
        0,
        galaxyHarness.starSystems.length,
        system,
    );
    const result = render(GalaxyWrapper, {
        props: { translations: galaxyTranslations, ...props },
    });

    await waitFor(() => expect(GalaxyRenderer).toHaveBeenCalled());
    galaxyHarness.capturedEvents?.onSystemLoad?.();
    galaxyHarness.capturedEvents?.onStarSystemSelect?.(system);
    await waitFor(() =>
        expect(result.container.querySelector(".system-dialog")).not.toBeNull(),
    );

    return result;
}

describe("GalaxyWrapper — observer sky action", () => {
    beforeEach(() => {
        Object.defineProperty(window, "location", {
            value: {
                href: "http://localhost/galaxy",
                pathname: "/galaxy",
                search: "",
                hash: "",
            },
            writable: true,
            configurable: true,
        });
        // Re-install a default matchMedia so the child AccessibilityManager
        // (which reads prefers-reduced-motion) is isolated from any spy
        // pollution left by the reduced-motion describe above. Mirrors the
        // installDefaultMatchMedia helper used by that suite.
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: false,
            media: "(prefers-reduced-motion: reduce)",
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        } as any);
    });

    it("renders ordered secondary View Sky and primary Explore actions", async () => {
        const { container } = await openSystemDialog();
        const actions = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                ".system-dialog .dialog-actions button",
            ),
        );

        expect(actions.map((button) => button.textContent?.trim())).toEqual([
            "Close",
            "View sky from here",
            "Coming Soon",
        ]);
        expect(actions[1].classList.contains("secondary")).toBe(true);
        expect(actions[2].classList.contains("primary")).toBe(true);
    });

    it("navigates an eligible non-explorable system", async () => {
        const { container } = await openSystemDialog();
        const viewSky = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                ".dialog-actions button",
            ),
        ).find(
            (button) => button.textContent?.trim() === "View sky from here",
        )!;

        await fireEvent.click(viewSky);

        expect(window.location.href).toBe(
            "/constellation?observer=sigma-draconis",
        );
        expect(galaxyHarness.eligibility).toHaveBeenCalledWith(baseSystem);
    });

    it("uses the localized observer route", async () => {
        const { container } = await openSystemDialog(baseSystem, {
            lang: "ja",
        });
        const viewSky = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                ".dialog-actions button",
            ),
        ).find(
            (button) => button.textContent?.trim() === "View sky from here",
        )!;

        await fireEvent.click(viewSky);

        expect(window.location.href).toBe(
            "/ja/constellation?observer=sigma-draconis",
        );
    });

    it.each(["invalid-coordinates", "origin-collision"] as const)(
        "maps %s to one focusable aria-disabled state",
        async (reason) => {
            galaxyHarness.eligibility.mockReturnValue({
                eligible: false,
                reason,
            });
            const originalHref = window.location.href;
            const { container } = await openSystemDialog();
            const viewSky = Array.from(
                container.querySelectorAll<HTMLButtonElement>(
                    ".dialog-actions button",
                ),
            ).find(
                (button) => button.textContent?.trim() === "View sky from here",
            )!;

            expect(viewSky.disabled).toBe(false);
            expect(viewSky.getAttribute("aria-disabled")).toBe("true");

            const descriptionId = viewSky.getAttribute("aria-describedby");
            expect(descriptionId).toBe("galaxy-sky-unavailable");
            expect(
                container.querySelector(`#${descriptionId}`)?.textContent,
            ).toContain("Sky view is unavailable for this system.");

            viewSky.focus();
            expect(document.activeElement).toBe(viewSky);
            await fireEvent.click(viewSky);
            expect(window.location.href).toBe(originalHref);
        },
    );

    it("keeps Coming Soon Explore behavior while View Sky is enabled", async () => {
        const { container } = await openSystemDialog();
        const actions = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                ".dialog-actions button",
            ),
        );
        const viewSky = actions.find(
            (button) => button.textContent?.trim() === "View sky from here",
        )!;
        const explore = actions.find(
            (button) => button.textContent?.trim() === "Coming Soon",
        )!;

        expect(viewSky.getAttribute("aria-disabled")).not.toBe("true");
        await fireEvent.click(explore);

        expect(
            container.querySelector(".coming-soon-notice")?.textContent,
        ).toContain("This planetary experience is coming soon.");
        expect(window.location.href).toBe("http://localhost/galaxy");
    });
});
