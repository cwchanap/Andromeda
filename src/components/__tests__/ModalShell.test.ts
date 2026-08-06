import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import ModalShellHarness from "./fixtures/ModalShellHarness.svelte";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ModalShell", () => {
  it("does not render the overlay while closed", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: false },
    });

    expect(container.querySelector(".modal-shell-overlay")).toBeNull();
  });

  it("renders every named and default slot while open", () => {
    const { container, getByText } = render(ModalShellHarness, {
      props: { isOpen: true },
    });

    expect(getByText("Harness heading")).toBeTruthy();
    expect(getByText("Harness body content")).toBeTruthy();
    expect(getByText("Harness action")).toBeTruthy();
    expect(getByText("Harness notice")).toBeTruthy();
    expect(container.querySelector(".modal-shell-content")).not.toBeNull();
    expect(container.querySelector(".modal-shell-actions")).not.toBeNull();
    expect(container.querySelector(".modal-shell-notices")).not.toBeNull();
  });

  it("renders dialog semantics and passed aria attributes", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true },
    });
    const dialog = container.querySelector(".modal-shell-dialog");

    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe("Modal shell test dialog");
    expect(dialog?.getAttribute("aria-labelledby")).toBe(
      "modal-shell-heading",
    );
    expect(dialog?.getAttribute("aria-describedby")).toBe(
      "modal-shell-description",
    );
  });

  it("calls onClose from the explicit close button", async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, onClose },
    });

    await fireEvent.click(container.querySelector(".modal-shell-close")!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop itself is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, onClose },
    });
    const overlay = container.querySelector(".modal-shell-overlay")!;

    await fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when content inside the dialog is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, onClose },
    });

    await fireEvent.click(container.querySelector(".modal-shell-dialog")!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose for Escape when it is not swallowed", async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, onClose },
    });

    await fireEvent.keyDown(container.querySelector(".modal-shell-overlay")!, {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when onEscape returns true", async () => {
    const onClose = vi.fn();
    const onEscape = vi.fn(() => true);
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, onClose, onEscape },
    });

    await fireEvent.keyDown(container.querySelector(".modal-shell-overlay")!, {
      key: "Escape",
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
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
      const { container, rerender } = render(ModalShellHarness, {
        props: { isOpen: false },
      });

      await rerender({ isOpen: true });
      await waitFor(() =>
        expect(document.activeElement).toBe(
          container.querySelector(".modal-shell-close"),
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
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, closeLabel: "Close this exact dialog now" },
    });

    expect(
      container.querySelector(".modal-shell-close")?.getAttribute("aria-label"),
    ).toBe("Close this exact dialog now");
  });

  it("emits the exact custom theme variables and max width", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true },
    });
    const dialog = container.querySelector(".modal-shell-dialog") as HTMLElement;

    expect(dialog.style.getPropertyValue("--primary-color")).toBe("#123456");
    expect(dialog.style.getPropertyValue("--secondary-color")).toBe("#234567");
    expect(dialog.style.getPropertyValue("--accent-color")).toBe("#345678");
    expect(dialog.style.getPropertyValue("--modal-background")).toBe("#010203");
    expect(dialog.style.getPropertyValue("--modal-text-color")).toBe("#fefefe");
    expect(dialog.style.maxWidth).toBe("600px");
  });

  it("renders no decoration nodes for the none mode", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, decoration: "none" },
    });

    expect(container.querySelectorAll(".modal-shell-star")).toHaveLength(0);
    expect(container.querySelectorAll(".modal-shell-particle")).toHaveLength(0);
  });

  it("renders exactly 75 stars for the stars mode", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, decoration: "stars" },
    });

    expect(container.querySelectorAll(".modal-shell-star")).toHaveLength(75);
    expect(container.querySelectorAll(".modal-shell-particle")).toHaveLength(0);
  });

  it("renders 75 stars and 20 particles for the cosmic mode", () => {
    const { container } = render(ModalShellHarness, {
      props: { isOpen: true, decoration: "cosmic" },
    });

    expect(container.querySelectorAll(".modal-shell-star")).toHaveLength(75);
    expect(container.querySelectorAll(".modal-shell-particle")).toHaveLength(
      20,
    );
  });
});
