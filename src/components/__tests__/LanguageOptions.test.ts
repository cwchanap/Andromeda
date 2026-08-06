import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import LanguageOptions from "@/components/LanguageOptions.svelte";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("LanguageOptions", () => {
    it("renders every supported language and marks the current locale active", () => {
        const { container } = render(LanguageOptions, {
            props: {
                lang: "zh",
                translations: { "settings.language": "Language" },
            },
        });

        expect(container.querySelectorAll(".lang-btn")).toHaveLength(3);
        expect(
            container.querySelector('.lang-btn.is-active[aria-pressed="true"]')
                ?.textContent?.trim(),
        ).toBe("中文");
        expect(container.querySelector(".lang-btn")?.getAttribute("aria-pressed")).toBe(
            "false",
        );
        expect(container.textContent).toContain("English");
        expect(container.textContent).toContain("日本語");
    });

    it("uses the translated language label for the group", () => {
        const { container } = render(LanguageOptions, {
            props: {
                lang: "en",
                translations: { "settings.language": "Langue" },
            },
        });

        expect(
            container.querySelector('[role="group"]')?.getAttribute("aria-label"),
        ).toBe("Langue");
    });

    it("preserves the query and hash while switching locale", async () => {
        Object.defineProperty(window, "location", {
            value: {
                href: "http://localhost/zh/constellation?observer=alpha-centauri#details",
                pathname: "/zh/constellation",
                search: "?observer=alpha-centauri",
                hash: "#details",
            },
            writable: true,
            configurable: true,
        });

        const { container } = render(LanguageOptions, {
            props: {
                lang: "zh",
                translations: { "settings.language": "Language" },
            },
        });
        const jaButton = Array.from(
            container.querySelectorAll<HTMLButtonElement>(".lang-btn"),
        ).find((button) => button.textContent?.trim() === "日本語");

        await fireEvent.click(jaButton as HTMLButtonElement);

        expect(window.location.href).toBe(
            "/ja/constellation?observer=alpha-centauri#details",
        );
    });
});
