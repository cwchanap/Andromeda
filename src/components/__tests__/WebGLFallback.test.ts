import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import WebGLFallback from "../WebGLFallback.svelte";

describe("WebGLFallback", () => {
    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(WebGLFallback);
            expect(container).toBeTruthy();
        });

        it("should display the main heading", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("3D Graphics Not Available")).toBeTruthy();
        });

        it("should display the explanation text", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText(/doesn't support WebGL/)).toBeTruthy();
        });

        it("should render troubleshooting heading", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Try These Solutions:")).toBeTruthy();
        });

        it("should display supported browsers section", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Supported Browsers:")).toBeTruthy();
            expect(getByText("• Chrome 9+")).toBeTruthy();
            expect(getByText("• Firefox 4+")).toBeTruthy();
        });

        it("should show 'Try Again' button by default", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Try Again")).toBeTruthy();
        });

        it("should show 'Go to Home' button by default", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Go to Home")).toBeTruthy();
        });
    });

    describe("Conditional Button Rendering", () => {
        it("should not show 'Try Again' button when showRetry is false", () => {
            const { queryByText } = render(WebGLFallback, {
                props: { showRetry: false },
            });
            expect(queryByText("Try Again")).toBeNull();
        });

        it("should not show 'Go to Home' button when showGoHome is false", () => {
            const { queryByText } = render(WebGLFallback, {
                props: { showGoHome: false },
            });
            expect(queryByText("Go to Home")).toBeNull();
        });

        it("should show neither button when both are disabled", () => {
            const { queryByText } = render(WebGLFallback, {
                props: { showRetry: false, showGoHome: false },
            });
            expect(queryByText("Try Again")).toBeNull();
            expect(queryByText("Go to Home")).toBeNull();
        });

        it("should show only 'Try Again' when showGoHome is false", () => {
            const { getByText, queryByText } = render(WebGLFallback, {
                props: { showGoHome: false },
            });
            expect(getByText("Try Again")).toBeTruthy();
            expect(queryByText("Go to Home")).toBeNull();
        });
    });

    describe("Button Interactions", () => {
        it("should not throw when 'Try Again' is clicked", async () => {
            const { getByText } = render(WebGLFallback);
            await expect(
                fireEvent.click(getByText("Try Again")),
            ).resolves.not.toThrow();
        });

        it("should not throw when 'Go to Home' is clicked", async () => {
            const { getByText } = render(WebGLFallback);
            await expect(
                fireEvent.click(getByText("Go to Home")),
            ).resolves.not.toThrow();
        });
    });

    describe("Troubleshooting Steps", () => {
        it("should display Update Your Browser step", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Update Your Browser")).toBeTruthy();
        });

        it("should display Enable Hardware Acceleration step", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Enable Hardware Acceleration")).toBeTruthy();
        });

        it("should display Try a Different Browser step", () => {
            const { getByText } = render(WebGLFallback);
            expect(getByText("Try a Different Browser")).toBeTruthy();
        });
    });
});
