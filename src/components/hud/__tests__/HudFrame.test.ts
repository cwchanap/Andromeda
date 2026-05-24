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
        const line = container.querySelector("[data-corner] line");
        expect(line?.getAttribute("stroke")).toBe("#ff2db4");
    });

    it("applies hud-frame-glow class when glow prop is true", () => {
        const { container } = render(HudFrame, { props: { glow: true } });
        const wrapper = container.querySelector(".hud-frame") as HTMLElement;
        expect(wrapper.classList.contains("hud-frame-glow")).toBe(true);
    });

    it("does not apply hud-frame-glow class when glow is false (default)", () => {
        const { container } = render(HudFrame, { props: {} });
        const wrapper = container.querySelector(".hud-frame") as HTMLElement;
        expect(wrapper.classList.contains("hud-frame-glow")).toBe(false);
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
