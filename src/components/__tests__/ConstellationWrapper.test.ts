import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import ConstellationWrapper from "@/components/ConstellationWrapper.svelte";

// Mock ConstellationRenderer
vi.mock("@/lib/constellation/ConstellationRenderer", () => {
    const mockRenderer = {
        initialize: vi.fn().mockResolvedValue(undefined),
        dispose: vi.fn(),
        resize: vi.fn(),
        setSelected: vi.fn(),
        setHovered: vi.fn(),
        tweenCameraTo: vi.fn(),
        worldToScreen: vi.fn(() => ({ x: 0, y: 0, visible: false })),
    };
    return {
        ConstellationRenderer: vi.fn().mockImplementation(() => mockRenderer),
    };
});

// Mock astronomy utilities
vi.mock("@/utils/astronomy", () => ({
    getCurrentLocation: vi
        .fn()
        .mockRejectedValue(new Error("Location unavailable")),
    isConstellationVisible: vi.fn(() => true),
    formatCoordinates: vi.fn(() => "40.71°N, 74.01°W"),
    celestialToSphere: vi.fn(() => ({ x: 0, y: 0, z: 100, visible: true })),
}));

// Mock constellation data
vi.mock("@/data/constellations", () => ({
    constellations: [
        {
            id: "orion",
            name: "Orion",
            stars: [],
            lines: [],
            rightAscension: 5.5,
            declination: 5,
        },
    ],
    getVisibleConstellations: vi.fn(() => [
        {
            id: "orion",
            name: "Orion",
            stars: [],
            lines: [],
            rightAscension: 5.5,
            declination: 5,
        },
    ]),
}));

describe("ConstellationWrapper", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(ConstellationWrapper)).not.toThrow();
    });

    it("renders the .constellation-view root element", () => {
        const { container } = render(ConstellationWrapper);
        const root = container.querySelector(".constellation-view");
        expect(root).not.toBeNull();
    });

    it("renders the back button", () => {
        const { container } = render(ConstellationWrapper);
        const backBtn = container.querySelector("button");
        expect(backBtn).not.toBeNull();
    });

    it("renders the controls toggle button", () => {
        const { container } = render(ConstellationWrapper);
        const buttons = container.querySelectorAll("button");
        // At least 2 buttons: back and controls toggle
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("shows an overlay when loading or error state is active", () => {
        const { container } = render(ConstellationWrapper);
        // In jsdom, WebGL is unavailable so onMount sets webglSupported=false
        // and the WebGL fallback overlay renders (pointer-events-none).
        // If loading were still true the BootSequence would render instead.
        const webglFallback = container.querySelector(".pointer-events-none");
        const bootSequence = container.querySelector(".boot-sequence");
        // At least one overlay should be present
        expect(webglFallback !== null || bootSequence !== null).toBe(true);
    });

    it("prioritizes WebGL fallback over generic error when WebGL is unsupported", () => {
        const { container } = render(ConstellationWrapper);
        // In jsdom, both webglSupported=false and error may be set.
        // The WebGL fallback (with amber ⚠️) should take precedence over
        // the generic error overlay (with red ❌).
        const webglHeading = container.querySelector(".text-amber-400");
        const errorHeading = container.querySelector(".text-red-400");
        // WebGL fallback should be shown, generic error should NOT
        expect(webglHeading).not.toBeNull();
        expect(errorHeading).toBeNull();
    });

    it("unmounts cleanly", () => {
        const { unmount } = render(ConstellationWrapper);
        expect(() => unmount()).not.toThrow();
    });

    it("renders a root element with children", () => {
        const { container } = render(ConstellationWrapper);
        expect(container.firstElementChild).not.toBeNull();
        expect(container.firstElementChild!.children.length).toBeGreaterThan(0);
    });

    it("drag instructions overlay uses z-10 utility class", async () => {
        // Mock canvas.getContext so checkWebGLSupport() returns true,
        // allowing the drag instructions overlay to render.
        const mockShader = {};
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            createShader: () => mockShader,
        }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

        try {
            const { container } = render(ConstellationWrapper);

            // Wait for the async init flow to complete (location → renderer → loading=false)
            await waitFor(() => {
                expect(container.innerHTML).toContain("z-10");
            });
        } finally {
            HTMLCanvasElement.prototype.getContext = origGetContext;
        }
    });
});
