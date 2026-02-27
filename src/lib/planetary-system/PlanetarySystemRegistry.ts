// Registry for managing planetary systems
import type {
    PlanetarySystem,
    PlanetarySystemRegistry as IPlanetarySystemRegistry,
} from "./types";

/**
 * Central registry for all planetary systems
 * Manages registration and retrieval of systems
 */
export class PlanetarySystemRegistry implements IPlanetarySystemRegistry {
    private _systems: Map<string, PlanetarySystem> = new Map();

    /**
     * Register a new planetary system
     */
    registerSystem(system: PlanetarySystem): void {
        this._systems.set(system.id, system);
    }

    /**
     * Get a specific planetary system by ID
     */
    getSystem(id: string): PlanetarySystem | undefined {
        return this._systems.get(id);
    }

    /**
     * Get all registered planetary systems
     */
    getAllSystems(): PlanetarySystem[] {
        return Array.from(this._systems.values());
    }

    /**
     * Check if a system exists
     */
    hasSystem(id: string): boolean {
        return this._systems.has(id);
    }

    /**
     * Get the systems map (read-only access)
     */
    get systems(): Map<string, PlanetarySystem> {
        return new Map(this._systems);
    }

    /**
     * Initialize all registered systems
     */
    async initializeAll(): Promise<void> {
        const initPromises = Array.from(this._systems.values())
            .filter((system) => system.initialize)
            .map((system) => system.initialize!());

        await Promise.all(initPromises);
    }

    /**
     * Cleanup all registered systems
     */
    async cleanupAll(): Promise<void> {
        const cleanupPromises = Array.from(this._systems.values())
            .filter((system) => system.cleanup)
            .map((system) => system.cleanup!());

        await Promise.all(cleanupPromises);
    }

    /**
     * Get systems filtered by criteria
     */
    getSystemsByType(systemType: string): PlanetarySystem[] {
        return this.getAllSystems().filter(
            (system) => system.systemData.systemType === systemType,
        );
    }

    /**
     * Get systems discovered by a specific entity/mission
     */
    getSystemsByDiscoverer(discoverer: string): PlanetarySystem[] {
        return this.getAllSystems().filter(
            (system) => system.systemData.metadata?.discoveredBy === discoverer,
        );
    }
}

// Global registry instance
export const planetarySystemRegistry = new PlanetarySystemRegistry();
