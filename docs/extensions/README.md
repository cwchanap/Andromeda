# Extension Development Guide

Learn how to create plugins and extensions for the Andromeda 3D Solar System Explorer.

## Overview

The Andromeda application features a powerful plugin system that allows developers to:

- Add new star systems and celestial bodies
- Create custom UI components and interactions
- Extend the AI assistant capabilities
- Add educational content and quizzes
- Integrate with external data sources

## Plugin Architecture

### Plugin Structure

A basic plugin follows this structure:

```
my-plugin/
├── package.json          # Plugin metadata
├── index.ts             # Main plugin entry point
├── systems/             # Star system definitions
│   └── alpha-centauri.ts
├── components/          # Custom UI components
│   └── CustomView.svelte
├── services/            # Additional services
│   └── DataService.ts
└── assets/              # Images, models, textures
    ├── textures/
    └── models/
```

### Basic Plugin Template

```typescript
// index.ts
import type { GamePlugin, PluginContext, StarSystemData } from '@andromeda/types'
import { alphaCentauriSystem } from './systems/alpha-centauri'

export default class MyPlugin implements GamePlugin {
  id = 'my-plugin'
  name = 'My Custom Plugin'
  version = '1.0.0'
  description = 'A custom plugin for Andromeda'
  author = 'Your Name'
  
  metadata = {
    tags: ['star-systems', 'educational'],
    category: 'system-pack' as const,
    compatibleVersions: ['1.0.0'],
    dependencies: [],
    permissions: ['read-systems', 'write-systems'] as const
  }
  
  private context?: PluginContext
  
  async initialize(context: PluginContext): Promise<void> {
    this.context = context
    
    // Register event listeners
    context.eventBus.on('system-changed', this.handleSystemChange.bind(this))
    
    // Initialize services
    await this.initializeServices()
    
    console.log(`${this.name} plugin initialized`)
  }
  
  async dispose(): Promise<void> {
    // Cleanup resources
    if (this.context) {
      this.context.eventBus.off('system-changed', this.handleSystemChange.bind(this))
    }
    
    console.log(`${this.name} plugin disposed`)
  }
  
  provideSystems(): StarSystemData[] {
    return [alphaCentauriSystem]
  }
  
  private async initializeServices(): Promise<void> {
    // Initialize any custom services
  }
  
  private handleSystemChange(data: { from: string, to: string }): void {
    // Handle system changes
    console.log(`System changed from ${data.from} to ${data.to}`)
  }
}
```

## Creating Star Systems

### Basic System Definition

```typescript
// systems/alpha-centauri.ts
import type { StarSystemData, CelestialBody } from '@andromeda/types'

// Define the central star
const proximaCentauri: CelestialBody = {
  id: 'proxima-centauri',
  name: 'Proxima Centauri',
  type: 'star',
  mass: 2.428e29, // kg
  radius: 107000, // km
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  texture: '/assets/textures/red-dwarf.jpg',
  description: 'A red dwarf star and the closest known star to the Sun',
  metadata: {
    surfaceTemperature: 3042, // Kelvin
    discoveryDate: '1915',
    discoveredBy: 'Robert Innes'
  }
}

// Define planets
const proximaB: CelestialBody = {
  id: 'proxima-b',
  name: 'Proxima Centauri b',
  type: 'planet',
  mass: 7.58e24, // kg (1.27 Earth masses)
  radius: 7160, // km
  position: { x: 7500000, y: 0, z: 0 }, // ~0.05 AU
  velocity: { x: 0, y: 0, z: 47000 }, // orbital velocity
  texture: '/assets/textures/rocky-planet.jpg',
  description: 'An exoplanet in the habitable zone of Proxima Centauri',
  metadata: {
    orbitalPeriod: 11.2, // days
    surfaceTemperature: 234, // Kelvin (estimated)
    discoveryDate: '2016',
    discoveredBy: 'European Southern Observatory'
  }
}

// Complete system definition
export const alphaCentauriSystem: StarSystemData = {
  id: 'alpha-centauri',
  name: 'Alpha Centauri System',
  description: 'The closest star system to Earth',
  star: proximaCentauri,
  planets: [proximaB],
  moons: [],
  asteroids: [],
  comets: [],
  
  // Extended properties for multi-system support
  position: {
    rightAscension: 14.660, // hours
    declination: -60.834, // degrees
    distance: 1.34 // parsecs
  },
  constellation: 'Centaurus',
  distance: 4.37, // light years
  spectralClass: 'M5.5Ve',
  status: 'active',
  
  discoveryData: {
    discoveryMethod: 'Direct observation',
    discoveryDate: '1915',
    observatory: 'Union Observatory',
    confirmedPlanets: 1,
    candidatePlanets: 2
  },
  
  metadata: {
    age: 4.85, // billion years
    diameter: 0.002, // light years
    totalMass: 0.123, // solar masses
    habitableZone: {
      inner: 0.04, // AU
      outer: 0.08 // AU
    },
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0.0'
  }
}
```

### Advanced System Features

#### Custom Orbital Mechanics

```typescript
import type { CelestialBody, Vector3D } from '@andromeda/types'

export class OrbitalMechanics {
  static calculatePosition(
    body: CelestialBody, 
    time: number, 
    orbitalElements: OrbitalElements
  ): Vector3D {
    const { semiMajorAxis, eccentricity, inclination, meanAnomaly } = orbitalElements
    
    // Calculate true anomaly
    const trueAnomaly = this.solveKeplersEquation(meanAnomaly, eccentricity)
    
    // Calculate position in orbital plane
    const radius = semiMajorAxis * (1 - eccentricity * eccentricity) / 
                  (1 + eccentricity * Math.cos(trueAnomaly))
    
    const x = radius * Math.cos(trueAnomaly)
    const y = radius * Math.sin(trueAnomaly)
    
    // Apply orbital inclination and rotation
    return this.transformToWorldSpace(x, y, inclination)
  }
  
  private static solveKeplersEquation(M: number, e: number): number {
    // Iterative solution to Kepler's equation
    let E = M
    for (let i = 0; i < 10; i++) {
      E = M + e * Math.sin(E)
    }
    return 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2))
  }
  
  private static transformToWorldSpace(x: number, y: number, inclination: number): Vector3D {
    const cos_i = Math.cos(inclination)
    const sin_i = Math.sin(inclination)
    
    return {
      x: x,
      y: y * cos_i,
      z: y * sin_i
    }
  }
}

interface OrbitalElements {
  semiMajorAxis: number // AU
  eccentricity: number
  inclination: number // radians
  meanAnomaly: number // radians
  argumentOfPeriapsis: number // radians
  longitudeOfAscendingNode: number // radians
}
```

## Custom UI Components

### Creating Plugin Components

```svelte
<!-- components/CustomView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import type { StarSystemData } from '@andromeda/types'
  
  export let system: StarSystemData
  export let onSystemSelect: (systemId: string) => void
  
  let mounted = false
  
  onMount(() => {
    mounted = true
  })
  
  function handleSystemClick() {
    onSystemSelect(system.id)
  }
</script>

<div class="custom-system-card" class:mounted>
  <div class="system-header">
    <h3>{system.name}</h3>
    <span class="distance">{system.distance} ly</span>
  </div>
  
  <div class="system-info">
    <p>{system.description}</p>
    <div class="system-stats">
      <div class="stat">
        <span class="label">Planets:</span>
        <span class="value">{system.planets.length}</span>
      </div>
      <div class="stat">
        <span class="label">Spectral Class:</span>
        <span class="value">{system.spectralClass}</span>
      </div>
    </div>
  </div>
  
  <button class="explore-button" on:click={handleSystemClick}>
    Explore System
  </button>
</div>

<style>
  .custom-system-card {
    background: linear-gradient(135deg, #1e3a8a, #3730a3);
    border-radius: 12px;
    padding: 1.5rem;
    color: white;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  }
  
  .custom-system-card.mounted {
    opacity: 1;
    transform: translateY(0);
  }
  
  .system-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .system-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .distance {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.875rem;
  }
  
  .system-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
  }
  
  .label {
    font-size: 0.75rem;
    opacity: 0.8;
  }
  
  .value {
    font-weight: 600;
  }
  
  .explore-button {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .explore-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
</style>
```

### Registering Components

```typescript
// In your plugin's initialize method
import CustomView from './components/CustomView.svelte'

async initialize(context: PluginContext): Promise<void> {
  // Register custom components
  context.componentRegistry.register('custom-system-view', CustomView)
  
  // Register in UI system
  context.ui.registerView({
    id: 'custom-view',
    name: 'Custom System View',
    component: 'custom-system-view',
    route: '/custom-view'
  })
}
```

## Extending Services

### Custom Data Service

```typescript
// services/DataService.ts
export class ExternalDataService {
  private apiKey: string
  private baseUrl: string
  
  constructor(apiKey: string, baseUrl: string = 'https://api.exoplanets.org') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }
  
  async fetchExoplanetData(systemId: string): Promise<ExoplanetData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/systems/${systemId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch exoplanet data:', error)
      throw error
    }
  }
  
  async updateSystemData(systemId: string): Promise<StarSystemData> {
    const exoplanetData = await this.fetchExoplanetData(systemId)
    
    // Transform external data to internal format
    return this.transformToSystemData(exoplanetData)
  }
  
  private transformToSystemData(data: ExoplanetData[]): StarSystemData {
    // Transform external API data to internal StarSystemData format
    // Implementation details...
    return transformedData
  }
}

interface ExoplanetData {
  name: string
  mass: number
  radius: number
  orbitalPeriod: number
  discoveryYear: number
  discoveryMethod: string
}
```

### AI Assistant Extensions

```typescript
// services/AIExtensionService.ts
export class AIExtensionService {
  private context: PluginContext
  
  constructor(context: PluginContext) {
    this.context = context
  }
  
  registerCustomPrompts(): void {
    // Add custom system prompts for your star systems
    this.context.aiService.addSystemPrompt('alpha-centauri', `
      You are an expert on the Alpha Centauri system. When users ask about 
      Proxima Centauri or Proxima b, provide detailed information about:
      - The red dwarf nature of Proxima Centauri
      - The potentially habitable conditions on Proxima b
      - The proximity to Earth and implications for future exploration
    `)
  }
  
  registerCustomActions(): void {
    // Add custom AI-triggered actions
    this.context.aiService.registerAction('compare-systems', async (data) => {
      const { systemA, systemB } = data
      return this.generateSystemComparison(systemA, systemB)
    })
  }
  
  private async generateSystemComparison(
    systemA: string, 
    systemB: string
  ): Promise<string> {
    // Generate detailed comparison between two star systems
    const comparison = await this.context.aiService.generateContent(
      'system-comparison',
      { systemA, systemB }
    )
    
    return comparison
  }
}
```

## Asset Management

### Loading Custom Assets

```typescript
// Plugin asset loading
export class PluginAssetLoader {
  private context: PluginContext
  private loadedAssets = new Map<string, any>()
  
  constructor(context: PluginContext) {
    this.context = context
  }
  
  async loadTextures(texturePaths: Record<string, string>): Promise<void> {
    const loader = this.context.assetLoader
    
    for (const [key, path] of Object.entries(texturePaths)) {
      try {
        const texture = await loader.loadTexture(path)
        this.loadedAssets.set(key, texture)
      } catch (error) {
        console.error(`Failed to load texture ${key}:`, error)
      }
    }
  }
  
  async load3DModels(modelPaths: Record<string, string>): Promise<void> {
    const loader = this.context.assetLoader
    
    for (const [key, path] of Object.entries(modelPaths)) {
      try {
        const model = await loader.loadModel(path)
        this.loadedAssets.set(key, model)
      } catch (error) {
        console.error(`Failed to load model ${key}:`, error)
      }
    }
  }
  
  getAsset(key: string): any {
    return this.loadedAssets.get(key)
  }
}
```

## Plugin Validation

### Validation Schema

```typescript
import Joi from 'joi'

export const pluginSchema = Joi.object({
  id: Joi.string().required().pattern(/^[a-z0-9-]+$/),
  name: Joi.string().required().min(1).max(100),
  version: Joi.string().required().pattern(/^\d+\.\d+\.\d+$/),
  description: Joi.string().required().min(10).max(500),
  author: Joi.string().required().min(1).max(100),
  
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()).required(),
    category: Joi.string().valid(
      'system-pack',
      'visual-enhancement',
      'educational-content',
      'interaction-tool',
      'utility'
    ).required(),
    compatibleVersions: Joi.array().items(Joi.string()).required(),
    dependencies: Joi.array().items(Joi.string()).required(),
    permissions: Joi.array().items(Joi.string().valid(
      'read-systems',
      'write-systems',
      'modify-ui',
      'network-access',
      'local-storage'
    )).required()
  }).required()
})

export function validatePlugin(plugin: any): ValidationResult {
  const { error, value } = pluginSchema.validate(plugin)
  
  return {
    isValid: !error,
    errors: error ? error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: 'VALIDATION_ERROR'
    })) : [],
    warnings: []
  }
}
```

## Testing Plugins

### Unit Testing

```typescript
// __tests__/MyPlugin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MyPlugin from '../index'
import type { PluginContext } from '@andromeda/types'

describe('MyPlugin', () => {
  let plugin: MyPlugin
  let mockContext: PluginContext
  
  beforeEach(() => {
    plugin = new MyPlugin()
    mockContext = {
      universeManager: vi.fn(),
      eventBus: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      },
      services: vi.fn(),
      logger: vi.fn()
    } as any
  })
  
  it('should initialize correctly', async () => {
    await plugin.initialize(mockContext)
    
    expect(mockContext.eventBus.on).toHaveBeenCalledWith(
      'system-changed',
      expect.any(Function)
    )
  })
  
  it('should provide star systems', () => {
    const systems = plugin.provideSystems()
    
    expect(systems).toHaveLength(1)
    expect(systems[0].id).toBe('alpha-centauri')
    expect(systems[0].name).toBe('Alpha Centauri System')
  })
  
  it('should dispose cleanly', async () => {
    await plugin.initialize(mockContext)
    await plugin.dispose()
    
    expect(mockContext.eventBus.off).toHaveBeenCalledWith(
      'system-changed',
      expect.any(Function)
    )
  })
})
```

### Integration Testing

```typescript
// __tests__/integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { UniverseManager } from '@andromeda/universe'
import { GamePluginManager } from '@andromeda/plugins'
import MyPlugin from '../index'

describe('MyPlugin Integration', () => {
  let universeManager: UniverseManager
  let pluginManager: GamePluginManager
  let plugin: MyPlugin
  
  beforeEach(async () => {
    universeManager = new UniverseManager()
    pluginManager = new GamePluginManager()
    plugin = new MyPlugin()
    
    await pluginManager.registerPlugin(plugin)
  })
  
  it('should integrate with universe manager', async () => {
    const systems = plugin.provideSystems()
    
    for (const system of systems) {
      await universeManager.addSystem(system)
    }
    
    const loadedSystems = universeManager.getAllSystems()
    expect(loadedSystems).toHaveLength(1)
    expect(loadedSystems[0].id).toBe('alpha-centauri')
  })
})
```

## Publishing Plugins

### Package.json Configuration

```json
{
  "name": "@andromeda/my-plugin",
  "version": "1.0.0",
  "description": "Custom star systems for Andromeda",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["andromeda", "plugin", "star-systems", "space"],
  "author": "Your Name",
  "license": "MIT",
  "peerDependencies": {
    "@andromeda/core": "^1.0.0"
  },
  "devDependencies": {
    "@andromeda/types": "^1.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0"
  },
  "files": [
    "dist/",
    "assets/",
    "README.md"
  ],
  "andromeda": {
    "pluginVersion": "1.0.0",
    "compatibleVersions": ["1.0.0"],
    "category": "system-pack",
    "permissions": ["read-systems", "write-systems"]
  }
}
```

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyAndromedaPlugin',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['@andromeda/core', '@andromeda/types'],
      output: {
        globals: {
          '@andromeda/core': 'AndromedaCore',
          '@andromeda/types': 'AndromedaTypes'
        }
      }
    }
  }
})
```

## Best Practices

### Performance Optimization

- Use lazy loading for large assets
- Implement efficient LOD (Level of Detail) systems
- Cache frequently accessed data
- Use Web Workers for heavy computations

### User Experience

- Provide clear loading states
- Handle errors gracefully
- Include comprehensive documentation
- Follow accessibility guidelines

### Security

- Validate all external data
- Sanitize user inputs
- Use secure communication protocols
- Implement proper permission systems

### Maintenance

- Follow semantic versioning
- Provide migration guides for breaking changes
- Include comprehensive tests
- Document all public APIs

This guide provides the foundation for creating powerful extensions to the Andromeda application. For more examples and advanced techniques, see the sample plugins in the `/examples` directory.
