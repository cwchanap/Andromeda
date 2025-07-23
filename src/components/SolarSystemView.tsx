import { useState, useCallback } from "react";
import SolarSystemScene from "./SolarSystemScene";
import PlanetInfoModal from "./PlanetInfoModal";
import NavigationControls from "./NavigationControls";
import type { CelestialBodyData } from "../types/game";

export default function SolarSystemView() {
  const [selectedPlanet, setSelectedPlanet] =
    useState<CelestialBodyData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(50);
  const [zoomControls, setZoomControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  } | null>(null);

  const handlePlanetSelect = useCallback((planet: CelestialBodyData) => {
    setSelectedPlanet(planet);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

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
      <SolarSystemScene
        onPlanetSelect={handlePlanetSelect}
        selectedPlanetId={selectedPlanet?.id}
        onZoomChange={handleZoomChange}
        onZoomControlsReady={handleZoomControlsReady}
      />

      <NavigationControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        currentZoom={currentZoom}
        maxZoom={300}
        minZoom={5}
      />

      <PlanetInfoModal
        planetData={selectedPlanet}
        isOpen={showModal}
        onClose={handleCloseModal}
        onAskAI={handleAskAI}
      />
    </div>
  );
}
