import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import SettingsPanel from "@/components/hud/SettingsPanel.svelte";

const translations: Record<string, string> = {
    "settings.title": "Settings",
    "settings.language": "Language",
    "action.close": "Close",
};

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("SettingsPanel — closed state", () => {
    it("renders nothing when isOpen is false", () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: false, lang: "en", translations },
        });
        expect(container.querySelector('[role="dialog"]')).toBeNull();
    });
});

describe("SettingsPanel — open state", () => {
    it("renders a modal dialog when isOpen is true", () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
        expect(dialog?.getAttribute("aria-label")).toBe("Settings");
    });

    it("renders one language button per supported locale", () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
        });
        // languages = { en: "English", zh: "中文", ja: "日本語" }
        const langButtons = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".lang-btn"),
        );
        expect(langButtons).toHaveLength(3);
        const labels = langButtons.map((b) => b.textContent?.trim());
        expect(labels).toContain("English");
        expect(labels).toContain("中文");
        expect(labels).toContain("日本語");
        expect(
            container.querySelector('[role="group"][aria-label="Language"]'),
        ).toBeTruthy();
    });

    it("marks the current language button as pressed/active", () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "zh", translations },
        });
        const active = container.querySelector(".lang-btn.is-active");
        expect(active).toBeTruthy();
        expect(active?.textContent?.trim()).toBe("中文");
        expect(active?.getAttribute("aria-pressed")).toBe("true");
    });

    it("renders the per-view settings slot section", () => {
        // The panel owns the Language section plus a `settings` slot where each
        // view injects its own toggles. The slot mount (section) must exist so
        // wrappers can fill it.
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
        });
        const sections = container.querySelectorAll(".settings-section");
        // First section = Language; second section = the settings slot mount.
        expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("renders a Close button", () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
        });
        const closeBtn = container.querySelector(".close-btn");
        expect(closeBtn).toBeTruthy();
        expect(closeBtn?.textContent?.trim()).toBe("Close");
    });
});

describe("SettingsPanel — interactions", () => {
    beforeEach(() => {
        // Stub window.location so changeLanguage can read/assign href without
        // jsdom's "Not implemented: navigation" noise.
        Object.defineProperty(window, "location", {
            value: {
                href: "http://localhost/constellation?observer=alpha-centauri#details",
                pathname: "/constellation",
                search: "?observer=alpha-centauri",
                hash: "#details",
            },
            writable: true,
            configurable: true,
        });
    });

    it("dispatches close when the Close button is clicked", async () => {
        const closed = vi.fn();
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
            events: { close: closed },
        });
        const closeBtn = container.querySelector(".close-btn") as HTMLElement;
        await fireEvent.click(closeBtn);
        expect(closed).toHaveBeenCalled();
    });

    it("dispatches close on Escape keydown", () => {
        const closed = vi.fn();
        render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
            events: { close: closed },
        });
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(closed).toHaveBeenCalled();
    });

    it("dispatches close when the backdrop (overlay) is clicked", async () => {
        const closed = vi.fn();
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
            events: { close: closed },
        });
        const overlay = container.querySelector(
            ".settings-overlay",
        ) as HTMLElement;
        // Click directly on the overlay (not the panel) — target === currentTarget.
        await fireEvent.click(overlay);
        expect(closed).toHaveBeenCalled();
    });

    it("does not dispatch close when a language button is clicked", async () => {
        const closed = vi.fn();
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
            events: { close: closed },
        });
        const zhBtn = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".lang-btn"),
        ).find((b) => b.textContent?.trim() === "中文") as HTMLElement;
        await fireEvent.click(zhBtn);
        expect(closed).not.toHaveBeenCalled();
    });

    it("preserves observer query and hash while switching locale", async () => {
        const { container } = render(SettingsPanel, {
            props: { isOpen: true, lang: "en", translations },
        });
        const jaBtn = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".lang-btn"),
        ).find(
            (button) => button.textContent?.trim() === "日本語",
        ) as HTMLElement;

        await fireEvent.click(jaBtn);

        expect(window.location.href).toBe(
            "/ja/constellation?observer=alpha-centauri#details",
        );
    });
});
