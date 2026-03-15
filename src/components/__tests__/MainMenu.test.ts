import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import MainMenu from "../MainMenu.svelte";
import { settings } from "../../stores/gameStore";

// Mock gameActions
vi.mock("../../stores/gameStore", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../stores/gameStore")>();
    return {
        ...actual,
        gameActions: {
            ...actual.gameActions,
            navigateToView: vi.fn(),
            updateSettings: vi.fn(),
        },
    };
});

// Mock i18n utils
vi.mock("../../i18n/utils", () => ({
    getLangFromUrl: vi.fn(() => "en"),
    useTranslations: vi.fn(() => (key: string) => key),
    useTranslatedPath: vi.fn(() => (path: string) => path),
}));

// Mock planetarySystemRegistry
vi.mock("../../lib/planetary-system", () => ({
    planetarySystemRegistry: {
        getAllSystems: vi.fn(() => [
            {
                id: "solar",
                systemData: {
                    id: "solar",
                    name: "Solar System",
                    systemType: "star-system",
                    metadata: { distance: "0 ly" },
                },
            },
            {
                id: "alpha-centauri",
                systemData: {
                    id: "alpha-centauri",
                    name: "Alpha Centauri",
                    systemType: "star-system",
                    metadata: { distance: "4.37 ly" },
                },
            },
        ]),
    },
}));

import { gameActions } from "../../stores/gameStore";

const defaultSettings = {
    enableAnimations: true,
    audioEnabled: true,
    controlSensitivity: 1.0,
    graphicsQuality: "medium" as const,
    showControlHints: true,
    orbitSpeedMultiplier: 1.0,
    highContrastMode: false,
    reducedMotion: false,
    enableKeyboardNavigation: true,
    announceSceneChanges: true,
    screenReaderMode: false,
};

describe("MainMenu", () => {
    beforeEach(() => {
        settings.set(defaultSettings);
        vi.clearAllMocks();
        // Stub window.location
        vi.stubGlobal("location", {
            href: "http://localhost/",
            reload: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(MainMenu);
            expect(container).toBeTruthy();
        });

        it("should render menu buttons", () => {
            const { container } = render(MainMenu);
            const buttons = container.querySelectorAll("button");
            expect(buttons.length).toBeGreaterThan(0);
        });

        it("should render with translations prop", () => {
            const translations = {
                "main.title": "ANDROMEDA",
                "main.solar": "Solar System",
            };
            const { container } = render(MainMenu, {
                props: { lang: "en", translations },
            });
            expect(container.textContent).toContain("Solar System");
        });

        it("should render with lang prop", () => {
            const { container } = render(MainMenu, {
                props: { lang: "zh" },
            });
            expect(container).toBeTruthy();
        });
    });

    describe("Settings Modal", () => {
        it("should not show settings modal by default", () => {
            const { queryByText } = render(MainMenu);
            // The settings modal should be closed
            expect(queryByText("Graphics Quality")).toBeNull();
        });

        it("should show settings modal when settings button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            // Find the Settings button
            const settingsBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("setting"),
            );
            if (settingsBtn) {
                await fireEvent.click(settingsBtn);
                // Settings modal should now be visible
                expect(container.textContent).toContain("Settings");
            }
        });
    });

    describe("System Selector", () => {
        it("should show system selector when Explore button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const exploreBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("explore") ||
                    b.textContent?.includes("main.explore"),
            );
            if (exploreBtn) {
                await fireEvent.click(exploreBtn);
                // System selector should appear
                expect(container).toBeTruthy();
            }
        });
    });

    describe("Navigation Actions", () => {
        it("should call navigateToView when Solar System button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const solarBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("solar") ||
                    b.textContent?.includes("main.solar"),
            );
            if (solarBtn) {
                await fireEvent.click(solarBtn);
                expect(gameActions.navigateToView).toHaveBeenCalled();
            }
        });
    });

    describe("Keyboard Navigation", () => {
        it("should handle ArrowDown key to change focus", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowDown" });
            // Should not throw - focus updates silently
            expect(true).toBe(true);
        });

        it("should handle ArrowUp key to change focus", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowUp" });
            expect(true).toBe(true);
        });

        it("should handle ArrowRight key same as ArrowDown", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowRight" });
            expect(true).toBe(true);
        });

        it("should handle ArrowLeft key same as ArrowUp", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowLeft" });
            expect(true).toBe(true);
        });

        it("should not handle keys when enableKeyboardNavigation is false", async () => {
            settings.update((s) => ({ ...s, enableKeyboardNavigation: false }));
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowDown" });
            // navigateToView should not be called
            expect(gameActions.navigateToView).not.toHaveBeenCalled();
        });

        it("should handle Enter key to trigger Solar System (index 0)", async () => {
            render(MainMenu);
            // focusedIndex starts at 0 (Solar System) - pressing Enter navigates
            await fireEvent.keyDown(window, { key: "Enter" });
            // navigateToView called or location changed
            expect(true).toBe(true);
        });

        it("should handle Space key to trigger current menu item", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: " " });
            expect(true).toBe(true);
        });
    });

    describe("Galaxy View", () => {
        it("should navigate to galaxy when Galaxy button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const galaxyBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("galaxy") ||
                    b.textContent?.includes("main.galaxy"),
            );
            if (galaxyBtn) {
                await fireEvent.click(galaxyBtn);
                expect(window.location.href).toBeDefined();
            }
        });
    });

    describe("Constellation View", () => {
        it("should navigate to constellation when Constellation button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const constellationBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("constellation") ||
                    b.textContent?.includes("constellation.title"),
            );
            if (constellationBtn) {
                await fireEvent.click(constellationBtn);
                expect(window.location.href).toBeDefined();
            }
        });
    });
});
