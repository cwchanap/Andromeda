import type { CelestialBodyData, SolarSystemData } from '../types/game';
import * as THREE from 'three';

// Placeholder data for celestial bodies - will be expanded in later tasks
export const solarSystemData: SolarSystemData = {
  sun: {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    description: 'The star at the center of our solar system',
    keyFacts: {
      diameter: '1,392,700 km',
      distanceFromSun: '0 km',
      orbitalPeriod: 'N/A',
      composition: ['Hydrogen', 'Helium'],
      temperature: '5,778 K (surface)'
    },
    images: [],
    position: new THREE.Vector3(0, 0, 0),
    scale: 2,
    material: {
      color: '#FDB813',
      emissive: '#FDB813'
    }
  },
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      type: 'planet',
      description: 'The third planet from the Sun and our home',
      keyFacts: {
        diameter: '12,756 km',
        distanceFromSun: '149.6 million km',
        orbitalPeriod: '365.25 days',
        composition: ['Iron', 'Oxygen', 'Silicon', 'Magnesium'],
        temperature: '15°C (average)',
        moons: 1
      },
      images: [],
      position: new THREE.Vector3(10, 0, 0),
      scale: 1,
      material: {
        color: '#6B93D6'
      },
      orbitRadius: 10,
      orbitSpeed: 0.01
    }
  ],
  systemScale: 1,
  systemCenter: new THREE.Vector3(0, 0, 0)
};

export const getCelestialBodyById = (id: string): CelestialBodyData | undefined => {
  if (id === solarSystemData.sun.id) {
    return solarSystemData.sun;
  }
  return solarSystemData.planets.find(planet => planet.id === id);
};

export const getAllCelestialBodies = (): CelestialBodyData[] => {
  return [solarSystemData.sun, ...solarSystemData.planets];
};