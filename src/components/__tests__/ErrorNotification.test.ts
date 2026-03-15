import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import ErrorNotification from "../ErrorNotification.svelte";

const makeError = (overrides = {}) => ({
    id: "err-1",
    message: "Something failed",
    severity: "medium" as const,
    timestamp: Date.now(),
    ...overrides,
});

describe("ErrorNotification", () => {
    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(ErrorNotification, {
                props: { error: makeError() },
            });
            expect(container).toBeTruthy();
        });

        it("should display the error message", () => {
            const { getByText } = render(ErrorNotification, {
                props: { error: makeError({ message: "Test error message" }) },
            });
            expect(getByText("Test error message")).toBeTruthy();
        });

        it("should render dismiss button with screen-reader text", () => {
            const { getByText } = render(ErrorNotification, {
                props: { error: makeError() },
            });
            expect(getByText("Dismiss")).toBeTruthy();
        });
    });

    describe("Severity Variants", () => {
        it("should render low severity with info icon", () => {
            const { container } = render(ErrorNotification, {
                props: { error: makeError({ severity: "low" }) },
            });
            expect(container.textContent).toContain("ℹ️");
        });

        it("should render medium severity with warning icon", () => {
            const { container } = render(ErrorNotification, {
                props: { error: makeError({ severity: "medium" }) },
            });
            expect(container.textContent).toContain("⚠️");
        });

        it("should render high severity with orange diamond icon", () => {
            const { container } = render(ErrorNotification, {
                props: { error: makeError({ severity: "high" }) },
            });
            expect(container.textContent).toContain("🔶");
        });

        it("should render critical severity with siren icon", () => {
            const { container } = render(ErrorNotification, {
                props: { error: makeError({ severity: "critical" }) },
            });
            expect(container.textContent).toContain("🚨");
        });
    });

    describe("Dev Info", () => {
        it("should not show dev info by default", () => {
            const error = makeError({ code: "ERR_CODE_123" });
            const { queryByText } = render(ErrorNotification, {
                props: { error },
            });
            expect(queryByText(/ERR_CODE_123/)).toBeNull();
        });

        it("should show dev info when showDevInfo is true and code is provided", () => {
            const error = makeError({
                code: "ERR_CODE_123",
                message: "Failed",
            });
            const { getByText } = render(ErrorNotification, {
                props: { error, showDevInfo: true },
            });
            expect(getByText(/ERR_CODE_123/)).toBeTruthy();
        });

        it("should not show code when showDevInfo is true but code is absent", () => {
            const error = makeError({ message: "Oops" });
            const { queryByText } = render(ErrorNotification, {
                props: { error, showDevInfo: true },
            });
            expect(queryByText(/\[/)).toBeNull();
        });
    });

    describe("Dismiss Button", () => {
        it("should be clickable without throwing", async () => {
            const { getByText } = render(ErrorNotification, {
                props: { error: makeError() },
            });
            await expect(
                fireEvent.click(getByText("Dismiss")),
            ).resolves.not.toThrow();
        });
    });
});
