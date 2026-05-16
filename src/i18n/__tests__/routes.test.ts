import { describe, expect, it } from "vitest";
import {
    getLocaleFromPath,
    localizePath,
    switchLocalePath,
    routes,
    type AppLocale,
} from "../routes";

describe("i18n routes", () => {
    it("detects supported locales from URL paths", () => {
        expect(getLocaleFromPath("/")).toBe("en");
        expect(getLocaleFromPath("/galaxy")).toBe("en");
        expect(getLocaleFromPath("/zh/galaxy")).toBe("zh");
        expect(getLocaleFromPath("/ja/planetary/solar")).toBe("ja");
    });

    it("localizes canonical paths using unprefixed English", () => {
        expect(localizePath("/galaxy", "en")).toBe("/galaxy");
        expect(localizePath("/galaxy", "zh")).toBe("/zh/galaxy");
        expect(localizePath("/planetary/solar", "ja")).toBe(
            "/ja/planetary/solar",
        );
    });

    it("switches locale without duplicating existing locale prefixes", () => {
        expect(switchLocalePath("/zh/galaxy", "ja")).toBe("/ja/galaxy");
        expect(switchLocalePath("/ja/planetary/solar", "en")).toBe(
            "/planetary/solar",
        );
        expect(switchLocalePath("/planetary/terrain/earth", "zh")).toBe(
            "/zh/planetary/terrain/earth",
        );
    });

    it("builds app route URLs from stable domain ids", () => {
        const locales: AppLocale[] = ["en", "zh", "ja"];
        expect(locales.map((locale) => routes.home(locale))).toEqual([
            "/",
            "/zh/",
            "/ja/",
        ]);
        expect(routes.galaxy("zh")).toBe("/zh/galaxy");
        expect(routes.constellation("ja")).toBe("/ja/constellation");
        expect(routes.planetarySystem("solar", "en")).toBe("/planetary/solar");
        expect(routes.terrain("mars", "zh")).toBe("/zh/planetary/terrain/mars");
    });
});
