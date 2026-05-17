/**
 * Normalizes a path by collapsing consecutive slashes and ensuring a single
 * leading slash. Prevents scheme-relative URLs (e.g. //evil.com) from being
 * produced during /en prefix stripping.
 */
export function normalizeCanonicalPath(rawPath: string): string {
    return rawPath.replace(/\/+/g, "/").replace(/^(?!\/)/, "/");
}
