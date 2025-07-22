// Core type definitions for the space exploration game
import type { Vector3 } from 'three';

export interface CelestialBodyData {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon';
  description: string;
  keyFacts: {
    diameter: string;
    distanceFromSun: string;
    orbitalPeriod: string;
    composition: string[];
    temperature: string;
    moons?: number;
  };
  images: string[];
  position: Vector3;
  scale: number;
  material: {
    color: string;
    emissive?: string;
    texture?: string;
  };
  orbitRadius?: number;
  orbitSpeed?: number;
}

export interface GameState {
  currentView: 'menu' | 'solar-system';
  selectedBody: CelestialBodyData | null;
  camera: {
    position: Vector3;
    target: Vector3;
    zoom: number;
  };
  ui: {
    showInfoModal: boolean;
    showChatbot: boolean;
    showControls: boolean;
  };
  settings: {
    enableAnimations: boolean;
    audioEnabled: boolean;
    controlSensitivity: number;
  };
}

export interface SolarSystemData {
  sun: CelestialBodyData;
  planets: CelestialBodyData[];
  systemScale: number;
  systemCenter: Vector3;
}