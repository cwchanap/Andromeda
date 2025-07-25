import { useState, useCallback } from "react";
import SolarSystemScene from "./SolarSystemScene";
import PlanetInfoModal from "./PlanetInfoModal";
import NavigationControls from "./NavigationControls";
import AIChatbot from "./AIChatbot";
import { Button } from "./ui/button";
import { AmbientParticles } from "./ParticleSystem";
import { useGameContext } from "../context/GameContext";
import { useResponsive, useTouchDevice } from "../hooks/useResponsive";
import { useMobileOptimization } from "../hooks/useMobileOptimization";
import type { CelestialBodyData } from "../types/game";

export default function SolarSystemView() {
  const gameContext = useGameContext();
  const {
    gameState,
    selectCelestialBody,
    navigateToView,
    showInfoModal,
    showChatbot,
    settings,
  } = gameContext;

  // Responsive and mobile optimization hooks
  const { isMobile } = useResponsive();
  const isTouchDevice = useTouchDevice();
  const { settings: mobileSettings, isLowPerformanceDevice } =
    useMobileOptimization();

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

  const handleAskAI = useCallback(() => {
    // Close the info modal and open the chatbot with the current context
    showInfoModal(false);
    showChatbot(true);
  }, [showInfoModal, showChatbot]);

  return (
    <div className="relative h-full w-full">
      {/* Ambient particle effects - only on higher performance devices */}
      {!isLowPerformanceDevice && mobileSettings.particleEffectsEnabled && (
        <AmbientParticles />
      )}
      {/* Back to Menu and AI Button - Responsive positioning */}
      {gameState.ui.showControls && (
        <div
          className={`absolute top-2 left-2 z-50 flex gap-2 ${isMobile ? "flex-col" : "flex-row"}`}
        >
          <Button
            variant="outline"
            onClick={handleBackToMenu}
            className={`bg-background/80 backdrop-blur-sm ${isMobile ? "px-2 py-1 text-xs" : ""}`}
            size={isMobile ? "sm" : "default"}
          >
            ← {isMobile ? "Menu" : "Back to Menu"}
          </Button>
          <Button
            variant="outline"
            onClick={() => showChatbot(true)}
            className={`bg-background/80 backdrop-blur-sm ${isMobile ? "px-2 py-1 text-xs" : ""}`}
            size={isMobile ? "sm" : "default"}
          >
            🤖 {isMobile ? "AI" : "Ask AI"}
          </Button>
        </div>
      )}
      <SolarSystemScene
        onPlanetSelect={handlePlanetSelect}
        selectedPlanetId={gameState.selectedBody?.id}
        onZoomChange={handleZoomChange}
        onZoomControlsReady={handleZoomControlsReady}
        enableControls={true}
        mobileOptimization={mobileSettings}
      />
      {/* Navigation Controls - Responsive positioning */}
      {gameState.ui.showControls && (
        <NavigationControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          currentZoom={currentZoom}
          maxZoom={300}
          minZoom={5}
          isMobile={isMobile}
          isTouch={isTouchDevice}
        />
      )}
      <PlanetInfoModal
        planetData={gameState.selectedBody}
        isOpen={gameState.ui.showInfoModal}
        onClose={handleCloseModal}
        onAskAI={handleAskAI}
        isMobile={isMobile}
      />
      <AIChatbot
        context={gameContext}
        isOpen={gameState.ui.showChatbot}
        onClose={() => showChatbot(false)}
        isMobile={isMobile}
      />{" "}
      {/* Control Hints - Show simplified version on mobile */}
      {settings.showControlHints && gameState.ui.showControls && !isMobile && (
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
      {/* Mobile Control Hints - Simplified for mobile */}
      {settings.showControlHints && gameState.ui.showControls && isMobile && (
        <div className="absolute bottom-2 left-2 z-40">
          <div className="bg-background/90 max-w-xs rounded-lg p-2 shadow-lg backdrop-blur-sm">
            <div className="text-muted-foreground space-y-1 text-xs">
              <div className="text-foreground mb-1 text-xs font-medium">
                Touch Controls:
              </div>
              <div>• Tap: Select planet</div>
              <div>• Drag: Rotate view</div>
              <div>• Pinch: Zoom in/out</div>
              <div>• Two fingers: Pan</div>
            </div>
          </div>
        </div>
      )}
      {/* Performance warning for low-end devices */}
      {isLowPerformanceDevice && (
        <div className="absolute top-16 right-2 left-2 z-40 md:right-auto md:left-4 md:max-w-sm">
          <div className="rounded-lg border border-amber-300 bg-amber-100 p-3 shadow-lg">
            <div className="text-sm text-amber-800">
              <div className="mb-1 font-medium">Performance Mode Active</div>
              <div className="text-xs">
                Graphics quality has been reduced for better performance on your
                device.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
