import { describe, expect, it } from "vitest";
import { ui } from "../ui";

// Every key the observer-mode HUD/actions render through t(), including the
// Task 5 observer readout (label/distance/frame/direction/education), the
// reference/Find Sol/Return actions, and the fallback/omission/WebGL copy.
const observerUiKeys = [
    "action.viewSkyFromHere",
    "galaxy.skyUnavailable",
    "constellation.observer.label",
    "constellation.observer.distanceFromSol",
    "constellation.observer.frameSystemBarycenter",
    "constellation.observer.viewDirection",
    "constellation.observer.referenceToggle",
    "constellation.observer.findSol",
    "constellation.observer.findSolAnnouncement",
    "constellation.observer.findSolUnavailable",
    "constellation.observer.returnToSol",
    "constellation.observer.chooseAnother",
    "constellation.observer.education",
    "constellation.observer.fallback",
    "constellation.observer.omissions",
    "constellation.observer.webglUnavailable",
] as const;

describe("HPA-432 observer UI i18n coverage", () => {
    for (const [locale, catalog] of Object.entries(ui)) {
        it.each(observerUiKeys)(`has %s in ${locale}`, (key) => {
            const value = (catalog as Record<string, string>)[key];
            expect(value, `missing ${key} for ${locale}`).toBeTypeOf("string");
            expect(value.trim(), `empty ${key} for ${locale}`).not.toBe("");
        });
    }

    // The Find Sol announcement is a template the wrapper interpolates with
    // the synthetic Sol star's coordinates; every locale must carry all
    // three placeholders or the announcement degrades to raw tokens.
    it.each(Object.entries(ui))(
        "findSolAnnouncement carries {ra}, {dec}, and {distance} placeholders in %s",
        (_locale, catalog) => {
            const announcement = (catalog as Record<string, string>)[
                "constellation.observer.findSolAnnouncement"
            ];
            expect(announcement).toContain("{ra}");
            expect(announcement).toContain("{dec}");
            expect(announcement).toContain("{distance}");
        },
    );
});
