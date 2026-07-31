import { describe, expect, it } from "vitest";
import { ui } from "../ui";

const observerUiKeys = [
    "action.viewSkyFromHere",
    "galaxy.skyUnavailable",
] as const;

describe("HPA-432 observer UI i18n coverage", () => {
    for (const [locale, catalog] of Object.entries(ui)) {
        it.each(observerUiKeys)(`has %s in ${locale}`, (key) => {
            const value = (catalog as Record<string, string>)[key];
            expect(value, `missing ${key} for ${locale}`).toBeTypeOf("string");
            expect(value.trim(), `empty ${key} for ${locale}`).not.toBe("");
        });
    }
});
