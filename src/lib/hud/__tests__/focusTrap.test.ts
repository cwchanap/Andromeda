import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { focusTrap } from "@/lib/hud/focusTrap";

// The global test setup mocks requestAnimationFrame to NOT execute its
// callback. focusTrap defers initial focus via rAF, so for these tests we
// replace it with a synchronous executor and restore the mock afterwards.
let originalRaf: typeof globalThis.requestAnimationFrame;

beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
    }) as typeof globalThis.requestAnimationFrame;
});

afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    vi.clearAllMocks();
});

function mountDialog(focusablesHtml: string): HTMLElement {
    document.body.innerHTML = "";
    const trigger = document.createElement("button");
    trigger.textContent = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    const dialog = document.createElement("div");
    dialog.innerHTML = focusablesHtml;
    document.body.appendChild(dialog);
    return dialog;
}

function dispatchTab(target: HTMLElement, shiftKey = false): void {
    target.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: "Tab",
            bubbles: true,
            cancelable: true,
            shiftKey,
        }),
    );
}

describe("focusTrap", () => {
    it("moves focus to the initialFocusSelector element on mount", () => {
        const dialog = mountDialog(
            '<button class="other">Other</button><button class="close-btn">Close</button>',
        );
        focusTrap(dialog, ".close-btn");
        expect(document.activeElement).toBe(dialog.querySelector(".close-btn"));
    });

    it("defaults focus to the first focusable when no selector matches", () => {
        const dialog = mountDialog(
            '<button class="a">A</button><button class="b">B</button>',
        );
        focusTrap(dialog);
        expect(document.activeElement).toBe(dialog.querySelector(".a"));
    });

    it("wraps Tab from last focusable back to first", () => {
        const dialog = mountDialog(
            '<button class="a">A</button><button class="b">B</button>',
        );
        const action = focusTrap(dialog);
        const last = dialog.querySelector(".b") as HTMLElement;
        last.focus();
        dispatchTab(last, false);
        expect(document.activeElement).toBe(dialog.querySelector(".a"));
        action.destroy();
    });

    it("wraps Shift+Tab from first focusable back to last", () => {
        const dialog = mountDialog(
            '<button class="a">A</button><button class="b">B</button>',
        );
        const action = focusTrap(dialog);
        const first = dialog.querySelector(".a") as HTMLElement;
        first.focus();
        dispatchTab(first, true);
        expect(document.activeElement).toBe(dialog.querySelector(".b"));
        action.destroy();
    });

    it("does not intercept Tab when at a middle element", () => {
        const dialog = mountDialog(
            '<button class="a">A</button><button class="b">B</button><button class="c">C</button>',
        );
        const action = focusTrap(dialog);
        const middle = dialog.querySelector(".b") as HTMLElement;
        middle.focus();
        const event = new KeyboardEvent("keydown", {
            key: "Tab",
            bubbles: true,
            cancelable: true,
            shiftKey: false,
        });
        middle.dispatchEvent(event);
        // No wrap should occur; focus stays on the middle element.
        expect(document.activeElement).toBe(middle);
        expect(event.defaultPrevented).toBe(false);
        action.destroy();
    });

    it("falls back to focusing the node itself when no focusables exist", () => {
        document.body.innerHTML = "";
        const trigger = document.createElement("button");
        trigger.textContent = "trigger";
        document.body.appendChild(trigger);
        trigger.focus();
        const dialog = document.createElement("div");
        dialog.setAttribute("tabindex", "-1");
        document.body.appendChild(dialog);
        focusTrap(dialog);
        expect(document.activeElement).toBe(dialog);
    });

    it("treats Tab as a no-op (no throw, no wrap) when focusables list is empty", () => {
        const dialog = document.createElement("div");
        document.body.appendChild(dialog);
        const action = focusTrap(dialog);
        expect(() => dispatchTab(dialog, false)).not.toThrow();
        action.destroy();
    });

    it("restores focus to the previously-focused trigger on destroy", () => {
        const dialog = mountDialog('<button class="close-btn">Close</button>');
        const trigger = document.body.querySelector("button") as HTMLElement;
        // mountDialog focuses the trigger before appending the dialog.
        const action = focusTrap(dialog, ".close-btn");
        expect(document.activeElement).toBe(dialog.querySelector(".close-btn"));
        action.destroy();
        expect(document.activeElement).toBe(trigger);
    });

    it("ignores non-Tab keys", () => {
        const dialog = mountDialog(
            '<button class="a">A</button><button class="b">B</button>',
        );
        const action = focusTrap(dialog);
        const first = dialog.querySelector(".a") as HTMLElement;
        first.focus();
        first.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "ArrowRight",
                bubbles: true,
                cancelable: true,
            }),
        );
        expect(document.activeElement).toBe(first);
        action.destroy();
    });

    it("skips disabled focusable elements", () => {
        const dialog = mountDialog(
            '<button class="a" disabled>A</button><button class="b">B</button>',
        );
        focusTrap(dialog);
        // First non-disabled focusable is .b, not the disabled .a.
        expect(document.activeElement).toBe(dialog.querySelector(".b"));
    });

    it("excludes elements that opt out with tabindex=-1", () => {
        // A native focusable element (button/link) explicitly removed from
        // the tab order via tabindex="-1" (e.g. roving-tabindex rest state)
        // must not be treated as a focusable by the trap, otherwise initial
        // focus or Tab wrapping can land on an element the author intended
        // to be outside the tab order.
        const dialog = mountDialog(
            '<button class="a" tabindex="-1">A</button><button class="b">B</button>',
        );
        focusTrap(dialog);
        // First in-tab-order focusable is .b, not the opted-out .a.
        expect(document.activeElement).toBe(dialog.querySelector(".b"));

        // Tab wrapping must also skip the opted-out element: from .b,
        // Shift+Tab should wrap back to .b (only focusable), not .a.
        const b = dialog.querySelector(".b") as HTMLElement;
        b.focus();
        dispatchTab(b, true);
        expect(document.activeElement).toBe(b);
    });
});
