import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import SkyBackdrop from "@/components/home/SkyBackdrop.svelte";

describe("SkyBackdrop", () => {
    afterEach(() => cleanup());

    it("is hidden from assistive technology", () => {
        const { container } = render(SkyBackdrop);
        expect(
            container.querySelector(".sky")?.getAttribute("aria-hidden"),
        ).toBe("true");
    });

    it("draws the same sky on every render, so SSR and hydration match", () => {
        const first = render(SkyBackdrop).container.innerHTML;
        cleanup();
        const second = render(SkyBackdrop).container.innerHTML;
        expect(first).toBe(second);
        expect(first).toContain("Alpheratz");
    });
});
