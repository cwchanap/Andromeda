import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";

// Mock the SolarSystem data with a small set of celestial bodies
vi.mock("@/lib/planetary-system/SolarSystem", () => ({
    solarSystemData: {
        star: {
            id: "sun",
            name: "Sun",
            description: "The central star of our solar system",
            type: "star",
        },
        celestialBodies: [
            {
                id: "mercury",
                name: "Mercury",
                description: "The closest planet to the Sun",
                type: "planet",
            },
            {
                id: "venus",
                name: "Venus",
                description: "The second planet from the Sun",
                type: "planet",
            },
            {
                id: "earth",
                name: "Earth",
                description: "The third planet from the Sun",
                type: "planet",
            },
        ],
    },
}));

// Mock gameActions in the store
vi.mock("@/stores/gameStore", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/stores/gameStore")>();
    return {
        ...actual,
        gameActions: {
            ...actual.gameActions,
            selectCelestialBody: vi.fn(),
            showInfoModal: vi.fn(),
        },
    };
});

import { settings, gameActions } from "@/stores/gameStore";
import KeyboardNavigation from "@/components/KeyboardNavigation.svelte";

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

describe("KeyboardNavigation", () => {
    beforeEach(() => {
        settings.set(defaultSettings);
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(KeyboardNavigation);
            expect(container).toBeTruthy();
        });

        it("should render a screen reader live region", () => {
            const { container } = render(KeyboardNavigation);
            const liveRegion = container.querySelector('[aria-live="polite"]');
            expect(liveRegion).toBeTruthy();
        });

        it("should not show keyboard controls panel when screenReaderMode is false", () => {
            const { queryByText } = render(KeyboardNavigation);
            expect(queryByText("Keyboard Controls")).toBeNull();
        });

        it("should show keyboard controls panel when screenReaderMode is true", () => {
            settings.update((s) => ({ ...s, screenReaderMode: true }));
            const { getByText } = render(KeyboardNavigation);
            expect(getByText("Keyboard Controls")).toBeTruthy();
        });

        it("should show all keyboard shortcuts in screenReaderMode", () => {
            settings.update((s) => ({ ...s, screenReaderMode: true }));
            const { getByText } = render(KeyboardNavigation);
            expect(getByText("Arrow keys: Navigate planets")).toBeTruthy();
            expect(getByText("Enter/Space: Select planet")).toBeTruthy();
            expect(getByText("+/-: Zoom in/out")).toBeTruthy();
            expect(getByText("0: Reset view")).toBeTruthy();
            expect(getByText("H: Show help")).toBeTruthy();
            expect(getByText("Escape: Clear selection")).toBeTruthy();
        });
    });

    describe("Arrow Key Navigation", () => {
        it("should call onPlanetSelect when ArrowRight is pressed", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "ArrowRight" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Sun");
        });

        it("should call onPlanetSelect when ArrowDown is pressed", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "ArrowDown" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
        });

        it("should call onPlanetSelect when ArrowLeft is pressed", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "ArrowRight" }); // idx 0
            await fireEvent.keyDown(window, { key: "ArrowRight" }); // idx 1

            onPlanetSelect.mockClear();
            await fireEvent.keyDown(window, { key: "ArrowLeft" }); // back to idx 0

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Sun");
        });

        it("should call onPlanetSelect when ArrowUp is pressed", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "ArrowUp" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
        });

        it("should wrap around to first when navigating past the last item", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            for (let i = 0; i < 4; i++) {
                await fireEvent.keyDown(window, { key: "ArrowRight" });
            }

            onPlanetSelect.mockClear();
            await fireEvent.keyDown(window, { key: "ArrowRight" }); // wraps to 0

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Sun");
        });
    });

    describe("Home/End Navigation", () => {
        it("should navigate to first body on Home key", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "Home" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Sun");
        });

        it("should navigate to last body on End key", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "End" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Earth");
        });
    });

    describe("Zoom Controls", () => {
        it("should call onZoomIn when '+' is pressed", async () => {
            const onZoomIn = vi.fn();
            render(KeyboardNavigation, { props: { onZoomIn } });

            await fireEvent.keyDown(window, { key: "+" });

            expect(onZoomIn).toHaveBeenCalledOnce();
        });

        it("should call onZoomIn when '=' is pressed", async () => {
            const onZoomIn = vi.fn();
            render(KeyboardNavigation, { props: { onZoomIn } });

            await fireEvent.keyDown(window, { key: "=" });

            expect(onZoomIn).toHaveBeenCalledOnce();
        });

        it("should call onZoomOut when '-' is pressed", async () => {
            const onZoomOut = vi.fn();
            render(KeyboardNavigation, { props: { onZoomOut } });

            await fireEvent.keyDown(window, { key: "-" });

            expect(onZoomOut).toHaveBeenCalledOnce();
        });
    });

    describe("Reset View", () => {
        it("should call onResetView when '0' is pressed", async () => {
            const onResetView = vi.fn();
            render(KeyboardNavigation, { props: { onResetView } });

            await fireEvent.keyDown(window, { key: "0" });

            expect(onResetView).toHaveBeenCalledOnce();
        });
    });

    describe("Select & Escape", () => {
        it("should call selectCelestialBody on Enter when a body is selected", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "ArrowRight" });
            await fireEvent.keyDown(window, { key: "Enter" });

            expect(gameActions.selectCelestialBody).toHaveBeenCalledOnce();
            expect(gameActions.showInfoModal).toHaveBeenCalledWith(true);
        });

        it("should call selectCelestialBody on Space when a body is selected", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "ArrowRight" });
            await fireEvent.keyDown(window, { key: " " });

            expect(gameActions.selectCelestialBody).toHaveBeenCalledOnce();
        });

        it("should close info modal on Escape", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "Escape" });

            expect(gameActions.showInfoModal).toHaveBeenCalledWith(false);
        });

        it("should not select when no body is focused (index -1)", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "Enter" });

            expect(gameActions.selectCelestialBody).not.toHaveBeenCalled();
        });
    });

    describe("Disabled State", () => {
        it("should not handle key events when enableKeyboardNavigation is false", async () => {
            const onPlanetSelect = vi.fn();
            settings.update((s) => ({ ...s, enableKeyboardNavigation: false }));
            render(KeyboardNavigation, { props: { onPlanetSelect } });

            await fireEvent.keyDown(window, { key: "ArrowRight" });

            expect(onPlanetSelect).not.toHaveBeenCalled();
        });
    });

    describe("Input Field Passthrough", () => {
        it("should not handle key events when target is an input element", async () => {
            const onPlanetSelect = vi.fn();
            const { container } = render(KeyboardNavigation, {
                props: { onPlanetSelect },
            });

            const input = document.createElement("input");
            container.appendChild(input);

            await fireEvent.keyDown(input, { key: "ArrowRight" });

            expect(onPlanetSelect).not.toHaveBeenCalled();
        });
    });

    describe("Screen Reader Announcements", () => {
        it("should update live region text when navigating", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "ArrowRight" });

            const liveRegion = document.querySelector(
                '[aria-live="polite"][aria-atomic="true"]',
            );
            expect(liveRegion?.textContent).toContain("Sun");
        });

        it("should announce zoom in when + is pressed", async () => {
            const onZoomIn = vi.fn();
            render(KeyboardNavigation, { props: { onZoomIn } });

            await fireEvent.keyDown(window, { key: "+" });

            const liveRegion = document.querySelector(
                '[aria-live="polite"][aria-atomic="true"]',
            );
            expect(liveRegion?.textContent).toContain("Zoomed in");
        });

        it("should not update live region when announceSceneChanges is false", async () => {
            settings.update((s) => ({ ...s, announceSceneChanges: false }));
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "ArrowRight" });

            const liveRegion = document.querySelector(
                '[aria-live="polite"][aria-atomic="true"]',
            );
            expect(liveRegion?.textContent).toBe("");
        });
    });

    describe("currentSelectedIndex Prop", () => {
        it("should start from provided currentSelectedIndex when navigating", async () => {
            const onPlanetSelect = vi.fn();
            render(KeyboardNavigation, {
                props: { onPlanetSelect, currentSelectedIndex: 2 },
            });

            // index 2 = Venus, ArrowRight moves to index 3 = Earth
            await fireEvent.keyDown(window, { key: "ArrowRight" });

            expect(onPlanetSelect).toHaveBeenCalledOnce();
            expect(onPlanetSelect.mock.calls[0][0].name).toBe("Earth");
        });
    });

    describe("Help Key", () => {
        it("should announce help text when H key is pressed", async () => {
            render(KeyboardNavigation);

            await fireEvent.keyDown(window, { key: "H" });

            const liveRegion = document.querySelector(
                '[aria-live="polite"][aria-atomic="true"]',
            );
            expect(liveRegion?.textContent).toContain("Keyboard controls");
        });
    });
});
