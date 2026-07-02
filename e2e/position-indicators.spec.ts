import { test, expect } from "@playwright/test";

/**
 * Position-indicator E2E tests.
 *
 * Strategy: assert DOM HUD elements that are always rendered (settings
 * toggles, compass readout, view-from-earth label) unconditionally, then
 * gate WebGL-dependent assertions (canvas presence, compass-on-drag) behind
 * a runtime WebGL capability check. This avoids the previous pattern of
 * try/catch-swallowing real assertions and falling back to "page loaded",
 * which would pass even if the entire indicator system were deleted.
 */

/** Evaluate whether the page can actually create a WebGL context. */
async function pageHasWebGL(
    page: import("@playwright/test").Page,
): Promise<boolean> {
    return page.evaluate(() => {
        try {
            const canvas = document.createElement("canvas");
            const gl =
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl");
            return !!gl;
        } catch {
            return false;
        }
    });
}

test.describe("Position indicators @smoke", () => {
    test("galaxy view: HUD settings toggles for Sol label + distance lines exist and toggle", async ({
        page,
    }) => {
        await page.goto("/galaxy");

        // The renderer container must exist regardless of WebGL.
        await expect(page.locator("#galaxy-renderer")).toBeVisible({
            timeout: 15000,
        });

        const webgl = await pageHasWebGL(page);
        if (!webgl) {
            // Without WebGL the galaxy renderer cannot initialize, so the HUD
            // (which is gated behind isSceneReady) never renders. Assert the
            // error/loading state is shown rather than silently passing.
            const overlay = page.locator(
                "#galaxy-renderer .error-overlay, #galaxy-renderer .loading-container, .loading-animation",
            );
            await expect(overlay).toBeVisible({ timeout: 15000 });
            test.info().annotations.push({
                type: "skip-reason",
                description:
                    "WebGL unavailable — asserted fallback overlay, skipped toggle assertions",
            });
            return;
        }

        // WebGL available — wait for the scene to become ready so the HUD
        // (including the settings button) renders.
        await expect(
            page.getByRole("button", { name: /settings/i }),
        ).toBeVisible({
            timeout: 20000,
        });

        // Open the settings panel to reveal the indicator toggles.
        await page.getByRole("button", { name: /settings/i }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Distance Lines toggle — maps to enableDistanceLines.
        const distanceLinesLabel = page.getByText(/distance lines/i, {
            exact: false,
        });
        await expect(distanceLinesLabel).toBeVisible();
        const distanceLinesCheckbox = distanceLinesLabel.locator(
            "input[type='checkbox']",
        );
        await expect(distanceLinesCheckbox).toBeVisible();
        const dlBefore = await distanceLinesCheckbox.isChecked();
        await distanceLinesCheckbox.check();
        await expect(distanceLinesCheckbox).toBeChecked();
        if (!dlBefore) await distanceLinesCheckbox.uncheck();

        // Sol Label toggle — maps to enableStarLabels (Sol marker label).
        const solLabelLabel = page.getByText(/sol label|sol marker/i, {
            exact: false,
        });
        await expect(solLabelLabel).toBeVisible();
        const solLabelCheckbox = solLabelLabel.locator(
            "input[type='checkbox']",
        );
        await expect(solLabelCheckbox).toBeVisible();
    });

    test("constellation view: compass readout + view-from-earth label render in HUD", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // The ViewHud (with settings button) renders regardless of WebGL.
        await expect(
            page.getByRole("button", { name: /settings/i }),
        ).toBeVisible({ timeout: 15000 });

        // Open settings and assert the constellation indicator toggles exist
        // (labels + auto-rotate). These are DOM elements independent of WebGL.
        await page.getByRole("button", { name: /settings/i }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Labels toggle (star names on/off).
        const labelsToggle = page.getByRole("checkbox").first();
        await expect(labelsToggle).toBeVisible();

        // Close the settings dialog so the HUD is visible again.
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible({ timeout: 5000 });

        // Wait for loading to complete — the compass readout + view-from-earth
        // label render inside {#if !loading && !error}. The 2D-canvas fallback
        // also sets loading=false, so this passes without WebGL.
        const compassReadout = page.locator(".compass-readout");
        await expect(compassReadout).toBeVisible({ timeout: 20000 });
        // Compass must show a cardinal direction + degree value, not empty.
        await expect(compassReadout).toContainText(/\d+°/);

        const viewFromEarth = page.locator(".view-from-earth");
        await expect(viewFromEarth).toBeVisible();
    });

    test("constellation view: compass azimuth updates on drag (WebGL-gated)", async ({
        page,
    }) => {
        await page.goto("/constellation");

        const webgl = await pageHasWebGL(page);
        test.skip(
            !webgl,
            "WebGL unavailable — compass-on-drag requires the 3D renderer",
        );

        // Wait for the 3D canvas + compass readout to be ready.
        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
        const compassReadout = page.locator(".compass-readout");
        await expect(compassReadout).toBeVisible({ timeout: 20000 });
        await expect(compassReadout).toContainText(/\d+°/);

        // Capture the initial azimuth reading.
        const initialText = (await compassReadout.textContent()) ?? "";

        // Drag the canvas horizontally to rotate the camera.
        const canvas = page.locator("canvas").first();
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();
        const cx = box!.x + box!.width / 2;
        const cy = box!.y + box!.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 150, cy, { steps: 10 });
        await page.mouse.up();

        // The compass readout must reflect the new azimuth. Wait for it to
        // differ from the initial reading (the rAF loop updates it each frame).
        await expect
            .poll(async () => (await compassReadout.textContent()) ?? "", {
                timeout: 10000,
                message: "compass azimuth should change after drag",
            })
            .not.toEqual(initialText);
    });
});
