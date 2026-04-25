/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import GalaxyRendererComponent from "@/components/GalaxyRenderer.svelte";
import { GalaxyRenderer } from "@/lib/galaxy";

// Mock the galaxy lib – capture events so onSystemLoad / onError can be triggered
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

describe("GalaxyRenderer component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(GalaxyRendererComponent)).not.toThrow();
    });

    it("renders a .galaxy-wrapper container", () => {
        const { container } = render(GalaxyRendererComponent);
        expect(container.querySelector(".galaxy-wrapper")).not.toBeNull();
    });

    it("shows loading overlay initially", () => {
        const { container } = render(GalaxyRendererComponent);
        const loadingOverlay = container.querySelector(".loading-overlay");
        expect(loadingOverlay).not.toBeNull();
    });

    it("loading overlay contains 'Loading galaxy' text", () => {
        render(GalaxyRendererComponent);
        expect(screen.getByText(/Loading galaxy/i)).toBeDefined();
    });

    it("does not show error overlay on initial render", () => {
        const { container } = render(GalaxyRendererComponent);
        const errorOverlay = container.querySelector(".error-overlay");
        expect(errorOverlay).toBeNull();
    });

    it("with autoStart=false does not initialize the renderer on mount", async () => {
        render(GalaxyRendererComponent, { props: { autoStart: false } });
        await Promise.resolve();
        expect(GalaxyRenderer).not.toHaveBeenCalled();
    });

    it("accepts a config prop without throwing", () => {
        expect(() =>
            render(GalaxyRendererComponent, {
                props: {
                    config: {
                        performanceMode: "low" as const,
                        enableControls: false,
                    },
                },
            }),
        ).not.toThrow();
    });

    it("constructs GalaxyRenderer on mount with autoStart=true", async () => {
        render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        expect(GalaxyRenderer).toHaveBeenCalled();
    });

    it("calls initialize on GalaxyRenderer", async () => {
        render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));

        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        expect(mockInstance?.initialize).toHaveBeenCalled();
    });

    it("hides loading overlay after onSystemLoad fires", async () => {
        const { container } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));

        // onSystemLoad sets isLoading=false
        const loadingOverlay = container.querySelector(".loading-overlay");
        expect(loadingOverlay).toBeNull();
    });

    it("calls dispose on cleanup", async () => {
        const { unmount } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));

        unmount();

        const mockInstance = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        expect(mockInstance?.dispose).toHaveBeenCalled();
    });

    it("shows error overlay when initialize throws", async () => {
        // Override initialize to throw an error
        const mockInstance = {
            initialize: vi.fn().mockImplementation(async () => {
                await Promise.resolve();
                throw new Error("Init failed");
            }),
            dispose: vi.fn(),
        };
        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            () => mockInstance,
        );

        const { container } = render(GalaxyRendererComponent);
        // Wait long enough for the async rejection and Svelte to process it
        await new Promise((r) => setTimeout(r, 100));

        const errorOverlay = container.querySelector(".error-overlay");
        expect(errorOverlay).not.toBeNull();
    });
});

describe("GalaxyRenderer component – event callbacks and exported methods", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows error overlay when onError event fires from renderer", async () => {
        (GalaxyRenderer as ReturnType<typeof vi.fn>).mockImplementationOnce(
            (_container: HTMLElement, _config: unknown, events: unknown) => {
                const evts = events as any;
                return {
                    initialize: vi.fn().mockImplementation(async () => {
                        await Promise.resolve();
                        evts.onError?.(new Error("renderer error"));
                    }),
                    dispose: vi.fn(),
                    onResize: vi.fn(),
                    focusOnStarSystem: vi.fn(),
                    highlightStarSystem: vi.fn(),
                    getCameraState: vi.fn(() => ({ zoom: 1 })),
                    getStats: vi.fn(() => ({ fps: 60 })),
                };
            },
        );

        const { container } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        expect(container.querySelector(".error-overlay")).not.toBeNull();
    });

    it("focusOnStarSystem exported method delegates to renderer", async () => {
        const { component } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        const inst = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        (component as any).focusOnStarSystem?.("solar-system", true);
        expect(inst?.focusOnStarSystem).toHaveBeenCalledWith(
            "solar-system",
            true,
        );
    });

    it("highlightStarSystem exported method delegates to renderer", async () => {
        const { component } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        const inst = (GalaxyRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        (component as any).highlightStarSystem?.("solar-system", true);
        expect(inst?.highlightStarSystem).toHaveBeenCalledWith(
            "solar-system",
            true,
        );
    });

    it("getCameraState returns value from renderer", async () => {
        const { component } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        const result = (component as any).getCameraState?.();
        expect(result).toEqual({ zoom: 1 });
    });

    it("getStats returns value from renderer", async () => {
        const { component } = render(GalaxyRendererComponent);
        await new Promise((r) => setTimeout(r, 50));
        const result = (component as any).getStats?.();
        expect(result).toEqual({ fps: 60 });
    });
});
