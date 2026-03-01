import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";

// Helper to set window dimensions in jsdom
function setWindowSize(width: number, height: number, dpr = 1) {
    Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: width,
    });
    Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: height,
    });
    Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: dpr,
    });
}

describe("BREAKPOINTS", () => {
    it("mobile breakpoint is 768", async () => {
        const { BREAKPOINTS } = await import("../responsiveStore");
        expect(BREAKPOINTS.mobile).toBe(768);
    });

    it("tablet breakpoint is 1024", async () => {
        const { BREAKPOINTS } = await import("../responsiveStore");
        expect(BREAKPOINTS.tablet).toBe(1024);
    });

    it("desktop breakpoint is 1200", async () => {
        const { BREAKPOINTS } = await import("../responsiveStore");
        expect(BREAKPOINTS.desktop).toBe(1200);
    });
});

describe("responsive store", () => {
    // Re-import store fresh each test to avoid module-level singleton issues
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("detects mobile viewport", async () => {
        setWindowSize(375, 667);
        const { responsive } = await import("../responsiveStore");
        const state = get(responsive);
        expect(state.isMobile).toBe(true);
        expect(state.isTablet).toBe(false);
        expect(state.isDesktop).toBe(false);
        expect(state.screenWidth).toBe(375);
        expect(state.screenHeight).toBe(667);
    });

    it("detects tablet viewport (between mobile and desktop breakpoints)", async () => {
        setWindowSize(900, 1200);
        const { responsive } = await import("../responsiveStore");
        const state = get(responsive);
        expect(state.isMobile).toBe(false);
        expect(state.isTablet).toBe(true);
        expect(state.isDesktop).toBe(false);
    });

    it("detects desktop viewport", async () => {
        setWindowSize(1440, 900);
        const { responsive } = await import("../responsiveStore");
        const state = get(responsive);
        expect(state.isMobile).toBe(false);
        expect(state.isTablet).toBe(false);
        expect(state.isDesktop).toBe(true);
    });

    it("captures device pixel ratio", async () => {
        setWindowSize(1440, 900, 2);
        const { responsive } = await import("../responsiveStore");
        const state = get(responsive);
        expect(state.devicePixelRatio).toBe(2);
    });

    it("update() refreshes the store with current window dimensions", async () => {
        setWindowSize(375, 667);
        const { responsive } = await import("../responsiveStore");
        expect(get(responsive).isMobile).toBe(true);

        setWindowSize(1440, 900);
        responsive.update();
        expect(get(responsive).isMobile).toBe(false);
        expect(get(responsive).isDesktop).toBe(true);
    });

    it("store is subscribable", async () => {
        setWindowSize(1440, 900);
        const { responsive } = await import("../responsiveStore");
        let received: unknown = null;
        const unsub = responsive.subscribe((val) => {
            received = val;
        });
        expect(received).not.toBeNull();
        unsub();
    });

    it("SSR fallback: returns desktop defaults when window is undefined", async () => {
        // Simulate server-side rendering environment (no window)
        vi.resetModules();
        vi.stubGlobal("window", undefined);
        try {
            const { responsive } = await import("../responsiveStore");
            const state = get(responsive);
            expect(state.isMobile).toBe(false);
            expect(state.isTablet).toBe(false);
            expect(state.isDesktop).toBe(true);
            expect(state.screenWidth).toBe(1920);
            expect(state.screenHeight).toBe(1080);
            expect(state.devicePixelRatio).toBe(1);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
