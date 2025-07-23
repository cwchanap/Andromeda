import { GameProvider } from "../context/GameContext";
import MainMenuReact from "./MainMenuReact";
import type { ReactNode } from "react";

interface MainMenuWrapperProps {
  children?: ReactNode;
}

export default function MainMenuWrapper({ children }: MainMenuWrapperProps) {
  return (
    <GameProvider initialView="menu">
      <MainMenuReact />
      {children}
    </GameProvider>
  );
}
