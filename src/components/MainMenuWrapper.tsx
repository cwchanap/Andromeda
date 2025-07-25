import { GameProvider } from "../context/GameContext";
import MainMenu from "./MainMenu";
import type { ReactNode } from "react";

interface MainMenuWrapperProps {
  children?: ReactNode;
}

export default function MainMenuWrapper({ children }: MainMenuWrapperProps) {
  return (
    <GameProvider initialView="menu">
      <MainMenu />
      {children}
    </GameProvider>
  );
}
