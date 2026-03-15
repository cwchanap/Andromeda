import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import Progress from "../Progress.svelte";

describe("Progress", () => {
    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(Progress);
            expect(container).toBeTruthy();
        });

        it("should render a progress bar container", () => {
            const { container } = render(Progress);
            const progressBar = container.querySelector("div");
            expect(progressBar).toBeTruthy();
        });

        it("should render with default value of 0", () => {
            const { container } = render(Progress);
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-100%)");
        });

        it("should render with a custom value", () => {
            const { container } = render(Progress, { props: { value: 50 } });
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-50%)");
        });

        it("should render at 100% when value is 100", () => {
            const { container } = render(Progress, { props: { value: 100 } });
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-0%)");
        });

        it("should render at 0% when value is 0", () => {
            const { container } = render(Progress, { props: { value: 0 } });
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-100%)");
        });

        it("should apply custom className", () => {
            const { container } = render(Progress, {
                props: { className: "h-4 custom-class" },
            });
            const outer = container.querySelector("div") as HTMLElement;
            expect(outer.className).toContain("custom-class");
        });

        it("should apply h-2 class when provided", () => {
            const { container } = render(Progress, {
                props: { value: 75, className: "h-2" },
            });
            const outer = container.querySelector("div") as HTMLElement;
            expect(outer.className).toContain("h-2");
        });
    });

    describe("Value Edge Cases", () => {
        it("should handle value of 25", () => {
            const { container } = render(Progress, { props: { value: 25 } });
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-75%)");
        });

        it("should handle value of 75", () => {
            const { container } = render(Progress, { props: { value: 75 } });
            const inner = container.querySelector("[style]") as HTMLElement;
            expect(inner.getAttribute("style")).toContain("translateX(-25%)");
        });
    });
});
