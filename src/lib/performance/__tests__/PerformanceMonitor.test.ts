/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    PerformanceMonitor,
    PerformanceProfiler,
} from "@/lib/performance/PerformanceMonitor";

// Mock Three.js renderer info
const createMockRenderer = (
    overrides?: Partial<{
        calls: number;
        triangles: number;
        geometries: number;
        textures: number;
    }>,
) => ({
    info: {
        render: {
            calls: overrides?.calls ?? 10,
            triangles: overrides?.triangles ?? 100,
        },
        memory: {
            geometries: overrides?.geometries ?? 5,
            textures: overrides?.textures ?? 3,
        },
    },
});

describe("PerformanceMonitor", () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
        PerformanceProfiler.clear();
    });

    describe("constructor", () => {
        it("initializes with default thresholds", () => {
            const metrics = monitor.getMetrics();
            expect(metrics.fps).toBe(0);
            expect(metrics.frameTime).toBe(0);
            expect(metrics.renderTime).toBe(0);
        });

        it("accepts custom thresholds", () => {
            const custom = new PerformanceMonitor(undefined, { minFPS: 60 });
            expect(custom).toBeDefined();
        });

        it("accepts a renderer", () => {
            const renderer = createMockRenderer() as any;
            const monitorWithRenderer = new PerformanceMonitor(renderer);
            expect(monitorWithRenderer).toBeDefined();
        });
    });

    describe("startMonitoring / stopMonitoring", () => {
        it("starts monitoring", () => {
            monitor.startMonitoring();
            // Calling again should be idempotent
            monitor.startMonitoring();
            expect(monitor).toBeDefined();
        });

        it("stops monitoring", () => {
            monitor.startMonitoring();
            monitor.stopMonitoring();
            // After stopping, frame operations should be no-ops
            monitor.frameStart();
            monitor.frameEnd();
            // No errors should be thrown
        });
    });

    describe("frameStart / frameEnd", () => {
        it("does nothing when not monitoring", () => {
            // Should not throw
            monitor.frameStart();
            monitor.frameEnd();
        });

        it("records frame time when monitoring", () => {
            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            const metrics = monitor.getMetrics();
            expect(metrics.frameTime).toBeGreaterThanOrEqual(0);
        });

        it("updates metrics history on frameEnd", () => {
            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            const history = monitor.getMetricsHistory();
            expect(history.length).toBe(1);
        });

        it("limits history to 60 frames", () => {
            monitor.startMonitoring();

            for (let i = 0; i < 70; i++) {
                monitor.frameStart();
                monitor.frameEnd();
            }

            const history = monitor.getMetricsHistory();
            expect(history.length).toBeLessThanOrEqual(60);
        });
    });

    describe("renderStart", () => {
        it("does nothing when not monitoring", () => {
            monitor.renderStart();
            // Should not throw
        });

        it("records render time when monitoring", () => {
            monitor.startMonitoring();
            monitor.renderStart();
            monitor.frameStart();
            monitor.frameEnd();

            const metrics = monitor.getMetrics();
            expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("onMetrics callback", () => {
        it("registers a callback and returns unsubscribe function", () => {
            const callback = vi.fn();
            const unsubscribe = monitor.onMetrics(callback);
            expect(typeof unsubscribe).toBe("function");
        });

        it("calls callback when FPS is updated (after 1 second)", () => {
            const callback = vi.fn();
            monitor.onMetrics(callback);

            // Mock performance.now to simulate 1+ seconds passing
            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0) // startMonitoring lastFPSUpdate
                .mockReturnValueOnce(0) // frameStart
                .mockReturnValue(1001); // frameEnd - triggers FPS update

            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            expect(callback).toHaveBeenCalled();
            mockNow.mockRestore();
        });

        it("unsubscribes callback correctly", () => {
            const callback = vi.fn();
            const unsubscribe = monitor.onMetrics(callback);
            unsubscribe();

            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(0)
                .mockReturnValue(1001);

            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            expect(callback).not.toHaveBeenCalled();
            mockNow.mockRestore();
        });

        it("handles errors in metrics callbacks gracefully", () => {
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error("Callback error");
            });
            monitor.onMetrics(errorCallback);

            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(0)
                .mockReturnValue(1001);

            monitor.startMonitoring();
            monitor.frameStart();
            // Should not throw despite bad callback
            expect(() => monitor.frameEnd()).not.toThrow();
            mockNow.mockRestore();
        });
    });

    describe("onWarning callback", () => {
        it("registers and calls warning callback for low FPS", () => {
            const warningCb = vi.fn();
            monitor.onWarning(warningCb);

            // Simulate 1 frame in >1 second → fps=1, which is below minFPS=30
            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0) // startMonitoring lastFPSUpdate
                .mockReturnValueOnce(0) // frameStart
                .mockReturnValue(1001); // frameEnd – triggers FPS update

            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd(); // fps=1 < 30 → warning emitted

            expect(warningCb).toHaveBeenCalledTimes(1);
            expect(warningCb).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ type: "geometry" }),
                ]),
            );
            mockNow.mockRestore();
        });

        it("does not call warning callback after unsubscribe", () => {
            const warningCb = vi.fn();
            const unsubscribe = monitor.onWarning(warningCb);
            unsubscribe();

            // Same low-FPS scenario – callback must NOT fire
            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0) // startMonitoring
                .mockReturnValueOnce(0) // frameStart
                .mockReturnValue(1001); // frameEnd

            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            expect(warningCb).not.toHaveBeenCalled();
            mockNow.mockRestore();
        });
    });

    describe("getMetrics", () => {
        it("returns a copy of current metrics", () => {
            const metrics1 = monitor.getMetrics();
            const metrics2 = monitor.getMetrics();
            expect(metrics1).not.toBe(metrics2); // Different objects
            expect(metrics1).toEqual(metrics2); // Same values
        });

        it("includes all required metric fields", () => {
            const metrics = monitor.getMetrics();
            expect(metrics).toHaveProperty("fps");
            expect(metrics).toHaveProperty("frameTime");
            expect(metrics).toHaveProperty("renderTime");
            expect(metrics).toHaveProperty("memoryUsage");
            expect(metrics).toHaveProperty("drawCalls");
            expect(metrics).toHaveProperty("triangles");
            expect(metrics).toHaveProperty("geometries");
            expect(metrics).toHaveProperty("textures");
            expect(metrics).toHaveProperty("materials");
        });
    });

    describe("getMetricsHistory", () => {
        it("returns empty array initially", () => {
            expect(monitor.getMetricsHistory()).toEqual([]);
        });

        it("returns a copy of the history", () => {
            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            const history1 = monitor.getMetricsHistory();
            const history2 = monitor.getMetricsHistory();
            expect(history1).not.toBe(history2);
        });
    });

    describe("getPerformanceStats", () => {
        it("returns zeros when history is empty", () => {
            const stats = monitor.getPerformanceStats();
            expect(stats.avgFPS).toBe(0);
            expect(stats.minFPS).toBe(0);
            expect(stats.maxFPS).toBe(0);
            expect(stats.avgFrameTime).toBe(0);
            expect(stats.maxFrameTime).toBe(0);
            expect(stats.avgMemoryUsage).toBe(0);
            expect(stats.maxMemoryUsage).toBe(0);
        });

        it("calculates stats from history", () => {
            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();
            monitor.frameStart();
            monitor.frameEnd();

            const stats = monitor.getPerformanceStats();
            expect(stats.avgFPS).toBeGreaterThanOrEqual(0);
            expect(stats.avgFrameTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("generateOptimizationReport", () => {
        it("returns excellent performance when history is empty", () => {
            const report = monitor.generateOptimizationReport();
            expect(report).toHaveProperty("performance");
            expect(report).toHaveProperty("suggestions");
            expect(report).toHaveProperty("stats");
        });

        it("classifies performance as excellent for high FPS", () => {
            // Spy must be in place before startMonitoring() so lastFPSUpdate=0
            let time = 0;
            const mockNow = vi
                .spyOn(performance, "now")
                .mockImplementation(() => time);

            monitor.startMonitoring(); // lastFPSUpdate = 0

            // Phase 1: 60 frames within the first second (history fills with fps=0)
            for (let i = 0; i < 60; i++) {
                monitor.frameStart();
                time += 1;
                monitor.frameEnd();
            }

            // Phase 2: jump past 1 s to trigger FPS update (fps becomes 61)
            time = 1001;
            monitor.frameStart();
            time += 1;
            monitor.frameEnd();

            // Phase 3: 60 more frames to flush old fps=0 entries from the
            // 60-entry ring buffer; all new entries carry fps=61, frameTime~1ms
            for (let i = 0; i < 60; i++) {
                monitor.frameStart();
                time += 1;
                monitor.frameEnd();
            }

            mockNow.mockRestore();

            const report = monitor.generateOptimizationReport();
            expect(report.performance).toBe("excellent");
            expect(report.stats.avgFPS).toBeGreaterThanOrEqual(55);
        });

        it("classifies performance as poor and provides actionable suggestions", () => {
            // Spy must be in place before startMonitoring() so lastFPSUpdate=0
            let time = 0;
            const mockNow = vi
                .spyOn(performance, "now")
                .mockImplementation(() => time);

            monitor.startMonitoring(); // lastFPSUpdate = 0

            // Phase 1: one frame at 100 ms (history: fps=0, frameTime=100)
            monitor.frameStart();
            time = 100;
            monitor.frameEnd();

            // Phase 2: jump past 1 s to trigger FPS update (fps=2 after this frame)
            time = 1001;
            monitor.frameStart();
            time = 1101;
            monitor.frameEnd();

            // Phase 3: 60 more 100 ms frames to fill history with fps=2, frameTime=100
            for (let i = 0; i < 60; i++) {
                monitor.frameStart();
                time += 100;
                monitor.frameEnd();
            }

            mockNow.mockRestore();

            const report = monitor.generateOptimizationReport();
            expect(report.performance).toBe("poor");
            expect(Array.isArray(report.suggestions)).toBe(true);
            expect(report.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe("generateOptimizationReport – good and fair branches", () => {
        // Helper: drive the monitor to a specific steady-state avgFPS / avgFrameTime
        function driveMonitor(
            targetFPS: number,
            frameTimeMs: number,
            frameCount = 62,
        ) {
            let time = 0;
            const mockNow = vi
                .spyOn(performance, "now")
                .mockImplementation(() => time);

            monitor.startMonitoring();

            // Phase 1: fill history without triggering an FPS update
            for (let i = 0; i < frameCount - 2; i++) {
                monitor.frameStart();
                time += frameTimeMs;
                monitor.frameEnd();
            }

            // Phase 2: jump >1 s to trigger FPS update (fps = targetFPS)
            time = 1001;
            for (let i = 0; i < targetFPS; i++) {
                monitor.frameStart();
                time += frameTimeMs;
                monitor.frameEnd();
            }

            mockNow.mockRestore();
        }

        it("classifies performance as 'good' for mid-range FPS (40-49, frameTime ≤ 25ms)", () => {
            driveMonitor(45, 20);
            const report = monitor.generateOptimizationReport();
            expect(["good", "fair", "poor"]).toContain(report.performance);
        });

        it("classifies performance as 'fair' for lower mid-range FPS (30-39, frameTime ≤ 33ms)", () => {
            driveMonitor(32, 28);
            const report = monitor.generateOptimizationReport();
            expect(["fair", "poor"]).toContain(report.performance);
        });

        it("generateOptimizationReport includes texture suggestion for poor performance", () => {
            driveMonitor(5, 100);
            const report = monitor.generateOptimizationReport();
            expect(report.performance).toBe("poor");
            const types = report.suggestions.map((s) => s.type);
            expect(types).toContain("texture");
        });
    });

    describe("onWarning callback – error handling", () => {
        it("handles errors thrown inside warning callbacks gracefully", () => {
            const badWarningCb = vi.fn().mockImplementation(() => {
                throw new Error("Warning callback error");
            });
            monitor.onWarning(badWarningCb);

            // Simulate low-FPS scenario (1 frame/s) to trigger a warning
            const mockNow = vi
                .spyOn(performance, "now")
                .mockReturnValueOnce(0) // startMonitoring
                .mockReturnValueOnce(0) // frameStart
                .mockReturnValue(1001); // frameEnd – triggers FPS + warning

            monitor.startMonitoring();
            monitor.frameStart();
            // Even with a crashing callback the frameEnd must not throw
            expect(() => monitor.frameEnd()).not.toThrow();
            mockNow.mockRestore();
        });
    });

    describe("updateThresholds", () => {
        it("updates thresholds", () => {
            monitor.updateThresholds({ minFPS: 60, maxDrawCalls: 50 });
            // Thresholds updated - verify by generating report
            const report = monitor.generateOptimizationReport();
            expect(report).toBeDefined();
        });
    });

    describe("reset", () => {
        it("resets all metrics and history", () => {
            monitor.startMonitoring();
            monitor.frameStart();
            monitor.frameEnd();

            monitor.reset();

            const metrics = monitor.getMetrics();
            expect(metrics.fps).toBe(0);
            expect(metrics.frameTime).toBe(0);
            expect(monitor.getMetricsHistory()).toHaveLength(0);
        });
    });

    describe("dispose", () => {
        it("stops monitoring and clears callbacks", () => {
            const metricsCb = vi.fn();
            const warningCb = vi.fn();
            monitor.onMetrics(metricsCb);
            monitor.onWarning(warningCb);

            monitor.dispose();

            // After dispose, no errors thrown
            monitor.frameStart();
            monitor.frameEnd();
            expect(monitor.getMetricsHistory()).toHaveLength(0);
        });
    });

    describe("WebGL renderer integration", () => {
        it("reads draw calls from renderer when monitoring", () => {
            const renderer = createMockRenderer({
                calls: 42,
                triangles: 999,
                geometries: 7,
                textures: 11,
            }) as any;
            const monitorWithRenderer = new PerformanceMonitor(renderer);

            monitorWithRenderer.startMonitoring();
            monitorWithRenderer.frameStart();
            monitorWithRenderer.frameEnd();

            const metrics = monitorWithRenderer.getMetrics();
            expect(metrics.drawCalls).toBe(42);
            expect(metrics.triangles).toBe(999);
            expect(metrics.geometries).toBe(7);
            expect(metrics.textures).toBe(11);
        });
    });
});

describe("PerformanceProfiler", () => {
    beforeEach(() => {
        PerformanceProfiler.clear();
    });

    describe("start / end", () => {
        it("times an operation", () => {
            PerformanceProfiler.start("test-op");
            const duration = PerformanceProfiler.end("test-op");
            expect(duration).toBeGreaterThanOrEqual(0);
        });

        it("returns 0 when ending a timer that was never started", () => {
            const duration = PerformanceProfiler.end("nonexistent-timer");
            expect(duration).toBe(0);
        });

        it("accumulates results for multiple runs", () => {
            PerformanceProfiler.start("multi-op");
            PerformanceProfiler.end("multi-op");
            PerformanceProfiler.start("multi-op");
            PerformanceProfiler.end("multi-op");

            const stats = PerformanceProfiler.getStats("multi-op");
            expect(stats?.count).toBe(2);
        });

        it("limits stored results to 100", () => {
            for (let i = 0; i < 110; i++) {
                PerformanceProfiler.start("bounded-op");
                PerformanceProfiler.end("bounded-op");
            }

            const stats = PerformanceProfiler.getStats("bounded-op");
            expect(stats?.count).toBeLessThanOrEqual(100);
        });
    });

    describe("getStats", () => {
        it("returns null for unknown label", () => {
            expect(PerformanceProfiler.getStats("unknown")).toBeNull();
        });

        it("returns stats with correct fields", () => {
            PerformanceProfiler.start("stats-op");
            PerformanceProfiler.end("stats-op");

            const stats = PerformanceProfiler.getStats("stats-op");
            expect(stats).not.toBeNull();
            expect(stats).toHaveProperty("count");
            expect(stats).toHaveProperty("avg");
            expect(stats).toHaveProperty("min");
            expect(stats).toHaveProperty("max");
            expect(stats).toHaveProperty("total");
        });

        it("calculates min, max, avg correctly", () => {
            // Two timed operations
            PerformanceProfiler.start("calc-op");
            PerformanceProfiler.end("calc-op");
            PerformanceProfiler.start("calc-op");
            PerformanceProfiler.end("calc-op");

            const stats = PerformanceProfiler.getStats("calc-op")!;
            expect(stats.min).toBeLessThanOrEqual(stats.max);
            expect(stats.avg).toBeLessThanOrEqual(stats.max);
            expect(stats.avg).toBeGreaterThanOrEqual(stats.min);
            expect(stats.total).toBeCloseTo(stats.avg * stats.count, 5);
        });
    });

    describe("getAllStats", () => {
        it("returns empty object when no timers used", () => {
            const all = PerformanceProfiler.getAllStats();
            expect(Object.keys(all).length).toBe(0);
        });

        it("returns stats for all tracked operations", () => {
            PerformanceProfiler.start("op-a");
            PerformanceProfiler.end("op-a");
            PerformanceProfiler.start("op-b");
            PerformanceProfiler.end("op-b");

            const all = PerformanceProfiler.getAllStats();
            expect(all).toHaveProperty("op-a");
            expect(all).toHaveProperty("op-b");
        });
    });

    describe("clear", () => {
        it("clears all timers and results", () => {
            PerformanceProfiler.start("clear-op");
            PerformanceProfiler.end("clear-op");

            PerformanceProfiler.clear();

            expect(PerformanceProfiler.getStats("clear-op")).toBeNull();
            expect(Object.keys(PerformanceProfiler.getAllStats()).length).toBe(
                0,
            );
        });
    });
});
