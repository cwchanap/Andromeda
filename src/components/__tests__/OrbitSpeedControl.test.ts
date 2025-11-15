import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { get } from "svelte/store";
import OrbitSpeedControl from "../OrbitSpeedControl.svelte";
import { settings } from "../../stores/gameStore";

// Mock i18n utilities
vi.mock("../../i18n/utils", () => ({
    getLangFromUrl: vi.fn(() => "en"),
    useTranslations: vi.fn(() => (key: string) => {
        const translations: Record<string, string> = {
            "controls.orbitSpeed": "Orbit Speed",
            "controls.reset": "Reset",
            "controls.paused": "Paused",
            "controls.normal": "Normal",
            "controls.speed100x": "100x",
        };
        return translations[key] || key;
    }),
}));

describe("OrbitSpeedControl", () => {
    const mockOnSpeedChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset settings store to default
        settings.set({
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
        });
    });

    afterEach(() => {
        cleanup();
    });

    describe("Component Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            expect(container).toBeTruthy();
        });

        it("should render the control header with title", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            expect(getByText("Orbit Speed")).toBeTruthy();
        });

        it("should render the reset button", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            expect(getByText("Reset")).toBeTruthy();
        });

        it("should render the speed slider", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector('input[type="range"]');
            expect(slider).toBeTruthy();
        });

        it("should render speed labels", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            expect(getByText("Paused")).toBeTruthy();
            expect(getByText("Normal")).toBeTruthy();
            expect(getByText("100x")).toBeTruthy();
        });

        it("should display current speed value", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            // Default speed is 1.0
            expect(getByText("1.0x")).toBeTruthy();
        });

        it("should display 'Paused' when speed is 0", () => {
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 0 }));
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            // Should show "Paused" in the speed display (not in the labels)
            const speedDisplay = container.querySelector(".speed-display");
            expect(speedDisplay?.textContent).toBe("Paused");
        });
    });

    describe("Slider Configuration", () => {
        it("should have correct min, max, and step values", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            expect(slider.min).toBe("0");
            expect(slider.max).toBe("100");
            expect(slider.step).toBe("0.1");
        });

        it("should have aria-label for accessibility", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            expect(slider.getAttribute("aria-label")).toBe("Orbit Speed");
        });

        it("should initialize slider with current store value", () => {
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 5.5 }));
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            expect(parseFloat(slider.value)).toBe(5.5);
        });
    });

    describe("Speed Change Interaction", () => {
        it("should update store when slider value changes", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            await fireEvent.input(slider, { target: { value: "2.5" } });

            // Wait for the store update and timeout
            await new Promise((resolve) => setTimeout(resolve, 150));

            const currentSettings = get(settings);
            expect(currentSettings.orbitSpeedMultiplier).toBe(2.5);
        });

        it("should call onSpeedChange callback when slider value changes", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            await fireEvent.input(slider, { target: { value: "3.0" } });

            expect(mockOnSpeedChange).toHaveBeenCalledWith(3.0);
        });

        it("should update display when slider value changes", async () => {
            const { container, getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            await fireEvent.input(slider, { target: { value: "7.5" } });

            // Check that the speed display is updated
            expect(getByText("7.5x")).toBeTruthy();
        });

        it("should show 'Paused' when speed is set to 0", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            await fireEvent.input(slider, { target: { value: "0" } });

            // Should show "Paused" in the speed display (not in the labels)
            const speedDisplay = container.querySelector(".speed-display");
            expect(speedDisplay?.textContent).toBe("Paused");
        });
    });

    describe("Reset Button Functionality", () => {
        it("should call onSpeedChange with 1.0 when reset button is clicked", async () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const resetButton = getByText("Reset");
            await fireEvent.click(resetButton);

            // The callback should be called with exactly 1.0 (the default speed)
            expect(mockOnSpeedChange).toHaveBeenCalledWith(1.0);
        });

        it("should reset speed from custom value to 1.0", async () => {
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 5.0 }));

            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const resetButton = getByText("Reset");
            await fireEvent.click(resetButton);

            // Wait for store update
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Verify the store was updated to the default value
            const currentSettings = get(settings);
            expect(currentSettings.orbitSpeedMultiplier).toBe(1.0);

            // Also verify the callback was called with the correct value
            expect(mockOnSpeedChange).toHaveBeenCalledWith(1.0);
        });

        it("should update slider value to 1.0 when reset is clicked", async () => {
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 10.0 }));

            const { getByText, container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const resetButton = getByText("Reset");
            await fireEvent.click(resetButton);

            // Wait for reactive updates
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Verify the slider reflects the reset value
            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            expect(parseFloat(slider.value)).toBe(1.0);
        });
    });

    describe("Store Integration", () => {
        it("should sync with store changes when not interacting", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            // Update store externally
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 4.2 }));

            // Wait for reactive updates
            await new Promise((resolve) => setTimeout(resolve, 50));

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            expect(parseFloat(slider.value)).toBe(4.2);
        });

        it("should not sync with store during user interaction", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            // User changes slider
            await fireEvent.input(slider, { target: { value: "3.0" } });

            // Immediately try to update store (should be blocked during interaction)
            settings.update((s) => ({ ...s, orbitSpeedMultiplier: 7.0 }));

            // Wait for interaction timeout (100ms)
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Slider should still show user's value
            expect(parseFloat(slider.value)).toBe(3.0);

            // After timeout, it should sync
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Now it should update from the store
            expect(parseFloat(slider.value)).toBe(7.0);
        });
    });

    describe("Translation Support", () => {
        it("should use custom translations when provided", () => {
            const customTranslations = {
                "controls.orbitSpeed": "Velocidad de órbita",
                "controls.reset": "Reiniciar",
                "controls.paused": "Pausado",
                "controls.normal": "Normal",
                "controls.speed100x": "100x",
            };

            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                    translations: customTranslations,
                },
            });

            expect(getByText("Velocidad de órbita")).toBeTruthy();
            expect(getByText("Reiniciar")).toBeTruthy();
        });

        it("should use fallback for missing translation keys", () => {
            const partialTranslations = {
                "controls.orbitSpeed": "Custom Orbit Speed",
            };

            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                    translations: partialTranslations,
                },
            });

            expect(getByText("Custom Orbit Speed")).toBeTruthy();
        });

        it("should support different languages", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "zh",
                },
            });

            // Should still render (with mocked translations)
            expect(getByText("Orbit Speed")).toBeTruthy();
        });
    });

    describe("Accessibility Features", () => {
        it("should have proper ARIA labels", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;
            expect(slider.getAttribute("aria-label")).toBeTruthy();
        });

        it("should have descriptive button titles", () => {
            const { getByTitle } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            expect(getByTitle("Reset")).toBeTruthy();
        });

        it("should be keyboard accessible", async () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            const slider = container.querySelector(
                'input[type="range"]',
            ) as HTMLInputElement;

            // Slider should be focusable and keyboard accessible
            expect(slider.tabIndex).toBeGreaterThanOrEqual(0);
        });
    });

    describe("Default Props", () => {
        it("should use default onSpeedChange if not provided", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    lang: "en",
                },
            });

            // Should render without errors
            expect(container).toBeTruthy();
        });

        it("should use default lang if not provided", () => {
            const { container } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                },
            });

            // Should render without errors
            expect(container).toBeTruthy();
        });

        it("should use empty translations object by default", () => {
            const { getByText } = render(OrbitSpeedControl, {
                props: {
                    onSpeedChange: mockOnSpeedChange,
                    lang: "en",
                },
            });

            // Should use the mocked useTranslations function
            expect(getByText("Orbit Speed")).toBeTruthy();
        });
    });
});
