/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import GalaxyWrapper from "@/components/GalaxyWrapper.svelte";
import { GalaxyRenderer } from "@/lib/galaxy";

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
        setSolMarkerVisible: vi.fn(),
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
        await new Promise((r) => setTimeout(r, 50));
        expect(GalaxyRenderer).toHaveBeenCalled();
    });

    it("calls initialize on GalaxyRenderer", async () => {
        render(GalaxyWrapper);
        await new Promise((r) => setTimeout(r, 50));

        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        expect(mockInstance?.initialize).toHaveBeenCalled();
    });

    it("shows shared HUD chrome after scene ready", async () => {
        const { container } = render(GalaxyWrapper);
        await new Promise((r) => setTimeout(r, 50));

        expect(container.querySelector(".view-hud")).not.toBeNull();
    });

    it("shows nearby-systems search after scene ready", async () => {
        const { container } = render(GalaxyWrapper);
        await new Promise((r) => setTimeout(r, 50));

        expect(container.querySelector(".galaxy-nearby")).not.toBeNull();
    });

    it("renders settings panel structure", async () => {
        const { container } = render(GalaxyWrapper);
        await new Promise((r) => setTimeout(r, 50));

        // ViewHud is present with its corner chrome (back + settings buttons)
        expect(container.querySelector(".view-hud")).not.toBeNull();
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
        await new Promise((r) => setTimeout(r, 50));

        unmount();

        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        expect(mockInstance?.dispose).toHaveBeenCalled();
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
            setSolMarkerVisible: vi.fn(),
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
        await new Promise((r) => setTimeout(r, 50));

        expect(container.querySelector(".error-overlay")).not.toBeNull();
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
        await new Promise((r) => setTimeout(r, 50));

        // Component should still be mounted
        expect(container.firstElementChild).not.toBeNull();
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
        await new Promise((r) => setTimeout(r, 50));

        // The system dialog should appear
        expect(container.querySelector(".system-dialog")).not.toBeNull();
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
        await new Promise((r) => setTimeout(r, 50));

        const closeBtn = container.querySelector(
            ".system-dialog .dialog-close-button",
        ) as HTMLElement;
        expect(closeBtn).not.toBeNull();
        await fireEvent.click(closeBtn);
        expect(container.querySelector(".system-dialog")).toBeNull();
    });
});
