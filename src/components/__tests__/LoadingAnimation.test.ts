import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import LoadingAnimation from "@/components/LoadingAnimation.svelte";

describe("LoadingAnimation", () => {
    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(LoadingAnimation);
            expect(container).toBeTruthy();
        });

        it("should render the default loading message", () => {
            const { getByText } = render(LoadingAnimation);
            expect(getByText("Loading solar system...")).toBeTruthy();
        });

        it("should render with a custom message", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { message: "Preparing the universe..." },
            });
            expect(getByText("Preparing the universe...")).toBeTruthy();
        });

        it("should render static subtitle text", () => {
            const { getByText } = render(LoadingAnimation);
            expect(
                getByText(
                    "Initializing 3D engine and loading celestial data...",
                ),
            ).toBeTruthy();
        });

        it("should render the Progress label", () => {
            const { getByText } = render(LoadingAnimation);
            expect(getByText("Progress")).toBeTruthy();
        });

        it("should show percentage for progress value", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 42 },
            });
            expect(getByText("42%")).toBeTruthy();
        });

        it("should round the progress percentage display", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 33.6 },
            });
            expect(getByText("34%")).toBeTruthy();
        });

        it("should show 0% when progress is 0", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 0 },
            });
            expect(getByText("0%")).toBeTruthy();
        });

        it("should show 100% when progress is 100", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 100 },
            });
            expect(getByText("100%")).toBeTruthy();
        });
    });

    describe("Fun Facts", () => {
        it("should show Sun fact when progress < 25", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 0 },
            });
            expect(
                getByText(/Sun contains 99.86% of the Solar System's mass/),
            ).toBeTruthy();
        });

        it("should show Jupiter fact when progress is 25-49", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 30 },
            });
            expect(getByText(/Jupiter has over 80 known moons/)).toBeTruthy();
        });

        it("should show Saturn fact when progress is 50-74", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 60 },
            });
            expect(
                getByText(/Saturn's rings are made mostly of water ice/),
            ).toBeTruthy();
        });

        it("should show Venus fact when progress is 75-99", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 80 },
            });
            expect(
                getByText(/Venus is the hottest planet in our solar system/),
            ).toBeTruthy();
        });

        it("should show ready message when progress is 100", () => {
            const { getByText } = render(LoadingAnimation, {
                props: { progress: 100 },
            });
            expect(
                getByText(/Ready to explore! Click on planets to learn more/),
            ).toBeTruthy();
        });
    });

    describe("Progress Step Indicators", () => {
        it("should render 5 step indicator dots", () => {
            const { container } = render(LoadingAnimation, {
                props: { progress: 50 },
            });
            // Find all the small dot divs in the step indicator
            // They're h-2 w-2 rounded-full divs inside a flex container
            const dots = container.querySelectorAll(".flex.space-x-2 > div");
            expect(dots.length).toBe(5);
        });
    });

    describe("Custom className", () => {
        it("should apply custom className to the outer container", () => {
            const { container } = render(LoadingAnimation, {
                props: { className: "test-custom-class" },
            });
            const outer = container.querySelector("div");
            expect(outer?.className).toContain("test-custom-class");
        });
    });
});
