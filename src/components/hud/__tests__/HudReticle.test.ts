import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudReticle from "../HudReticle.svelte";

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
});
