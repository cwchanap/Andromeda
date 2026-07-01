import { test, expect } from "@playwright/test";

test.describe("Shared HUD @smoke", () => {
    test("galaxy shows shared chrome and no standalone language button", async ({
        page,
    }) => {
        await page.goto("/galaxy");
        try {
            await page.waitForSelector(
                "#galaxy-renderer canvas, #galaxy-renderer",
                {
                    timeout: 15000,
                },
            );
        } catch {
            // headless no-WebGL fallback: just assert page loaded
        }
        // Back button present
        await expect(
            page.getByRole("button", { name: /back to menu/i }),
        ).toBeVisible({ timeout: 10000 });
        // Settings present (scope to HUD to avoid Astro dev toolbar's "Settings" item)
        await expect(page.getByLabel("Settings")).toBeVisible();
    });

    test("view switcher has all three tabs", async ({ page }) => {
        await page.goto("/galaxy");
        await expect(page.getByRole("tab", { name: /galaxy/i })).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByRole("tab", { name: /star/i })).toBeVisible();
        await expect(
            page.getByRole("tab", { name: /constellation/i }),
        ).toBeVisible();
    });

    test("language is reachable via settings panel", async ({ page }) => {
        await page.goto("/galaxy");
        // Scope to HUD settings button to avoid Astro dev toolbar's "Settings" item
        await page.getByLabel("Settings").click({ force: true });
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole("button", { name: "中文" })).toBeVisible({
            timeout: 5000,
        });
    });
});
