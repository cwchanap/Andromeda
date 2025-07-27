// Plugin manager for handling game extensions
import type { GamePlugin, PluginContext } from "../../types/universe";
import type { PluginManager } from "../../types/game";
import {
    PluginLoggerImpl,
    PluginStorageImpl,
    UniverseManager,
} from "./UniverseManager";

/**
 * Main plugin manager implementation
 */
export class GamePluginManager implements PluginManager {
    public loadedPlugins = new Map<string, GamePlugin>();
    public enabledPlugins = new Set<string>();
    private pluginContexts = new Map<string, PluginContext>();

    constructor(
        private universeManager: UniverseManager,
        private gameState: unknown,
        private renderer: unknown,
    ) {}

    /**
     * Load a plugin
     */
    async loadPlugin(plugin: GamePlugin): Promise<void> {
        if (this.loadedPlugins.has(plugin.id)) {
            throw new Error(`Plugin '${plugin.id}' is already loaded`);
        }

        // Validate plugin
        const validation = this.validatePlugin(plugin);
        if (!validation.isValid) {
            throw new Error(
                `Plugin validation failed: ${validation.errors.join(", ")}`,
            );
        }

        // Check dependencies
        await this.checkDependencies(plugin);

        // Create plugin context
        const context = this.createPluginContext(plugin.id);
        this.pluginContexts.set(plugin.id, context);

        try {
            // Initialize plugin
            await plugin.initialize(context);

            // Add any systems provided by the plugin
            if (plugin.systems) {
                for (const system of plugin.systems) {
                    this.universeManager.addSystem(system);
                }
            }

            // Store plugin
            this.loadedPlugins.set(plugin.id, plugin);

            context.logger.info(`Plugin '${plugin.name}' loaded successfully`);
        } catch (error) {
            // Cleanup on failure
            this.pluginContexts.delete(plugin.id);
            throw new Error(
                `Failed to initialize plugin '${plugin.id}': ${error}`,
            );
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(pluginId: string): Promise<void> {
        const plugin = this.loadedPlugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin '${pluginId}' is not loaded`);
        }

        // Disable if enabled
        if (this.enabledPlugins.has(pluginId)) {
            await this.disablePlugin(pluginId);
        }

        const context = this.pluginContexts.get(pluginId);

        try {
            // Cleanup plugin
            await plugin.cleanup();

            // Remove systems added by plugin
            if (plugin.systems) {
                for (const system of plugin.systems) {
                    this.universeManager.removeSystem(system.id);
                }
            }

            // Remove from collections
            this.loadedPlugins.delete(pluginId);
            this.pluginContexts.delete(pluginId);

            context?.logger.info(
                `Plugin '${plugin.name}' unloaded successfully`,
            );
        } catch (error) {
            context?.logger.error(`Error during plugin cleanup: ${error}`);
            throw error;
        }
    }

    /**
     * Enable a plugin
     */
    async enablePlugin(pluginId: string): Promise<void> {
        const plugin = this.loadedPlugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin '${pluginId}' is not loaded`);
        }

        if (this.enabledPlugins.has(pluginId)) {
            return; // Already enabled
        }

        const context = this.pluginContexts.get(pluginId);

        try {
            if (plugin.activate) {
                await plugin.activate();
            }

            this.enabledPlugins.add(pluginId);
            context?.logger.info(`Plugin '${plugin.name}' enabled`);
        } catch (error) {
            context?.logger.error(`Failed to enable plugin: ${error}`);
            throw error;
        }
    }

    /**
     * Disable a plugin
     */
    async disablePlugin(pluginId: string): Promise<void> {
        const plugin = this.loadedPlugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin '${pluginId}' is not loaded`);
        }

        if (!this.enabledPlugins.has(pluginId)) {
            return; // Already disabled
        }

        const context = this.pluginContexts.get(pluginId);

        try {
            if (plugin.deactivate) {
                await plugin.deactivate();
            }

            this.enabledPlugins.delete(pluginId);
            context?.logger.info(`Plugin '${plugin.name}' disabled`);
        } catch (error) {
            context?.logger.error(`Failed to disable plugin: ${error}`);
            throw error;
        }
    }

    /**
     * Get a plugin by ID
     */
    getPlugin(pluginId: string): GamePlugin | null {
        return this.loadedPlugins.get(pluginId) || null;
    }

    /**
     * Get all loaded plugins
     */
    getAllPlugins(): GamePlugin[] {
        return Array.from(this.loadedPlugins.values());
    }

    /**
     * Get enabled plugins
     */
    getEnabledPlugins(): GamePlugin[] {
        return Array.from(this.enabledPlugins)
            .map((id) => this.loadedPlugins.get(id)!)
            .filter(Boolean);
    }

    /**
     * Check if plugin is loaded
     */
    isPluginLoaded(pluginId: string): boolean {
        return this.loadedPlugins.has(pluginId);
    }

    /**
     * Check if plugin is enabled
     */
    isPluginEnabled(pluginId: string): boolean {
        return this.enabledPlugins.has(pluginId);
    }

    /**
     * Create plugin context
     */
    private createPluginContext(pluginId: string): PluginContext {
        return {
            universe: this.universeManager.exportUniverse(),
            gameState: this.gameState,
            renderer: this.renderer,
            eventBus: this.universeManager.getEventBus(),
            logger: new PluginLoggerImpl(pluginId),
            storage: new PluginStorageImpl(pluginId),
        };
    }

    /**
     * Validate plugin
     */
    private validatePlugin(plugin: GamePlugin): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!plugin.id || typeof plugin.id !== "string") {
            errors.push("Plugin must have a valid ID");
        }

        if (!plugin.name || typeof plugin.name !== "string") {
            errors.push("Plugin must have a valid name");
        }

        if (!plugin.version || typeof plugin.version !== "string") {
            errors.push("Plugin must have a valid version");
        }

        if (typeof plugin.initialize !== "function") {
            errors.push("Plugin must have an initialize function");
        }

        if (typeof plugin.cleanup !== "function") {
            errors.push("Plugin must have a cleanup function");
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check plugin dependencies
     */
    private async checkDependencies(plugin: GamePlugin): Promise<void> {
        if (!plugin.dependencies || plugin.dependencies.length === 0) {
            return;
        }

        const missingDependencies: string[] = [];

        for (const depId of plugin.dependencies) {
            if (!this.loadedPlugins.has(depId)) {
                missingDependencies.push(depId);
            }
        }

        if (missingDependencies.length > 0) {
            throw new Error(
                `Missing dependencies: ${missingDependencies.join(", ")}`,
            );
        }
    }

    /**
     * Dispose of all plugins
     */
    async dispose(): Promise<void> {
        const pluginIds = Array.from(this.loadedPlugins.keys());

        for (const pluginId of pluginIds) {
            try {
                await this.unloadPlugin(pluginId);
            } catch (error) {
                console.error(`Error unloading plugin '${pluginId}':`, error);
            }
        }
    }
}
