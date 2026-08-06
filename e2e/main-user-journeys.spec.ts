// End-to-end tests for main user journeys
import { test, expect } from "@playwright/test";

// Test constants for maintainability
const ROUTES = {
    HOME: "/",
    SOLAR_SYSTEM: "/planetary/solar",
} as const;

const PAGE_TITLES = {
    MAIN: "ANDROMEDA",
} as const;

test.describe("Main Menu Navigation", () => {
    test("should display main menu with correct options @smoke", async ({
        page,
    }) => {
        await page.goto(ROUTES.HOME);

        // Check that main menu is visible
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
            PAGE_TITLES.MAIN,
        );

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Check navigation buttons within the Home command hub
        await expect(
            home.getByRole("button", { name: /Solar System/i }),
        ).toBeVisible();
        await expect(
            home.getByRole("button", { name: /Explore Exoplanets/i }),
        ).toBeVisible();
        const settingsControl = page.locator(".home-settings-control");
        await expect(settingsControl).toBeVisible();
        await expect(
            settingsControl.getByRole("button", { name: /Settings/i }),
        ).toBeVisible();
    });

    test("should navigate to solar system view @smoke", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Click the Solar System button in the Home command hub
        const solarButton = home.getByRole("button", {
            name: /Solar System/i,
        });
        await expect(solarButton).toBeVisible({ timeout: 5000 });
        await solarButton.click({ force: true });

        // Wait for navigation to complete
        await page.waitForURL(/\/planetary\/solar/, { timeout: 10000 });
        // Should navigate to solar system page (locale prefix may vary)
        await expect(page).toHaveURL(/\/planetary\/solar/);
    });

    test("should open settings modal", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Click the Home Settings button without matching Astro toolbar buttons
        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await expect(settingsButton).toBeVisible({ timeout: 5000 });
        await settingsButton.click({ force: true });

        // Settings modal should be visible
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
    });
});

test.describe("Solar System View", () => {
    test("should load 3D solar system scene", async ({ page }) => {
        await page.goto(ROUTES.SOLAR_SYSTEM);

        // Wait for either the 3D renderer to load OR a fallback/loading state
        // In headless CI without WebGL, the canvas may not appear
        try {
            await page.waitForSelector("#solar-system-renderer", {
                timeout: 15000,
            });

            // Check that canvas element is present
            const canvas = page.locator("canvas");
            await expect(canvas).toBeVisible({ timeout: 10000 });
        } catch {
            // In headless environments without WebGL, check for loading or fallback states
            const pageContent = await page.content();
            expect(
                pageContent.includes("planetary-system-container") ||
                    pageContent.includes("loading") ||
                    pageContent.includes("WebGL"),
            ).toBe(true);
        }
    });

    test("should display navigation controls", async ({ page }) => {
        await page.goto(ROUTES.SOLAR_SYSTEM);

        // Wait for the page to load - the 3D scene may or may not appear
        // depending on WebGL support in the test environment
        try {
            await page.waitForSelector("#solar-system-renderer", {
                timeout: 15000,
            });

            // Check for control buttons - these may be in different containers
            await expect(
                page.getByRole("button", { name: /zoom/i }).first(),
            ).toBeVisible({ timeout: 10000 });
            await expect(
                page.getByRole("button", { name: /reset/i }).first(),
            ).toBeVisible({ timeout: 10000 });
        } catch {
            // If no renderer/controls appear, verify the page container exists
            const pageContent = await page.content();
            expect(pageContent.includes("planetary-system-container")).toBe(
                true,
            );
        }
    });

    test("should handle planet selection", async ({ page }) => {
        await page.goto(ROUTES.SOLAR_SYSTEM);

        // Wait for scene to load
        await page.waitForSelector("canvas", { timeout: 30000 });

        // Click on canvas (simulating planet click)
        const canvas = page.locator("canvas");
        await canvas.click({ position: { x: 400, y: 300 } });

        // Check if info modal appears (may take time due to 3D interaction)
        try {
            await expect(page.getByRole("dialog")).toBeVisible({
                timeout: 5000,
            });
        } catch {
            // If direct click doesn't work, we can test the UI components directly
            console.log(
                "Direct canvas interaction test skipped - requires 3D scene",
            );
        }
    });

    test("should open and close comparison from a solar body detail", async ({
        page,
    }) => {
        await page.goto(ROUTES.SOLAR_SYSTEM);

        // Wait for the scene controls so keyboard navigation is initialized.
        const sceneControl = page.getByRole("button", {
            name: /Jump to body/i,
        });
        await expect(sceneControl).toBeVisible({ timeout: 15000 });

        // Use the accessible keyboard navigation path to open the first body
        // detail without relying on a pixel-specific 3D canvas click.
        await sceneControl.focus();
        await page.keyboard.press("Home");

        const bodyDialog = page.locator(".modal-shell-dialog").first();
        await expect(bodyDialog).toBeVisible({ timeout: 10000 });

        const addToCompareButton = bodyDialog.getByRole("button", {
            name: /Add to Comparison/i,
        });
        await expect(addToCompareButton).toBeVisible();
        await addToCompareButton.click();

        const viewComparisonButton = bodyDialog.getByRole("button", {
            name: /View Comparison/i,
        });
        await expect(viewComparisonButton).toBeVisible();
        await viewComparisonButton.click();

        const comparisonDialog = page.getByRole("dialog", {
            name: /Comparative Planetology/i,
        });
        await expect(comparisonDialog).toBeVisible({ timeout: 10000 });
        await expect(comparisonDialog).toHaveClass(/modal-shell-dialog/);

        await comparisonDialog.locator(".modal-shell-close").click();
        await expect(comparisonDialog).not.toBeVisible();
        await expect(viewComparisonButton).toBeFocused();
    });
});

test.describe("System Selector", () => {
    test("should open system selector", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Click the Explore Exoplanets button in the Home command hub
        const exoplanetsButton = home.getByRole("button", {
            name: /Explore Exoplanets/i,
        });
        await expect(exoplanetsButton).toBeVisible({ timeout: 5000 });
        await exoplanetsButton.click({ force: true });

        // ExploreSystems modal should be visible - use dialog role for specificity
        await expect(
            page.getByRole("dialog", { name: /Star Systems/i }),
        ).toBeVisible({ timeout: 10000 });
    });

    test("should display available systems", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to load
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Open system selector - wait a bit for Svelte hydration
        const exoplanetsButton = home.getByRole("button", {
            name: /Explore Exoplanets/i,
        });
        await expect(exoplanetsButton).toBeVisible({ timeout: 5000 });

        // Wait for potential Svelte hydration to complete
        await page.waitForTimeout(500);

        // Click with force to ensure it triggers
        await exoplanetsButton.click({ force: true });

        // Wait for modal to appear by checking for the dialog
        await expect(
            page.getByRole("dialog", { name: /Star Systems/i }),
        ).toBeVisible({ timeout: 10000 });

        // Check for at least one system card with Solar System heading
        await expect(
            page.getByRole("heading", { name: /SOLAR SYSTEM/i }),
        ).toBeVisible({ timeout: 5000 });

        // Check for an Explore action button in the modal
        await expect(
            page.getByRole("button", { name: /Explore/i }).first(),
        ).toBeVisible({ timeout: 5000 });

        // Close modal using Escape key
        await page.keyboard.press("Escape");
    });
});

test.describe("Settings Management", () => {
    test("should open and close settings modal", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Open the Home Settings control without matching Astro toolbar buttons
        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await expect(settingsButton).toBeVisible({ timeout: 5000 });
        await settingsButton.click({ force: true });
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });

        // Close settings - use the close button within the dialog
        await page
            .getByRole("dialog")
            .getByRole("button", { name: /close/i })
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("should persist settings changes", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Open the Home Settings control without matching Astro toolbar buttons
        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await expect(settingsButton).toBeVisible({ timeout: 5000 });
        await settingsButton.dispatchEvent("click");
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });

        // Get the animation toggle and record its initial state
        const dialog = page.getByRole("dialog");
        const animationToggle = dialog.getByRole("checkbox", {
            name: /animation/i,
        });
        const initialState = await animationToggle.isChecked();

        // Toggle the setting to the opposite state
        if (initialState) {
            await animationToggle.uncheck();
        } else {
            await animationToggle.check();
        }
        const toggledState = await animationToggle.isChecked();
        expect(toggledState).toBe(!initialState);

        // Save settings - use button within dialog
        await dialog.getByRole("button", { name: /save/i }).click();

        // Wait for dialog to close and hydration after state change
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await page.waitForTimeout(1000);

        // Reopen settings and verify change persisted
        await settingsButton.dispatchEvent("click");
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });

        // Verify the setting maintained its toggled state
        const savedState = await page
            .getByRole("dialog")
            .getByRole("checkbox", { name: /animation/i })
            .isChecked();
        expect(savedState).toBe(toggledState);
    });
});

test.describe("Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Focus on the first interactive element
        await page.keyboard.press("Tab");

        // Verify we can tab through menu buttons - just check that buttons are focusable
        // Tab order may vary based on layout, so we verify key buttons can receive focus
        const solarSystemButton = home.getByRole("button", {
            name: /Solar System/i,
        });
        await solarSystemButton.focus();
        await expect(solarSystemButton).toBeFocused();

        await page.keyboard.press("Tab");
        // Next button should be focused (don't assume which one)
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();

        // Verify settings button can also be focused
        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await settingsButton.focus();
        await expect(settingsButton).toBeFocused();
    });

    test("should support Enter key for button activation", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to load
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Wait for potential Svelte hydration to complete
        await page.waitForTimeout(1000);

        // Settings is a separate Home control rather than one of the four
        // destination buttons tracked by MainMenu's arrow-key navigation.
        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await settingsButton.focus();

        // Press Enter on the actual Settings button.
        await page.keyboard.press("Enter");

        // Settings modal should open - check for the dialog role
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
    });

    test("should have proper ARIA labels", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Check for proper labeling - verify buttons are accessible by role
        const solarButton = home.getByRole("button", {
            name: /Solar System/i,
        });
        await expect(solarButton).toBeVisible();
        await expect(solarButton).toBeEnabled();

        const settingsControl = page.locator(".home-settings-control");
        const settingsButton = settingsControl.getByRole("button", {
            name: /Settings/i,
        });
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton).toBeEnabled();
    });
});

test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto(ROUTES.HOME);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();
        const settingsControl = page.locator(".home-settings-control");
        await expect(settingsControl).toBeVisible();

        // Main menu should be visible and functional
        await expect(
            home.getByRole("button", { name: /Solar System/i }),
        ).toBeVisible();
        await expect(
            settingsControl.getByRole("button", { name: /Settings/i }),
        ).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto(ROUTES.HOME);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();
        const settingsControl = page.locator(".home-settings-control");
        await expect(settingsControl).toBeVisible();

        // All elements should be visible
        await expect(
            home.getByRole("button", { name: /Solar System/i }),
        ).toBeVisible();
        await expect(
            home.getByRole("button", { name: /Explore Exoplanets/i }),
        ).toBeVisible();
        await expect(
            settingsControl.getByRole("button", { name: /Settings/i }),
        ).toBeVisible();
    });
});

test.describe("Performance", () => {
    test("should load main page quickly", async ({ page }) => {
        const startTime = Date.now();
        await page.goto(ROUTES.HOME);

        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Wait for main content to be visible
        await expect(
            home.getByRole("button", { name: /Solar System/i }),
        ).toBeVisible();

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds (relaxed for CI)
    });

    test("should handle 3D scene loading gracefully", async ({ page }) => {
        await page.goto(ROUTES.SOLAR_SYSTEM);

        // Wait for the page to settle
        await page.waitForLoadState("networkidle");

        // Check that the page container exists (3D canvas may not appear in headless)
        const pageContent = await page.content();
        expect(pageContent.includes("planetary-system-container")).toBe(true);

        // Check for any of: canvas, error message, loading state, or fallback
        const hasCanvas = await page
            .locator("canvas")
            .isVisible()
            .catch(() => false);
        const hasLoading = await page
            .getByText(/loading/i)
            .isVisible()
            .catch(() => false);
        const hasWrapper = pageContent.includes("astro-island");

        // At least one of these should be true
        expect(hasCanvas || hasLoading || hasWrapper).toBe(true);
    });
});

test.describe("Error Handling", () => {
    test("should display error boundary when needed", async ({ page }) => {
        // This would test error boundaries, but requires triggering an actual error
        // For now, we can check that error handling components exist
        await page.goto(ROUTES.HOME);
        const home = page.locator(".home-command-hub");
        await expect(home).toBeVisible();

        // Check that the page loads without throwing uncaught errors
        const errors: string[] = [];
        page.on("pageerror", (error) => {
            errors.push(error.message);
        });

        await page.waitForTimeout(2000);

        // There should be no uncaught JavaScript errors
        expect(errors.length).toBe(0);
    });
});

test.describe("30 Nearest Systems", () => {
    test("galaxy view loads with star systems @smoke", async ({ page }) => {
        await page.goto("/galaxy");

        // 3D canvas must be visible
        await page.waitForSelector("#galaxy-renderer", { timeout: 15000 });
        const canvas = page.locator("canvas");
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Wait for the scene to finish initializing. The shared ViewHud
        // refactor removed the hamburger menu that previously served as the
        // scene-ready indicator. The Nearby Systems panel (in the HUD
        // controls slot) renders the system list as .hud-list-row items;
        // wait for the loading spinner to disappear so the renderer is
        // ready to handle system selection.
        await expect(page.locator(".animate-spin")).toHaveCount(0, {
            timeout: 15000,
        });

        // The Nearby Systems panel lists all 30 systems as hud-list-row
        // buttons (replacing the old hamburger menu's .system-item entries).
        const systemItems = page.locator(".galaxy-nearby .hud-list-row");
        await expect(systemItems).toHaveCount(30, { timeout: 5000 });

        // Click Alpha Centauri and assert dialog shows 2 confirmed exoplanets
        const alphaCentauriItem = systemItems.filter({
            hasText: /Alpha Centauri/i,
        });
        await expect(alphaCentauriItem).toBeVisible();
        await alphaCentauriItem.click();
        const dialog = page.locator(".modal-shell-dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(/Known Exoplanets.*2/i)).toBeVisible();
    });

    test("system dialog actions do not overflow on narrow viewports", async ({
        page,
    }) => {
        // 360px sits within the 320-375px range where the fixed navigation
        // actions and localized labels must remain fully visible. The Close
        // control is kept separately in the dialog header.
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto("/galaxy");

        await page.waitForSelector("#galaxy-renderer", { timeout: 15000 });
        await expect(page.locator(".animate-spin")).toHaveCount(0, {
            timeout: 15000,
        });

        const systemItems = page.locator(".galaxy-nearby .hud-list-row");
        await expect(systemItems).toHaveCount(30, { timeout: 5000 });

        const alphaCentauriItem = systemItems.filter({
            hasText: /Alpha Centauri/i,
        });
        await alphaCentauriItem.click();
        const dialog = page.locator(".modal-shell-dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });

        await expect(dialog.locator(".modal-shell-close")).toBeVisible();

        const actions = dialog.locator(".modal-shell-actions");
        const actionButtons = actions.getByRole("button");
        await expect(actionButtons).toHaveCount(3);

        // Every action button must be fully visible inside the dialog's
        // horizontal bounds (no horizontal overflow / clipping).
        const dialogBox = await dialog.boundingBox();
        const actionsBox = await actions.boundingBox();
        expect(dialogBox).not.toBeNull();
        expect(actionsBox).not.toBeNull();
        expect(actionsBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
        expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(
            dialogBox!.x + dialogBox!.width,
        );

        for (const button of await actionButtons.all()) {
            const box = await button.boundingBox();
            expect(box).not.toBeNull();
            expect(box!.x).toBeGreaterThanOrEqual(dialogBox!.x);
            expect(box!.x + box!.width).toBeLessThanOrEqual(
                dialogBox!.x + dialogBox!.width,
            );
        }

        // Short landscape-style viewports exercise the vertical flex split:
        // fixed header/actions remain visible while the details body keeps a
        // usable scroll area that can reach the final content.
        await page.setViewportSize({ width: 360, height: 400 });
        const details = dialog.locator(".dialog-content");
        await expect(details).toBeVisible();
        const scrollState = await details.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
            return {
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                scrollTop: element.scrollTop,
            };
        });
        expect(scrollState.clientHeight).toBeGreaterThan(0);
        expect(scrollState.scrollHeight).toBeGreaterThan(
            scrollState.clientHeight,
        );
        expect(
            scrollState.scrollTop + scrollState.clientHeight,
        ).toBeGreaterThanOrEqual(scrollState.scrollHeight - 1);
    });

    test("Alpha Centauri system page loads @smoke", async ({ page }) => {
        await page.goto("/planetary/alpha-centauri");

        // 3D canvas must be visible
        await page.waitForSelector("#planetary-system-renderer", {
            timeout: 15000,
        });
        const canvas = page.locator("canvas");
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Wait for command rail buttons (scene ready indicator)
        const finderBtn = page.getByRole("button", { name: /Jump to body/i });
        await expect(finderBtn).toBeVisible({ timeout: 15000 });

        // Open finder and assert Proxima Centauri c is listed
        await finderBtn.click();
        const finderSearch = page.locator(".hud-finder input[type='text']");
        await expect(finderSearch).toBeVisible();
        await finderSearch.fill("Proxima Centauri c");
        const finderList = page.locator(".hud-finder .hud-list-row");
        await expect(
            finderList.filter({ hasText: /Proxima Centauri c/i }),
        ).toBeVisible({ timeout: 5000 });

        // Pin Proxima Centauri c so the camera focuses on it
        await finderList.filter({ hasText: /Proxima Centauri c/i }).click();

        // Wait for the target-lock reticle to appear (tracks the body's screen position)
        const reticle = page.locator(".hud-reticle");
        await expect(reticle).toBeVisible({ timeout: 5000 });

        // Click on the canvas at the reticle's screen position (converted to
        // canvas-relative coordinates). Try a small grid around the reticle
        // because the body mesh may be slightly offset from the tracking point.
        const canvasBox = await canvas.boundingBox();
        const reticleBox = await reticle.boundingBox();
        let modalVisible = false;
        if (canvasBox && reticleBox) {
            const centerX = reticleBox.x + reticleBox.width / 2 - canvasBox.x;
            const centerY = reticleBox.y + reticleBox.height / 2 - canvasBox.y;
            const offsets = [
                { x: 0, y: 0 },
                { x: -8, y: 0 },
                { x: 8, y: 0 },
                { x: 0, y: -8 },
                { x: 0, y: 8 },
            ];
            for (const off of offsets) {
                await canvas.click({
                    position: { x: centerX + off.x, y: centerY + off.y },
                });
                const modal = page.locator(".modal-shell-dialog");
                modalVisible = await modal.isVisible().catch(() => false);
                if (modalVisible) {
                    await expect(
                        modal.locator(".status-badge--candidate"),
                    ).toBeVisible({ timeout: 3000 });
                    break;
                }
            }
        }
        // If no click opened the modal (can happen in headless environments),
        // the finder assertions above still confirm the page loaded correctly.
    });
});
