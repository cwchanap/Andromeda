import { expect, test } from "@playwright/test";

test.describe("i18n routes", () => {
    test("serves localized home fallback pages with page styles @smoke", async ({
        page,
    }) => {
        const response = await page.goto("/zh/");

        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", "zh");

        const stylesheetCount = await page
            .locator('link[rel="stylesheet"], style')
            .count();
        expect(stylesheetCount).toBeGreaterThan(0);
    });

    test("serves localized galaxy fallback with page styles @smoke", async ({
        page,
    }) => {
        await page.goto("/zh/galaxy");

        await expect(page.locator("html")).toHaveAttribute("lang", "zh");
        await expect(page.locator("#galaxy-container")).toBeVisible();
        await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

        const stylesheetCount = await page
            .locator('link[rel="stylesheet"], style')
            .count();
        expect(stylesheetCount).toBeGreaterThan(0);
    });

    test("serves localized dynamic planetary system routes", async ({
        page,
    }) => {
        await page.goto("/ja/planetary/solar");

        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        await expect(page.locator("#planetary-system-container")).toBeVisible();
    });

    test("redirects prefixed English routes to the canonical route", async ({
        page,
    }) => {
        await page.goto("/en/planetary/solar");

        await expect(page).toHaveURL(/\/planetary\/solar$/);
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
});
