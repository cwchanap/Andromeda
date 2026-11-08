import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import LoadingAnimation from "@/components/LoadingAnimation.svelte";

describe("LoadingAnimation", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders the default loading message", () => {
        const { getByText } = render(LoadingAnimation);
        expect(getByText("Loading solar system...")).toBeTruthy();
    });

    it("renders a custom message", () => {
        const { getByText } = render(LoadingAnimation, {
            props: { message: "Preparing the universe..." },
        });
        expect(getByText("Preparing the universe...")).toBeTruthy();
    });

    it("announces itself as a status region", () => {
        const { getByRole } = render(LoadingAnimation);
        expect(getByRole("status")).toBeTruthy();
    });

    it.each([
        [0, "0%"],
        [42, "42%"],
        [33.6, "34%"],
        [100, "100%"],
    ])("shows the rounded percentage for progress %s", (progress, label) => {
        const { getByText } = render(LoadingAnimation, {
            props: { progress },
        });
        expect(getByText(label)).toBeTruthy();
    });

    it("hides the progress bar when progress is null (indeterminate)", () => {
        const { container } = render(LoadingAnimation, {
            props: { progress: null },
        });
        expect(container.querySelector(".loading-progress")).toBeNull();
        expect(container.textContent).not.toContain("%");
    });

    it("applies a custom className to the outer container", () => {
        const { container } = render(LoadingAnimation, {
            props: { className: "test-custom-class" },
        });
        const outer = container.querySelector(".loading-animation");
        expect(outer?.className).toContain("test-custom-class");
    });
});
