import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import TargetLockOverlay from "../TargetLockOverlay.svelte";

describe("TargetLockOverlay", () => {
    it("does not render when visible is false", () => {
        const { container } = render(TargetLockOverlay, {
            props: { visible: false, x: 100, y: 100, name: "Orion" },
        });
        expect(container.querySelector(".target-lock")).toBeNull();
    });

    it("renders reticle, name and TARGET LOCKED badge when visible", () => {
        const { container, getByText } = render(TargetLockOverlay, {
            props: { visible: true, x: 100, y: 100, name: "Orion" },
        });
        expect(container.querySelector(".target-lock")).not.toBeNull();
        expect(getByText("Orion")).toBeTruthy();
        expect(getByText("TARGET LOCKED")).toBeTruthy();
    });
});
