import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import GalaxyRenderer from "@/components/GalaxyRenderer.svelte";

// Mock the galaxy lib so no real Three.js renderer is created
vi.mock("@/lib/galaxy", () => {
    const mockRenderer = {
        initialize: vi.fn().mockResolvedValue(undefined),
        dispose: vi.fn(),
        onResize: vi.fn(),
        focusOnStarSystem: vi.fn(),
        highlightStarSystem: vi.fn(),
        getCameraState: vi.fn(() => ({ zoom: 1 })),
        getStats: vi.fn(() => ({ fps: 60 })),
    };

    return {
        GalaxyRenderer: vi.fn().mockImplementation(() => mockRenderer),
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
        expect(() => render(GalaxyRenderer)).not.toThrow();
    });

    it("renders a .galaxy-wrapper container", () => {
        const { container } = render(GalaxyRenderer);
        expect(container.querySelector(".galaxy-wrapper")).not.toBeNull();
    });

    it("shows loading overlay initially", () => {
        const { container } = render(GalaxyRenderer);
        // isLoading starts as true before onMount completes
        const loadingOverlay = container.querySelector(".loading-overlay");
        expect(loadingOverlay).not.toBeNull();
    });

    it("loading overlay contains 'Loading galaxy' text", () => {
        render(GalaxyRenderer);
        expect(screen.getByText(/Loading galaxy/i)).toBeDefined();
    });

    it("does not show error overlay on initial render", () => {
        const { container } = render(GalaxyRenderer);
        const errorOverlay = container.querySelector(".error-overlay");
        expect(errorOverlay).toBeNull();
    });

    it("with autoStart=false does not initialize the renderer on mount", async () => {
        const { GalaxyRenderer: MockGalaxyRenderer } =
            await import("@/lib/galaxy");
        render(GalaxyRenderer, { props: { autoStart: false } });
        await Promise.resolve();
        expect(MockGalaxyRenderer).not.toHaveBeenCalled();
    });

    it("accepts a config prop without throwing", () => {
        expect(() =>
            render(GalaxyRenderer, {
                props: {
                    config: {
                        performanceMode: "low" as const,
                        enableControls: false,
                    },
                },
            }),
        ).not.toThrow();
    });
});
