import { GameProvider } from "../context/GameContext";
import SolarSystemView from "./SolarSystemView";
import type { ReactNode } from "react";

interface SolarSystemWrapperProps {
  children?: ReactNode;
}

export default function SolarSystemWrapper({
  children,
}: SolarSystemWrapperProps) {
  return (
    <GameProvider initialView="solar-system">
      <SolarSystemView />
      {children}
    </GameProvider>
  );
}
