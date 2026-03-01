// Unit tests for UniverseManager
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    UniverseManager,
    PluginLoggerImpl,
    PluginStorageImpl,
} from "../UniverseManager";
import type { StarSystemData } from "../../../types/universe";
import type { PlanetarySystemData } from "../../planetary-system/types";
import * as THREE from "three";

describe("UniverseManager", () => {
    let universeManager: UniverseManager;

    const mockStarSystem: StarSystemData = {
        id: "test-system",
        name: "Test System",
        description: "A test star system",
        star: {
            id: "test-star",
            name: "Test Star",
            type: "star",
            description: "A test star",
            keyFacts: {
                diameter: "1,000,000 km",
                distanceFromSun: "0 km",
                orbitalPeriod: "N/A",
                composition: ["Hydrogen", "Helium"],
                temperature: "5,000 K",
            },
            images: [],
            position: new THREE.Vector3(0, 0, 0),
            scale: 1,
            material: { color: "#FFFF00" },
        },
        celestialBodies: [],
        systemScale: 1,
        systemCenter: new THREE.Vector3(0, 0, 0),
        systemType: "solar",
    };

    beforeEach(() => {
        universeManager = new UniverseManager();
    });

    describe("Constructor and Initialization", () => {
        it("should initialize with default universe data", () => {
            const metadata = universeManager.getUniverseMetadata();
            expect(metadata.name).toBe("Andromeda Universe");
            expect(metadata.version).toBe("1.0.0");
        });

        it("should start with empty systems map", () => {
            const systems = universeManager.getAllSystems();
            expect(systems).toHaveLength(0);
        });
    });

    describe("System Management", () => {
        describe("addSystem", () => {
            it("should add a valid system", () => {
                const result = universeManager.addSystem(mockStarSystem);
                expect(result).toBe(true);

                const systems = universeManager.getAllSystems();
                expect(systems).toHaveLength(1);
                expect(systems[0].id).toBe("test-system");
            });

            it("should reject invalid system", () => {
                const invalidSystem = { ...mockStarSystem, id: "" };
                const result = universeManager.addSystem(invalidSystem);
                expect(result).toBe(false);

                const systems = universeManager.getAllSystems();
                expect(systems).toHaveLength(0);
            });
        });

        describe("removeSystem", () => {
            it("should remove existing system", () => {
                universeManager.addSystem(mockStarSystem);

                const result = universeManager.removeSystem("test-system");
                expect(result).toBe(true);

                const systems = universeManager.getAllSystems();
                expect(systems).toHaveLength(0);
            });

            it("should not remove non-existent system", () => {
                const result = universeManager.removeSystem("non-existent");
                expect(result).toBe(false);
            });

            it("should not remove currently active system", async () => {
                universeManager.addSystem(mockStarSystem);
                await universeManager.switchToSystem("test-system");

                const result = universeManager.removeSystem("test-system");
                expect(result).toBe(false);

                const systems = universeManager.getAllSystems();
                expect(systems).toHaveLength(1);
            });
        });

        describe("switchToSystem", () => {
            it("should switch to existing system", async () => {
                universeManager.addSystem(mockStarSystem);

                const result =
                    await universeManager.switchToSystem("test-system");
                expect(result).toBe(true);

                const currentSystem = universeManager.getCurrentSystem();
                expect(currentSystem?.id).toBe("test-system");
            });

            it("should fail to switch to non-existent system", async () => {
                const result =
                    await universeManager.switchToSystem("non-existent");
                expect(result).toBe(false);
            });
        });

        describe("getSystem", () => {
            it("should return existing system", () => {
                universeManager.addSystem(mockStarSystem);

                const system = universeManager.getSystem("test-system");
                expect(system).toBeDefined();
                expect(system?.id).toBe("test-system");
            });

            it("should return null for non-existent system", () => {
                const system = universeManager.getSystem("non-existent");
                expect(system).toBeNull();
            });
        });
    });

    describe("Planetary System Conversion", () => {
        const mockPlanetarySystemData: PlanetarySystemData = {
            id: "solar-system",
            name: "Solar System",
            description: "Our home planetary system",
            systemType: "solar",
            star: {
                id: "sun",
                name: "Sun",
                type: "star",
                description: "Our star",
                keyFacts: {
                    diameter: "1,392,700 km",
                    distanceFromSun: "0 km",
                    orbitalPeriod: "N/A",
                    composition: ["Hydrogen", "Helium"],
                    temperature: "5,778 K",
                },
                images: [],
                position: new THREE.Vector3(0, 0, 0),
                scale: 2.5,
                material: { color: "#FDB813" },
            },
            celestialBodies: [],
            systemScale: 1,
            systemCenter: new THREE.Vector3(0, 0, 0),
        };

        it("should convert PlanetarySystemData to StarSystemData", () => {
            const converted = UniverseManager.convertPlanetarySystemData(
                mockPlanetarySystemData,
            );

            expect(converted.id).toBe("sol");
            expect(converted.name).toBe("Solar System");
            expect(converted.systemType).toBe("solar");
            expect(converted.star).toEqual(mockPlanetarySystemData.star);
            expect(converted.celestialBodies).toEqual(
                mockPlanetarySystemData.celestialBodies,
            );
        });

        it("should initialize with planetary system data", () => {
            universeManager.initializeWithPlanetarySystem(
                mockPlanetarySystemData,
            );

            const systems = universeManager.getAllSystems();
            expect(systems).toHaveLength(1);
            expect(systems[0].id).toBe("sol");

            const currentSystem = universeManager.getCurrentSystem();
            expect(currentSystem?.id).toBe("sol");
        });
    });

    describe("Universe Data Management", () => {
        it("should export universe data", () => {
            universeManager.addSystem({
                ...mockStarSystem,
                id: "system1",
            });

            const exported = universeManager.exportUniverse();
            expect(exported.systems.size).toBe(1);
            expect(exported.systems.has("system1")).toBe(true);
            expect(exported.metadata).toBeDefined();
        });

        it("should import universe data", () => {
            const universeData = {
                systems: new Map([
                    ["system1", { ...mockStarSystem, id: "system1" }],
                ]),
                currentSystemId: "system1",
                metadata: {
                    name: "Test Universe",
                    description: "Test",
                    version: "1.0.0",
                    lastUpdated: new Date(),
                },
            };

            const result = universeManager.importUniverse(universeData);
            expect(result).toBe(true);

            const systems = universeManager.getAllSystems();
            expect(systems).toHaveLength(1);
        });
    });

    describe("Event System", () => {
        it("should emit events when systems are added", () => {
            const eventBus = universeManager.getEventBus();
            const mockHandler = vi.fn();

            eventBus.on("system-added", mockHandler);
            universeManager.addSystem(mockStarSystem);

            expect(mockHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemId: "test-system",
                    system: mockStarSystem,
                }),
            );
        });
    });

    describe("Error Handling", () => {
        it("should handle validation errors gracefully", () => {
            const invalidSystem = {
                id: "",
                name: "",
                // Missing required fields
            } as StarSystemData;

            const result = universeManager.addSystem(invalidSystem);
            expect(result).toBe(false);
        });

        it("should handle switch errors gracefully", async () => {
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});

            const result = await universeManager.switchToSystem("non-existent");
            expect(result).toBe(false);

            consoleSpy.mockRestore();
        });
    });
});

// ─── DefaultSystemValidator (accessed through UniverseManager.addSystem) ────

describe("DefaultSystemValidator (via UniverseManager)", () => {
    let manager: UniverseManager;

    const validStar = {
        id: "star-1",
        name: "Test Star",
        type: "star" as const,
        description: "A star",
        keyFacts: {
            diameter: "1,000,000 km",
            distanceFromSun: "0 km",
            orbitalPeriod: "N/A",
            composition: ["Hydrogen"],
            temperature: "5,000 K",
        },
        images: [],
        position: new THREE.Vector3(0, 0, 0),
        scale: 1,
        material: { color: "#fff" },
    };

    beforeEach(() => {
        manager = new UniverseManager();
    });

    it("rejects system with missing name", () => {
        expect(
            manager.addSystem({
                id: "x",
                name: "",
                description: "",
                star: validStar,
                celestialBodies: [],
                systemScale: 1,
                systemCenter: new THREE.Vector3(0, 0, 0),
                systemType: "solar",
            }),
        ).toBe(false);
    });

    it("rejects system with non-star 'star' field", () => {
        const wrongType = { ...validStar, type: "planet" as const };
        expect(
            manager.addSystem({
                id: "x",
                name: "X",
                description: "",
                star: wrongType as never,
                celestialBodies: [],
                systemScale: 1,
                systemCenter: new THREE.Vector3(0, 0, 0),
                systemType: "solar",
            }),
        ).toBe(false);
    });

    it("rejects system with missing star", () => {
        expect(
            manager.addSystem({
                id: "x",
                name: "X",
                description: "",
                star: null as never,
                celestialBodies: [],
                systemScale: 1,
                systemCenter: new THREE.Vector3(0, 0, 0),
                systemType: "solar",
            }),
        ).toBe(false);
    });

    it("rejects system with non-array celestialBodies", () => {
        expect(
            manager.addSystem({
                id: "x",
                name: "X",
                description: "",
                star: validStar,
                celestialBodies: null as never,
                systemScale: 1,
                systemCenter: new THREE.Vector3(0, 0, 0),
                systemType: "solar",
            }),
        ).toBe(false);
    });

    it("warns but succeeds for bodies with non-positive orbitRadius", () => {
        const result = manager.addSystem({
            id: "x",
            name: "X",
            description: "",
            star: validStar,
            celestialBodies: [
                { ...validStar, type: "planet" as const, orbitRadius: -5 },
            ],
            systemScale: 1,
            systemCenter: new THREE.Vector3(0, 0, 0),
            systemType: "solar",
        });
        expect(result).toBe(true);
    });

    it("rejects universe import when currentSystemId is not in systems", () => {
        const result = manager.importUniverse({
            systems: new Map([
                [
                    "sol",
                    {
                        id: "sol",
                        name: "Sol",
                        description: "",
                        star: validStar,
                        celestialBodies: [],
                        systemScale: 1,
                        systemCenter: new THREE.Vector3(0, 0, 0),
                        systemType: "solar",
                    },
                ],
            ]),
            currentSystemId: "missing",
            metadata: {
                name: "U",
                description: "D",
                version: "1",
                lastUpdated: new Date(),
            },
        });
        expect(result).toBe(false);
    });
});

// ─── SimpleEventBus (accessed through UniverseManager.getEventBus) ──────────

describe("SimpleEventBus (via UniverseManager.getEventBus)", () => {
    let eventBus: ReturnType<UniverseManager["getEventBus"]>;

    beforeEach(() => {
        eventBus = new UniverseManager().getEventBus();
    });

    it("on() registers a handler that receives emitted data", () => {
        const handler = vi.fn();
        eventBus.on("test", handler);
        eventBus.emit("test", { value: 42 });
        expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it("off() removes a registered handler", () => {
        const handler = vi.fn();
        eventBus.on("test", handler);
        eventBus.off("test", handler);
        eventBus.emit("test", {});
        expect(handler).not.toHaveBeenCalled();
    });

    it("once() fires handler exactly once", () => {
        const handler = vi.fn();
        eventBus.once("test", handler);
        eventBus.emit("test", "first");
        eventBus.emit("test", "second");
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith("first");
    });

    it("emit() is a no-op for events with no listeners", () => {
        expect(() => eventBus.emit("no-listeners", {})).not.toThrow();
    });

    it("listener errors are caught and do not prevent other listeners", () => {
        const bad = vi.fn(() => {
            throw new Error("boom");
        });
        const good = vi.fn();
        eventBus.on("test", bad);
        eventBus.on("test", good);
        expect(() => eventBus.emit("test", {})).not.toThrow();
        expect(good).toHaveBeenCalled();
    });
});

// ─── PluginLoggerImpl ────────────────────────────────────────────────────────

describe("PluginLoggerImpl", () => {
    it("debug logs with plugin prefix", () => {
        const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
        const logger = new PluginLoggerImpl("test-plugin");
        logger.debug("hello", { a: 1 });
        expect(spy).toHaveBeenCalledWith("[test-plugin] hello", { a: 1 });
        spy.mockRestore();
    });

    it("info logs with plugin prefix", () => {
        const spy = vi.spyOn(console, "info").mockImplementation(() => {});
        const logger = new PluginLoggerImpl("test-plugin");
        logger.info("info message");
        expect(spy).toHaveBeenCalledWith(
            "[test-plugin] info message",
            undefined,
        );
        spy.mockRestore();
    });

    it("warn logs with plugin prefix", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const logger = new PluginLoggerImpl("test-plugin");
        logger.warn("warning");
        expect(spy).toHaveBeenCalledWith("[test-plugin] warning", undefined);
        spy.mockRestore();
    });

    it("error logs with plugin prefix", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const logger = new PluginLoggerImpl("test-plugin");
        const err = new Error("oops");
        logger.error("error message", err);
        expect(spy).toHaveBeenCalledWith("[test-plugin] error message", err);
        spy.mockRestore();
    });
});

// ─── PluginStorageImpl ───────────────────────────────────────────────────────

describe("PluginStorageImpl", () => {
    beforeEach(() => {
        (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
        (localStorage.setItem as ReturnType<typeof vi.fn>).mockReset();
        (localStorage.removeItem as ReturnType<typeof vi.fn>).mockReset();
        (localStorage.key as ReturnType<typeof vi.fn>).mockReset();
    });

    it("get() returns null when key not in storage", async () => {
        (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
            null,
        );
        const storage = new PluginStorageImpl("my-plugin");
        expect(await storage.get("setting")).toBeNull();
        expect(localStorage.getItem).toHaveBeenCalledWith(
            "plugin:my-plugin:setting",
        );
    });

    it("get() parses JSON from storage", async () => {
        (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
            JSON.stringify({ x: 1 }),
        );
        const storage = new PluginStorageImpl("my-plugin");
        expect(await storage.get("setting")).toEqual({ x: 1 });
    });

    it("get() returns null on JSON parse error", async () => {
        (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
            "{{invalid",
        );
        const storage = new PluginStorageImpl("my-plugin");
        expect(await storage.get("setting")).toBeNull();
    });

    it("set() serializes value to localStorage", async () => {
        const storage = new PluginStorageImpl("my-plugin");
        await storage.set("setting", { value: 42 });
        expect(localStorage.setItem).toHaveBeenCalledWith(
            "plugin:my-plugin:setting",
            JSON.stringify({ value: 42 }),
        );
    });

    it("remove() removes the namespaced key", async () => {
        const storage = new PluginStorageImpl("my-plugin");
        await storage.remove("setting");
        expect(localStorage.removeItem).toHaveBeenCalledWith(
            "plugin:my-plugin:setting",
        );
    });

    it("keys() returns unprefixed keys belonging to this plugin", async () => {
        const prefix = "plugin:my-plugin:";
        const mockKeys = [`${prefix}a`, `${prefix}b`, "plugin:other:c"];
        Object.defineProperty(localStorage, "length", {
            value: mockKeys.length,
            configurable: true,
        });
        (localStorage.key as ReturnType<typeof vi.fn>).mockImplementation(
            (i: number) => mockKeys[i],
        );

        const storage = new PluginStorageImpl("my-plugin");
        const keys = await storage.keys();
        expect(keys).toContain("a");
        expect(keys).toContain("b");
        expect(keys).not.toContain("c");
    });

    it("clear() removes all keys for this plugin only", async () => {
        const prefix = "plugin:my-plugin:";
        const mockKeys = [`${prefix}x`, "plugin:other:y"];
        Object.defineProperty(localStorage, "length", {
            value: mockKeys.length,
            configurable: true,
        });
        (localStorage.key as ReturnType<typeof vi.fn>).mockImplementation(
            (i: number) => mockKeys[i],
        );

        const storage = new PluginStorageImpl("my-plugin");
        await storage.clear();
        expect(localStorage.removeItem).toHaveBeenCalledWith(`${prefix}x`);
        expect(localStorage.removeItem).not.toHaveBeenCalledWith(
            "plugin:other:y",
        );
    });

    it("set() silently handles localStorage.setItem throwing (QuotaExceeded)", async () => {
        vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
            throw new Error("QuotaExceededError");
        });
        const storage = new PluginStorageImpl("my-plugin");
        // Should not throw even when localStorage throws
        await expect(storage.set("key", "value")).resolves.toBeUndefined();
    });
});

// ─── DefaultSystemValidator.validatePlugin ──────────────────────────────────

describe("DefaultSystemValidator.validatePlugin", () => {
    interface ValidationError {
        field: string;
        message: string;
    }

    interface ValidationResult {
        isValid: boolean;
        errors: ValidationError[];
    }

    interface SystemValidator {
        validatePlugin(plugin: unknown): ValidationResult;
    }

    let validator: SystemValidator;

    beforeEach(() => {
        // Access the private DefaultSystemValidator via UniverseManager's internals
        const mgr = new UniverseManager();
        validator = (mgr as unknown as { validator: SystemValidator })
            .validator;
    });

    function makeValidPlugin() {
        return {
            id: "test-plugin",
            name: "Test Plugin",
            version: "1.0.0",
            initialize: vi.fn(),
            cleanup: vi.fn(),
        };
    }

    it("returns valid for a well-formed plugin", () => {
        const result = validator.validatePlugin(makeValidPlugin());
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("errors when plugin id is missing", () => {
        const plugin = makeValidPlugin();
        // @ts-expect-error - testing error handling for missing required property
        delete plugin.id;
        const result = validator.validatePlugin(plugin);
        expect(result.isValid).toBe(false);
        expect(
            result.errors.some((e: ValidationError) => e.field === "id"),
        ).toBe(true);
    });

    it("errors when plugin name is missing", () => {
        const plugin = makeValidPlugin();
        // @ts-expect-error - testing error handling for missing required property
        delete plugin.name;
        const result = validator.validatePlugin(plugin);
        expect(result.isValid).toBe(false);
        expect(
            result.errors.some((e: ValidationError) => e.field === "name"),
        ).toBe(true);
    });

    it("errors when plugin version is missing", () => {
        const plugin = makeValidPlugin();
        // @ts-expect-error - testing error handling for missing required property
        delete plugin.version;
        const result = validator.validatePlugin(plugin);
        expect(result.isValid).toBe(false);
        expect(
            result.errors.some((e: ValidationError) => e.field === "version"),
        ).toBe(true);
    });

    it("errors when initialize is not a function", () => {
        const plugin = { ...makeValidPlugin(), initialize: "not-a-fn" };
        const result = validator.validatePlugin(plugin);
        expect(result.isValid).toBe(false);
        expect(
            result.errors.some(
                (e: ValidationError) => e.field === "initialize",
            ),
        ).toBe(true);
    });

    it("errors when cleanup is not a function", () => {
        const plugin = { ...makeValidPlugin(), cleanup: "not-a-fn" };
        const result = validator.validatePlugin(plugin);
        expect(result.isValid).toBe(false);
        expect(
            result.errors.some((e: ValidationError) => e.field === "cleanup"),
        ).toBe(true);
    });

    it("collects multiple errors for a completely invalid plugin", () => {
        const result = validator.validatePlugin({});
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
});
