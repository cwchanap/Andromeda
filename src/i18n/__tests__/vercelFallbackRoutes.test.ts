import { describe, expect, it } from "vitest";
import {
    createLocaleRouteDefinitions,
    injectLocaleRouteDefinitions,
} from "@/i18n/vercelFallbackRoutes";

const appRoutes = [
    {
        type: "page",
        isPrerendered: false,
        pattern: "/",
        patternRegex: /^\/$/,
    },
    {
        type: "page",
        isPrerendered: false,
        pattern: "/galaxy",
        patternRegex: /^\/galaxy\/?$/,
    },
    {
        type: "page",
        isPrerendered: false,
        pattern: "/planetary/[systemid]",
        patternRegex: /^\/planetary\/([^/]+?)\/?$/,
    },
    {
        type: "endpoint",
        isPrerendered: false,
        pattern: "/_image",
        patternRegex: /^\/_image\/?$/,
    },
];

describe("Vercel i18n fallback routes", () => {
    it("creates serverless route entries for all locale-prefixed app pages", () => {
        expect(
            createLocaleRouteDefinitions(appRoutes, ["en", "zh", "ja"]),
        ).toEqual([
            {
                src: "^/(?:en|zh|ja)/?$",
                dest: "_render",
            },
            {
                src: "^/(?:en|zh|ja)/galaxy/?$",
                dest: "_render",
            },
            {
                src: "^/(?:en|zh|ja)/planetary/([^/]+?)/?$",
                dest: "_render",
            },
        ]);
    });

    it("handles config that omits the routes property entirely", () => {
        const config = { version: 3 };

        const result = injectLocaleRouteDefinitions(config, [
            { src: "^/(?:en|zh|ja)/?$", dest: "_render" },
            { src: "^/(?:en|zh|ja)/galaxy/?$", dest: "_render" },
        ]);

        expect(result).toEqual({
            version: 3,
            routes: [
                { src: "^/(?:en|zh|ja)/?$", dest: "_render" },
                { src: "^/(?:en|zh|ja)/galaxy/?$", dest: "_render" },
            ],
        });
    });

    it("preserves other top-level fields when injecting into config without routes", () => {
        const config = { version: 3, someFlag: true };

        const result = injectLocaleRouteDefinitions(config, [
            { src: "^/(?:en|zh|ja)/?$", dest: "_render" },
        ]);

        expect(result.someFlag).toBe(true);
        expect(result.version).toBe(3);
        expect(result.routes).toHaveLength(1);
    });

    it("injects locale-prefixed entries before canonical render routes", () => {
        const config = {
            version: 3,
            routes: [
                { handle: "filesystem" },
                {
                    src: "^/_astro/(.*)$",
                    headers: {
                        "cache-control": "public, max-age=31536000, immutable",
                    },
                    continue: true,
                },
                { src: "^/galaxy/?$", dest: "_render" },
            ],
        };

        expect(
            injectLocaleRouteDefinitions(config, [
                { src: "^/(?:en|zh|ja)/galaxy/?$", dest: "_render" },
            ]),
        ).toEqual({
            version: 3,
            routes: [
                { handle: "filesystem" },
                {
                    src: "^/_astro/(.*)$",
                    headers: {
                        "cache-control": "public, max-age=31536000, immutable",
                    },
                    continue: true,
                },
                { src: "^/(?:en|zh|ja)/galaxy/?$", dest: "_render" },
                { src: "^/galaxy/?$", dest: "_render" },
            ],
        });
    });
});
