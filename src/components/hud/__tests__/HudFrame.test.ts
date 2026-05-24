import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudFrame from "../HudFrame.svelte";

describe("HudFrame", () => {
    it("renders four corner brackets", () => {
        const { container } = render(HudFrame, { props: {} });
        const corners = container.querySelectorAll("[data-corner]");
        expect(corners.length).toBe(4);
    });

    it("applies the color prop to brackets via stroke", () => {
        const { container } = render(HudFrame, { props: { color: "#ff2db4" } });
        const path = container.querySelector("[data-corner] line");
        expect(path?.getAttribute("stroke")).toBe("#ff2db4");
    });

    it("respects bracketLength prop", () => {
        const { container } = render(HudFrame, {
            props: { bracketLength: 24 },
        });
        const wrapper = container.querySelector(".hud-frame") as HTMLElement;
        expect(wrapper?.style.getPropertyValue("--bracket-length")).toBe(
            "24px",
        );
    });
});
