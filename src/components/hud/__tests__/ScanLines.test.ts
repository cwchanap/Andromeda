import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import ScanLines from "../ScanLines.svelte";

describe("ScanLines", () => {
    it("renders the overlay with both gradient layers", () => {
        const { container } = render(ScanLines);
        const overlay = container.querySelector(".scan-lines") as HTMLElement;
        expect(overlay).not.toBeNull();
        expect(overlay.getAttribute("aria-hidden")).toBe("true");
        expect(container.querySelector(".scan-lines-fine")).not.toBeNull();
        expect(container.querySelector(".scan-lines-coarse")).not.toBeNull();
    });

    it("forwards the opacity prop to the --scan-opacity CSS variable", () => {
        const { container } = render(ScanLines, { props: { opacity: 0.3 } });
        const overlay = container.querySelector(".scan-lines") as HTMLElement;
        expect(overlay.style.getPropertyValue("--scan-opacity")).toBe("0.3");
    });
});
