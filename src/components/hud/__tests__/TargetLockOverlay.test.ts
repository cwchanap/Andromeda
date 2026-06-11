import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import TargetLockOverlay from "@/components/hud/TargetLockOverlay.svelte";

describe("TargetLockOverlay", () => {
    it("renders reticle, name and TARGET LOCKED badge by default", () => {
        const { container, getByText } = render(TargetLockOverlay, {
            props: { x: 100, y: 100, name: "Orion" },
        });
        expect(container.querySelector(".target-lock")).not.toBeNull();
        expect(getByText("Orion")).toBeTruthy();
        expect(getByText("TARGET LOCKED")).toBeTruthy();
    });

    it("renders custom lockedLabel when provided", () => {
        const { getByText } = render(TargetLockOverlay, {
            props: { x: 0, y: 0, name: "Mars", lockedLabel: "目標已鎖定" },
        });
        expect(getByText("目標已鎖定")).toBeTruthy();
    });
});
