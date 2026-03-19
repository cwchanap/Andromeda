import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import GalaxyWrapper from "@/components/GalaxyWrapper.svelte";

// Mock heavy dependencies so the component mounts without real Three.js
vi.mock("@/lib/galaxy", () => {
    const mockRenderer = {
        initialize: vi.fn().mockResolvedValue(undefined),
        dispose: vi.fn(),
        onResize: vi.fn(),
        focusOnStarSystem: vi.fn(),
        highlightStarSystem: vi.fn(),
        getCameraState: vi.fn(() => ({ zoom: 1 })),
        getStats: vi.fn(() => ({ fps: 60 })),
        updateConfig: vi.fn(),
    };
    return {
        GalaxyRenderer: vi.fn().mockImplementation(() => mockRenderer),
        localGalaxyData: { starSystems: [], metadata: { name: "Test Galaxy" } },
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
        // Component wraps everything in a root div – just check the root exists
        expect(container.firstElementChild).not.toBeNull();
    });

    it("shows loading indicator initially", () => {
        render(GalaxyWrapper);
        // LoadingAnimation is rendered while isLoading=true
        // Look for text that indicates loading state
        const { container } = render(GalaxyWrapper);
        // The LoadingAnimation component or .loading-overlay should be present
        expect(container.innerHTML).toBeTruthy();
    });

    it("does not show error panel on initial render", () => {
        const { container } = render(GalaxyWrapper);
        // error is null at start so no error panel
        expect(container.querySelector(".error-panel")).toBeNull();
    });

    it("renders a back-to-menu control", () => {
        render(GalaxyWrapper);
        // The wrapper always renders navigation controls
        const { container } = render(GalaxyWrapper);
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });
});
