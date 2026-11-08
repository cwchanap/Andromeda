import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import ModalHarness from "@/components/__tests__/fixtures/ModalHarness.svelte";
import ModalBareHarness from "@/components/__tests__/fixtures/ModalBareHarness.svelte";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("Modal", () => {
    it("does not render the overlay while closed", () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: false },
        });

        expect(container.querySelector(".ui-modal-overlay")).toBeNull();
    });

    it("renders every named and default slot while open", () => {
        const { container, getByText } = render(ModalHarness, {
            props: { isOpen: true },
        });

        expect(getByText("Harness heading")).toBeTruthy();
        expect(getByText("Harness body content")).toBeTruthy();
        expect(getByText("Harness action")).toBeTruthy();
        expect(getByText("Harness notice")).toBeTruthy();
        expect(container.querySelector(".ui-modal-content")).not.toBeNull();
        expect(container.querySelector(".ui-modal-actions")).not.toBeNull();
        expect(container.querySelector(".ui-modal-notices")).not.toBeNull();
    });

    it("renders dialog semantics and passed aria attributes", () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: true },
        });
        const dialog = container.querySelector(".ui-modal-dialog");

        expect(dialog).not.toBeNull();
        expect(dialog?.getAttribute("role")).toBe("dialog");
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
        expect(dialog?.getAttribute("aria-label")).toBe(
            "Modal shell test dialog",
        );
        expect(dialog?.getAttribute("aria-labelledby")).toBe(
            "ui-modal-heading",
        );
        expect(dialog?.getAttribute("aria-describedby")).toBe(
            "ui-modal-description",
        );
    });

    it("calls onClose from the explicit close button", async () => {
        const onClose = vi.fn();
        const { container } = render(ModalHarness, {
            props: { isOpen: true, onClose },
        });

        await fireEvent.click(container.querySelector(".ui-modal-close")!);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop itself is clicked", async () => {
        const onClose = vi.fn();
        const { container } = render(ModalHarness, {
            props: { isOpen: true, onClose },
        });
        const overlay = container.querySelector(".ui-modal-overlay")!;

        await fireEvent.click(overlay);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when content inside the dialog is clicked", async () => {
        const onClose = vi.fn();
        const { container } = render(ModalHarness, {
            props: { isOpen: true, onClose },
        });

        await fireEvent.click(container.querySelector(".ui-modal-dialog")!);

        expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose for Escape when it is not swallowed", async () => {
        const onClose = vi.fn();
        const { container } = render(ModalHarness, {
            props: { isOpen: true, onClose },
        });

        await fireEvent.keyDown(container.querySelector(".ui-modal-overlay")!, {
            key: "Escape",
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when onEscape returns true", async () => {
        const onClose = vi.fn();
        const onEscape = vi.fn(() => true);
        const { container } = render(ModalHarness, {
            props: { isOpen: true, onClose, onEscape },
        });

        await fireEvent.keyDown(container.querySelector(".ui-modal-overlay")!, {
            key: "Escape",
        });

        expect(onEscape).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it("stops keydown events inside the dialog from reaching window handlers", async () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: true },
        });
        const dialogButton = container.querySelector(
            ".ui-modal-dialog button:not(.ui-modal-close)",
        ) as HTMLButtonElement;
        const windowKeydown = vi.fn();
        window.addEventListener("keydown", windowKeydown);

        try {
            dialogButton.focus();
            await fireEvent.keyDown(dialogButton, { key: "ArrowDown" });

            expect(windowKeydown).not.toHaveBeenCalled();
        } finally {
            window.removeEventListener("keydown", windowKeydown);
        }
    });

    it("moves focus into the dialog and restores it when the overlay is destroyed", async () => {
        const requestAnimationFrame = vi
            .spyOn(globalThis, "requestAnimationFrame")
            .mockImplementation((callback) => {
                queueMicrotask(() => callback(0));
                return 1;
            });
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.textContent = "Open modal";
        document.body.append(trigger);
        trigger.focus();

        try {
            const { container, rerender } = render(ModalHarness, {
                props: { isOpen: false },
            });

            await rerender({ isOpen: true });
            await waitFor(() =>
                expect(document.activeElement).toBe(
                    container.querySelector(".ui-modal-close"),
                ),
            );

            await rerender({ isOpen: false });
            await waitFor(() => expect(document.activeElement).toBe(trigger));
        } finally {
            requestAnimationFrame.mockRestore();
            trigger.remove();
        }
    });

    it("passes the complete close label through to the close button", () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: true, closeLabel: "Close this exact dialog now" },
        });

        expect(
            container
                .querySelector(".ui-modal-close")
                ?.getAttribute("aria-label"),
        ).toBe("Close this exact dialog now");
    });

    it("applies the max width to the dialog", () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: true },
        });
        const dialog = container.querySelector(
            ".ui-modal-dialog",
        ) as HTMLElement;

        expect(dialog.style.maxWidth).toBe("600px");
    });

    it("docks to the right when placement is right", () => {
        const { container } = render(ModalHarness, {
            props: { isOpen: true, placement: "right" },
        });

        expect(
            container
                .querySelector(".ui-modal-overlay")
                ?.classList.contains("is-right"),
        ).toBe(true);
    });

    it("omits the notices and actions chrome when those slots are not supplied", () => {
        const { container, getByText } = render(ModalBareHarness, {
            props: { isOpen: true },
        });

        expect(getByText("Bare heading")).toBeTruthy();
        expect(getByText("Bare body content")).toBeTruthy();
        expect(container.querySelector(".ui-modal-content")).not.toBeNull();
        // Consumers that supply neither optional slot (e.g. ComparisonModal)
        // must not get the empty padded footer chrome.
        expect(container.querySelector(".ui-modal-notices")).toBeNull();
        expect(container.querySelector(".ui-modal-actions")).toBeNull();
    });
});
