import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector.svelte";

describe("GlobalLanguageSelector", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render without crashing", () => {
        const { container } = render(GlobalLanguageSelector);
        expect(container).toBeTruthy();
    });

    it("should render a fixed-position container", () => {
        const { container } = render(GlobalLanguageSelector);
        const wrapper = container.querySelector("div");
        expect(wrapper).toBeTruthy();
        expect(wrapper?.className).toContain("fixed");
    });

    it("should render the language selector button", () => {
        const { container } = render(GlobalLanguageSelector);
        const button = container.querySelector("button");
        expect(button).toBeTruthy();
    });
});
