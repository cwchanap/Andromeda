import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import GlitchText from "../GlitchText.svelte";

describe("GlitchText", () => {
    it("settles to the final text after the animation completes", async () => {
        vi.useFakeTimers();
        const { getByTestId } = render(GlitchText, {
            props: { text: "ORION" },
        });
        vi.advanceTimersByTime(300);
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");
        vi.useRealTimers();
    });

    it("snaps to final text when reduced-motion is preferred", async () => {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockReturnValue({
                matches: true,
                media: "(prefers-reduced-motion: reduce)",
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }),
        });
        const { getByTestId } = render(GlitchText, {
            props: { text: "ORION" },
        });
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");
    });
});
