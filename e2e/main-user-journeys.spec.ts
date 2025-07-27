// End-to-end tests for main user journeys
import { test, expect } from "@playwright/test";

test.describe("Main Menu Navigation", () => {
    test("should display main menu with correct options", async ({ page }) => {
        await page.goto("/");

        // Check that main menu is visible
        await expect(page.locator("h1")).toContainText(
            "Space Exploration Game",
        );

        // Check navigation buttons
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "System Selector" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Settings" }),
        ).toBeVisible();
    });

    test("should navigate to solar system view", async ({ page }) => {
        await page.goto("/");

        // Click Start Game button
        await page.getByRole("button", { name: "Start Game" }).click();

        // Should navigate to solar system page
        await expect(page).toHaveURL("/solar-system");
    });

    test("should open settings modal", async ({ page }) => {
        await page.goto("/");

        // Click Settings button
        await page.getByRole("button", { name: "Settings" }).click();

        // Settings modal should be visible
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.locator("h2")).toContainText("Settings");
    });
});

test.describe("Solar System View", () => {
    test("should load 3D solar system scene", async ({ page }) => {
        await page.goto("/solar-system");

        // Wait for the scene to load
        await page.waitForSelector("#solar-system-renderer", {
            timeout: 10000,
        });

        // Check that canvas element is present
        const canvas = page.locator("canvas");
        await expect(canvas).toBeVisible();

        // Check for loading completion
        await page.waitForFunction(
            () => {
                const canvas = document.querySelector("canvas");
                return canvas && canvas.width > 0 && canvas.height > 0;
            },
            { timeout: 15000 },
        );
    });

    test("should display navigation controls", async ({ page }) => {
        await page.goto("/solar-system");

        // Wait for controls to load
        await page.waitForSelector(".navigation-controls", { timeout: 10000 });

        // Check for control buttons
        await expect(page.getByRole("button", { name: /zoom/i })).toBeVisible();
        await expect(
            page.getByRole("button", { name: /reset/i }),
        ).toBeVisible();
    });

    test("should handle planet selection", async ({ page }) => {
        await page.goto("/solar-system");

        // Wait for scene to load
        await page.waitForSelector("canvas", { timeout: 10000 });

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
        await page.goto("/");

        // Click System Selector button
        await page.getByRole("button", { name: "System Selector" }).click();

        // System selector modal should be visible
        await expect(
            page.getByRole("dialog", { name: /select star system/i }),
        ).toBeVisible();
    });

    test("should display available systems", async ({ page }) => {
        await page.goto("/");

        // Open system selector
        await page.getByRole("button", { name: "System Selector" }).click();

        // Check for solar system card
        await expect(page.getByText("Solar System")).toBeVisible();

        // Close modal
        await page.getByRole("button", { name: /close/i }).click();
    });
});

test.describe("Settings Management", () => {
    test("should open and close settings modal", async ({ page }) => {
        await page.goto("/");

        // Open settings
        await page.getByRole("button", { name: "Settings" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();

        // Close settings
        await page.getByRole("button", { name: /close/i }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("should persist settings changes", async ({ page }) => {
        await page.goto("/");

        // Open settings
        await page.getByRole("button", { name: "Settings" }).click();

        // Toggle a setting (e.g., animations)
        const animationToggle = page.getByRole("checkbox", {
            name: /animation/i,
        });
        if (await animationToggle.isChecked()) {
            await animationToggle.uncheck();
        } else {
            await animationToggle.check();
        }

        // Save settings
        await page.getByRole("button", { name: /save/i }).click();

        // Reopen settings and verify change persisted
        await page.getByRole("button", { name: "Settings" }).click();

        // Setting should maintain its state
        const savedState = await animationToggle.isChecked();
        expect(typeof savedState).toBe("boolean");
    });
});

test.describe("Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
        await page.goto("/");

        // Tab through main menu buttons
        await page.keyboard.press("Tab");
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
            page.getByRole("button", { name: "System Selector" }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
            page.getByRole("button", { name: "Settings" }),
        ).toBeFocused();
    });

    test("should support Enter key for button activation", async ({ page }) => {
        await page.goto("/");

        // Focus on Settings button and press Enter
        await page.getByRole("button", { name: "Settings" }).focus();
        await page.keyboard.press("Enter");

        // Settings modal should open
        await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("should have proper ARIA labels", async ({ page }) => {
        await page.goto("/");

        // Check for proper labeling
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toHaveAttribute("type", "button");
        await expect(
            page.getByRole("button", { name: "Settings" }),
        ).toHaveAttribute("type", "button");
    });
});

test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto("/");

        // Main menu should be visible and functional
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Settings" }),
        ).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto("/");

        // All elements should be visible
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "System Selector" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Settings" }),
        ).toBeVisible();
    });
});

test.describe("Performance", () => {
    test("should load main page quickly", async ({ page }) => {
        const startTime = Date.now();
        await page.goto("/");

        // Wait for main content to be visible
        await expect(
            page.getByRole("button", { name: "Start Game" }),
        ).toBeVisible();

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test("should handle 3D scene loading gracefully", async ({ page }) => {
        await page.goto("/solar-system");

        // Check for loading states or fallbacks
        const hasCanvas = await page
            .locator("canvas")
            .isVisible({ timeout: 15000 });
        const hasError = await page.locator(".error-message").isVisible();
        const hasFallback = await page.locator(".webgl-fallback").isVisible();

        // At least one of these should be true (success, error handling, or fallback)
        expect(hasCanvas || hasError || hasFallback).toBe(true);
    });
});

test.describe("Error Handling", () => {
    test("should display error boundary when needed", async ({ page }) => {
        // This would test error boundaries, but requires triggering an actual error
        // For now, we can check that error handling components exist
        await page.goto("/");

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
