// Demo integration for the extensibility architecture
import { UniverseManager } from "../lib/universe/UniverseManager";
import { GamePluginManager } from "../lib/universe/PluginManager";
import {
    alphaCentauriPlugin,
    keplerSystemsPlugin,
} from "../lib/universe/ExamplePlugins";
import { solarSystemData } from "../data/celestialBodies";
import { gameState, gameActions } from "../stores/gameStore";

/**
 * Initialize the extensible universe system
 */
export class ExtensibilityDemo {
    private universeManager: UniverseManager;
    private pluginManager: GamePluginManager;

    constructor() {
        this.universeManager = new UniverseManager();

        // Initialize with our solar system for backward compatibility
        this.universeManager.initializeWithSolarSystem(solarSystemData);

        // Create plugin manager (with temporary any types for now)
        this.pluginManager = new GamePluginManager(
            this.universeManager,
            gameState, // Game state reference
            null, // Renderer reference (will be provided later)
        );

        this.setupEventListeners();
    }

    /**
     * Set up event listeners for universe changes
     */
    private setupEventListeners(): void {
        const eventBus = this.universeManager.getEventBus();

        eventBus.on("system-changed", (data) => {
            console.log(`Switched to system: ${data.currentSystemId}`);

            // Update game state
            gameActions.switchToSystem(data.currentSystemId);

            // Notify that system has changed
            this.onSystemChanged(data.system);
        });

        eventBus.on("system-added", (data) => {
            console.log(`New system added: ${data.systemId}`);
            this.updateAvailableSystems();
        });

        eventBus.on("system-removed", (data) => {
            console.log(`System removed: ${data.systemId}`);
            this.updateAvailableSystems();
        });
    }

    /**
     * Load example plugins to demonstrate extensibility
     */
    async loadExamplePlugins(): Promise<void> {
        try {
            console.log("Loading Alpha Centauri plugin...");
            await this.pluginManager.loadPlugin(alphaCentauriPlugin);
            await this.pluginManager.enablePlugin(alphaCentauriPlugin.id);

            console.log("Loading Kepler systems plugin...");
            await this.pluginManager.loadPlugin(keplerSystemsPlugin);
            await this.pluginManager.enablePlugin(keplerSystemsPlugin.id);

            this.updateAvailableSystems();

            console.log("✅ Example plugins loaded successfully!");
            this.logSystemStatus();
        } catch (error) {
            console.error("Failed to load plugins:", error);
        }
    }

    /**
     * Switch to a different star system
     */
    async switchToSystem(systemId: string): Promise<boolean> {
        return await this.universeManager.switchToSystem(systemId);
    }

    /**
     * Get all available systems
     */
    getAvailableSystems() {
        return this.universeManager.getAllSystems();
    }

    /**
     * Get current system
     */
    getCurrentSystem() {
        return this.universeManager.getCurrentSystem();
    }

    /**
     * Get universe manager instance
     */
    getUniverseManager(): UniverseManager {
        return this.universeManager;
    }

    /**
     * Get plugin manager instance
     */
    getPluginManager(): GamePluginManager {
        return this.pluginManager;
    }

    /**
     * Update available systems in game state
     */
    private updateAvailableSystems(): void {
        const systems = this.universeManager.getAllSystems();
        const systemIds = systems.map((s) => s.id);
        const currentSystemId =
            this.universeManager.getCurrentSystem()?.id || "sol";

        gameActions.updateGameState({
            universe: {
                currentSystemId,
                availableSystems: systemIds,
                systemTransition: undefined,
            },
        });
    }

    /**
     * Handle system change
     */
    private onSystemChanged(system: unknown): void {
        console.log(`Now exploring: ${system.name}`);
        console.log(`System type: ${system.systemType}`);
        console.log(`Celestial bodies: ${system.celestialBodies.length}`);

        // Could trigger 3D scene updates here
        // Could update UI components here
        // Could load system-specific educational content here
    }

    /**
     * Log current system status
     */
    private logSystemStatus(): void {
        console.log("\n🌌 EXTENSIBILITY DEMO STATUS 🌌");
        console.log("================================");

        const systems = this.universeManager.getAllSystems();
        const currentSystem = this.universeManager.getCurrentSystem();
        const loadedPlugins = this.pluginManager.getAllPlugins();

        console.log(`Available systems: ${systems.length}`);
        systems.forEach((system) => {
            const marker = system.id === currentSystem?.id ? "➤" : " ";
            console.log(`${marker} ${system.name} (${system.systemType})`);
        });

        console.log(`\nLoaded plugins: ${loadedPlugins.length}`);
        loadedPlugins.forEach((plugin) => {
            const status = this.pluginManager.isPluginEnabled(plugin.id)
                ? "enabled"
                : "disabled";
            console.log(`  • ${plugin.name} v${plugin.version} (${status})`);
        });

        if (currentSystem) {
            console.log(`\nCurrent system: ${currentSystem.name}`);
            console.log(
                `Celestial bodies: ${currentSystem.celestialBodies.length + 1}`,
            ); // +1 for star

            if (currentSystem.metadata?.distance) {
                console.log(`Distance: ${currentSystem.metadata.distance}`);
            }
        }
    }

    /**
     * Demonstrate plugin functionality
     */
    async demonstratePluginSystem(): Promise<void> {
        console.log("\n🔌 PLUGIN SYSTEM DEMONSTRATION 🔌");
        console.log("==================================");

        // Show initial state
        console.log(
            "Initial systems:",
            this.universeManager.getAllSystems().map((s) => s.name),
        );

        // Load plugins
        await this.loadExamplePlugins();

        // Show systems after plugin loading
        console.log(
            "Systems after plugins:",
            this.universeManager.getAllSystems().map((s) => s.name),
        );

        // Demonstrate system switching
        console.log("\nDemonstrating system switching...");
        await this.switchToSystem("alpha-centauri");

        console.log("Current system:", this.getCurrentSystem()?.name);

        // Switch back to solar system
        await this.switchToSystem("sol");
        console.log("Switched back to:", this.getCurrentSystem()?.name);
    }

    /**
     * Create a sample custom plugin
     */
    createSamplePlugin() {
        return {
            id: "sample-plugin",
            name: "Sample Extension Plugin",
            version: "1.0.0",
            description: "A sample plugin demonstrating the extensibility API",

            async initialize(context: unknown) {
                console.log("Sample plugin initialized");

                // Example: Add custom event listener
                context.eventBus.on("system-changed", (data: unknown) => {
                    console.log(
                        `Sample plugin noticed system change to: ${data.currentSystemId}`,
                    );
                });
            },

            async cleanup() {
                console.log("Sample plugin cleaned up");
            },

            // Could add custom star systems
            systems: [],

            // Could add custom features
            features: [
                {
                    id: "sample-feature",
                    name: "Sample Feature",
                    type: "ui-component" as const,
                    configuration: {
                        customSetting: true,
                    },
                },
            ],
        };
    }

    /**
     * Clean up resources
     */
    async dispose(): Promise<void> {
        await this.pluginManager.dispose();
        console.log("Extensibility demo disposed");
    }
}

// Create global instance for demo purposes
export const extensibilityDemo = new ExtensibilityDemo();

// Auto-initialize demo in development
if (process.env.NODE_ENV === "development") {
    // Delay initialization to allow other systems to load
    setTimeout(() => {
        extensibilityDemo.demonstratePluginSystem().catch(console.error);
    }, 1000);
}
