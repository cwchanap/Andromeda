import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import CosmicBackground from "@/components/CosmicBackground.svelte";

describe("CosmicBackground", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(CosmicBackground)).not.toThrow();
    });

    it("renders a root container element", () => {
        const { container } = render(CosmicBackground);
        expect(container.firstElementChild).not.toBeNull();
    });

    it("renders a div with pointer-events-none class", () => {
        const { container } = render(CosmicBackground);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain("pointer-events-none");
    });

    it("renders a fixed-position element", () => {
        const { container } = render(CosmicBackground);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain("fixed");
    });

    it("renders a negative z-index element", () => {
        const { container } = render(CosmicBackground);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain("z-[-1]");
    });

    it("mounts and unmounts without memory errors", () => {
        const { unmount } = render(CosmicBackground);
        expect(() => unmount()).not.toThrow();
    });

    it("unmounts cleanly (onDestroy dispose path)", () => {
        const { unmount } = render(CosmicBackground);
        // onDestroy calls cancelAnimationFrame and renderer.dispose
        // verify no throw on cleanup
        expect(() => unmount()).not.toThrow();
    });

    it("renders exactly one root element", () => {
        const { container } = render(CosmicBackground);
        expect(container.children).toHaveLength(1);
    });
});
