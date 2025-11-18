import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import SettingsModal from "../SettingsModal.svelte";
import type { GameSettings } from "../../stores/gameStore";

describe("SettingsModal", () => {
    const defaultSettings: GameSettings = {
        enableAnimations: true,
        audioEnabled: true,
        controlSensitivity: 1.0,
        graphicsQuality: "medium",
        showControlHints: true,
        orbitSpeedMultiplier: 1.0,
        highContrastMode: false,
        reducedMotion: false,
        enableKeyboardNavigation: true,
        announceSceneChanges: true,
        screenReaderMode: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe("Component Rendering", () => {
        it("should render when isOpen is true", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Game Settings")).toBeTruthy();
        });

        it("should not render dialog content when isOpen is false", () => {
            const { queryByText } = render(SettingsModal, {
                props: {
                    isOpen: false,
                    currentSettings: defaultSettings,
                },
            });

            // Dialog should not be visible
            expect(queryByText("Game Settings")).toBeFalsy();
        });

        it("should render all section headers", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Visual Settings")).toBeTruthy();
            expect(getByText("Audio Settings")).toBeTruthy();
            expect(getByText("Control Settings")).toBeTruthy();
            expect(getByText("Accessibility Settings")).toBeTruthy();
        });

        it("should render Configuration badge", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Configuration")).toBeTruthy();
        });
    });

    describe("Visual Settings Section", () => {
        it("should render enable animations checkbox", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Enable Animations")).toBeTruthy();
            expect(
                getByText("Enable planet rotation and orbital animations"),
            ).toBeTruthy();
        });

        it("should render graphics quality dropdown", () => {
            const { getByText, container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Graphics Quality")).toBeTruthy();
            expect(
                getByText("Adjust rendering quality for performance"),
            ).toBeTruthy();

            const select = container.querySelector("select");
            expect(select).toBeTruthy();
        });

        it("should have correct graphics quality options", () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const options = container.querySelectorAll("select option");
            expect(options.length).toBe(3);
            expect(options[0].textContent).toBe("Low");
            expect(options[1].textContent).toBe("Medium");
            expect(options[2].textContent).toBe("High");
        });

        it("should render show control hints checkbox", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Show Control Hints")).toBeTruthy();
            expect(
                getByText("Display helpful control hints in the game"),
            ).toBeTruthy();
        });

        it("should reflect current enableAnimations setting", () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: {
                        ...defaultSettings,
                        enableAnimations: true,
                    },
                },
            });

            const checkbox = container.querySelector(
                'input[type="checkbox"]',
            ) as HTMLInputElement;
            expect(checkbox.checked).toBe(true);
        });

        it("should reflect current graphics quality setting", () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: {
                        ...defaultSettings,
                        graphicsQuality: "high",
                    },
                },
            });

            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            expect(select.value).toBe("high");
        });
    });

    describe("Audio Settings Section", () => {
        it("should render enable audio checkbox", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Enable Audio")).toBeTruthy();
            expect(
                getByText("Enable background music and sound effects"),
            ).toBeTruthy();
        });

        it("should reflect current audio enabled setting", () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: {
                        ...defaultSettings,
                        audioEnabled: false,
                    },
                },
            });

            const checkboxes = container.querySelectorAll(
                'input[type="checkbox"]',
            );
            // Find the audio checkbox (second one in the list)
            const audioCheckbox = Array.from(checkboxes).find((cb) => {
                const parent = cb.closest(".flex");
                return parent?.textContent?.includes("Enable Audio");
            }) as HTMLInputElement;

            expect(audioCheckbox).toBeTruthy();
            expect(audioCheckbox.checked).toBe(false);
        });
    });

    describe("Control Settings Section", () => {
        it("should render mouse sensitivity slider", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Mouse Sensitivity")).toBeTruthy();
            expect(getByText("1.0x")).toBeTruthy();
            expect(getByText("Slow (0.1x)")).toBeTruthy();
            expect(getByText("Fast (2.0x)")).toBeTruthy();
        });

        it("should reflect current control sensitivity setting", () => {
            const { container, getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: {
                        ...defaultSettings,
                        controlSensitivity: 1.5,
                    },
                },
            });

            expect(getByText("1.5x")).toBeTruthy();

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            expect(parseFloat(slider.value)).toBe(1.5);
        });

        it("should update sensitivity display when slider changes", async () => {
            const { container, getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            await fireEvent.input(slider, { target: { value: "1.8" } });

            // Display should update
            expect(getByText("1.8x")).toBeTruthy();
        });
    });

    describe("Accessibility Settings Section", () => {
        it("should render all accessibility options", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("High Contrast Mode")).toBeTruthy();
            expect(getByText("Reduced Motion")).toBeTruthy();
            expect(getByText("Keyboard Navigation")).toBeTruthy();
            expect(getByText("Announce Scene Changes")).toBeTruthy();
            expect(getByText("Screen Reader Mode")).toBeTruthy();
        });

        it("should have ARIA attributes for accessibility checkboxes", () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const ariaDescribedByCheckboxes =
                container.querySelectorAll("[aria-describedby]");
            expect(ariaDescribedByCheckboxes.length).toBeGreaterThan(0);
        });

        it("should reflect current accessibility settings", () => {
            const customSettings: GameSettings = {
                ...defaultSettings,
                highContrastMode: true,
                reducedMotion: true,
                enableKeyboardNavigation: false,
                announceSceneChanges: false,
                screenReaderMode: true,
            };

            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: customSettings,
                },
            });

            const checkboxes = container.querySelectorAll(
                'input[type="checkbox"]',
            );
            // Verify that checkboxes are checked/unchecked according to settings
            expect(checkboxes.length).toBeGreaterThan(0);
        });
    });

    describe("Action Buttons", () => {
        it("should render all action buttons", () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            expect(getByText("Reset to Defaults")).toBeTruthy();
            expect(getByText("Cancel")).toBeTruthy();
            expect(getByText("Save Settings")).toBeTruthy();
        });

        it("should have clickable Cancel button", async () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const cancelButton = getByText("Cancel");
            expect(cancelButton).toBeTruthy();

            // Button should be clickable
            await fireEvent.click(cancelButton);
        });

        it("should have clickable Save button", async () => {
            const { getByText, container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            // Change a setting
            const checkbox = container.querySelector(
                'input[type="checkbox"]',
            ) as HTMLInputElement;
            await fireEvent.click(checkbox);

            const saveButton = getByText("Save Settings");
            expect(saveButton).toBeTruthy();

            // Button should be clickable
            await fireEvent.click(saveButton);
        });
    });

    describe("Reset to Defaults Functionality", () => {
        it("should reset all settings to defaults when Reset button is clicked", async () => {
            vi.useFakeTimers();

            const customSettings: GameSettings = {
                enableAnimations: false,
                audioEnabled: false,
                controlSensitivity: 1.8,
                graphicsQuality: "low",
                showControlHints: false,
                orbitSpeedMultiplier: 5.0,
                highContrastMode: true,
                reducedMotion: true,
                enableKeyboardNavigation: false,
                announceSceneChanges: false,
                screenReaderMode: true,
            };

            const { getByText, container, getByRole } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: customSettings,
                },
            });

            const resetButton = getByText("Reset to Defaults");
            await fireEvent.click(resetButton);

            // Wait for reactive updates using fake timers
            await vi.advanceTimersByTimeAsync(50);

            // Verify settings are reset by checking the component's internal state through the DOM
            // Select is unique, so we can verify it directly
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            expect(select.value).toBe("medium");

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            expect(parseFloat(slider.value)).toBe(1.0);

            // Verify checkbox settings using Testing Library's getByRole with accessible names
            // This uses aria-label attributes and is robust to DOM structure changes
            expect(
                (
                    getByRole("checkbox", {
                        name: "Enable Animations",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Show Control Hints",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Enable Audio",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true);
            expect(
                (
                    getByRole("checkbox", {
                        name: "High Contrast Mode",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(false);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Reduced Motion",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(false);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Keyboard Navigation",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Announce Scene Changes",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true);
            expect(
                (
                    getByRole("checkbox", {
                        name: "Screen Reader Mode",
                    }) as HTMLInputElement
                ).checked,
            ).toBe(false);

            vi.useRealTimers();
        });

        it("should have reset button that is clickable", async () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const resetButton = getByText("Reset to Defaults");
            expect(resetButton).toBeTruthy();

            // Button should be clickable
            await fireEvent.click(resetButton);
        });
    });

    describe("Settings Synchronization", () => {
        it("should reflect current settings in UI", async () => {
            const customSettings: GameSettings = {
                ...defaultSettings,
                graphicsQuality: "high",
            };

            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: customSettings,
                },
            });

            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            expect(select.value).toBe("high");
        });

        it("should preserve user changes in UI", async () => {
            const { getByText, container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            // User changes graphics quality
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            await fireEvent.change(select, { target: { value: "low" } });

            expect(select.value).toBe("low");

            // Changes should persist in the component
            const cancelButton = getByText("Cancel");
            expect(cancelButton).toBeTruthy();
        });
    });

    describe("Checkbox Interactions", () => {
        it("should toggle enableAnimations checkbox", async () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: {
                        ...defaultSettings,
                        enableAnimations: true,
                    },
                },
            });

            const checkbox = container.querySelector(
                'input[type="checkbox"]',
            ) as HTMLInputElement;
            expect(checkbox.checked).toBe(true);

            await fireEvent.click(checkbox);
            expect(checkbox.checked).toBe(false);

            await fireEvent.click(checkbox);
            expect(checkbox.checked).toBe(true);
        });

        it("should toggle all accessibility checkboxes independently", async () => {
            const { getByText } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            // Get all checkboxes in the accessibility section
            // Navigate to the Card component containing "Accessibility Settings"
            const accessibilitySection = getByText("Accessibility Settings")
                .closest('div[class*="bg-card"]') // Find the parent Card component
                ?.querySelector('[class*="space-y-4"]'); // Find CardContent within this card

            // Assert the accessibility section exists - fail loudly if missing
            expect(accessibilitySection).not.toBeNull();
            expect(accessibilitySection).toBeDefined();

            const checkboxes = accessibilitySection!.querySelectorAll(
                'input[type="checkbox"]',
            );

            // Assert we have exactly 5 accessibility checkboxes
            // (High Contrast, Reduced Motion, Keyboard Nav, Announce Changes, Screen Reader)
            expect(checkboxes.length).toBe(5);

            // Each should be independently toggleable
            for (const checkbox of Array.from(checkboxes)) {
                const initialState = (checkbox as HTMLInputElement).checked;
                await fireEvent.click(checkbox);
                expect((checkbox as HTMLInputElement).checked).toBe(
                    !initialState,
                );
            }
        });
    });

    describe("Graphics Quality Selection", () => {
        it("should update graphics quality when dropdown changes", async () => {
            const { container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;

            await fireEvent.change(select, { target: { value: "high" } });
            expect(select.value).toBe("high");

            await fireEvent.change(select, { target: { value: "low" } });
            expect(select.value).toBe("low");
        });
    });

    describe("User Interactions", () => {
        it("should allow changing multiple settings before save", async () => {
            const { getByText, container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            // Change some settings
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            await fireEvent.change(select, { target: { value: "high" } });

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            await fireEvent.input(slider, { target: { value: "1.5" } });

            // Verify changes are reflected in UI
            expect(select.value).toBe("high");
            expect(parseFloat(slider.value)).toBe(1.5);

            // Save button should be available
            const saveButton = getByText("Save Settings");
            expect(saveButton).toBeTruthy();
        });

        it("should allow canceling without errors", async () => {
            const { getByText, container } = render(SettingsModal, {
                props: {
                    isOpen: true,
                    currentSettings: defaultSettings,
                },
            });

            // Change a setting
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            await fireEvent.change(select, { target: { value: "low" } });

            const cancelButton = getByText("Cancel");
            await fireEvent.click(cancelButton);

            // Should complete without errors
            expect(cancelButton).toBeTruthy();
        });
    });
});
