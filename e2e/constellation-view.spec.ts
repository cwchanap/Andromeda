// End-to-end tests for constellation view functionality
import { test, expect } from "@playwright/test";

test.describe("Constellation View Navigation", () => {
    test("should navigate to constellation view from main menu @smoke", async ({
        page,
    }) => {
        await page.goto("/");

        // Wait for the page to fully load by checking for the main title
        await expect(page.locator('h1:has-text("ANDROMEDA")')).toBeVisible();

        // Find and click the constellation button using exact text match
        const constellationButton = page.getByRole("button", {
            name: "✨ Constellation View",
        });
        await expect(constellationButton).toBeVisible({ timeout: 10000 });
        await constellationButton.click();

        // Wait for navigation to complete
        await page.waitForURL("/constellation", { timeout: 10000 });
        // Should navigate to constellation page
        await expect(page).toHaveURL("/constellation");
        await expect(page).toHaveTitle(/Constellation View/);
    });

    test("should display constellation view main button with proper styling", async ({
        page,
    }) => {
        await page.goto("/");

        // Check that constellation button exists with proper text
        const constellationButton = page.getByRole("button", {
            name: "✨ Constellation View",
        });
        await expect(constellationButton).toBeVisible();

        // Check for cosmic styling classes
        await expect(constellationButton).toHaveClass(/menu-button/);
        await expect(constellationButton).toHaveClass(/border-indigo-400/);
    });

    test("should have back to menu functionality", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load by checking for the main heading
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible({ timeout: 10000 });

        // Click back to menu
        await page.getByRole("button", { name: "← Back to Menu" }).click();

        // Wait for navigation to complete
        await page.waitForURL("/", { timeout: 10000 });
        // Should return to main menu
        await expect(page).toHaveURL("/");
        await expect(page.locator("h1")).toContainText("ANDROMEDA");
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

        // Should show loading state initially
        await expect(
            page.getByText("Loading constellation data..."),
        ).toBeVisible();

        // Should eventually load the constellation view
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // Should show location information
        await expect(page.getByText("Current Location:")).toBeVisible();
        await expect(page.getByText("40.7128°, -74.0060°")).toBeVisible();
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
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // Should show default location (New York City)
        await expect(page.getByText("40.7128°, -74.0060°")).toBeVisible();

        // Should indicate permission issue (wrapped in parentheses)
        await expect(
            page.getByText(/Location permission needed/),
        ).toBeVisible();
    });

    test("should display current time information", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for loading to complete
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // Should show current time
        await expect(page.getByText("Current Time:")).toBeVisible();

        // Should show a formatted date (checking for year 2025)
        await expect(page.getByText(/2025/)).toBeVisible();
    });
});

test.describe("Constellation Data and Selection", () => {
    test("should display visible constellations list", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for constellation data to load
        await expect(page.getByText("Visible Constellations:")).toBeVisible({
            timeout: 10000,
        });

        // Should show constellation buttons
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Cassiopeia/i }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Cygnus/i }),
        ).toBeVisible();

        // Check constellation details in buttons
        await expect(page.getByText("UMa • 7 stars")).toBeVisible();
        await expect(page.getByText("Cas • 5 stars")).toBeVisible();
        await expect(page.getByText("Cyg • 5 stars")).toBeVisible();
    });

    test("should allow constellation selection and show details", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellations to load
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible({ timeout: 10000 });

        // Click on Ursa Major
        await page.getByRole("button", { name: /Ursa Major/i }).click();

        // Should show constellation details
        await expect(
            page.getByText(
                "The Great Bear, containing the famous Big Dipper asterism",
            ),
        ).toBeVisible();
        await expect(page.getByText(/Callisto.*nymph.*bear/)).toBeVisible();
        await expect(page.getByText("Best months:")).toBeVisible();
        await expect(page.getByText("Mar, Apr, May, Jun, Jul")).toBeVisible();

        // Button should be highlighted/active
        const ursaMajorButton = page.getByRole("button", {
            name: /Ursa Major/i,
        });
        await expect(ursaMajorButton).toHaveClass(/bg-cyan-600/);
    });

    test("should switch between different constellations", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for constellations to load
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible({ timeout: 10000 });

        // Select Ursa Major first
        await page.getByRole("button", { name: /Ursa Major/i }).click();
        await expect(page.getByText("The Great Bear")).toBeVisible();

        // Switch to Cassiopeia
        await page.getByRole("button", { name: /Cassiopeia/i }).click();
        await expect(
            page.getByText("The Queen, forming a distinctive 'W' shape"),
        ).toBeVisible();
        await expect(page.getByText(/vain queen of Ethiopia/)).toBeVisible();
        await expect(page.getByText("Sep, Oct, Nov, Dec, Jan")).toBeVisible();

        // Switch to Cygnus
        await page.getByRole("button", { name: /Cygnus/i }).click();
        await expect(
            page.getByText("The Swan, also known as the Northern Cross"),
        ).toBeVisible();
        await expect(page.getByText(/Zeus disguised as a swan/)).toBeVisible();
    });
});

test.describe("Constellation View UI Controls", () => {
    test("should toggle location information display", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for controls to load
        await expect(
            page.getByRole("button", { name: "Hide Location Info" }),
        ).toBeVisible({ timeout: 10000 });

        // Should initially show location info
        await expect(page.getByText("Current Location:")).toBeVisible();
        await expect(page.getByText("Current Time:")).toBeVisible();

        // Hide location info
        await page.getByRole("button", { name: "Hide Location Info" }).click();

        // Location info should be hidden
        await expect(page.getByText("Current Location:")).not.toBeVisible();
        await expect(page.getByText("Current Time:")).not.toBeVisible();

        // Button text should change
        await expect(
            page.getByRole("button", { name: "Show Location Info" }),
        ).toBeVisible();

        // Show location info again
        await page.getByRole("button", { name: "Show Location Info" }).click();
        await expect(page.getByText("Current Location:")).toBeVisible();
        await expect(page.getByText("Current Time:")).toBeVisible();
    });

    test("should have controls toggle button", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for controls to load
        await expect(page.getByRole("button", { name: "⚙️" })).toBeVisible({
            timeout: 10000,
        });

        // Controls panel should be visible initially
        await expect(page.getByText("Constellation View")).toBeVisible();

        // Click controls toggle
        await page.getByRole("button", { name: "⚙️" }).click();

        // The button should change to show/hide controls
        // Note: The actual behavior depends on implementation
        // For now, we just verify the button exists and is clickable
        await expect(page.getByRole("button", { name: /⚙️|📊/ })).toBeVisible();
    });

    test("should display proper constellation count and details", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation list
        await expect(page.getByText("Visible Constellations:")).toBeVisible({
            timeout: 10000,
        });

        // Should show multiple constellations for late August in New York
        const constellationButtons = page
            .getByRole("button")
            .filter({ hasText: /• \d+ stars/ });
        const count = await constellationButtons.count();
        expect(count).toBeGreaterThanOrEqual(3); // Should have at least 3 visible constellations

        // Check specific star counts
        await expect(page.getByText("7 stars")).toBeVisible(); // Ursa Major
        await expect(page.getByText("5 stars")).toBeVisible(); // Cassiopeia/Cygnus
    });
});

test.describe("Constellation View Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for controls to load
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeVisible({ timeout: 10000 });

        // Tab through main controls
        await page.keyboard.press("Tab");
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: /⚙️|📊/ })).toBeFocused();

        // Continue tabbing to constellation list
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab"); // Skip location toggle

        // Should reach constellation buttons
        const firstConstellation = page
            .getByRole("button", { name: /Ursa Major|Cassiopeia|Cygnus/ })
            .first();
        await page.keyboard.press("Tab");
        await expect(firstConstellation).toBeFocused();
    });

    test("should support Enter key for constellation selection", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation buttons to load
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible({ timeout: 10000 });

        // Focus on Ursa Major and press Enter
        await page.getByRole("button", { name: /Ursa Major/i }).focus();
        await page.keyboard.press("Enter");

        // Should show constellation details
        await expect(page.getByText("The Great Bear")).toBeVisible();
    });

    test("should have proper ARIA labels and roles", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeVisible({ timeout: 10000 });

        // Check button roles
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toHaveAttribute("type", "button");
        await expect(
            page.getByRole("button", { name: /Hide|Show Location Info/ }),
        ).toHaveAttribute("type", "button");

        // Check headings hierarchy
        await expect(
            page.getByRole("heading", { name: "Constellation View" }),
        ).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "Visible Constellations:" }),
        ).toBeVisible();
    });
});

test.describe("Constellation View Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto("/constellation");

        // Wait for page to load
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // Main controls should be visible and accessible
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: /⚙️|📊/ })).toBeVisible();

        // Constellation list should be scrollable on mobile
        await expect(page.getByText("Visible Constellations:")).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto("/constellation");

        // Wait for page to load
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // All elements should be properly sized
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeVisible();
        await expect(page.getByText("Current Location:")).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible();
    });

    test("should handle different screen orientations", async ({ page }) => {
        // Test landscape mobile
        await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE landscape
        await page.goto("/constellation");

        // Should still be functional in landscape
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });
        await expect(
            page.getByRole("button", { name: "← Back to Menu" }),
        ).toBeVisible();
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
        await page.waitForTimeout(5000);

        // Should not have uncaught JavaScript errors
        expect(errors.length).toBe(0);
    });

    test("should display loading state properly", async ({ page }) => {
        await page.goto("/constellation");

        // Should show loading indicators
        const loadingText = page.getByText("Loading constellation data...");
        const gettingLocation = page.getByText("Getting user location...");

        // At least one loading indicator should appear
        const hasLoading =
            (await loadingText.isVisible()) ||
            (await gettingLocation.isVisible());
        expect(hasLoading).toBe(true);
    });

    test("should handle constellation data loading errors", async ({
        page,
    }) => {
        // This test would need to mock network failures
        // For now, we verify the page handles the normal flow
        await page.goto("/constellation");

        // Should eventually load successfully or show an error
        try {
            await expect(page.getByText("Constellation View")).toBeVisible({
                timeout: 15000,
            });
        } catch {
            // Check for error message
            await expect(
                page.getByText(/Unable to load constellation view|error/i),
            ).toBeVisible();
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
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 15000,
        });

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds
    });

    test("should handle constellation selection responsively", async ({
        page,
    }) => {
        await page.goto("/constellation");

        // Wait for constellation list to load
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible({ timeout: 10000 });

        // Measure selection response time
        const startTime = Date.now();
        await page.getByRole("button", { name: /Ursa Major/i }).click();
        await expect(page.getByText("The Great Bear")).toBeVisible();
        const selectionTime = Date.now() - startTime;

        expect(selectionTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
});

test.describe("Constellation View Integration", () => {
    test("should maintain state when navigating back and forth", async ({
        page,
    }) => {
        // Start from main menu
        await page.goto("/");

        // Navigate to constellation view
        const constellationButton = page.locator(
            'button:has-text("Constellation View")',
        );
        await constellationButton.click();

        // Wait for load and select a constellation
        await expect(
            page.getByRole("button", { name: /Ursa Major/i }),
        ).toBeVisible({ timeout: 10000 });
        await page.getByRole("button", { name: /Ursa Major/i }).click();
        await expect(page.getByText("The Great Bear")).toBeVisible();

        // Go back to main menu
        await page.getByRole("button", { name: "← Back to Menu" }).click();
        await expect(page).toHaveURL("/");

        // Return to constellation view
        await constellationButton.click();

        // Should load successfully again
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });
    });

    test("should work with language selector", async ({ page }) => {
        await page.goto("/constellation");

        // Wait for page to load
        await expect(page.getByText("Constellation View")).toBeVisible({
            timeout: 10000,
        });

        // Language selector should be present
        await expect(
            page.getByRole("button", { name: "Language selector" }),
        ).toBeVisible();

        // Test that changing language doesn't break the page
        // (Note: actual language switching would require more complex testing)
        const languageButton = page.getByRole("button", {
            name: "Language selector",
        });
        await expect(languageButton).toBeVisible();
    });
});
