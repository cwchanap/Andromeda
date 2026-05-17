import { describe, expect, it } from "vitest";
import { normalizeCanonicalPath } from "@/utils/pathUtils";

describe("normalizeCanonicalPath", () => {
    it("returns / for empty string", () => {
        expect(normalizeCanonicalPath("")).toBe("/");
    });

    it("returns / for root path", () => {
        expect(normalizeCanonicalPath("/")).toBe("/");
    });

    it("preserves simple paths", () => {
        expect(normalizeCanonicalPath("/galaxy")).toBe("/galaxy");
    });

    it("preserves nested paths", () => {
        expect(normalizeCanonicalPath("/planetary/solar")).toBe(
            "/planetary/solar",
        );
    });

    it("collapses consecutive slashes to prevent scheme-relative URLs", () => {
        // Open redirect fix: //evil.com → /evil.com
        expect(normalizeCanonicalPath("//evil.com")).toBe("/evil.com");
    });

    it("collapses multiple consecutive slashes", () => {
        expect(normalizeCanonicalPath("///galaxy///test")).toBe("/galaxy/test");
    });

    it("ensures leading slash on relative-looking paths", () => {
        expect(normalizeCanonicalPath("galaxy")).toBe("/galaxy");
    });

    it("handles path with trailing slashes", () => {
        expect(normalizeCanonicalPath("/galaxy/")).toBe("/galaxy/");
    });

    it("handles double slash at start only", () => {
        expect(normalizeCanonicalPath("//planetary/solar")).toBe(
            "/planetary/solar",
        );
    });
});
