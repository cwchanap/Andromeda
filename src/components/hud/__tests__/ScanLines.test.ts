import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import ScanLines from "../ScanLines.svelte";

describe("ScanLines", () => {
    it("renders a non-interactive full-bleed overlay", () => {
        const { container } = render(ScanLines);
        const overlay = container.querySelector(".scan-lines") as HTMLElement;
        expect(overlay).not.toBeNull();
        expect(getComputedStyle(overlay).pointerEvents).toBe("none");
    });
});
