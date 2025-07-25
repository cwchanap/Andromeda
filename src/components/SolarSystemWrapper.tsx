import { useState, useEffect } from "react";
import { GameProvider } from "../context/GameContext";
import SolarSystemView from "./SolarSystemView";
import { LoadingAnimation, FadeInTransition } from "./LoadingAnimation";
import {
  useSimulatedLoading,
  LOADING_STAGES,
} from "../hooks/useLoadingProgress";
import type { ReactNode } from "react";

interface SolarSystemWrapperProps {
  children?: ReactNode;
}

export default function SolarSystemWrapper({
  children,
}: SolarSystemWrapperProps) {
  const [isSceneReady, setIsSceneReady] = useState(false);

  // Use the loading progress hook with solar system stages
  const { loadingState, startSimulation, completeLoading } =
    useSimulatedLoading(LOADING_STAGES.SOLAR_SYSTEM, false);

  // Start loading simulation when component mounts
  useEffect(() => {
    startSimulation();

    // Simulate loading time for different components
    const loadingTimer = setTimeout(
      () => {
        setIsSceneReady(true);
        completeLoading();
      },
      3000 + Math.random() * 2000,
    ); // 3-5 seconds for realism

    return () => clearTimeout(loadingTimer);
  }, [startSimulation, completeLoading]);

  // Show loading animation while loading
  if (loadingState.isLoading) {
    return (
      <LoadingAnimation
        progress={loadingState.progress}
        message={loadingState.stage}
      />
    );
  }

  return (
    <GameProvider initialView="solar-system">
      <FadeInTransition isLoaded={isSceneReady} duration={800}>
        <SolarSystemView />
        {children}
      </FadeInTransition>
    </GameProvider>
  );
}
