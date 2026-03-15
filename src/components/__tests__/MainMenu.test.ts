import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import MainMenu from "@/components/MainMenu.svelte";
import { settings } from "@/stores/gameStore";

// Mock gameActions
vi.mock("@/stores/gameStore", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/stores/gameStore")>();
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
vi.mock("@/i18n/utils", () => ({
    getLangFromUrl: vi.fn(() => "en"),
    useTranslations: vi.fn(() => (key: string) => key),
    useTranslatedPath: vi.fn(() => (path: string) => path),
}));

// Mock planetarySystemRegistry
vi.mock("@/lib/planetary-system", () => ({
    planetarySystemRegistry: {
        getAllSystems: vi.fn(() => [
            {
                id: "solar",
                name: "Solar System",
                description: "Our home star system",
                systemData: {
                    id: "solar",
                    name: "Solar System",
                    systemType: "star-system",
                    metadata: { distance: "0 ly" },
                },
            },
            {
                id: "alpha-centauri",
                name: "Alpha Centauri",
                description: "Nearest star system to Sol",
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

import { gameActions } from "@/stores/gameStore";

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
            expect(queryByText("Graphics Quality")).toBeNull();
        });

        it("should show settings modal when settings button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const settingsBtn = buttons.find((b) =>
                b.textContent?.toLowerCase().includes("setting"),
            );
            expect(settingsBtn).toBeTruthy();
            await fireEvent.click(settingsBtn!);
            expect(container.textContent).toContain("Game Settings");
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
            expect(exploreBtn).toBeTruthy();
            await fireEvent.click(exploreBtn!);
            // System selector with mock systems should appear
            expect(container.textContent).toContain("Solar System");
            expect(container.textContent).toContain("Alpha Centauri");
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
            expect(solarBtn).toBeTruthy();
            await fireEvent.click(solarBtn!);
            expect(gameActions.navigateToView).toHaveBeenCalledWith(
                "solar-system",
            );
        });
    });

    describe("Keyboard Navigation", () => {
        it("should move focus to next item on ArrowDown", async () => {
            const { container } = render(MainMenu);
            const menuButtons = container.querySelectorAll(".menu-button");
            expect(menuButtons.length).toBeGreaterThan(1);
            await fireEvent.keyDown(window, { key: "ArrowDown" });
            // focusedIndex moved to 1 — second button should now be focused
            expect(document.activeElement).toBe(menuButtons[1]);
        });

        it("should move focus to previous item on ArrowUp", async () => {
            const { container } = render(MainMenu);
            const menuButtons = container.querySelectorAll(".menu-button");
            // Start at index 0, ArrowUp wraps to last
            await fireEvent.keyDown(window, { key: "ArrowUp" });
            expect(document.activeElement).toBe(
                menuButtons[menuButtons.length - 1],
            );
        });

        it("should move focus forward on ArrowRight", async () => {
            const { container } = render(MainMenu);
            const menuButtons = container.querySelectorAll(".menu-button");
            await fireEvent.keyDown(window, { key: "ArrowRight" });
            expect(document.activeElement).toBe(menuButtons[1]);
        });

        it("should move focus backward on ArrowLeft", async () => {
            const { container } = render(MainMenu);
            const menuButtons = container.querySelectorAll(".menu-button");
            await fireEvent.keyDown(window, { key: "ArrowLeft" });
            expect(document.activeElement).toBe(
                menuButtons[menuButtons.length - 1],
            );
        });

        it("should not handle keys when enableKeyboardNavigation is false", async () => {
            settings.update((s) => ({ ...s, enableKeyboardNavigation: false }));
            render(MainMenu);
            await fireEvent.keyDown(window, { key: "ArrowDown" });
            expect(gameActions.navigateToView).not.toHaveBeenCalled();
        });

        it("should trigger Solar System action on Enter at index 0", async () => {
            render(MainMenu);
            // focusedIndex starts at 0 (Solar System)
            await fireEvent.keyDown(window, { key: "Enter" });
            expect(gameActions.navigateToView).toHaveBeenCalledWith(
                "solar-system",
            );
        });

        it("should trigger Solar System action on Space at index 0", async () => {
            render(MainMenu);
            await fireEvent.keyDown(window, { key: " " });
            expect(gameActions.navigateToView).toHaveBeenCalledWith(
                "solar-system",
            );
        });
    });

    describe("Galaxy View", () => {
        it("should navigate to /galaxy when Galaxy button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const galaxyBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("galaxy") ||
                    b.textContent?.includes("main.galaxy"),
            );
            expect(galaxyBtn).toBeTruthy();
            await fireEvent.click(galaxyBtn!);
            expect(window.location.href).toBe("/galaxy");
        });
    });

    describe("Constellation View", () => {
        it("should navigate to /constellation when Constellation button is clicked", async () => {
            const { container } = render(MainMenu);
            const buttons = Array.from(container.querySelectorAll("button"));
            const constellationBtn = buttons.find(
                (b) =>
                    b.textContent?.toLowerCase().includes("constellation") ||
                    b.textContent?.includes("constellation.title"),
            );
            expect(constellationBtn).toBeTruthy();
            await fireEvent.click(constellationBtn!);
            expect(window.location.href).toBe("/constellation");
        });
    });
});
