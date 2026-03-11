import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    LazyLoadingManager,
    BundleSplitter,
    createLazyComponent,
} from "@/lib/performance/LazyLoadingManager";

describe("LazyLoadingManager", () => {
    let manager: LazyLoadingManager;

    beforeEach(() => {
        manager = new LazyLoadingManager();
    });

    describe("constructor", () => {
        it("initializes with 6 known modules", () => {
            const stats = manager.getStats();
            expect(stats.totalModules).toBe(6);
            expect(stats.loadedModules).toBe(0);
            expect(stats.loadingModules).toBe(0);
            expect(stats.progress).toBe(0);
        });
    });

    describe("loadModule", () => {
        it("loads a module and caches it", async () => {
            const module = { value: 42 };
            const importFn = vi.fn().mockResolvedValue(module);

            const result = await manager.loadModule("test-module", importFn);

            expect(result).toBe(module);
            expect(importFn).toHaveBeenCalledTimes(1);
            expect(manager.isLoaded("test-module")).toBe(true);
        });

        it("returns cached module on second call without re-importing", async () => {
            const module = { value: 42 };
            const importFn = vi.fn().mockResolvedValue(module);

            await manager.loadModule("cached-module", importFn);
            const result = await manager.loadModule("cached-module", importFn);

            expect(result).toBe(module);
            expect(importFn).toHaveBeenCalledTimes(1);
        });

        it("returns existing loading promise when module is loading", async () => {
            let resolveLoad!: (v: unknown) => void;
            const loadPromise = new Promise((resolve) => {
                resolveLoad = resolve;
            });
            const importFn = vi.fn().mockReturnValue(loadPromise);

            const p1 = manager.loadModule("concurrent-module", importFn);
            const p2 = manager.loadModule("concurrent-module", importFn);

            // Only one import call should have been made
            expect(importFn).toHaveBeenCalledTimes(1);

            resolveLoad({ value: "concurrent" });
            await Promise.all([p1, p2]);
        });

        it("increments loadedCount after successful load", async () => {
            const importFn = vi.fn().mockResolvedValue({ value: 1 });
            await manager.loadModule("count-module", importFn);

            const stats = manager.getStats();
            expect(stats.loadedModules).toBe(1);
        });

        it("throws error when import function fails all retries", async () => {
            const importFn = vi
                .fn()
                .mockRejectedValue(new Error("Import failed"));

            await expect(
                manager.loadModule("fail-module", importFn, {
                    retries: 0,
                    retryDelay: 0,
                }),
            ).rejects.toThrow("Failed to load module fail-module");

            expect(manager.isLoaded("fail-module")).toBe(false);
        });

        it("retries loading on failure", async () => {
            const module = { value: "success" };
            const importFn = vi
                .fn()
                .mockRejectedValueOnce(new Error("Temporary failure"))
                .mockResolvedValueOnce(module);

            const result = await manager.loadModule("retry-module", importFn, {
                retries: 2,
                retryDelay: 0,
            });

            expect(result).toBe(module);
            expect(importFn).toHaveBeenCalledTimes(2);
        });

        it("notifies progress callback when module loads", async () => {
            const progressCb = vi.fn();
            manager.onProgress(progressCb);

            await manager.loadModule(
                "progress-module",
                vi.fn().mockResolvedValue({}),
            );

            // Should have been called at least once (at end of load)
            expect(progressCb).toHaveBeenCalled();
        });
    });

    describe("onProgress", () => {
        it("registers a callback and returns an unsubscribe function", async () => {
            const callback = vi.fn();
            const unsubscribe = manager.onProgress(callback);

            await manager.loadModule(
                "on-progress-module",
                vi.fn().mockResolvedValue({}),
            );
            const callCountBefore = callback.mock.calls.length;

            unsubscribe();
            await manager.loadModule(
                "on-progress-module-2",
                vi.fn().mockResolvedValue({}),
            );

            // No additional calls after unsubscribe
            expect(callback.mock.calls.length).toBe(callCountBefore);
        });

        it("notifies with correct progress data structure", async () => {
            const callback = vi.fn();
            manager.onProgress(callback);

            await manager.loadModule(
                "data-module",
                vi.fn().mockResolvedValue({}),
            );

            const progressArg =
                callback.mock.calls[callback.mock.calls.length - 1][0];
            expect(progressArg).toHaveProperty("loaded");
            expect(progressArg).toHaveProperty("total");
            expect(progressArg).toHaveProperty("progress");
        });

        it("handles errors in progress callbacks gracefully", async () => {
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error("Callback error");
            });
            manager.onProgress(errorCallback);

            // Should not throw
            await expect(
                manager.loadModule(
                    "error-cb-module",
                    vi.fn().mockResolvedValue({}),
                ),
            ).resolves.toBeDefined();
        });
    });

    describe("isLoaded", () => {
        it("returns false for unloaded module", () => {
            expect(manager.isLoaded("nonexistent")).toBe(false);
        });

        it("returns true after loading", async () => {
            await manager.loadModule(
                "loaded-check",
                vi.fn().mockResolvedValue({}),
            );
            expect(manager.isLoaded("loaded-check")).toBe(true);
        });
    });

    describe("isLoading", () => {
        it("returns false when module is not loading", () => {
            expect(manager.isLoading("not-loading")).toBe(false);
        });

        it("returns true while module is loading", () => {
            let resolveLoad!: (v: unknown) => void;
            const loadPromise = new Promise((resolve) => {
                resolveLoad = resolve;
            });
            const importFn = vi.fn().mockReturnValue(loadPromise);

            manager.loadModule("is-loading-module", importFn);
            expect(manager.isLoading("is-loading-module")).toBe(true);

            resolveLoad({});
        });
    });

    describe("getModule", () => {
        it("returns null for unloaded module", () => {
            expect(manager.getModule("nonexistent")).toBeNull();
        });

        it("returns the module after loading", async () => {
            const module = { value: "test" };
            await manager.loadModule(
                "get-module-test",
                vi.fn().mockResolvedValue(module),
            );

            expect(manager.getModule("get-module-test")).toBe(module);
        });
    });

    describe("getStats", () => {
        it("returns correct stats after loading modules", async () => {
            await manager.loadModule(
                "stats-module-1",
                vi.fn().mockResolvedValue({}),
            );
            await manager.loadModule(
                "stats-module-2",
                vi.fn().mockResolvedValue({}),
            );

            const stats = manager.getStats();
            expect(stats.loadedModules).toBe(2);
            expect(stats.loadingModules).toBe(0);
            expect(stats.progress).toBeGreaterThan(0);
        });
    });

    describe("clearModules", () => {
        it("clears all loaded modules", async () => {
            await manager.loadModule(
                "clear-module",
                vi.fn().mockResolvedValue({}),
            );
            expect(manager.isLoaded("clear-module")).toBe(true);

            manager.clearModules();

            expect(manager.isLoaded("clear-module")).toBe(false);
            expect(manager.getStats().loadedModules).toBe(0);
        });
    });

    describe("preloadModules", () => {
        it("loads multiple modules in parallel", async () => {
            const module1 = { value: 1 };
            const module2 = { value: 2 };

            await manager.preloadModules([
                {
                    id: "preload-1",
                    importFn: vi.fn().mockResolvedValue(module1),
                },
                {
                    id: "preload-2",
                    importFn: vi.fn().mockResolvedValue(module2),
                },
            ]);

            expect(manager.isLoaded("preload-1")).toBe(true);
            expect(manager.isLoaded("preload-2")).toBe(true);
        });

        it("continues loading other modules when one fails", async () => {
            await manager.preloadModules([
                {
                    id: "preload-fail",
                    importFn: vi.fn().mockRejectedValue(new Error("fail")),
                    config: { retries: 0, retryDelay: 0 },
                },
                {
                    id: "preload-success",
                    importFn: vi.fn().mockResolvedValue({ ok: true }),
                },
            ]);

            expect(manager.isLoaded("preload-success")).toBe(true);
            expect(manager.isLoaded("preload-fail")).toBe(false);
        });
    });

    describe("dispose", () => {
        it("clears all internal state", async () => {
            const progressCb = vi.fn();
            manager.onProgress(progressCb);
            await manager.loadModule(
                "dispose-module",
                vi.fn().mockResolvedValue({}),
            );

            const callsBeforeDispose = progressCb.mock.calls.length;
            expect(callsBeforeDispose).toBeGreaterThan(0);

            manager.dispose();

            const stats = manager.getStats();
            expect(stats.loadedModules).toBe(0);
            expect(stats.loadingModules).toBe(0);
            expect(stats.totalModules).toBe(0);
            expect(stats.progress).toBe(0);

            // Progress callback should no longer be called after dispose
            manager.clearModules();
            expect(progressCb.mock.calls.length).toBe(callsBeforeDispose);
        });
    });
});

describe("BundleSplitter", () => {
    describe("estimateSavings", () => {
        it("calculates initial bundle size correctly", () => {
            const result = BundleSplitter.estimateSavings(1000, 300);
            expect(result.initialBundleSize).toBe(700);
            expect(result.lazySavings).toBe(300);
            expect(result.percentageSaved).toBeCloseTo(30);
        });

        it("returns 0 savings when lazy size is 0", () => {
            const result = BundleSplitter.estimateSavings(1000, 0);
            expect(result.initialBundleSize).toBe(1000);
            expect(result.lazySavings).toBe(0);
            expect(result.percentageSaved).toBe(0);
        });

        it("returns 100% savings when all code is lazy loaded", () => {
            const result = BundleSplitter.estimateSavings(500, 500);
            expect(result.initialBundleSize).toBe(0);
            expect(result.percentageSaved).toBeCloseTo(100);
        });
    });

    describe("loadChunksByPriority", () => {
        it("loads critical chunks first", async () => {
            const order: string[] = [];
            const criticalFn = vi.fn().mockImplementation(async () => {
                order.push("critical");
                return {};
            });
            const lowFn = vi.fn().mockImplementation(async () => {
                order.push("low");
                return {};
            });

            await BundleSplitter.loadChunksByPriority([
                { id: "low-chunk", priority: "low", importFn: lowFn },
                {
                    id: "critical-chunk",
                    priority: "critical",
                    importFn: criticalFn,
                },
            ]);

            expect(order[0]).toBe("critical");
        });

        it("handles empty chunk list without errors", async () => {
            await expect(
                BundleSplitter.loadChunksByPriority([]),
            ).resolves.toBeUndefined();
        });
    });
});

describe("createLazyComponent", () => {
    it("calls the fallback when import fails", async () => {
        const fallback = vi.fn().mockReturnValue("fallback-result");
        const importFn = vi.fn().mockRejectedValue(new Error("Import error"));

        const lazyComp = createLazyComponent(
            "fail-component",
            importFn,
            fallback,
        );
        const result = await (
            lazyComp as (...args: unknown[]) => Promise<unknown>
        )();

        expect(result).toBe("fallback-result");
        expect(fallback).toHaveBeenCalled();
    });

    it("throws when import fails and no fallback is provided", async () => {
        const importFn = vi
            .fn()
            .mockRejectedValue(new Error("No fallback error"));

        const lazyComp = createLazyComponent("no-fallback", importFn);
        await expect(
            (lazyComp as (...args: unknown[]) => Promise<unknown>)(),
        ).rejects.toThrow();
    });

    it("loads component with default export", async () => {
        const component = vi.fn().mockReturnValue("result");
        const importFn = vi.fn().mockResolvedValue({ default: component });

        const lazyComp = createLazyComponent("default-export", importFn);
        const result = await (
            lazyComp as (...args: unknown[]) => Promise<unknown>
        )();

        expect(result).toBe("result");
    });

    it("caches the component after first load", async () => {
        const component = vi.fn().mockReturnValue("cached");
        const importFn = vi.fn().mockResolvedValue({ default: component });

        const lazyComp = createLazyComponent("cached-component", importFn);
        await (lazyComp as (...args: unknown[]) => Promise<unknown>)();
        await (lazyComp as (...args: unknown[]) => Promise<unknown>)();

        expect(importFn).toHaveBeenCalledTimes(1);
    });
});
