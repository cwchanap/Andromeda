import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import GlitchText from "@/components/hud/GlitchText.svelte";

afterEach(() => vi.restoreAllMocks());

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
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: true,
            media: "(prefers-reduced-motion: reduce)",
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
            onchange: null,
        } as MediaQueryList);
        const { getByTestId } = render(GlitchText, {
            props: { text: "ORION" },
        });
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");
    });

    it("restarts animation and settles to new text when text prop changes", async () => {
        vi.useFakeTimers();
        const { getByTestId, rerender } = render(GlitchText, {
            props: { text: "ORION" },
        });
        vi.advanceTimersByTime(300);
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");

        await rerender({ text: "LYRA" });
        vi.advanceTimersByTime(300);
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("LYRA");
        vi.useRealTimers();
    });

    it("clears the timer on unmount", () => {
        vi.useFakeTimers();
        const clearSpy = vi.spyOn(global, "clearInterval");
        const { unmount } = render(GlitchText, { props: { text: "ORION" } });
        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
        vi.useRealTimers();
    });

    it("restarts animation when durationMs prop changes", async () => {
        vi.useFakeTimers();
        const { getByTestId, rerender } = render(GlitchText, {
            props: { text: "ORION", durationMs: 200 },
        });
        vi.advanceTimersByTime(300);
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");

        // Changing durationMs should restart the animation
        await rerender({ text: "ORION", durationMs: 500 });
        // At this point animation should have restarted — display may be scrambled
        // Advance past new duration to settle
        vi.advanceTimersByTime(600);
        await tick();
        expect(getByTestId("glitch-text").textContent).toBe("ORION");
        vi.useRealTimers();
    });
});
