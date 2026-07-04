/**
 * MediaQueryList listener helpers with legacy Safari/iOS fallback.
 *
 * Safari < 14 and iOS < 14 only expose the deprecated `addListener` /
 * `removeListener` API on MediaQueryList, not `addEventListener` /
 * `removeEventListener`. Calling the modern API directly on those browsers
 * throws `TypeError: mql.addEventListener is not a function`. These helpers
 * pick whichever API is available so callers don't have to branch per site.
 */

type MediaQueryListener = (e: MediaQueryListEvent) => void;

interface ModernMql {
    addEventListener: (type: string, listener: MediaQueryListener) => void;
    removeEventListener: (type: string, listener: MediaQueryListener) => void;
}

interface LegacyMql {
    addListener: (listener: MediaQueryListener) => void;
    removeListener: (listener: MediaQueryListener) => void;
}

type AnyMql = (Partial<ModernMql> & Partial<LegacyMql>) | null | undefined;

/**
 * Minimal structural type accepted by the helpers. Exported so callers
 * (and tests) can type mock MediaQueryList objects without resorting to
 * `any`. Real `MediaQueryList` instances satisfy this shape.
 */
export type MediaQueryListLike = Partial<ModernMql> & Partial<LegacyMql>;

export function addMediaQueryListener(
    mql: AnyMql,
    type: string,
    listener: MediaQueryListener,
): void {
    if (!mql) return;
    if (typeof mql.addEventListener === "function") {
        mql.addEventListener(type, listener);
    } else if (typeof mql.addListener === "function") {
        mql.addListener(listener);
    }
}

export function removeMediaQueryListener(
    mql: AnyMql,
    type: string,
    listener: MediaQueryListener,
): void {
    if (!mql) return;
    if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener(type, listener);
    } else if (typeof mql.removeListener === "function") {
        mql.removeListener(listener);
    }
}
