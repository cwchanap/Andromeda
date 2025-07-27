/**
 * Lazy loading utilities for code splitting and performance optimization
 */

interface LazyModuleConfig {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
}

interface LazyLoadingProgress {
    loaded: number;
    total: number;
    progress: number;
    currentModule?: string;
}

/**
 * Lazy loading manager for code splitting and dynamic imports
 */
export class LazyLoadingManager {
    private loadedModules = new Map<string, unknown>();
    private loadingPromises = new Map<string, Promise<unknown>>();
    private progressCallbacks = new Set<
        (progress: LazyLoadingProgress) => void
    >();
    private totalModules = 0;
    private loadedCount = 0;

    constructor() {
        // Initialize with known modules
        this.initializeModuleList();
    }

    /**
     * Initialize the list of known modules for progress tracking
     */
    private initializeModuleList(): void {
        // Define modules that will be lazy loaded
        const moduleList = [
            "three-performance-utils",
            "celestial-body-effects",
            "advanced-materials",
            "particle-systems",
            "audio-manager",
            "ai-integration",
        ];

        this.totalModules = moduleList.length;
    }

    /**
     * Add progress callback
     */
    onProgress(callback: (progress: LazyLoadingProgress) => void): () => void {
        this.progressCallbacks.add(callback);
        return () => this.progressCallbacks.delete(callback);
    }

    /**
     * Notify progress callbacks
     */
    private notifyProgress(currentModule?: string): void {
        const progress =
            this.totalModules > 0 ? this.loadedCount / this.totalModules : 0;
        const progressData: LazyLoadingProgress = {
            loaded: this.loadedCount,
            total: this.totalModules,
            progress,
            currentModule,
        };

        this.progressCallbacks.forEach((callback) => {
            try {
                callback(progressData);
            } catch (error) {
                console.error("Error in progress callback:", error);
            }
        });
    }

    /**
     * Lazy load a module with retry logic
     */
    async loadModule<T = unknown>(
        moduleId: string,
        importFn: () => Promise<T>,
        config: LazyModuleConfig = {},
    ): Promise<T> {
        // Check if already loaded
        if (this.loadedModules.has(moduleId)) {
            return this.loadedModules.get(moduleId) as T;
        }

        // Check if currently loading
        if (this.loadingPromises.has(moduleId)) {
            return this.loadingPromises.get(moduleId) as Promise<T>;
        }

        const { retries = 3, retryDelay = 1000, timeout = 30000 } = config;

        // Create loading promise with retry and timeout logic
        const loadingPromise = this.createLoadingPromise(
            moduleId,
            importFn,
            retries,
            retryDelay,
            timeout,
        );

        this.loadingPromises.set(moduleId, loadingPromise);

        try {
            const module = await loadingPromise;
            this.loadedModules.set(moduleId, module);
            this.loadedCount++;
            this.notifyProgress();
            return module;
        } catch (error) {
            console.error(`Failed to load module ${moduleId}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(moduleId);
        }
    }

    /**
     * Create a loading promise with timeout and retry logic
     */
    private async createLoadingPromise<T>(
        moduleId: string,
        importFn: () => Promise<T>,
        retries: number,
        retryDelay: number,
        timeout: number,
    ): Promise<T> {
        this.notifyProgress(moduleId);

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Create timeout promise
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(
                        () =>
                            reject(
                                new Error(`Module ${moduleId} loading timeout`),
                            ),
                        timeout,
                    );
                });

                // Race between import and timeout
                const module = await Promise.race([importFn(), timeoutPromise]);
                return module;
            } catch (error) {
                if (attempt === retries) {
                    throw new Error(
                        `Failed to load module ${moduleId} after ${retries + 1} attempts: ${error}`,
                    );
                }

                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                console.warn(
                    `Retrying module ${moduleId} load (attempt ${attempt + 2}/${retries + 1})`,
                );
            }
        }

        throw new Error(`Unreachable code: ${moduleId}`);
    }

    /**
     * Preload multiple modules in parallel
     */
    async preloadModules(
        moduleConfigs: Array<{
            id: string;
            importFn: () => Promise<unknown>;
            config?: LazyModuleConfig;
        }>,
    ): Promise<void> {
        const preloadPromises = moduleConfigs.map(({ id, importFn, config }) =>
            this.loadModule(id, importFn, config).catch((error) => {
                console.warn(`Failed to preload module ${id}:`, error);
                return null;
            }),
        );

        await Promise.allSettled(preloadPromises);
    }

    /**
     * Check if a module is loaded
     */
    isLoaded(moduleId: string): boolean {
        return this.loadedModules.has(moduleId);
    }

    /**
     * Check if a module is currently loading
     */
    isLoading(moduleId: string): boolean {
        return this.loadingPromises.has(moduleId);
    }

    /**
     * Get loaded module
     */
    getModule<T = unknown>(moduleId: string): T | null {
        return (this.loadedModules.get(moduleId) as T) || null;
    }

    /**
     * Get loading statistics
     */
    getStats(): {
        totalModules: number;
        loadedModules: number;
        loadingModules: number;
        progress: number;
    } {
        return {
            totalModules: this.totalModules,
            loadedModules: this.loadedModules.size,
            loadingModules: this.loadingPromises.size,
            progress:
                this.totalModules > 0
                    ? this.loadedCount / this.totalModules
                    : 0,
        };
    }

    /**
     * Clear all loaded modules (for memory management)
     */
    clearModules(): void {
        this.loadedModules.clear();
        this.loadedCount = 0;
        this.notifyProgress();
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        this.progressCallbacks.clear();
        this.loadedCount = 0;
        this.totalModules = 0;
    }
}

/**
 * Global lazy loading manager instance
 */
export const lazyLoadingManager = new LazyLoadingManager();

/**
 * Decorator for lazy loading class methods
 */
export function lazyLoad(moduleId: string, importFn: () => Promise<unknown>) {
    return function (
        target: unknown,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: unknown[]) {
            // Load the module if not already loaded
            await lazyLoadingManager.loadModule(moduleId, importFn);

            // Call original method
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

/**
 * Utility function for creating lazy-loaded components
 */
export function createLazyComponent<T extends (...args: unknown[]) => unknown>(
    moduleId: string,
    importFn: () => Promise<{ default: T } | T>,
    fallback?: T,
): T {
    let cachedComponent: T | null = null;

    const lazyComponent = (async (...args: Parameters<T>) => {
        if (cachedComponent) {
            return cachedComponent(...args);
        }

        try {
            const module = await lazyLoadingManager.loadModule(
                moduleId,
                importFn,
            );
            const moduleWithDefault = module as { default?: T };
            cachedComponent = moduleWithDefault.default || (module as T);
            if (cachedComponent) {
                return cachedComponent(...args);
            }
            throw new Error(
                `Module ${moduleId} does not export a valid component`,
            );
        } catch (error) {
            console.error(`Failed to load lazy component ${moduleId}:`, error);
            if (fallback) {
                return fallback(...args);
            }
            throw error;
        }
    }) as T;

    return lazyComponent;
}

/**
 * Bundle splitting utilities
 */
export class BundleSplitter {
    private static readonly CHUNK_PRIORITIES = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
    };

    /**
     * Load chunks based on priority
     */
    static async loadChunksByPriority(
        chunks: Array<{
            id: string;
            priority: keyof typeof BundleSplitter.CHUNK_PRIORITIES;
            importFn: () => Promise<unknown>;
        }>,
    ): Promise<void> {
        // Sort chunks by priority
        const sortedChunks = chunks.sort(
            (a, b) =>
                this.CHUNK_PRIORITIES[a.priority] -
                this.CHUNK_PRIORITIES[b.priority],
        );

        // Load critical chunks immediately
        const criticalChunks = sortedChunks.filter(
            (chunk) => chunk.priority === "critical",
        );
        await Promise.all(
            criticalChunks.map((chunk) =>
                lazyLoadingManager.loadModule(chunk.id, chunk.importFn),
            ),
        );

        // Load high priority chunks
        const highPriorityChunks = sortedChunks.filter(
            (chunk) => chunk.priority === "high",
        );
        await Promise.all(
            highPriorityChunks.map((chunk) =>
                lazyLoadingManager.loadModule(chunk.id, chunk.importFn),
            ),
        );

        // Load medium and low priority chunks in background
        const backgroundChunks = sortedChunks.filter(
            (chunk) => chunk.priority === "medium" || chunk.priority === "low",
        );

        // Don't await these - let them load in background
        backgroundChunks.forEach((chunk) =>
            lazyLoadingManager
                .loadModule(chunk.id, chunk.importFn)
                .catch((error) =>
                    console.warn(
                        `Background chunk ${chunk.id} failed to load:`,
                        error,
                    ),
                ),
        );
    }

    /**
     * Estimate bundle size savings
     */
    static estimateSavings(
        totalBundleSize: number,
        lazyLoadedSize: number,
    ): {
        initialBundleSize: number;
        lazySavings: number;
        percentageSaved: number;
    } {
        const initialBundleSize = totalBundleSize - lazyLoadedSize;
        const percentageSaved = (lazyLoadedSize / totalBundleSize) * 100;

        return {
            initialBundleSize,
            lazySavings: lazyLoadedSize,
            percentageSaved,
        };
    }
}
