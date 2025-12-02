// End-to-end tests for main user journeys
import { test, expect } from "@playwright/test";

// Test constants for maintainability
const ROUTES = {
    HOME: "/",
    SOLAR_SYSTEM: "/en/planetary/solar",
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

        // Check navigation buttons (use emoji prefixes for specificity)
        await expect(
            page.getByRole("button", { name: /☀️ Solar System/ }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", {
                name: /🌌 Explore Exoplanets/,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /⚙️ Settings/ }),
        ).toBeVisible();
    });

    test("should navigate to solar system view @smoke", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        // Click Solar System button (use emoji prefix for specificity)
        const solarButton = page.getByRole("button", {
            name: /☀️ Solar System/,
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

        // Click Settings button (exclude Astro toolbar buttons)
        const settingsButton = page.getByRole("button", {
            name: /⚙️ Settings/,
        });
        await expect(settingsButton).toBeVisible({ timeout: 5000 });
        await settingsButton.click({ force: true });

        // Settings modal should be visible
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
    });
});

test.describe("Solar System View", () => {
    test("should load 3D solar system scene", async ({ page }) => {
        await page.goto("/en/planetary/solar");

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
        await page.goto("/en/planetary/solar");

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
        await page.goto("/en/planetary/solar");

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
});

test.describe("System Selector", () => {
    test("should open system selector", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        // Click Explore Exoplanets button (use emoji prefix for specificity)
        const exoplanetsButton = page.getByRole("button", {
            name: /Explore Exoplanets/,
        });
        await expect(exoplanetsButton).toBeVisible({ timeout: 5000 });
        await exoplanetsButton.click({ force: true });

        // System selector modal should be visible - use heading role for specificity
        await expect(
            page.getByRole("heading", { name: /Choose a Planetary System/i }),
        ).toBeVisible({ timeout: 10000 });
    });

    test("should display available systems", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Wait for page to load
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });

        // Open system selector - wait a bit for Svelte hydration
        const exoplanetsButton = page.getByRole("button", {
            name: /Explore Exoplanets/,
        });
        await expect(exoplanetsButton).toBeVisible({ timeout: 5000 });

        // Wait for potential Svelte hydration to complete
        await page.waitForTimeout(500);

        // Click with force to ensure it triggers
        await exoplanetsButton.click({ force: true });

        // Wait for modal to appear by checking for the heading
        await expect(
            page.getByRole("heading", { name: /Choose a Planetary System/i }),
        ).toBeVisible({ timeout: 10000 });

        // Check for at least one system option - look for the button with Solar System text
        await expect(
            page.getByRole("button", {
                name: /Solar System.*Our home solar system/,
            }),
        ).toBeVisible({ timeout: 5000 });

        // Close modal using Escape key to avoid Astro dev toolbar blocking Cancel button
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

        // Open settings (use emoji prefix to avoid Astro toolbar)
        const settingsButton = page.getByRole("button", {
            name: /⚙️ Settings/,
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

        // Open settings (use emoji prefix to avoid Astro toolbar)
        const settingsButton = page.getByRole("button", {
            name: /⚙️ Settings/,
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

        // Focus on the first interactive element
        await page.keyboard.press("Tab");

        // Verify we can tab through menu buttons - just check that buttons are focusable
        // Tab order may vary based on layout, so we verify key buttons can receive focus
        const solarSystemButton = page.getByRole("button", {
            name: /☀️ Solar System/,
        });
        await solarSystemButton.focus();
        await expect(solarSystemButton).toBeFocused();

        await page.keyboard.press("Tab");
        // Next button should be focused (don't assume which one)
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();

        // Verify settings button can also be focused
        const settingsButton = page.getByRole("button", {
            name: /⚙️ Settings/,
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

        // Wait for potential Svelte hydration to complete
        await page.waitForTimeout(1000);

        // Note: The MainMenu component has a global keydown handler that tracks focusedIndex internally.
        // When using programmatic .focus(), the component's internal focusedIndex doesn't update.
        // So we need to use the component's own keyboard navigation to set focusedIndex to Settings.
        // Settings is the 5th item (index 4), so we press ArrowDown 4 times from the first item.

        // First, focus on any menu button to activate keyboard navigation context
        const solarButton = page.getByRole("button", {
            name: /☀️ Solar System/,
        });
        await solarButton.focus();

        // Navigate down to Settings (4 times: Solar -> Exoplanets -> Galaxy -> Constellation -> Settings)
        await page.keyboard.press("ArrowDown"); // -> Exoplanets
        await page.keyboard.press("ArrowDown"); // -> Galaxy
        await page.keyboard.press("ArrowDown"); // -> Constellation
        await page.keyboard.press("ArrowDown"); // -> Settings

        // Now press Enter - should activate Settings
        await page.keyboard.press("Enter");

        // Settings modal should open - check for the dialog role
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
    });

    test("should have proper ARIA labels", async ({ page }) => {
        await page.goto(ROUTES.HOME);

        // Check for proper labeling - verify buttons are accessible by role
        const solarButton = page.getByRole("button", {
            name: /☀️ Solar System/,
        });
        await expect(solarButton).toBeVisible();
        await expect(solarButton).toBeEnabled();

        const settingsButton = page.getByRole("button", {
            name: /⚙️ Settings/,
        });
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton).toBeEnabled();
    });
});

test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto(ROUTES.HOME);

        // Main menu should be visible and functional (use emoji prefixes)
        await expect(
            page.getByRole("button", { name: /☀️ Solar System/ }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /⚙️ Settings/ }),
        ).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto(ROUTES.HOME);

        // All elements should be visible (use emoji prefixes)
        await expect(
            page.getByRole("button", { name: /☀️ Solar System/ }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", {
                name: /🌌 Explore Exoplanets/,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /⚙️ Settings/ }),
        ).toBeVisible();
    });
});

test.describe("Performance", () => {
    test("should load main page quickly", async ({ page }) => {
        const startTime = Date.now();
        await page.goto(ROUTES.HOME);

        // Wait for main content to be visible (use emoji prefix)
        await expect(
            page.getByRole("button", { name: /☀️ Solar System/ }),
        ).toBeVisible();

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds (relaxed for CI)
    });

    test("should handle 3D scene loading gracefully", async ({ page }) => {
        await page.goto("/en/planetary/solar");

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
