import { writable } from "svelte/store";
import type { GameState, CelestialBodyData } from "../types/game";
import * as THREE from "three";

export interface GameSettings {
    enableAnimations: boolean;
    audioEnabled: boolean;
    controlSensitivity: number;
    graphicsQuality: "low" | "medium" | "high";
    showControlHints: boolean;
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

    navigateToView: (view: "menu" | "solar-system") => {
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

    resetGameState: () => {
        gameState.set(defaultGameState);
    },
};
