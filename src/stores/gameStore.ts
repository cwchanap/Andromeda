import { writable } from "svelte/store";
import type { GameState, CelestialBodyData } from "../types/game";
import * as THREE from "three";

export interface GameSettings {
    enableAnimations: boolean;
    audioEnabled: boolean;
    controlSensitivity: number;
    graphicsQuality: "low" | "medium" | "high";
    showControlHints: boolean;
    orbitSpeedMultiplier: number; // Global multiplier for orbit speeds
    // Accessibility settings
    highContrastMode: boolean;
    reducedMotion: boolean;
    enableKeyboardNavigation: boolean;
    announceSceneChanges: boolean;
    screenReaderMode: boolean;
}

const defaultGameState: GameState = {
    currentView: "menu",
    selectedBody: null,
    camera: {
        position: new THREE.Vector3(0, 0, 50),
        target: new THREE.Vector3(0, 0, 0),
        zoom: 1,
    },
    ui: {
        showInfoModal: false,
        showChatbot: false,
        showControls: false,
        showSystemSelector: false,
    },
    settings: {
        enableAnimations: true,
        audioEnabled: true,
        controlSensitivity: 1.0,
    },
};

const defaultSettings: GameSettings = {
    enableAnimations: true,
    audioEnabled: true,
    controlSensitivity: 1.0,
    graphicsQuality: "medium",
    showControlHints: true,
    orbitSpeedMultiplier: 1.0, // Default speed multiplier
    // Accessibility defaults
    highContrastMode: false,
    reducedMotion: false,
    enableKeyboardNavigation: true,
    announceSceneChanges: true,
    screenReaderMode: false,
};

// Create writable stores
export const gameState = writable<GameState>(defaultGameState);
export const settings = writable<GameSettings>(defaultSettings);

// Helper functions to update stores
export const gameActions = {
    updateGameState: (updates: Partial<GameState>) => {
        gameState.update((state) => ({ ...state, ...updates }));
    },

    updateSettings: (newSettings: GameSettings) => {
        settings.set(newSettings);
    },

    selectCelestialBody: (body: CelestialBodyData | null) => {
        gameState.update((state) => ({ ...state, selectedBody: body }));
    },

    navigateToView: (view: "menu" | "solar-system" | "system-selector") => {
        gameState.update((state) => ({ ...state, currentView: view }));
    },

    showInfoModal: (show: boolean) => {
        gameState.update((state) => ({
            ...state,
            ui: { ...state.ui, showInfoModal: show },
        }));
    },

    showChatbot: (show: boolean) => {
        gameState.update((state) => ({
            ...state,
            ui: { ...state.ui, showChatbot: show },
        }));
    },

    showControls: (show: boolean) => {
        gameState.update((state) => ({
            ...state,
            ui: { ...state.ui, showControls: show },
        }));
    },

    showSystemSelector: (show: boolean) => {
        gameState.update((state) => ({
            ...state,
            ui: { ...state.ui, showSystemSelector: show },
        }));
    },

    // Universe/system management actions
    switchToSystem: (systemId: string) => {
        gameState.update((state) => ({
            ...state,
            universe: {
                ...state.universe,
                currentSystemId: systemId,
                availableSystems: state.universe?.availableSystems || [],
                systemTransition: undefined,
            },
        }));
    },

    startSystemTransition: (fromSystemId: string, toSystemId: string) => {
        gameState.update((state) => ({
            ...state,
            universe: {
                ...state.universe,
                currentSystemId: fromSystemId,
                availableSystems: state.universe?.availableSystems || [],
                systemTransition: {
                    isTransitioning: true,
                    fromSystemId,
                    toSystemId,
                    progress: 0,
                },
            },
        }));
    },

    updateSystemTransitionProgress: (progress: number) => {
        gameState.update((state) => ({
            ...state,
            universe: state.universe
                ? {
                      ...state.universe,
                      systemTransition: state.universe.systemTransition
                          ? {
                                ...state.universe.systemTransition,
                                progress,
                            }
                          : undefined,
                  }
                : undefined,
        }));
    },

    completeSystemTransition: (systemId: string) => {
        gameState.update((state) => ({
            ...state,
            universe: {
                ...state.universe,
                currentSystemId: systemId,
                availableSystems: state.universe?.availableSystems || [],
                systemTransition: undefined,
            },
        }));
    },

    resetGameState: () => {
        gameState.set(defaultGameState);
    },
};
