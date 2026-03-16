import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { settings } from "@/stores/gameStore";

// Mock CSS imports that AccessibilityManager uses
vi.mock("@/styles/high-contrast.css", () => ({}));
vi.mock("@/styles/reduced-motion.css", () => ({}));

// matchMedia mock factory
function createMatchMediaMock(matchesQuery?: (q: string) => boolean) {
    return vi.fn().mockImplementation((query: string) => ({
        matches: matchesQuery ? matchesQuery(query) : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

import AccessibilityManager from "@/components/AccessibilityManager.svelte";

// Default matchMedia mock (no system preferences active)
let matchMediaMock = createMatchMediaMock();

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

describe("AccessibilityManager", () => {
    beforeEach(() => {
        matchMediaMock = createMatchMediaMock();
        vi.stubGlobal("matchMedia", matchMediaMock);
        settings.set(defaultSettings);
        // Clear attributes from previous tests
        document.documentElement.removeAttribute("data-high-contrast");
        document.documentElement.removeAttribute("data-reduced-motion");
        document.documentElement.removeAttribute("data-system-reduced-motion");
        document.documentElement.removeAttribute("data-system-high-contrast");
        // Clear CSS custom properties
        const root = document.documentElement;
        root.style.removeProperty("--text-primary");
        root.style.removeProperty("--bg-primary");
        root.style.removeProperty("--focus-color");
        // Remove any leftover announcement elements from previous tests
        document.body
            .querySelectorAll('[aria-live="polite"].sr-only')
            .forEach((el) => {
                el.remove();
            });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.useRealTimers(); // ensure fake timers don't leak between tests
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(AccessibilityManager);
            expect(container).toBeTruthy();
        });

        it("should not set accessibility attributes by default", () => {
            render(AccessibilityManager);
            // With default settings, no accessibility attributes should be applied
            expect(
                document.documentElement.getAttribute("data-high-contrast"),
            ).toBeNull();
            expect(
                document.documentElement.getAttribute("data-reduced-motion"),
            ).toBeNull();
        });
    });

    describe("High Contrast Mode - Setting to true", () => {
        it("should set data-high-contrast=true when rendered with highContrastMode enabled", () => {
            // Set highContrastMode to true BEFORE rendering so the reactive block fires
            settings.set({ ...defaultSettings, highContrastMode: true });
            render(AccessibilityManager);

            expect(
                document.documentElement.getAttribute("data-high-contrast"),
            ).toBe("true");
        });

        it("should apply high contrast CSS custom properties when highContrastMode is true", () => {
            settings.set({ ...defaultSettings, highContrastMode: true });
            render(AccessibilityManager);

            const root = document.documentElement;
            expect(root.style.getPropertyValue("--text-primary")).toBe(
                "#ffffff",
            );
            expect(root.style.getPropertyValue("--bg-primary")).toBe("#000000");
            expect(root.style.getPropertyValue("--focus-color")).toBe(
                "#ffff00",
            );
        });

        it("should set data-high-contrast when setting changes after mount", async () => {
            render(AccessibilityManager);

            // Change setting after mount
            settings.update((s) => ({ ...s, highContrastMode: true }));
            await new Promise((r) => setTimeout(r, 0));

            expect(
                document.documentElement.getAttribute("data-high-contrast"),
            ).toBe("true");
        });

        it("should set data-high-contrast=false when toggling back to false", async () => {
            settings.set({ ...defaultSettings, highContrastMode: true });
            render(AccessibilityManager);

            settings.update((s) => ({ ...s, highContrastMode: false }));
            await new Promise((r) => setTimeout(r, 0));

            expect(
                document.documentElement.getAttribute("data-high-contrast"),
            ).toBe("false");
        });

        it("should remove CSS custom properties when highContrastMode set to false", async () => {
            settings.set({ ...defaultSettings, highContrastMode: true });
            render(AccessibilityManager);

            settings.update((s) => ({ ...s, highContrastMode: false }));
            await new Promise((r) => setTimeout(r, 0));

            const root = document.documentElement;
            expect(root.style.getPropertyValue("--text-primary")).toBe("");
        });
    });

    describe("Reduced Motion", () => {
        it("should set data-reduced-motion=true when reducedMotion is enabled", () => {
            settings.set({ ...defaultSettings, reducedMotion: true });
            render(AccessibilityManager);

            expect(
                document.documentElement.getAttribute("data-reduced-motion"),
            ).toBe("true");
        });

        it("should set data-reduced-motion when setting changes after mount", async () => {
            render(AccessibilityManager);

            settings.update((s) => ({ ...s, reducedMotion: true }));
            await new Promise((r) => setTimeout(r, 0));

            expect(
                document.documentElement.getAttribute("data-reduced-motion"),
            ).toBe("true");
        });
    });

    describe("System Preferences", () => {
        it("should query matchMedia for reduced motion on mount", () => {
            render(AccessibilityManager);
            expect(matchMediaMock).toHaveBeenCalledWith(
                "(prefers-reduced-motion: reduce)",
            );
        });

        it("should query matchMedia for high contrast on mount", () => {
            render(AccessibilityManager);
            expect(matchMediaMock).toHaveBeenCalledWith(
                "(prefers-contrast: high)",
            );
        });

        it("should set data-system-reduced-motion when system prefers reduced motion", () => {
            matchMediaMock = createMatchMediaMock((q) =>
                q.includes("prefers-reduced-motion"),
            );
            vi.stubGlobal("matchMedia", matchMediaMock);

            render(AccessibilityManager);

            expect(
                document.documentElement.getAttribute(
                    "data-system-reduced-motion",
                ),
            ).toBe("true");
        });
    });

    describe("Announcements", () => {
        it("should create an announcement element when high contrast changes and announceSceneChanges is true", async () => {
            vi.useFakeTimers();
            render(AccessibilityManager);

            settings.update((s) => ({
                ...s,
                highContrastMode: true,
                announceSceneChanges: true,
            }));
            await vi.advanceTimersByTimeAsync(0);

            const announcements = document.body.querySelectorAll(
                '[aria-live="polite"].sr-only',
            );
            expect(announcements.length).toBeGreaterThan(0);

            vi.useRealTimers();
        });

        it("should remove announcement after timeout", async () => {
            vi.useFakeTimers();
            render(AccessibilityManager);

            settings.update((s) => ({
                ...s,
                highContrastMode: true,
                announceSceneChanges: true,
            }));
            await vi.advanceTimersByTimeAsync(10);

            // Confirm announcement exists before timeout
            let announcements = document.body.querySelectorAll(
                '[aria-live="polite"].sr-only',
            );
            expect(announcements.length).toBeGreaterThan(0);

            // Advance past the 1000ms removal timeout
            await vi.advanceTimersByTimeAsync(1100);

            announcements = document.body.querySelectorAll(
                '[aria-live="polite"].sr-only',
            );
            expect(announcements.length).toBe(0);
        });

        it("should not create announcement when announceSceneChanges is false", async () => {
            vi.useFakeTimers();
            settings.set({ ...defaultSettings, announceSceneChanges: false });
            render(AccessibilityManager);

            settings.update((s) => ({
                ...s,
                highContrastMode: true,
            }));
            await vi.advanceTimersByTimeAsync(10);

            const announcements = document.body.querySelectorAll(
                '[aria-live="polite"].sr-only',
            );
            expect(announcements.length).toBe(0);
        });
    });
});
