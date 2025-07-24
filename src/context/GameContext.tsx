import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type { GameState, CelestialBodyData } from "../types/game";
import type { GameSettings } from "../components/SettingsModal";
import * as THREE from "three";

interface GameContextType {
  gameState: GameState;
  settings: GameSettings;
  updateGameState: (updates: Partial<GameState>) => void;
  updateSettings: (settings: GameSettings) => void;
  selectCelestialBody: (body: CelestialBodyData | null) => void;
  navigateToView: (view: "menu" | "solar-system") => void;
  showInfoModal: (show: boolean) => void;
  showChatbot: (show: boolean) => void;
  showControls: (show: boolean) => void;
  resetGameState: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    // During SSR, return a default context to prevent errors
    if (typeof window === "undefined") {
      return {
        gameState: {
          currentView: "menu" as const,
          selectedBody: null,
          camera: {
            position: new THREE.Vector3(0, 20, 50),
            target: new THREE.Vector3(0, 0, 0),
            zoom: 50,
          },
          ui: {
            showInfoModal: false,
            showChatbot: false,
            showControls: true,
          },
          settings: {
            enableAnimations: true,
            audioEnabled: true,
            controlSensitivity: 1.0,
          },
        },
        settings: {
          enableAnimations: true,
          audioEnabled: true,
          controlSensitivity: 1.0,
          graphicsQuality: "medium" as const,
          showControlHints: true,
        },
        updateGameState: () => {},
        updateSettings: () => {},
        selectCelestialBody: () => {},
        navigateToView: () => {},
        showInfoModal: () => {},
        showChatbot: () => {},
        showControls: () => {},
        resetGameState: () => {},
      };
    }
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
  initialView?: "menu" | "solar-system";
}

export function GameProvider({
  children,
  initialView = "menu",
}: GameProviderProps) {
  // Load settings from localStorage or use defaults
  const loadSettings = (): GameSettings => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("space-game-settings");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn("Failed to parse stored settings:", e);
        }
      }
    }
    return {
      enableAnimations: true,
      audioEnabled: true,
      controlSensitivity: 1.0,
      graphicsQuality: "medium",
      showControlHints: true,
    };
  };

  // Load game state from localStorage or use defaults
  const loadGameState = (): GameState => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("space-game-state");
      if (stored) {
        try {
          const parsedState = JSON.parse(stored);
          // Always use the initialView parameter to override stored view
          return {
            ...parsedState,
            currentView: initialView,
          };
        } catch (e) {
          console.warn("Failed to parse stored game state:", e);
        }
      }
    }
    return {
      currentView: initialView,
      selectedBody: null,
      camera: {
        position: new THREE.Vector3(0, 20, 50),
        target: new THREE.Vector3(0, 0, 0),
        zoom: 50,
      },
      ui: {
        showInfoModal: false,
        showChatbot: false,
        showControls: true,
      },
      settings: {
        enableAnimations: true,
        audioEnabled: true,
        controlSensitivity: 1.0,
      },
    };
  };

  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  // Persist game state to localStorage
  const persistGameState = useCallback((state: GameState) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("space-game-state", JSON.stringify(state));
      } catch (e) {
        console.warn("Failed to persist game state:", e);
      }
    }
  }, []);

  // Persist settings to localStorage
  const persistSettings = useCallback((newSettings: GameSettings) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "space-game-settings",
          JSON.stringify(newSettings),
        );
      } catch (e) {
        console.warn("Failed to persist settings:", e);
      }
    }
  }, []);

  const updateGameState = useCallback(
    (updates: Partial<GameState>) => {
      setGameState((prev) => {
        const newState = { ...prev, ...updates };
        persistGameState(newState);
        return newState;
      });
    },
    [persistGameState],
  );

  const updateSettings = useCallback(
    (newSettings: GameSettings) => {
      setSettings(newSettings);
      persistSettings(newSettings);
      // Also update the settings in game state for compatibility
      updateGameState({
        settings: {
          enableAnimations: newSettings.enableAnimations,
          audioEnabled: newSettings.audioEnabled,
          controlSensitivity: newSettings.controlSensitivity,
        },
      });
    },
    [persistSettings, updateGameState],
  );

  const selectCelestialBody = useCallback(
    (body: CelestialBodyData | null) => {
      updateGameState({ selectedBody: body });
    },
    [updateGameState],
  );

  const navigateToView = useCallback(
    (view: "menu" | "solar-system") => {
      updateGameState({ currentView: view });

      // Handle client-side navigation
      if (typeof window !== "undefined") {
        const targetPath = view === "menu" ? "/" : "/solar-system";
        if (window.location.pathname !== targetPath) {
          window.location.href = targetPath;
        }
      }
    },
    [updateGameState],
  );

  const showInfoModal = useCallback((show: boolean) => {
    setGameState((prev) => ({
      ...prev,
      ui: { ...prev.ui, showInfoModal: show },
    }));
  }, []);

  const showChatbot = useCallback((show: boolean) => {
    setGameState((prev) => ({
      ...prev,
      ui: { ...prev.ui, showChatbot: show },
    }));
  }, []);

  const showControls = useCallback((show: boolean) => {
    setGameState((prev) => ({
      ...prev,
      ui: { ...prev.ui, showControls: show },
    }));
  }, []);

  const resetGameState = useCallback(() => {
    const defaultState = loadGameState();
    setGameState(defaultState);
    persistGameState(defaultState);
  }, [persistGameState]);

  const contextValue: GameContextType = useMemo(
    () => ({
      gameState,
      settings,
      updateGameState,
      updateSettings,
      selectCelestialBody,
      navigateToView,
      showInfoModal,
      showChatbot,
      showControls,
      resetGameState,
    }),
    [
      gameState,
      settings,
      updateGameState,
      updateSettings,
      selectCelestialBody,
      navigateToView,
      showInfoModal,
      showChatbot,
      showControls,
      resetGameState,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
}
