import { describe, it, expect } from "vitest";
import { planetarySystemRegistry } from "@/lib/planetary-system";
import { ui } from "@/i18n/ui";

/**
 * Guards against the registry and i18n catalogs drifting out of sync.
 *
 * Every system registered in `planetarySystemRegistry` must expose a localized
 * `name` and `description` in every supported locale, otherwise the HUD panel
 * (PlanetarySystemWrapper) and the explore modal (ExploreSystems) silently fall
 * back to the English registry name — which is how the trappist-1 / wolf-359
 * gap originally slipped in. This test fails fast whenever a new system is
 * registered without its translations.
 */
describe("planetary system i18n coverage", () => {
    const locales = Object.keys(ui) as Array<keyof typeof ui>;
    const systems = planetarySystemRegistry.getAllSystems();

    it("registry has registered at least the curated + generated systems", () => {
        // Sanity guard so the suite can't pass against an empty registry
        // (e.g. if registration side-effects stop running in the test env).
        const ids = systems.map((s) => s.id);
        for (const required of [
            "solar",
            "alpha-centauri",
            "trappist-1",
            "wolf-359",
        ]) {
            expect(ids, `expected ${required} to be registered`).toContain(
                required,
            );
        }
    });

    describe.each(systems.map((s) => [s.id]))("%s", (systemId) => {
        it.each(locales)("has systems.<id>.name in %s", (locale) => {
            const catalog = ui[locale] as Record<string, string>;
            const key = `systems.${systemId}.name`;
            expect(
                catalog[key],
                `missing ${key} for locale "${locale}"`,
            ).toBeTruthy();
        });

        it.each(locales)("has systems.<id>.description in %s", (locale) => {
            const catalog = ui[locale] as Record<string, string>;
            const key = `systems.${systemId}.description`;
            expect(
                catalog[key],
                `missing ${key} for locale "${locale}"`,
            ).toBeTruthy();
        });
    });
});
