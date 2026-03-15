import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import SettingsModal from "@/components/SettingsModal.svelte";
import type { GameSettings } from "@/stores/gameStore";

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

describe("SettingsModal", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe("Closed State", () => {
        it("should not show settings content when closed", () => {
            const { queryByText } = render(SettingsModal, {
                props: { isOpen: false, currentSettings: defaultSettings },
            });
            expect(queryByText("Game Settings")).toBeNull();
        });
    });

    describe("Open State", () => {
        it("should render without crashing when open", () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            expect(container).toBeTruthy();
        });

        it("should show Game Settings header when open", () => {
            const { getByText } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            expect(getByText("Game Settings")).toBeTruthy();
        });

        it("should show Visual Settings section", () => {
            const { getByText } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            expect(getByText("Visual Settings")).toBeTruthy();
        });

        it("should show Accessibility Settings section", () => {
            const { getByText } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            expect(getByText("Accessibility Settings")).toBeTruthy();
        });

        it("should show Save Settings button", () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const buttons = Array.from(container.querySelectorAll("button"));
            const saveBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("save"),
            );
            expect(saveBtn).toBeTruthy();
        });

        it("should show Reset to Defaults button", () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const buttons = Array.from(container.querySelectorAll("button"));
            const resetBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("reset"),
            );
            expect(resetBtn).toBeTruthy();
        });

        it("should show graphics quality options", () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            expect(container.textContent?.toLowerCase()).toContain("quality");
        });
    });

    describe("Interactions", () => {
        it("should reset form to default values when Reset button is clicked", async () => {
            // Start with non-default value for animations
            const modifiedSettings = {
                ...defaultSettings,
                enableAnimations: false,
            };
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: modifiedSettings },
            });
            const buttons = Array.from(container.querySelectorAll("button"));
            const resetBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("reset"),
            );
            expect(resetBtn).toBeTruthy();
            await fireEvent.click(resetBtn!);
            // After reset, Enable Animations checkbox should be checked (default = true)
            const animationsCheckbox = container.querySelector(
                "input[aria-label='Enable Animations']",
            ) as HTMLInputElement;
            expect(animationsCheckbox?.checked).toBe(true);
        });

        it("should toggle checkboxes without throwing", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const checkboxes = container.querySelectorAll(
                "input[type='checkbox']",
            );
            for (const checkbox of Array.from(checkboxes).slice(0, 3)) {
                expect(() => fireEvent.click(checkbox)).not.toThrow();
            }
        });

        it("should update graphicsQuality select value when changed", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            expect(select).toBeTruthy();
            await fireEvent.change(select, { target: { value: "high" } });
            expect(select.value).toBe("high");
        });

        it("should update range inputs without throwing", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const ranges = container.querySelectorAll("input[type='range']");
            for (const range of Array.from(ranges)) {
                expect(() =>
                    fireEvent.input(range, { target: { value: "2.0" } }),
                ).not.toThrow();
            }
        });
    });

    describe("Current Settings Reflection", () => {
        it("should reflect highContrastMode=true on the High Contrast Mode checkbox", () => {
            const highContrastSettings = {
                ...defaultSettings,
                highContrastMode: true,
            };
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: highContrastSettings },
            });
            const highContrastCheckbox = container.querySelector(
                "input[aria-label='High Contrast Mode']",
            ) as HTMLInputElement;
            expect(highContrastCheckbox).toBeTruthy();
            expect(highContrastCheckbox.checked).toBe(true);
        });

        it("should reflect low graphics quality in the select element", () => {
            const lowSettings = {
                ...defaultSettings,
                graphicsQuality: "low" as const,
            };
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: lowSettings },
            });
            const select = container.querySelector(
                "select",
            ) as HTMLSelectElement;
            expect(select).toBeTruthy();
            expect(select.value).toBe("low");
        });
    });
});
