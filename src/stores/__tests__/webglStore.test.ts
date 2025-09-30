import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";
import { createWebGLStore } from "../webglStore";
import { WebGLErrorHandler } from "../../utils/errorHandling";

describe("webglStore", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("initializes with detected WebGL capabilities", () => {
        const checkSpy = vi
            .spyOn(WebGLErrorHandler.prototype, "checkWebGLSupport")
            .mockReturnValue({
                webgl: true,
                webgl2: false,
            });

        const store = createWebGLStore();
        const support = get({ subscribe: store.subscribe });

        expect(support).toEqual({ webgl: true, webgl2: false });
        expect(checkSpy).toHaveBeenCalledTimes(1);
        expect(get(store.isChecking)).toBe(false);
    });

    it("captures thrown errors with their message", () => {
        vi.spyOn(
            WebGLErrorHandler.prototype,
            "checkWebGLSupport",
        ).mockImplementation(() => {
            throw new Error("webgl failed");
        });

        const store = createWebGLStore();
        const support = get({ subscribe: store.subscribe });

        expect(support).toEqual({
            webgl: false,
            webgl2: false,
            error: "webgl failed",
        });
        expect(get(store.isChecking)).toBe(false);
    });

    it("supports manual rechecks after the initial probe", () => {
        const checkSpy = vi
            .spyOn(WebGLErrorHandler.prototype, "checkWebGLSupport")
            .mockReturnValueOnce({ webgl: false, webgl2: false })
            .mockReturnValueOnce({ webgl: true, webgl2: true });

        const store = createWebGLStore();
        expect(get({ subscribe: store.subscribe })).toEqual({
            webgl: false,
            webgl2: false,
        });

        store.checkWebGLSupport();

        expect(checkSpy).toHaveBeenCalledTimes(2);
        expect(get({ subscribe: store.subscribe })).toEqual({
            webgl: true,
            webgl2: true,
        });
    });

    it("falls back to a generic message for non-Error throwables", () => {
        vi.spyOn(
            WebGLErrorHandler.prototype,
            "checkWebGLSupport",
        ).mockImplementation(() => {
            throw "boom";
        });

        const store = createWebGLStore();
        const support = get({ subscribe: store.subscribe });

        expect(support).toEqual({
            webgl: false,
            webgl2: false,
            error: "Unknown WebGL error",
        });
    });
});
