import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import ViewHud from "@/components/hud/ViewHud.svelte";

const translations: Record<string, string> = {
    "controls.backToMenu": "← Back to Menu",
    "nav.settings": "Settings",
    "settings.title": "Settings",
    "settings.language": "Language",
    "action.close": "Close",
    "viewSwitcher.label": "VIEW",
    "viewSwitcher.star": "Star",
    "viewSwitcher.galaxy": "Galaxy",
    "viewSwitcher.constellation": "Constellation",
};

afterEach(() => {
    cleanup();
});

describe("ViewHud", () => {
    it("renders the Back-to-Menu button in the top-left corner", () => {
        const { container, getByRole } = render(ViewHud, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        expect(container.querySelector(".hud-top-left .hud-btn")).toBeTruthy();
        expect(getByRole("button", { name: "← Back to Menu" })).toBeTruthy();
    });

    it("renders the Settings gear in the top-right corner", () => {
        const { container, getByRole } = render(ViewHud, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        expect(container.querySelector(".hud-top-right .hud-btn")).toBeTruthy();
        expect(getByRole("button", { name: "Settings" })).toBeTruthy();
    });

    it("renders the embedded ViewSwitcher with the current view highlighted", () => {
        const { container } = render(ViewHud, {
            props: { currentView: "constellation", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher");
        expect(nav).toBeTruthy();
        const active = nav?.querySelector("a.is-active");
        expect(active?.textContent?.trim()).toBe("Constellation");
        expect(active?.getAttribute("aria-current")).toBe("page");
    });

    it("opens the settings panel when the gear is clicked", async () => {
        const { container, getByRole } = render(ViewHud, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        // No dialog initially.
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        await fireEvent.click(getByRole("button", { name: "Settings" }));
        const dialog = await waitForDialog(container);
        expect(dialog).toBeTruthy();
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
    });

    it("renders all named slot containers so wrappers can fill them", () => {
        const { container } = render(ViewHud, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        // The shell must provide these slot mounts for the per-view snippets.
        expect(container.querySelector(".hud-info")).toBeTruthy();
        expect(container.querySelector(".hud-controls")).toBeTruthy();
        expect(container.querySelector(".hud-overlay")).toBeTruthy();
        expect(container.querySelector(".hud-bottom-left")).toBeTruthy();
        expect(container.querySelector(".hud-bottom-right")).toBeTruthy();
    });

    it("propagates currentView changes to the switcher active link", () => {
        // Render with star active, then re-render with galaxy active to verify
        // the prop flows through to the embedded ViewSwitcher.
        const first = render(ViewHud, {
            props: { currentView: "star", lang: "en", translations },
        });
        expect(
            first.container
                .querySelector("nav.view-switcher")
                ?.querySelector("a.is-active")
                ?.textContent?.trim(),
        ).toBe("Star");
        cleanup();
        const second = render(ViewHud, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        expect(
            second.container
                .querySelector("nav.view-switcher")
                ?.querySelector("a.is-active")
                ?.textContent?.trim(),
        ).toBe("Galaxy");
    });
});

// SettingsPanel mounts via focusTrap which defers focus through rAF (a no-op
// in the test env); the dialog node still renders synchronously, so a simple
// query suffices.
function waitForDialog(container: HTMLElement): HTMLElement | null {
    return container.querySelector('[role="dialog"]');
}
