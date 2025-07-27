// Unit tests for game store
import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { gameState, settings, gameActions } from "../gameStore";
import type { GameSettings } from "../gameStore";
import * as THREE from "three";

describe("Game Store", () => {
    beforeEach(() => {
        // Reset to default state before each test
        gameActions.resetGameState();
    });

    describe("Default State", () => {
        it("should have correct default game state", () => {
            const state = get(gameState);

            expect(state.currentView).toBe("menu");
            expect(state.selectedBody).toBeNull();
            expect(state.camera.zoom).toBe(1);
            expect(state.ui.showInfoModal).toBe(false);
            expect(state.ui.showChatbot).toBe(false);
            expect(state.ui.showControls).toBe(false);
            expect(state.ui.showSystemSelector).toBe(false);
            expect(state.settings.enableAnimations).toBe(true);
            expect(state.settings.audioEnabled).toBe(true);
            expect(state.settings.controlSensitivity).toBe(1.0);
        });

        it("should have correct default settings", () => {
            const currentSettings = get(settings);

            expect(currentSettings.enableAnimations).toBe(true);
            expect(currentSettings.audioEnabled).toBe(true);
            expect(currentSettings.controlSensitivity).toBe(1.0);
            expect(currentSettings.graphicsQuality).toBe("medium");
            expect(currentSettings.showControlHints).toBe(true);
            expect(currentSettings.highContrastMode).toBe(false);
            expect(currentSettings.reducedMotion).toBe(false);
            expect(currentSettings.enableKeyboardNavigation).toBe(true);
            expect(currentSettings.announceSceneChanges).toBe(true);
            expect(currentSettings.screenReaderMode).toBe(false);
        });
    });

    describe("Game Actions", () => {
        describe("updateGameState", () => {
            it("should update partial game state", () => {
                gameActions.updateGameState({ currentView: "solar-system" });

                const state = get(gameState);
                expect(state.currentView).toBe("solar-system");
                expect(state.selectedBody).toBeNull(); // Should preserve other properties
            });
        });

        describe("navigateToView", () => {
            it("should update current view", () => {
                gameActions.navigateToView("solar-system");

                const state = get(gameState);
                expect(state.currentView).toBe("solar-system");
            });

            it("should support system-selector view", () => {
                gameActions.navigateToView("system-selector");

                const state = get(gameState);
                expect(state.currentView).toBe("system-selector");
            });
        });

        describe("selectCelestialBody", () => {
            const mockCelestialBody = {
                id: "earth",
                name: "Earth",
                type: "planet" as const,
                description: "Our home planet",
                keyFacts: {
                    diameter: "12,756 km",
                    distanceFromSun: "149.6 million km",
                    orbitalPeriod: "365.25 days",
                    composition: ["Rock", "Water"],
                    temperature: "15°C",
                    moons: 1,
                },
                images: [],
                position: new THREE.Vector3(8, 0, 0),
                scale: 1.0,
                material: { color: "#6B93D6" },
            };

            it("should select celestial body", () => {
                gameActions.selectCelestialBody(mockCelestialBody);

                const state = get(gameState);
                expect(state.selectedBody).toEqual(mockCelestialBody);
            });

            it("should clear selection when passed null", () => {
                gameActions.selectCelestialBody(mockCelestialBody);
                gameActions.selectCelestialBody(null);

                const state = get(gameState);
                expect(state.selectedBody).toBeNull();
            });
        });

        describe("UI State Management", () => {
            it("should toggle info modal", () => {
                gameActions.showInfoModal(true);
                let state = get(gameState);
                expect(state.ui.showInfoModal).toBe(true);

                gameActions.showInfoModal(false);
                state = get(gameState);
                expect(state.ui.showInfoModal).toBe(false);
            });

            it("should toggle chatbot", () => {
                gameActions.showChatbot(true);
                let state = get(gameState);
                expect(state.ui.showChatbot).toBe(true);

                gameActions.showChatbot(false);
                state = get(gameState);
                expect(state.ui.showChatbot).toBe(false);
            });

            it("should toggle controls", () => {
                gameActions.showControls(true);
                let state = get(gameState);
                expect(state.ui.showControls).toBe(true);

                gameActions.showControls(false);
                state = get(gameState);
                expect(state.ui.showControls).toBe(false);
            });

            it("should toggle system selector", () => {
                gameActions.showSystemSelector(true);
                let state = get(gameState);
                expect(state.ui.showSystemSelector).toBe(true);

                gameActions.showSystemSelector(false);
                state = get(gameState);
                expect(state.ui.showSystemSelector).toBe(false);
            });
        });

        describe("Multi-System Support", () => {
            it("should switch to system", () => {
                gameActions.switchToSystem("alpha-centauri");

                const state = get(gameState);
                expect(state.universe?.currentSystemId).toBe("alpha-centauri");
                expect(state.universe?.systemTransition).toBeUndefined();
            });

            it("should start system transition", () => {
                gameActions.startSystemTransition("sol", "alpha-centauri");

                const state = get(gameState);
                expect(state.universe?.currentSystemId).toBe("sol");
                expect(state.universe?.systemTransition?.isTransitioning).toBe(
                    true,
                );
                expect(state.universe?.systemTransition?.fromSystemId).toBe(
                    "sol",
                );
                expect(state.universe?.systemTransition?.toSystemId).toBe(
                    "alpha-centauri",
                );
                expect(state.universe?.systemTransition?.progress).toBe(0);
            });

            it("should update transition progress", () => {
                gameActions.startSystemTransition("sol", "alpha-centauri");
                gameActions.updateSystemTransitionProgress(0.5);

                const state = get(gameState);
                expect(state.universe?.systemTransition?.progress).toBe(0.5);
            });

            it("should complete system transition", () => {
                gameActions.startSystemTransition("sol", "alpha-centauri");
                gameActions.completeSystemTransition("alpha-centauri");

                const state = get(gameState);
                expect(state.universe?.currentSystemId).toBe("alpha-centauri");
                expect(state.universe?.systemTransition).toBeUndefined();
            });
        });

        describe("Settings Management", () => {
            it("should update settings", () => {
                const newSettings: GameSettings = {
                    enableAnimations: false,
                    audioEnabled: false,
                    controlSensitivity: 2.0,
                    graphicsQuality: "high",
                    showControlHints: false,
                    highContrastMode: true,
                    reducedMotion: true,
                    enableKeyboardNavigation: false,
                    announceSceneChanges: false,
                    screenReaderMode: true,
                };

                gameActions.updateSettings(newSettings);

                const currentSettings = get(settings);
                expect(currentSettings).toEqual(newSettings);
            });
        });

        describe("resetGameState", () => {
            it("should reset to default state", () => {
                // Modify state
                gameActions.navigateToView("solar-system");
                gameActions.showInfoModal(true);
                gameActions.selectCelestialBody({
                    id: "test",
                    name: "Test",
                    type: "planet",
                    description: "Test planet",
                    keyFacts: {
                        diameter: "1000 km",
                        distanceFromSun: "1 AU",
                        orbitalPeriod: "1 year",
                        composition: ["Rock"],
                        temperature: "0°C",
                    },
                    images: [],
                    position: new THREE.Vector3(0, 0, 0),
                    scale: 1,
                    material: { color: "#FFFFFF" },
                });

                // Reset
                gameActions.resetGameState();

                const state = get(gameState);
                expect(state.currentView).toBe("menu");
                expect(state.selectedBody).toBeNull();
                expect(state.ui.showInfoModal).toBe(false);
            });
        });
    });

    describe("Store Reactivity", () => {
        it("should notify subscribers when state changes", () => {
            let notificationCount = 0;

            const unsubscribe = gameState.subscribe(() => {
                notificationCount++;
            });

            // Initial subscription call
            expect(notificationCount).toBe(1);

            gameActions.navigateToView("solar-system");
            expect(notificationCount).toBe(2);

            gameActions.showInfoModal(true);
            expect(notificationCount).toBe(3);

            unsubscribe();
        });

        it("should handle multiple subscribers", () => {
            let count1 = 0;
            let count2 = 0;

            const unsubscribe1 = gameState.subscribe(() => count1++);
            const unsubscribe2 = gameState.subscribe(() => count2++);

            gameActions.navigateToView("solar-system");

            expect(count1).toBeGreaterThan(1);
            expect(count2).toBeGreaterThan(1);

            unsubscribe1();
            unsubscribe2();
        });
    });

    describe("Type Safety", () => {
        it("should enforce correct view types", () => {
            // These should work without TypeScript errors
            gameActions.navigateToView("menu");
            gameActions.navigateToView("solar-system");
            gameActions.navigateToView("system-selector");

            // This would cause a TypeScript error if uncommented:
            // gameActions.navigateToView('invalid-view');
        });

        it("should enforce correct celestial body structure", () => {
            const validBody = {
                id: "mars",
                name: "Mars",
                type: "planet" as const,
                description: "The red planet",
                keyFacts: {
                    diameter: "6,792 km",
                    distanceFromSun: "227.9 million km",
                    orbitalPeriod: "687 days",
                    composition: ["Iron", "Rock"],
                    temperature: "-65°C",
                    moons: 2,
                },
                images: [],
                position: new THREE.Vector3(11, 0, 0),
                scale: 0.53,
                material: { color: "#CD5C5C" },
            };

            // This should work without TypeScript errors
            gameActions.selectCelestialBody(validBody);

            const state = get(gameState);
            expect(state.selectedBody).toEqual(validBody);
        });
    });
});
