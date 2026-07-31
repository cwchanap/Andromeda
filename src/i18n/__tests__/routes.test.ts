import { describe, expect, it } from "vitest";
import {
    getLocaleFromPath,
    localizePath,
    switchLocalePath,
    switchLocaleUrl,
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

    it("builds localized observer and canonical Sol routes", () => {
        expect(routes.constellation("en")).toBe("/constellation");
        expect(routes.constellation("en", { observerId: undefined })).toBe(
            "/constellation",
        );
        expect(routes.constellation("en", { observerId: null })).toBe(
            "/constellation",
        );
        expect(routes.constellation("zh", { observerId: "sol" })).toBe(
            "/zh/constellation",
        );
        expect(
            routes.constellation("ja", { observerId: "alpha-centauri" }),
        ).toBe("/ja/constellation?observer=alpha-centauri");
        expect(
            routes.constellation("en", { observerId: "alpha centauri/β" }),
        ).toBe("/constellation?observer=alpha+centauri%2F%CE%B2");
    });

    it("switches locale while preserving query and hash", () => {
        expect(
            switchLocaleUrl(
                new URL(
                    "https://example.test/constellation?observer=alpha-centauri&ref=earth#details",
                ),
                "ja",
            ),
        ).toBe(
            "/ja/constellation?observer=alpha-centauri&ref=earth#details",
        );
    });

    it("switches locale without duplicating prefixes", () => {
        expect(
            switchLocaleUrl(
                new URL(
                    "https://example.test/zh/constellation?observer=alpha-centauri",
                ),
                "en",
            ),
        ).toBe("/constellation?observer=alpha-centauri");
    });
});
