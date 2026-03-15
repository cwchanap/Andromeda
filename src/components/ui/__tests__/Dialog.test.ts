import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import Dialog from "../Dialog.svelte";

describe("Dialog", () => {
    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should not render content when open is false", () => {
            const { queryByRole } = render(Dialog, { props: { open: false } });
            expect(queryByRole("dialog")).toBeNull();
        });

        it("should render content when open is true", () => {
            const { getByRole } = render(Dialog, { props: { open: true } });
            expect(getByRole("dialog")).toBeTruthy();
        });

        it("should render close button by default when open", () => {
            const { container } = render(Dialog, { props: { open: true } });
            const closeButton = container.querySelector("button");
            expect(closeButton).toBeTruthy();
        });

        it("should not render close button when showCloseButton is false", () => {
            const { container } = render(Dialog, {
                props: { open: true, showCloseButton: false },
            });
            expect(container.querySelector("button")).toBeNull();
        });

        it("should have aria-modal attribute on dialog", () => {
            const { getByRole } = render(Dialog, { props: { open: true } });
            const dialog = getByRole("dialog");
            expect(dialog.getAttribute("aria-modal")).toBe("true");
        });

        it("should apply custom className to dialog content", () => {
            const { getByRole } = render(Dialog, {
                props: { open: true, className: "custom-dialog-class" },
            });
            const dialog = getByRole("dialog");
            expect(dialog.className).toContain("custom-dialog-class");
        });
    });

    describe("Close Button Interaction", () => {
        it("should not throw when close button is clicked", async () => {
            const { container } = render(Dialog, { props: { open: true } });
            const closeButton = container.querySelector(
                "button",
            ) as HTMLButtonElement;
            await expect(fireEvent.click(closeButton)).resolves.not.toThrow();
        });
    });

    describe("Overlay Click", () => {
        it("should not throw when overlay is clicked", async () => {
            const { container } = render(Dialog, { props: { open: true } });
            // The overlay is the outermost div (fixed inset-0) with role=button
            const overlay = container.querySelector(
                'div[role="button"]',
            ) as HTMLElement;
            await expect(fireEvent.click(overlay)).resolves.not.toThrow();
        });
    });

    describe("Keyboard Interaction", () => {
        it("should not throw when Escape key is pressed on overlay", async () => {
            const { container } = render(Dialog, { props: { open: true } });
            const overlay = container.querySelector(
                'div[role="button"]',
            ) as HTMLElement;
            await expect(
                fireEvent.keyDown(overlay, { key: "Escape" }),
            ).resolves.not.toThrow();
        });

        it("should not throw when Enter key is pressed on overlay", async () => {
            const { container } = render(Dialog, { props: { open: true } });
            const overlay = container.querySelector(
                'div[role="button"]',
            ) as HTMLElement;
            await expect(
                fireEvent.keyDown(overlay, { key: "Enter" }),
            ).resolves.not.toThrow();
        });

        it("should not throw when Escape is pressed on dialog content", async () => {
            const { getByRole } = render(Dialog, { props: { open: true } });
            const dialog = getByRole("dialog");
            await expect(
                fireEvent.keyDown(dialog, { key: "Escape" }),
            ).resolves.not.toThrow();
        });
    });
});
