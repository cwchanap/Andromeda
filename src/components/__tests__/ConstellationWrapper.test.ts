import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
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

    it("shows loading overlay initially (loading=true)", () => {
        const { container } = render(ConstellationWrapper);
        // loading starts as true, shows overlay with bg-black/80
        const overlay = container.querySelector(".bg-black\\/80");
        expect(overlay).not.toBeNull();
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
});
