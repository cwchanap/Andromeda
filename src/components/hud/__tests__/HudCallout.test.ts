import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudCallout from "@/components/hud/HudCallout.svelte";

describe("HudCallout", () => {
    it("positions the card next to the anchor point", () => {
        const { container } = render(HudCallout, {
            props: { x: 100, y: 200, title: "Sirius", lines: ["Mag -1.46"] },
        });
        const card = container.querySelector(".callout-card") as HTMLElement;
        expect(card.style.transform).toContain("translate(132px, 200px)");
    });

    it("renders title and each body line", () => {
        const { getByText } = render(HudCallout, {
            props: {
                x: 0,
                y: 0,
                title: "Vega",
                lines: ["Mag 0.03", "Spectral A0V"],
            },
        });
        expect(getByText("Vega")).toBeTruthy();
        expect(getByText("Mag 0.03")).toBeTruthy();
        expect(getByText("Spectral A0V")).toBeTruthy();
    });

    it("renders the leader element with aria-hidden", () => {
        const { container } = render(HudCallout, {
            props: { x: 0, y: 0, title: "Sirius", lines: ["Mag -1.46"] },
        });
        const leader = container.querySelector(
            ".callout-leader",
        ) as HTMLElement;
        expect(leader).toBeTruthy();
        expect(leader.getAttribute("aria-hidden")).toBe("true");
    });

    it("custom offset adjusts leader width and card translate", () => {
        const { container } = render(HudCallout, {
            props: {
                x: 100,
                y: 200,
                title: "Sirius",
                lines: ["Mag -1.46"],
                offset: 50,
            },
        });
        const leader = container.querySelector(
            ".callout-leader",
        ) as HTMLElement;
        expect(leader.style.width).toBe("50px");
        const card = container.querySelector(".callout-card") as HTMLElement;
        expect(card.style.transform).toContain("translate(150px, 200px)");
    });

    it("renders without crashing when lines is empty", () => {
        const { getByText, container } = render(HudCallout, {
            props: { x: 0, y: 0, title: "Vega", lines: [] },
        });
        expect(getByText("Vega")).toBeTruthy();
        const lineElements = container.querySelectorAll(".callout-line");
        expect(lineElements.length).toBe(0);
    });

    it("marks card as a tooltip for assistive tech", () => {
        const { container } = render(HudCallout, {
            props: { x: 0, y: 0, title: "Sirius", lines: ["Mag -1.46"] },
        });
        const card = container.querySelector(".callout-card") as HTMLElement;
        expect(card.getAttribute("role")).toBe("tooltip");
    });
});
