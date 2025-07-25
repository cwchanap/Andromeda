import { useState, useEffect } from "react";
import { GameProvider } from "../context/GameContext";
import SolarSystemView from "./SolarSystemView";
import { LoadingAnimation, FadeInTransition } from "./LoadingAnimation";
import { ThreeJSErrorBoundary } from "./ErrorBoundary";
import {
  ErrorNotification,
  setupGlobalErrorHandlers,
} from "./ErrorNotification";
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

  // Set up global error handlers when component mounts
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

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
    <GameProvider>
      <ThreeJSErrorBoundary
        onWebGLError={() => {
          // Handle WebGL-specific errors
          console.warn("WebGL error detected in Solar System");
        }}
      >
        <FadeInTransition isLoaded={isSceneReady} duration={800}>
          <SolarSystemView />
          {children}
        </FadeInTransition>
      </ThreeJSErrorBoundary>

      {/* Global error notification system */}
      <ErrorNotification />
    </GameProvider>
  );
}
