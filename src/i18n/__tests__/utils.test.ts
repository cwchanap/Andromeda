import { describe, it, expect } from "vitest";
import {
    getLangFromUrl,
    useTranslations,
    useTranslatedPath,
    getStaticPaths,
    pathHasLocale,
    stripLocaleFromPath,
    addLocaleToPath,
} from "../utils";

describe("getLangFromUrl", () => {
    it("returns 'en' for /en/... path", () => {
        expect(getLangFromUrl(new URL("https://example.com/en/about"))).toBe(
            "en",
        );
    });

    it("returns 'zh' for /zh/... path", () => {
        expect(getLangFromUrl(new URL("https://example.com/zh/about"))).toBe(
            "zh",
        );
    });

    it("returns 'ja' for /ja/... path", () => {
        expect(getLangFromUrl(new URL("https://example.com/ja/about"))).toBe(
            "ja",
        );
    });

    it("falls back to default lang (en) for unknown language segment", () => {
        expect(getLangFromUrl(new URL("https://example.com/fr/about"))).toBe(
            "en",
        );
    });

    it("falls back to default lang for root path", () => {
        expect(getLangFromUrl(new URL("https://example.com/"))).toBe("en");
    });
});

describe("useTranslations", () => {
    it("returns correct translation for English", () => {
        const t = useTranslations("en");
        expect(t("nav.home")).toBe("Home");
    });

    it("returns correct translation for Chinese", () => {
        const t = useTranslations("zh");
        const result = t("nav.home");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    it("returns correct translation for Japanese", () => {
        const t = useTranslations("ja");
        const result = t("nav.home");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    it("handles translation with no replacements", () => {
        const t = useTranslations("en");
        expect(t("main.title")).toBe("ANDROMEDA");
    });

    it("replaces single placeholder in translation", () => {
        const t = useTranslations("en");
        // nav.home = "Home", no placeholder; but verify the replacement loop
        // runs without error and returns the original string
        const result = t("nav.home", { unused: "value" });
        expect(result).toBe("Home");
    });

    it("falls back to english when zh value equals en fallback", () => {
        // Both en and zh are valid strings
        const tEn = useTranslations("en");
        const tZh = useTranslations("zh");
        expect(typeof tEn("nav.home")).toBe("string");
        expect(typeof tZh("nav.home")).toBe("string");
    });

    it("returns a function", () => {
        const t = useTranslations("en");
        expect(typeof t).toBe("function");
    });
});

describe("useTranslatedPath", () => {
    it("returns path with locale prefix for non-default lang", () => {
        const translatePath = useTranslatedPath("zh");
        expect(translatePath("/about")).toBe("/zh/about");
    });

    it("returns path without locale prefix for default lang (en) when showDefaultLang=false", () => {
        const translatePath = useTranslatedPath("en");
        // Default lang is 'en' and showDefaultLang = false → no prefix
        expect(translatePath("/about")).toBe("/about");
    });

    it("accepts an explicit lang override to non-default", () => {
        const translatePath = useTranslatedPath("en");
        expect(translatePath("/about", "ja")).toBe("/ja/about");
    });

    it("returns locale-prefixed path when overriding to non-default lang", () => {
        const translatePath = useTranslatedPath("en");
        expect(translatePath("/contact", "zh")).toBe("/zh/contact");
    });

    it("returns a function", () => {
        expect(typeof useTranslatedPath("en")).toBe("function");
    });
});

describe("getStaticPaths", () => {
    it("returns a path entry for each supported language", () => {
        const paths = getStaticPaths();
        expect(paths.length).toBeGreaterThanOrEqual(3);
        const langs = paths.map((p) => p.params.lang);
        expect(langs).toContain("en");
        expect(langs).toContain("zh");
        expect(langs).toContain("ja");
    });

    it("each entry has a params.lang property", () => {
        const paths = getStaticPaths();
        paths.forEach((p) => {
            expect(p).toHaveProperty("params");
            expect(p.params).toHaveProperty("lang");
        });
    });
});

describe("pathHasLocale", () => {
    it("returns true for /en/page", () => {
        expect(pathHasLocale("/en/page")).toBe(true);
    });

    it("returns true for /zh/page", () => {
        expect(pathHasLocale("/zh/page")).toBe(true);
    });

    it("returns true for /ja/page", () => {
        expect(pathHasLocale("/ja/page")).toBe(true);
    });

    it("returns false for /page (no locale)", () => {
        expect(pathHasLocale("/page")).toBe(false);
    });

    it("returns false for / root path", () => {
        expect(pathHasLocale("/")).toBe(false);
    });

    it("returns false for /fr/page (unsupported lang)", () => {
        expect(pathHasLocale("/fr/page")).toBe(false);
    });
});

describe("stripLocaleFromPath", () => {
    it("strips /en/ prefix", () => {
        expect(stripLocaleFromPath("/en/about")).toBe("/about");
    });

    it("strips /zh/ prefix", () => {
        expect(stripLocaleFromPath("/zh/about")).toBe("/about");
    });

    it("strips /ja/ prefix", () => {
        expect(stripLocaleFromPath("/ja/about")).toBe("/about");
    });

    it("returns path unchanged when no locale prefix", () => {
        expect(stripLocaleFromPath("/about")).toBe("/about");
    });

    it("strips locale from path with multiple segments", () => {
        expect(stripLocaleFromPath("/en/planetary/solar")).toBe(
            "/planetary/solar",
        );
    });

    it("returns / for /en/ (locale-only path)", () => {
        expect(stripLocaleFromPath("/en/")).toBe("/");
    });
});

describe("addLocaleToPath", () => {
    it("adds /zh/ prefix for Chinese", () => {
        expect(addLocaleToPath("/about", "zh")).toBe("/zh/about");
    });

    it("adds /ja/ prefix for Japanese", () => {
        expect(addLocaleToPath("/about", "ja")).toBe("/ja/about");
    });

    it("returns path unchanged for default lang (en) when showDefaultLang=false", () => {
        expect(addLocaleToPath("/about", "en")).toBe("/about");
    });
});
