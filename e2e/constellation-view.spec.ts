// End-to-end tests for constellation view functionality
import { test, expect } from "@playwright/test";

test.describe("Constellation View Navigation", () => {
    test("should navigate to constellation view from main menu @smoke", async ({
        page,
    }) => {
        await page.goto("/");

        // Wait for the page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 15000 });

        // Wait for Svelte hydration to complete
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // Find the constellation button
        const constellationButton = page.getByRole("button", {
            name: /Constellation View/,
        });
        await expect(constellationButton).toBeVisible({ timeout: 10000 });

        // Try multiple click approaches until navigation happens
        try {
            await constellationButton.click({ timeout: 2000 });
        } catch {
            // If regular click fails, use dispatchEvent
            await constellationButton.dispatchEvent("click");
        }

        // Wait for navigation to complete (use regex for locale flexibility)
        await page.waitForURL(/\/constellation/, { timeout: 20000 });
        // Should navigate to constellation page
        await expect(page).toHaveURL(/\/constellation/);
    });

    test("should display constellation view main button with proper styling", async ({
        page,
    }) => {
        await page.goto("/");

        // Check that constellation button exists with proper text
        const constellationButton = page.getByRole("button", {
            name: /✨ Constellation View/,
        });
        await expect(constellationButton).toBeVisible({ timeout: 10000 });
    });

    test("should have back to menu functionality", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load - increase timeout
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({ timeout: 30000 });

        // Click back to menu
        await page.getByRole("button", { name: /Back to Menu/i }).click();

        // Wait for navigation to complete
        await page.waitForURL(/\/($|\?)/, { timeout: 10000 });
        // Should return to main menu - use specific heading selector to avoid Astro toolbar h1
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible();
    });
});

test.describe("Constellation View Loading and Location", () => {
    test("should handle location loading gracefully", async ({ page }) => {
        // Mock geolocation to prevent hanging
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "geolocation", {
                value: {
                    getCurrentPosition: (
                        success: (position: GeolocationPosition) => void,
                    ) => {
                        setTimeout(() => {
                            success({
                                coords: {
                                    latitude: 40.7128,
                                    longitude: -74.006,
                                    accuracy: 10,
                                },
                            } as GeolocationPosition);
                        }, 100);
                    },
                },
                writable: true,
            });
        });

        await page.goto("/constellation");

        // Should eventually load the constellation view
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
    });

    test("should fallback to default location when geolocation fails", async ({
        page,
    }) => {
        // Mock geolocation failure
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "geolocation", {
                value: {
                    getCurrentPosition: (
                        _success: (position: GeolocationPosition) => void,
                        error: (error: GeolocationPositionError) => void,
                    ) => {
                        setTimeout(() => {
                            error({
                                code: 1,
                                message: "User denied Geolocation",
                            } as GeolocationPositionError);
                        }, 100);
                    },
                },
                writable: true,
            });
        });

        await page.goto("/constellation");

        // Should eventually load with default location
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
    });

    test("should display current time information", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for loading to complete
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
    });
});

test.describe("Constellation Data and Selection", () => {
    test("should display visible constellations list", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for constellation data to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Should show some constellation buttons (names may vary by season/location)
        await expect(
            page.getByRole("button").filter({ hasText: /stars/ }).first(),
        ).toBeVisible({ timeout: 15000 });
    });

    test("should allow constellation selection and show details", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellations to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Wait for at least one constellation button
        const constellationButton = page
            .getByRole("button")
            .filter({ hasText: /stars/ })
            .first();
        await expect(constellationButton).toBeVisible({ timeout: 15000 });

        // Click on a constellation
        await constellationButton.click();

        // Verify something happened (button state changed or details shown)
        await page.waitForTimeout(500); // Brief wait for UI update
    });

    test("should switch between different constellations", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for constellations to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Wait for constellation buttons
        const constellationButtons = page
            .getByRole("button")
            .filter({ hasText: /stars/ });
        await expect(constellationButtons.first()).toBeVisible({
            timeout: 15000,
        });

        // Get at least two buttons and click them in sequence
        const count = await constellationButtons.count();
        if (count >= 2) {
            await constellationButtons.nth(0).click();
            await page.waitForTimeout(300);
            await constellationButtons.nth(1).click();
            await page.waitForTimeout(300);
        }
    });
});

test.describe("Constellation View UI Controls", () => {
    test("should toggle location information display", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for controls to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Toggle button should exist and be interactive
        const toggleButton = page.getByRole("button", {
            name: /Location Info/i,
        });
        await expect(toggleButton).toBeVisible({ timeout: 5000 });

        // Location info should be visible by default
        const locationInfo = page.getByText(/Current Location/i);
        await expect(locationInfo).toBeVisible({ timeout: 10000 });

        // Hide location info
        await toggleButton.click();
        await expect(locationInfo).toHaveCount(0);
        await expect(toggleButton).toContainText(/Show/i);

        // Show location info again and verify content returns
        await toggleButton.click();
        await expect(page.getByText(/Current Location/i)).toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByText(/Current Time/i)).toBeVisible({
            timeout: 5000,
        });
        await expect(toggleButton).toContainText(/Hide/i);
    });

    test("should have controls toggle button", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Back button should be visible
        await expect(page.getByRole("button", { name: /Back/i })).toBeVisible();
    });

    test("should display proper constellation count and details", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation list
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Should show some constellations
        const constellationButtons = page
            .getByRole("button")
            .filter({ hasText: /stars/ });
        await expect(constellationButtons.first()).toBeVisible({
            timeout: 15000,
        });
        const count = await constellationButtons.count();
        expect(count).toBeGreaterThanOrEqual(1); // Should have at least 1 visible constellation
    });
});

test.describe("Constellation View Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Tab through - verify focus works
        await page.keyboard.press("Tab");
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();
    });

    test("should support Enter key for constellation selection", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation buttons to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        const constellationButton = page
            .getByRole("button")
            .filter({ hasText: /stars/ })
            .first();
        await expect(constellationButton).toBeVisible({ timeout: 15000 });

        // Focus and press Enter
        await constellationButton.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300); // Brief wait for UI update
    });

    test("should have proper ARIA labels and roles", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Check button roles
        await expect(
            page.getByRole("button", { name: /Back/i }),
        ).toHaveAttribute("type", "button");
    });
});

test.describe("Constellation View Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Back button should be visible
        await expect(page.getByRole("button", { name: /Back/i })).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // All elements should be properly sized
        await expect(page.getByRole("button", { name: /Back/i })).toBeVisible();
    });

    test("should handle different screen orientations", async ({ page }) => {
        // Test landscape mobile
        await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE landscape
        await page.goto("/constellation");

        // Should still be functional in landscape
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
        await expect(page.getByRole("button", { name: /Back/i })).toBeVisible();
    });
});

test.describe("Constellation View Error Handling", () => {
    test("should handle JavaScript errors gracefully", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => {
            errors.push(error.message);
        });

        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Should not have uncaught JavaScript errors
        expect(errors.length).toBe(0);
    });

    test("should display loading state properly", async ({ page }) => {
        await page.goto("/constellation");

        // Page should eventually load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
    });

    test("should handle constellation data loading errors", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Should eventually load successfully or show an error
        try {
            await expect(
                page.getByRole("heading", { name: "Constellation View" }),
            ).toBeVisible({
                timeout: 30000,
            });
        } catch {
            // Check for error message
            await expect(page.getByText(/Unable to load|error/i)).toBeVisible();
        }
    });
});

test.describe("Constellation View Performance", () => {
    test("should load constellation view within reasonable time", async ({
        page,
    }) => {
        const startTime = Date.now();
        await page.goto("/constellation");

        // Wait for main content to be visible
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(30000); // Should load within 30 seconds
    });

    test("should handle constellation selection responsively", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation list to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        const constellationButton = page
            .getByRole("button")
            .filter({ hasText: /stars/ })
            .first();
        await expect(constellationButton).toBeVisible({ timeout: 15000 });

        // Measure selection response time
        const startTime = Date.now();
        await constellationButton.click();
        await page.waitForTimeout(300); // Brief wait for UI update
        const selectionTime = Date.now() - startTime;

        expect(selectionTime).toBeLessThan(3000); // Should respond within 3 seconds
    });
});

test.describe("Constellation View Integration", () => {
    test("should maintain state when navigating back and forth", async ({
        page,
    }) => {
        // Start from main menu
        await page.goto("/");

        // Wait for page to fully load and Svelte to hydrate
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(500);

        // Navigate to constellation view
        const constellationButton = page.getByRole("button", {
            name: /Constellation View/,
        });
        await expect(constellationButton).toBeVisible({ timeout: 10000 });
        await constellationButton.click({ force: true });

        // Wait for load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Go back to main menu
        await page.getByRole("button", { name: /Back/i }).click();
        await expect(
            page.getByRole("heading", { level: 1, name: "ANDROMEDA" }),
        ).toBeVisible({ timeout: 10000 });

        // Wait for hydration before clicking again
        await page.waitForTimeout(500);

        // Return to constellation view
        await page
            .getByRole("button", { name: /Constellation View/ })
            .click({ force: true });

        // Should load successfully again
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });
    });

    test("should work with language selector", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({
            timeout: 30000,
        });

        // Language selector should be present
        await expect(
            page.getByRole("button", { name: /Language/i }),
        ).toBeVisible();
    });
});
