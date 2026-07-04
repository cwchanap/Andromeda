import { describe, it, expect, vi } from "vitest";
import {
    addMediaQueryListener,
    removeMediaQueryListener,
    type MediaQueryListLike,
} from "../mediaQuery";

function makeModernMql(): MediaQueryListLike {
    return {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };
}

function makeLegacyMql(): MediaQueryListLike {
    // Safari/iOS < 14: MediaQueryList only exposes the deprecated
    // addListener/removeListener, not addEventListener/removeEventListener.
    return {
        addListener: vi.fn(),
        removeListener: vi.fn(),
    };
}

describe("addMediaQueryListener", () => {
    it("uses addEventListener when available", () => {
        const mql = makeModernMql();
        const handler = vi.fn();
        addMediaQueryListener(mql, "change", handler);
        expect(mql.addEventListener).toHaveBeenCalledWith("change", handler);
        expect(mql.addEventListener).toHaveBeenCalledTimes(1);
    });

    it("falls back to addListener when addEventListener is missing", () => {
        const mql = makeLegacyMql();
        const handler = vi.fn();
        addMediaQueryListener(mql, "change", handler);
        // Legacy API passes the handler directly (no event type).
        expect(mql.addListener).toHaveBeenCalledWith(handler);
        expect(mql.addListener).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when mql is null", () => {
        const handler = vi.fn();
        expect(() =>
            addMediaQueryListener(null, "change", handler),
        ).not.toThrow();
    });
});

describe("removeMediaQueryListener", () => {
    it("uses removeEventListener when available", () => {
        const mql = makeModernMql();
        const handler = vi.fn();
        removeMediaQueryListener(mql, "change", handler);
        expect(mql.removeEventListener).toHaveBeenCalledWith("change", handler);
        expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
    });

    it("falls back to removeListener when removeEventListener is missing", () => {
        const mql = makeLegacyMql();
        const handler = vi.fn();
        removeMediaQueryListener(mql, "change", handler);
        expect(mql.removeListener).toHaveBeenCalledWith(handler);
        expect(mql.removeListener).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when mql is null", () => {
        const handler = vi.fn();
        expect(() =>
            removeMediaQueryListener(null, "change", handler),
        ).not.toThrow();
    });
});
