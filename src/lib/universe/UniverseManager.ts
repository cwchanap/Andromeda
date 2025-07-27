// Universe manager for handling multiple star systems and extensibility
import type {
    UniverseData,
    StarSystemData,
    SystemValidator,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    GamePlugin,
    PluginEventBus,
    PluginLogger,
    PluginStorage,
} from "../../types/universe";
import type { SolarSystemData } from "../../types/game";

/**
 * Main universe manager class
 */
export class UniverseManager {
    private universe: UniverseData;
    private validator: SystemValidator;
    private eventBus: PluginEventBus;

    constructor() {
        this.universe = {
            systems: new Map(),
            currentSystemId: "sol", // Default to our solar system
            metadata: {
                name: "Andromeda Universe",
                description: "Educational space exploration universe",
                version: "1.0.0",
                lastUpdated: new Date(),
            },
        };

        this.validator = new DefaultSystemValidator();
        this.eventBus = new SimpleEventBus();
    }

    /**
     * Add a star system to the universe
     */
    addSystem(system: StarSystemData): boolean {
        const validation = this.validator.validateStarSystem(system);
        if (!validation.isValid) {
            console.error("System validation failed:", validation.errors);
            return false;
        }

        this.universe.systems.set(system.id, system);
        this.eventBus.emit("system-added", { systemId: system.id, system });
        return true;
    }

    /**
     * Remove a star system from the universe
     */
    removeSystem(systemId: string): boolean {
        if (systemId === this.universe.currentSystemId) {
            console.warn("Cannot remove currently active system");
            return false;
        }

        const removed = this.universe.systems.delete(systemId);
        if (removed) {
            this.eventBus.emit("system-removed", { systemId });
        }
        return removed;
    }

    /**
     * Switch to a different star system
     */
    async switchToSystem(systemId: string): Promise<boolean> {
        const system = this.universe.systems.get(systemId);
        if (!system) {
            console.error(`System '${systemId}' not found`);
            return false;
        }

        const previousSystemId = this.universe.currentSystemId;
        this.universe.currentSystemId = systemId;

        this.eventBus.emit("system-change-start", {
            fromSystemId: previousSystemId,
            toSystemId: systemId,
        });

        try {
            // Allow plugins to handle system transition
            this.eventBus.emit("system-changed", {
                previousSystemId,
                currentSystemId: systemId,
                system,
            });
            return true;
        } catch (error) {
            // Rollback on error
            this.universe.currentSystemId = previousSystemId;
            this.eventBus.emit("system-change-error", { error, systemId });
            return false;
        }
    }

    /**
     * Get current star system
     */
    getCurrentSystem(): StarSystemData | null {
        return this.universe.systems.get(this.universe.currentSystemId) || null;
    }

    /**
     * Get all available systems
     */
    getAllSystems(): StarSystemData[] {
        return Array.from(this.universe.systems.values());
    }

    /**
     * Get system by ID
     */
    getSystem(systemId: string): StarSystemData | null {
        return this.universe.systems.get(systemId) || null;
    }

    /**
     * Convert legacy SolarSystemData to new StarSystemData format
     */
    static convertSolarSystemData(
        solarSystem: SolarSystemData,
        systemId = "sol",
    ): StarSystemData {
        return {
            id: systemId,
            name: "Solar System",
            description:
                "Our home star system containing the Sun and eight planets",
            star: solarSystem.sun,
            celestialBodies: solarSystem.planets,
            systemScale: solarSystem.systemScale,
            systemCenter: solarSystem.systemCenter,
            systemType: "solar",
            metadata: {
                discoveredBy: "Ancient civilizations",
                discoveryDate: "Prehistoric",
                distance: "0 light-years",
                constellation: "N/A",
                spectralClass: "G2V",
            },
        };
    }

    /**
     * Initialize with legacy solar system data for backward compatibility
     */
    initializeWithSolarSystem(solarSystem: SolarSystemData): void {
        const starSystem = UniverseManager.convertSolarSystemData(solarSystem);
        this.addSystem(starSystem);
        this.universe.currentSystemId = starSystem.id;
    }

    /**
     * Get universe metadata
     */
    getUniverseMetadata() {
        return { ...this.universe.metadata };
    }

    /**
     * Get event bus for plugin communication
     */
    getEventBus(): PluginEventBus {
        return this.eventBus;
    }

    /**
     * Export universe data
     */
    exportUniverse(): UniverseData {
        return {
            systems: new Map(this.universe.systems),
            currentSystemId: this.universe.currentSystemId,
            metadata: { ...this.universe.metadata },
        };
    }

    /**
     * Import universe data
     */
    importUniverse(universeData: UniverseData): boolean {
        const validation = this.validator.validateUniverse(universeData);
        if (!validation.isValid) {
            console.error("Universe validation failed:", validation.errors);
            return false;
        }

        this.universe = {
            systems: new Map(universeData.systems),
            currentSystemId: universeData.currentSystemId,
            metadata: { ...universeData.metadata },
        };

        this.eventBus.emit("universe-imported", { universe: this.universe });
        return true;
    }
}

/**
 * Default system validator implementation
 */
class DefaultSystemValidator implements SystemValidator {
    validateStarSystem(system: StarSystemData): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Basic validation
        if (!system.id || typeof system.id !== "string") {
            errors.push({
                field: "id",
                message: "System ID is required",
                severity: "error",
            });
        }

        if (!system.name || typeof system.name !== "string") {
            errors.push({
                field: "name",
                message: "System name is required",
                severity: "error",
            });
        }

        if (!system.star) {
            errors.push({
                field: "star",
                message: "System must have a star",
                severity: "error",
            });
        } else if (system.star.type !== "star") {
            errors.push({
                field: "star.type",
                message: "Star must be of type 'star'",
                severity: "error",
            });
        }

        if (!Array.isArray(system.celestialBodies)) {
            errors.push({
                field: "celestialBodies",
                message: "Celestial bodies must be an array",
                severity: "error",
            });
        }

        // Validate orbital mechanics
        if (Array.isArray(system.celestialBodies)) {
            system.celestialBodies.forEach((body, index) => {
                if (body.orbitRadius && body.orbitRadius <= 0) {
                    warnings.push({
                        field: `celestialBodies[${index}].orbitRadius`,
                        message: "Orbit radius should be positive",
                        severity: "warning",
                    });
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    validateUniverse(universe: UniverseData): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (!universe.systems || !(universe.systems instanceof Map)) {
            errors.push({
                field: "systems",
                message: "Universe must have systems Map",
                severity: "error",
            });
        }

        if (!universe.currentSystemId) {
            errors.push({
                field: "currentSystemId",
                message: "Current system ID is required",
                severity: "error",
            });
        } else if (!universe.systems.has(universe.currentSystemId)) {
            errors.push({
                field: "currentSystemId",
                message: "Current system ID must exist in systems",
                severity: "error",
            });
        }

        // Validate each system
        for (const [systemId, system] of universe.systems) {
            const systemValidation = this.validateStarSystem(system);
            if (!systemValidation.isValid) {
                errors.push(
                    ...systemValidation.errors.map((e) => ({
                        ...e,
                        field: `systems.${systemId}.${e.field}`,
                    })),
                );
                warnings.push(
                    ...systemValidation.warnings.map((w) => ({
                        ...w,
                        field: `systems.${systemId}.${w.field}`,
                    })),
                );
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    validatePlugin(plugin: GamePlugin): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (!plugin.id || typeof plugin.id !== "string") {
            errors.push({
                field: "id",
                message: "Plugin ID is required",
                severity: "error",
            });
        }

        if (!plugin.name || typeof plugin.name !== "string") {
            errors.push({
                field: "name",
                message: "Plugin name is required",
                severity: "error",
            });
        }

        if (!plugin.version || typeof plugin.version !== "string") {
            errors.push({
                field: "version",
                message: "Plugin version is required",
                severity: "error",
            });
        }

        if (typeof plugin.initialize !== "function") {
            errors.push({
                field: "initialize",
                message: "Plugin must have initialize function",
                severity: "error",
            });
        }

        if (typeof plugin.cleanup !== "function") {
            errors.push({
                field: "cleanup",
                message: "Plugin must have cleanup function",
                severity: "error",
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

/**
 * Simple event bus implementation
 */
class SimpleEventBus implements PluginEventBus {
    private listeners = new Map<string, Array<(data: unknown) => void>>();

    emit(event: string, data?: unknown): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((listener) => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(
                        `Error in event listener for '${event}':`,
                        error,
                    );
                }
            });
        }
    }

    on(event: string, handler: (data: unknown) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(handler);
    }

    off(event: string, handler: (data: unknown) => void): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(handler);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    once(event: string, handler: (data: unknown) => void): void {
        const onceHandler = (data: unknown) => {
            handler(data);
            this.off(event, onceHandler);
        };
        this.on(event, onceHandler);
    }
}

/**
 * Plugin logger implementation
 */
export class PluginLoggerImpl implements PluginLogger {
    constructor(private pluginId: string) {}

    debug(message: string, data?: unknown): void {
        console.debug(`[${this.pluginId}] ${message}`, data);
    }

    info(message: string, data?: unknown): void {
        console.info(`[${this.pluginId}] ${message}`, data);
    }

    warn(message: string, data?: unknown): void {
        console.warn(`[${this.pluginId}] ${message}`, data);
    }

    error(message: string, error?: Error): void {
        console.error(`[${this.pluginId}] ${message}`, error);
    }
}

/**
 * Simple plugin storage implementation using localStorage
 */
export class PluginStorageImpl implements PluginStorage {
    constructor(private pluginId: string) {}

    private getKey(key: string): string {
        return `plugin:${this.pluginId}:${key}`;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const item = localStorage.getItem(this.getKey(key));
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        try {
            localStorage.setItem(this.getKey(key), JSON.stringify(value));
        } catch (error) {
            console.error(
                `Failed to store data for plugin ${this.pluginId}:`,
                error,
            );
        }
    }

    async remove(key: string): Promise<void> {
        localStorage.removeItem(this.getKey(key));
    }

    async clear(): Promise<void> {
        const prefix = `plugin:${this.pluginId}:`;
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    async keys(): Promise<string[]> {
        const prefix = `plugin:${this.pluginId}:`;
        const keys: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key.substring(prefix.length));
            }
        }

        return keys;
    }
}
