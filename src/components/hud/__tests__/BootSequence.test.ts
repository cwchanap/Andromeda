import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import BootSequence from "../BootSequence.svelte";

describe("BootSequence", () => {
    it("prints all lines after total duration", async () => {
        vi.useFakeTimers();
        const { container } = render(BootSequence, {
            props: { debugInfo: "Constellation view ready" },
        });
        vi.advanceTimersByTime(1200);
        await tick();
        const lines = container.querySelectorAll("[data-line]");
        expect(lines.length).toBeGreaterThanOrEqual(5);
        vi.useRealTimers();
    });

    it("renders the debugInfo text as the AWAITING TARGET line content when provided", () => {
        const { container } = render(BootSequence, {
            props: { debugInfo: "Getting user location..." },
        });
        expect(container.textContent).toContain("Getting user location");
    });
});
