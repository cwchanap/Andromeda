import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/svelte";
import SkyBackdrop from "@/components/home/SkyBackdrop.svelte";

describe("SkyBackdrop", () => {
    afterEach(() => cleanup());

    it("is hidden from assistive technology", () => {
        const { container } = render(SkyBackdrop);
        expect(
            container.querySelector(".sky")?.getAttribute("aria-hidden"),
        ).toBe("true");
    });

    it("draws the same seeded sky on every visit", async () => {
        const draw = async () => {
            const { container } = render(SkyBackdrop);
            await waitFor(() =>
                expect(container.querySelector(".sky-detail")).not.toBeNull(),
            );
            return container.innerHTML;
        };
        const first = await draw();
        cleanup();
        const second = await draw();
        expect(first).toBe(second);
        expect(first).toContain("Alpheratz");
    });
});
