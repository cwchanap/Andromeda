/**
 * Svelte action: trap Tab focus within a dialog node, move focus into it on
 * mount, and restore focus to the previously-focused element on destroy.
 *
 * Used by modal-style overlays (SettingsPanel, Galaxy "Selected System"
 * dialog) so keyboard users cannot Tab out of the dialog and screen-reader
 * users get a predictable focus target.
 *
 * @param initialFocusSelector Optional CSS selector for the element to focus
 *   on mount. Defaults to the first focusable element, or the node itself.
 */
export function focusTrap(
    node: HTMLElement,
    initialFocusSelector?: string,
): { destroy(): void } {
    const trigger = document.activeElement as HTMLElement | null;
    // Query all potentially focusable elements, then filter by tabIndex >= 0
    // and absence of `disabled`. Filtering by `el.tabIndex >= 0` (rather than
    // a `:not([tabindex="-1"])` CSS pseudo-class) correctly excludes native
    // focusables (button/link/input) that explicitly opt out of the tab order
    // with `tabindex="-1"` — the CSS alternative only guards the `[tabindex]`
    // branch, so a `<button tabindex="-1">` would still match the `button`
    // branch and pollute the trap's focus cycle.
    const selector = "button, [href], input, select, textarea, [tabindex]";

    function focusables(): HTMLElement[] {
        return Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
            (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0,
        );
    }

    const target =
        (initialFocusSelector
            ? node.querySelector<HTMLElement>(initialFocusSelector)
            : null) ??
        focusables()[0] ??
        node;
    // Defer slightly so slotted content is rendered before focusing. Keep
    // the frame id so destroy() can cancel a pending callback — otherwise
    // the deferred focus can fire after teardown and steal focus back from
    // the restored trigger element.
    const focusFrame = requestAnimationFrame(() => target.focus());

    function onKeydown(event: KeyboardEvent) {
        if (event.key !== "Tab") return;
        const els = focusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    node.addEventListener("keydown", onKeydown);
    return {
        destroy() {
            cancelAnimationFrame(focusFrame);
            node.removeEventListener("keydown", onKeydown);
            trigger?.focus?.();
        },
    };
}
