import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import HudCallout from "../HudCallout.svelte";

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
});
