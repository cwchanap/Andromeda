import { useState, useCallback } from "react";
import SolarSystemScene from "./SolarSystemScene";
import PlanetInfoModal from "./PlanetInfoModal";
import NavigationControls from "./NavigationControls";
import { Button } from "./ui/button";
import { useGameContext } from "../context/GameContext";
import type { CelestialBodyData } from "../types/game";

export default function SolarSystemView() {
  const {
    gameState,
    selectCelestialBody,
    navigateToView,
    showInfoModal,
    settings,
  } = useGameContext();

  const [currentZoom, setCurrentZoom] = useState<number>(50);
  const [zoomControls, setZoomControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null>(null);

  const handlePlanetSelect = useCallback(
    (planet: CelestialBodyData) => {
      selectCelestialBody(planet);
      showInfoModal(true);
    },
    [selectCelestialBody, showInfoModal],
  );

  const handleCloseModal = useCallback(() => {
    showInfoModal(false);
  }, [showInfoModal]);

  const handleBackToMenu = useCallback(() => {
    navigateToView("menu");
  }, [navigateToView]);

  const handleZoomIn = useCallback(() => {
    zoomControls?.zoomIn();
  }, [zoomControls]);

  const handleZoomOut = useCallback(() => {
    zoomControls?.zoomOut();
  }, [zoomControls]);

  const handleResetView = useCallback(() => {
    zoomControls?.resetView();
  }, [zoomControls]);

  const handleZoomControlsReady = useCallback(
    (controls: {
      zoomIn: () => void;
      zoomOut: () => void;
      resetView: () => void;
    }) => {
      setZoomControls(controls);
    },
    [],
  );

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  const handleAskAI = (question: string) => {
    // This will be implemented in task 8 (AI chatbot functionality)
    console.log("AI Question:", question);
  };

  return (
    <div className="relative h-full w-full">
      {/* Back to Menu Button */}
      {gameState.ui.showControls && (
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="outline"
            onClick={handleBackToMenu}
            className="bg-background/80 backdrop-blur-sm"
          >
            ← Back to Menu
          </Button>
        </div>
      )}

      <SolarSystemScene
        onPlanetSelect={handlePlanetSelect}
        selectedPlanetId={gameState.selectedBody?.id}
        onZoomChange={handleZoomChange}
        onZoomControlsReady={handleZoomControlsReady}
        enableControls={true}
      />

      {gameState.ui.showControls && (
        <NavigationControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          currentZoom={currentZoom}
          maxZoom={300}
          minZoom={5}
        />
      )}

      <PlanetInfoModal
        planetData={gameState.selectedBody}
        isOpen={gameState.ui.showInfoModal}
        onClose={handleCloseModal}
        onAskAI={handleAskAI}
      />

      {/* Control Hints */}
      {settings.showControlHints && gameState.ui.showControls && (
        <div className="absolute bottom-4 left-4 z-40">
          <div className="bg-background/90 max-w-sm rounded-lg p-4 shadow-lg backdrop-blur-sm">
            <div className="text-muted-foreground space-y-2 text-sm">
              <div className="text-foreground mb-2 font-medium">Controls:</div>
              <div>• Left click + drag: Rotate view</div>
              <div>• Right click + drag: Pan camera</div>
              <div>• Scroll wheel: Zoom in/out</div>
              <div>• WASD / Arrow keys: Move camera</div>
              <div>• +/- keys: Zoom in/out</div>
              <div>• R key: Reset view</div>
              <div>• Click planets: View information</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
