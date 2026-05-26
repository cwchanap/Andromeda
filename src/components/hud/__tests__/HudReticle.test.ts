import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudReticle from "@/components/hud/HudReticle.svelte";

describe("HudReticle", () => {
    it("positions itself at the given screen coordinates", () => {
        const { container } = render(HudReticle, {
            props: { x: 150, y: 300, state: "hover" },
        });
        const el = container.querySelector(".hud-reticle") as HTMLElement;
        expect(el.style.transform).toContain("translate(150px, 300px)");
    });

    it("applies data-state attribute for styling", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "locked" },
        });
        const el = container.querySelector(".hud-reticle");
        expect(el?.getAttribute("data-state")).toBe("locked");
    });

    it("renders the label when provided", () => {
        const { getByText } = render(HudReticle, {
            props: { x: 0, y: 0, state: "hover", label: "BETELGEUSE" },
        });
        expect(getByText("BETELGEUSE")).toBeTruthy();
    });

    it("does not render label by default", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "hover" },
        });
        const labelEl = container.querySelector(".reticle-label");
        expect(labelEl).toBeNull();
    });

    it("renders locked-state ticks when state is 'locked'", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "locked" },
        });
        const ticks = container.querySelector(".ticks");
        expect(ticks).not.toBeNull();
        const lines = ticks!.querySelectorAll("line");
        expect(lines).toHaveLength(8);
    });

    it("marks svg as decorative with aria-hidden", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "hover" },
        });
        const svg = container.querySelector("svg");
        expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });

    it("exposes label via aria-label on wrapper when label is set", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "hover", label: "Andromeda" },
        });
        const wrapper = container.querySelector(".hud-reticle");
        expect(wrapper?.getAttribute("aria-label")).toBe("Andromeda");
        expect(wrapper?.getAttribute("role")).toBe("img");
        expect(wrapper?.getAttribute("aria-hidden")).toBeNull();
    });

    it("hides from accessibility tree when no label is provided", () => {
        const { container } = render(HudReticle, {
            props: { x: 0, y: 0, state: "hover" },
        });
        const wrapper = container.querySelector(".hud-reticle");
        expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
        expect(wrapper?.getAttribute("role")).toBeNull();
        expect(wrapper?.getAttribute("aria-label")).toBeNull();
    });
});
