import { useState } from "react";
import { Button } from "./ui/button";
import SettingsModal from "./SettingsModal";
import { useGameContext } from "../context/GameContext";
import type { GameSettings } from "./SettingsModal";

export default function MainMenu() {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSettings, navigateToView } = useGameContext();

  const handleStartGame = () => {
    navigateToView("solar-system");
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    updateSettings(newSettings);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-5xl font-bold text-transparent drop-shadow-2xl md:text-6xl">
          Space Exploration Game
        </h1>
        <p className="mb-12 text-xl leading-relaxed text-gray-200">
          Explore our solar system and learn about celestial bodies through
          immersive 3D visualization
        </p>

        <div className="mb-12 flex flex-col gap-4">
          <Button
            size="lg"
            onClick={handleStartGame}
            className="h-14 w-full transform border-none bg-gradient-to-r from-indigo-600 to-purple-600 text-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
          >
            Start Game
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleOpenSettings}
            className="h-12 w-full transform border-2 border-white/30 bg-white/10 text-lg text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20"
          >
            Settings
          </Button>
        </div>

        <div className="animate-pulse opacity-60">
          <p className="text-sm text-gray-400">
            Use mouse to rotate • Scroll to zoom • Click planets to explore
          </p>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        onSave={handleSaveSettings}
        currentSettings={settings}
      />
    </div>
  );
}
