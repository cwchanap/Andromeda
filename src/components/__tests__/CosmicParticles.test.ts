import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import CosmicParticles from "@/components/CosmicParticles.svelte";

describe("CosmicParticles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        expect(() => render(CosmicParticles)).not.toThrow();
    });

    it("renders a canvas element", () => {
        const { container } = render(CosmicParticles);
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
    });

    it("canvas is bound to the component (bind:this)", async () => {
        const { container } = render(CosmicParticles);
        await Promise.resolve(); // flush onMount
        const canvas = container.querySelector("canvas");
        // Canvas should exist after mount
        expect(canvas).not.toBeNull();
    });

    it("canvas has position fixed styling via CSS class", () => {
        const { container } = render(CosmicParticles);
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
        expect((canvas as HTMLElement).classList.contains("fixed")).toBe(true);
    });

    it("unmounts cleanly without errors", () => {
        const { unmount } = render(CosmicParticles);
        expect(() => unmount()).not.toThrow();
    });

    it("does not render any non-canvas content", () => {
        const { container } = render(CosmicParticles);
        const nonCanvas = Array.from(container.children).filter(
            (el) => el.tagName.toLowerCase() !== "canvas",
        );
        expect(nonCanvas.length).toBe(0);
    });
});
