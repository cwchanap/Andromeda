import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import ErrorBoundary from "../ErrorBoundary.svelte";

describe("ErrorBoundary", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    describe("Default State (no error)", () => {
        it("should render without crashing", () => {
            const { container } = render(ErrorBoundary);
            expect(container).toBeTruthy();
        });

        it("should not show error UI by default", () => {
            const { queryByText } = render(ErrorBoundary);
            expect(queryByText("Application Error")).toBeNull();
        });
    });

    describe("Error State", () => {
        it("should show error UI when window error event fires", async () => {
            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("Test error"),
                    message: "Test error",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Application Error")).toBeTruthy();
        });

        it("should display the default fallback message when an error occurs", async () => {
            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("boom"),
                    message: "boom",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Something went wrong")).toBeTruthy();
        });

        it("should display a custom fallback message", async () => {
            const { getByText } = render(ErrorBoundary, {
                props: { fallback: "Custom error message" },
            });

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("fail"),
                    message: "fail",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Custom error message")).toBeTruthy();
        });

        it("should show error technical details section", async () => {
            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("Technical error"),
                    message: "Technical error",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Technical Details")).toBeTruthy();
        });

        it("should show Reload Page button when error occurs", async () => {
            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("fail"),
                    message: "fail",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Reload Page")).toBeTruthy();
        });

        it("should show Try Again button by default when error occurs", async () => {
            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("fail"),
                    message: "fail",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Try Again")).toBeTruthy();
        });

        it("should not show Try Again button when showReset is false", async () => {
            const { queryByText } = render(ErrorBoundary, {
                props: { showReset: false },
            });

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("fail"),
                    message: "fail",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            expect(queryByText("Try Again")).toBeNull();
        });
    });

    describe("Reset Functionality", () => {
        it("should clear error state when Try Again is clicked", async () => {
            const { getByText, queryByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("reset me"),
                    message: "reset me",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            await fireEvent.click(getByText("Try Again"));

            expect(queryByText("Application Error")).toBeNull();
        });
    });

    describe("Reload Page", () => {
        it("should call window.location.reload when Reload Page is clicked", async () => {
            const reloadSpy = vi.fn();
            Object.defineProperty(window, "location", {
                configurable: true,
                value: { reload: reloadSpy },
            });

            const { getByText } = render(ErrorBoundary);

            window.dispatchEvent(
                new ErrorEvent("error", {
                    error: new Error("crash"),
                    message: "crash",
                }),
            );
            await new Promise((r) => setTimeout(r, 0));

            await fireEvent.click(getByText("Reload Page"));

            expect(reloadSpy).toHaveBeenCalledOnce();
        });
    });

    describe("Unhandled Promise Rejection", () => {
        it("should show error UI on unhandled rejection", async () => {
            const { getByText } = render(ErrorBoundary);

            // Dispatch a custom unhandledrejection event (PromiseRejectionEvent not in jsdom)
            const event = Object.assign(new Event("unhandledrejection"), {
                reason: "rejection reason",
                promise: Promise.resolve(),
            });
            window.dispatchEvent(event);
            await new Promise((r) => setTimeout(r, 0));

            expect(getByText("Application Error")).toBeTruthy();
        });
    });
});
