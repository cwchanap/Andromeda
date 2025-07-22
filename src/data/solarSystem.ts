import type { SolarSystemData, CelestialBodyData } from '../types/game';
import * as THREE from 'three';

// Basic solar system data - will be expanded in later tasks
export const solarSystemData: SolarSystemData = {
  systemScale: 1,
  systemCenter: new THREE.Vector3(0, 0, 0),
  
  sun: {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    description: 'The star at the center of our solar system',
    keyFacts: {
      diameter: '1.39 million km',
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
        diameter: '12,742 km',
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
    // More planets will be added in later tasks
  ]
};