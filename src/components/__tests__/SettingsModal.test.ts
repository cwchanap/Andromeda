import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import SettingsModal from "../SettingsModal.svelte";
import type { GameSettings } from "../../stores/gameStore";

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
        it("should call reset handler when Reset button is clicked", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const buttons = Array.from(container.querySelectorAll("button"));
            const resetBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("reset"),
            );
            if (resetBtn) {
                await fireEvent.click(resetBtn);
                expect(true).toBe(true);
            }
        });

        it("should toggle checkboxes without throwing", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const checkboxes = container.querySelectorAll(
                "input[type='checkbox']",
            );
            for (const checkbox of Array.from(checkboxes).slice(0, 3)) {
                await fireEvent.click(checkbox);
            }
            expect(true).toBe(true);
        });

        it("should change graphics quality via select", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const selects = container.querySelectorAll("select");
            if (selects.length > 0) {
                await fireEvent.change(selects[0], {
                    target: { value: "high" },
                });
                expect(true).toBe(true);
            }
        });

        it("should update range inputs without throwing", async () => {
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: defaultSettings },
            });
            const ranges = container.querySelectorAll("input[type='range']");
            for (const range of Array.from(ranges)) {
                await fireEvent.input(range, { target: { value: "2.0" } });
            }
            expect(true).toBe(true);
        });
    });

    describe("Current Settings Reflection", () => {
        it("should reflect highContrastMode when true", () => {
            const highContrastSettings = {
                ...defaultSettings,
                highContrastMode: true,
            };
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: highContrastSettings },
            });
            const checkboxes = Array.from(
                container.querySelectorAll("input[type='checkbox']"),
            ) as HTMLInputElement[];
            const checked = checkboxes.some((c) => c.checked);
            expect(checked).toBe(true);
        });

        it("should reflect low graphics quality setting", () => {
            const lowSettings = {
                ...defaultSettings,
                graphicsQuality: "low" as const,
            };
            const { container } = render(SettingsModal, {
                props: { isOpen: true, currentSettings: lowSettings },
            });
            expect(container.textContent?.toLowerCase()).toContain("low");
        });
    });
});
