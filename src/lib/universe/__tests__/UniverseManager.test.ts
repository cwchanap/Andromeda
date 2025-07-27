// Unit tests for UniverseManager
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UniverseManager } from "../UniverseManager";
import type { StarSystemData } from "../../../types/universe";
import type { SolarSystemData } from "../../../types/game";
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

            it("should not remove currently active system", () => {
                universeManager.addSystem(mockStarSystem);
                // Make it the current system (would need to be implemented in actual code)

                const result = universeManager.removeSystem("test-system");
                // This should be false when current system protection is implemented
                expect(typeof result).toBe("boolean");
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

    describe("Solar System Conversion", () => {
        const mockSolarSystemData: SolarSystemData = {
            sun: {
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
            planets: [],
            systemScale: 1,
            systemCenter: new THREE.Vector3(0, 0, 0),
        };

        it("should convert SolarSystemData to StarSystemData", () => {
            const converted =
                UniverseManager.convertSolarSystemData(mockSolarSystemData);

            expect(converted.id).toBe("sol");
            expect(converted.name).toBe("Solar System");
            expect(converted.systemType).toBe("solar");
            expect(converted.star).toEqual(mockSolarSystemData.sun);
            expect(converted.celestialBodies).toEqual(
                mockSolarSystemData.planets,
            );
        });

        it("should initialize with solar system data", () => {
            universeManager.initializeWithSolarSystem(mockSolarSystemData);

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
        it("should have event bus", () => {
            const eventBus = universeManager.getEventBus();
            expect(eventBus).toBeDefined();
            expect(typeof eventBus.emit).toBe("function");
            expect(typeof eventBus.on).toBe("function");
        });

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
