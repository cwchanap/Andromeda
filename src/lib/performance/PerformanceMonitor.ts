/**
 * Performance monitoring and analytics system
 * Tracks performance metrics, memory usage, and optimization opportunities
 */

import * as THREE from "three";

interface MemoryInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
    memory?: MemoryInfo;
}

interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    renderTime: number;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    materials: number;
}

interface PerformanceThresholds {
    minFPS: number;
    maxFrameTime: number;
    maxMemoryUsage: number;
    maxDrawCalls: number;
}

interface OptimizationSuggestion {
    type: "geometry" | "texture" | "material" | "draw-calls" | "memory";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    action: string;
    impact: "performance" | "memory" | "quality";
}

/**
 * Performance monitoring system for tracking and optimizing 3D rendering
 */
export class PerformanceMonitor {
    private isMonitoring = false;
    private metrics: PerformanceMetrics = this.createEmptyMetrics();
    private metricsHistory: PerformanceMetrics[] = [];
    private maxHistoryLength = 60; // Store 60 frames of history

    private frameStartTime = 0;
    private renderStartTime = 0;
    private frameCount = 0;
    private lastFPSUpdate = 0;

    private thresholds: PerformanceThresholds = {
        minFPS: 30,
        maxFrameTime: 33.33, // 30 FPS = 33.33ms per frame
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        maxDrawCalls: 100,
    };

    private performanceCallbacks = new Set<
        (metrics: PerformanceMetrics) => void
    >();
    private warningCallbacks = new Set<
        (suggestions: OptimizationSuggestion[]) => void
    >();

    constructor(
        private renderer?: THREE.WebGLRenderer,
        customThresholds?: Partial<PerformanceThresholds>,
    ) {
        if (customThresholds) {
            this.thresholds = { ...this.thresholds, ...customThresholds };
        }
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();

        console.log("Performance monitoring started");
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        this.isMonitoring = false;
        console.log("Performance monitoring stopped");
    }

    /**
     * Mark the start of a frame
     */
    frameStart(): void {
        if (!this.isMonitoring) return;
        this.frameStartTime = performance.now();
    }

    /**
     * Mark the start of rendering
     */
    renderStart(): void {
        if (!this.isMonitoring) return;
        this.renderStartTime = performance.now();
    }

    /**
     * Mark the end of a frame and update metrics
     */
    frameEnd(): void {
        if (!this.isMonitoring) return;

        const now = performance.now();
        const frameTime = now - this.frameStartTime;
        const renderTime = now - this.renderStartTime;

        this.updateMetrics(frameTime, renderTime);
        this.frameCount++;

        // Update FPS every second
        if (now - this.lastFPSUpdate >= 1000) {
            this.metrics.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = now;

            // Notify callbacks
            this.notifyPerformanceCallbacks();
            this.checkPerformanceThresholds();
        }

        // Store metrics history
        if (this.metricsHistory.length >= this.maxHistoryLength) {
            this.metricsHistory.shift();
        }
        this.metricsHistory.push({ ...this.metrics });
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(frameTime: number, renderTime: number): void {
        this.metrics.frameTime = frameTime;
        this.metrics.renderTime = renderTime;

        // Update memory usage
        if ("memory" in performance) {
            const memInfo = (performance as ExtendedPerformance).memory;
            if (memInfo) {
                this.metrics.memoryUsage = {
                    used: memInfo.usedJSHeapSize,
                    total: memInfo.totalJSHeapSize,
                    percentage:
                        (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) *
                        100,
                };
            }
        }

        // Update WebGL metrics
        if (this.renderer) {
            const info = this.renderer.info;
            this.metrics.drawCalls = info.render.calls;
            this.metrics.triangles = info.render.triangles;
            this.metrics.geometries = info.memory.geometries;
            this.metrics.textures = info.memory.textures;
        }
    }

    /**
     * Check performance against thresholds and generate warnings
     */
    private checkPerformanceThresholds(): void {
        const suggestions: OptimizationSuggestion[] = [];

        // Check FPS
        if (this.metrics.fps < this.thresholds.minFPS) {
            suggestions.push({
                type: "geometry",
                severity: this.metrics.fps < 20 ? "critical" : "high",
                message: `Low FPS detected: ${this.metrics.fps} FPS`,
                action: "Consider reducing geometry complexity or enabling LOD system",
                impact: "performance",
            });
        }

        // Check frame time
        if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
            suggestions.push({
                type: "draw-calls",
                severity: this.metrics.frameTime > 50 ? "high" : "medium",
                message: `High frame time: ${this.metrics.frameTime.toFixed(2)}ms`,
                action: "Optimize draw calls or reduce material complexity",
                impact: "performance",
            });
        }

        // Check memory usage
        if (this.metrics.memoryUsage.used > this.thresholds.maxMemoryUsage) {
            suggestions.push({
                type: "memory",
                severity:
                    this.metrics.memoryUsage.percentage > 90
                        ? "critical"
                        : "high",
                message: `High memory usage: ${(this.metrics.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`,
                action: "Dispose unused geometries and textures, enable texture compression",
                impact: "memory",
            });
        }

        // Check draw calls
        if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
            suggestions.push({
                type: "draw-calls",
                severity: this.metrics.drawCalls > 200 ? "high" : "medium",
                message: `High draw calls: ${this.metrics.drawCalls}`,
                action: "Use instanced rendering or merge geometries",
                impact: "performance",
            });
        }

        // Check texture count
        if (this.metrics.textures > 50) {
            suggestions.push({
                type: "texture",
                severity: this.metrics.textures > 100 ? "high" : "medium",
                message: `High texture count: ${this.metrics.textures}`,
                action: "Use texture atlases or implement texture streaming",
                impact: "memory",
            });
        }

        if (suggestions.length > 0) {
            this.notifyWarningCallbacks(suggestions);
        }
    }

    /**
     * Add performance metrics callback
     */
    onMetrics(callback: (metrics: PerformanceMetrics) => void): () => void {
        this.performanceCallbacks.add(callback);
        return () => this.performanceCallbacks.delete(callback);
    }

    /**
     * Add performance warning callback
     */
    onWarning(
        callback: (suggestions: OptimizationSuggestion[]) => void,
    ): () => void {
        this.warningCallbacks.add(callback);
        return () => this.warningCallbacks.delete(callback);
    }

    /**
     * Notify performance callbacks
     */
    private notifyPerformanceCallbacks(): void {
        this.performanceCallbacks.forEach((callback) => {
            try {
                callback({ ...this.metrics });
            } catch (error) {
                console.error("Error in performance callback:", error);
            }
        });
    }

    /**
     * Notify warning callbacks
     */
    private notifyWarningCallbacks(
        suggestions: OptimizationSuggestion[],
    ): void {
        this.warningCallbacks.forEach((callback) => {
            try {
                callback([...suggestions]);
            } catch (error) {
                console.error("Error in warning callback:", error);
            }
        });
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Get metrics history
     */
    getMetricsHistory(): PerformanceMetrics[] {
        return [...this.metricsHistory];
    }

    /**
     * Get performance statistics over time
     */
    getPerformanceStats(): {
        avgFPS: number;
        minFPS: number;
        maxFPS: number;
        avgFrameTime: number;
        maxFrameTime: number;
        avgMemoryUsage: number;
        maxMemoryUsage: number;
    } {
        if (this.metricsHistory.length === 0) {
            return {
                avgFPS: 0,
                minFPS: 0,
                maxFPS: 0,
                avgFrameTime: 0,
                maxFrameTime: 0,
                avgMemoryUsage: 0,
                maxMemoryUsage: 0,
            };
        }

        const fps = this.metricsHistory.map((m) => m.fps);
        const frameTimes = this.metricsHistory.map((m) => m.frameTime);
        const memoryUsage = this.metricsHistory.map((m) => m.memoryUsage.used);

        return {
            avgFPS: fps.reduce((a, b) => a + b, 0) / fps.length,
            minFPS: Math.min(...fps),
            maxFPS: Math.max(...fps),
            avgFrameTime:
                frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
            maxFrameTime: Math.max(...frameTimes),
            avgMemoryUsage:
                memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
            maxMemoryUsage: Math.max(...memoryUsage),
        };
    }

    /**
     * Generate optimization report
     */
    generateOptimizationReport(): {
        performance: "excellent" | "good" | "fair" | "poor";
        suggestions: OptimizationSuggestion[];
        stats: {
            avgFPS: number;
            minFPS: number;
            maxFPS: number;
            avgFrameTime: number;
            maxFrameTime: number;
            avgMemoryUsage: number;
            maxMemoryUsage: number;
        };
    } {
        const stats = this.getPerformanceStats();
        const suggestions: OptimizationSuggestion[] = [];

        // Determine overall performance rating
        let performance: "excellent" | "good" | "fair" | "poor";
        if (stats.avgFPS >= 50 && stats.avgFrameTime <= 20) {
            performance = "excellent";
        } else if (stats.avgFPS >= 40 && stats.avgFrameTime <= 25) {
            performance = "good";
        } else if (stats.avgFPS >= 30 && stats.avgFrameTime <= 33) {
            performance = "fair";
        } else {
            performance = "poor";
        }

        // Generate suggestions based on metrics
        if (performance === "poor" || performance === "fair") {
            suggestions.push({
                type: "geometry",
                severity: performance === "poor" ? "high" : "medium",
                message: "Consider implementing Level of Detail (LOD) system",
                action: "Reduce polygon count for distant objects",
                impact: "performance",
            });

            suggestions.push({
                type: "texture",
                severity: "medium",
                message: "Optimize texture sizes and formats",
                action: "Use compressed textures and appropriate resolutions",
                impact: "memory",
            });
        }

        return {
            performance,
            suggestions,
            stats,
        };
    }

    /**
     * Reset metrics and history
     */
    reset(): void {
        this.metrics = this.createEmptyMetrics();
        this.metricsHistory = [];
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();
    }

    /**
     * Create empty metrics object
     */
    private createEmptyMetrics(): PerformanceMetrics {
        return {
            fps: 0,
            frameTime: 0,
            renderTime: 0,
            memoryUsage: {
                used: 0,
                total: 0,
                percentage: 0,
            },
            drawCalls: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            materials: 0,
        };
    }

    /**
     * Update performance thresholds
     */
    updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.stopMonitoring();
        this.performanceCallbacks.clear();
        this.warningCallbacks.clear();
        this.metricsHistory = [];
    }
}

/**
 * Utility class for performance profiling
 */
export class PerformanceProfiler {
    private static timers = new Map<string, number>();
    private static results = new Map<string, number[]>();

    /**
     * Start timing an operation
     */
    static start(label: string): void {
        this.timers.set(label, performance.now());
    }

    /**
     * End timing an operation
     */
    static end(label: string): number {
        const startTime = this.timers.get(label);
        if (startTime === undefined) {
            console.warn(`Timer "${label}" was never started`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.timers.delete(label);

        // Store result
        if (!this.results.has(label)) {
            this.results.set(label, []);
        }
        const results = this.results.get(label)!;
        results.push(duration);

        // Keep only last 100 results
        if (results.length > 100) {
            results.shift();
        }

        return duration;
    }

    /**
     * Get timing statistics for a label
     */
    static getStats(label: string): {
        count: number;
        avg: number;
        min: number;
        max: number;
        total: number;
    } | null {
        const results = this.results.get(label);
        if (!results || results.length === 0) {
            return null;
        }

        const total = results.reduce((a, b) => a + b, 0);
        return {
            count: results.length,
            avg: total / results.length,
            min: Math.min(...results),
            max: Math.max(...results),
            total,
        };
    }

    /**
     * Clear all timing data
     */
    static clear(): void {
        this.timers.clear();
        this.results.clear();
    }

    /**
     * Get all timing results
     */
    static getAllStats(): Record<
        string,
        ReturnType<typeof PerformanceProfiler.getStats>
    > {
        const stats: Record<
            string,
            ReturnType<typeof PerformanceProfiler.getStats>
        > = {};
        for (const [label] of this.results) {
            stats[label] = this.getStats(label);
        }
        return stats;
    }
}
