# API Documentation

This section covers the core APIs and services in the Andromeda application.

## Core Services

### Solar System Renderer (`SolarSystemRenderer`)

Main class responsible for Three.js scene management and 3D rendering.

```typescript
class SolarSystemRenderer {
  constructor(canvas: HTMLCanvasElement, data: SolarSystemData)
  
  // Scene management
  async initialize(): Promise<void>
  render(): void
  dispose(): void
  
  // Camera controls
  setCameraTarget(position: THREE.Vector3): void
  getCameraPosition(): THREE.Vector3
  
  // Interaction
  onObjectClick(callback: (object: THREE.Object3D) => void): void
  onHover(callback: (object: THREE.Object3D | null) => void): void
  
  // Performance
  setQualityLevel(level: 'low' | 'medium' | 'high'): void
  pauseRendering(): void
  resumeRendering(): void
}
```

### Universe Manager (`UniverseManager`)

Manages multiple star systems and provides system switching capabilities.

```typescript
class UniverseManager extends EventTarget {
  constructor()
  
  // System management
  addSystem(system: StarSystemData): void
  removeSystem(id: string): void
  getSystem(id: string): StarSystemData | undefined
  getAllSystems(): StarSystemData[]
  
  // Active system
  setActiveSystem(id: string): Promise<void>
  getActiveSystem(): StarSystemData | undefined
  
  // Validation
  validateSystem(system: StarSystemData): ValidationResult
  
  // Events
  addEventListener(type: 'systemAdded' | 'systemRemoved' | 'systemChanged', 
                  listener: EventListener): void
}
```

### Game Plugin Manager (`GamePluginManager`)

Handles plugin loading and lifecycle management.

```typescript
class GamePluginManager {
  constructor()
  
  // Plugin management
  registerPlugin(plugin: GamePlugin): Promise<void>
  unregisterPlugin(id: string): void
  getPlugin(id: string): GamePlugin | undefined
  getAllPlugins(): GamePlugin[]
  
  // Lifecycle
  async initializePlugins(): Promise<void>
  async disposePlugins(): Promise<void>
  
  // Events
  on(event: 'pluginRegistered' | 'pluginUnregistered', 
     callback: (plugin: GamePlugin) => void): void
}
```

## Store APIs

### Game Store (`gameStore`)

Central state management for game data and user interactions.

```typescript
interface GameStore {
  // State
  selectedBody: Writable<CelestialBody | null>
  isLoading: Writable<boolean>
  currentView: Writable<'menu' | 'solar-system' | 'settings'>
  error: Writable<string | null>
  
  // Actions
  selectBody(body: CelestialBody | null): void
  setLoading(loading: boolean): void
  setView(view: string): void
  setError(error: string | null): void
  
  // Computed
  hasSelection: Readable<boolean>
  isInSolarSystemView: Readable<boolean>
}
```

### Universe Store (`universeStore`)

Manages universe state and system selection.

```typescript
interface UniverseStore {
  // State
  systems: Writable<StarSystemData[]>
  activeSystemId: Writable<string | null>
  isTransitioning: Writable<boolean>
  
  // Actions
  addSystem(system: StarSystemData): void
  removeSystem(id: string): void
  setActiveSystem(id: string): Promise<void>
  
  // Computed
  activeSystem: Readable<StarSystemData | null>
  availableSystems: Readable<StarSystemData[]>
}
```

### WebGL Store (`webglStore`)

Manages WebGL context and capabilities.

```typescript
interface WebGLStore {
  // State
  isSupported: Writable<boolean>
  context: Writable<WebGLRenderingContext | null>
  capabilities: Writable<WebGLCapabilities>
  
  // Actions
  checkSupport(): boolean
  initializeContext(canvas: HTMLCanvasElement): boolean
  
  // Computed
  canUseAdvancedFeatures: Readable<boolean>
  recommendedQuality: Readable<'low' | 'medium' | 'high'>
}
```

## Service APIs

### AI Service (`aiService`)

Provides AI-powered educational assistance.

```typescript
class AIService {
  constructor(apiKey: string)
  
  // Chat functionality
  async sendMessage(message: string, context?: ChatContext): Promise<string>
  async getContextualHelp(topic: string): Promise<string>
  
  // Educational content
  async explainCelestialBody(body: CelestialBody): Promise<string>
  async generateQuiz(topic: string): Promise<QuizQuestion[]>
  
  // Configuration
  setSystemPrompt(prompt: string): void
  setTemperature(temperature: number): void
}
```

## Utility APIs

### Asset Loader (`AssetLoader`)

Handles loading and caching of 3D assets and textures.

```typescript
class AssetLoader {
  constructor()
  
  // Loading
  async loadTexture(url: string): Promise<THREE.Texture>
  async loadModel(url: string): Promise<THREE.Group>
  async preloadAssets(urls: string[]): Promise<void>
  
  // Caching
  clearCache(): void
  getCacheSize(): number
  
  // Progress tracking
  onProgress(callback: (loaded: number, total: number) => void): void
}
```

### Performance Monitor (`PerformanceMonitor`)

Tracks and reports application performance metrics.

```typescript
class PerformanceMonitor {
  constructor()
  
  // Monitoring
  startMonitoring(): void
  stopMonitoring(): void
  
  // Metrics
  getFPS(): number
  getMemoryUsage(): MemoryInfo
  getRenderTime(): number
  
  // Reporting
  generateReport(): PerformanceReport
  onMetricUpdate(callback: (metrics: PerformanceMetrics) => void): void
}
```

## Component Props and Events

### SolarSystemWrapper

```typescript
interface SolarSystemWrapperProps {
  data: SolarSystemData
  quality?: 'low' | 'medium' | 'high'
  autoRotate?: boolean
  enableInteraction?: boolean
}

// Events
on:bodySelected={(event) => { body: CelestialBody }}
on:sceneReady={(event) => { renderer: SolarSystemRenderer }}
on:error={(event) => { error: Error }}
```

### SystemSelector

```typescript
interface SystemSelectorProps {
  systems: StarSystemData[]
  activeSystemId?: string
  showTransitions?: boolean
}

// Events
on:systemSelected={(event) => { systemId: string }}
on:transitionStart={(event) => {}}
on:transitionEnd={(event) => {}}
```

### SettingsModal

```typescript
interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
}

// Events
on:close={(event) => {}}
on:settingsChanged={(event) => { settings: AppSettings }}
```

## Error Handling

All APIs use consistent error handling patterns:

```typescript
// Service errors
class ServiceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message)
  }
}

// Validation errors
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

interface ValidationError {
  field: string
  message: string
  code: string
}
```

## Event System

The application uses a centralized event system for cross-component communication:

```typescript
// Event types
type AppEvent = 
  | 'celestialBodySelected'
  | 'systemChanged' 
  | 'viewChanged'
  | 'settingsUpdated'
  | 'errorOccurred'

// Event data
interface EventData {
  celestialBodySelected: { body: CelestialBody }
  systemChanged: { from: string, to: string }
  viewChanged: { view: string }
  settingsUpdated: { settings: AppSettings }
  errorOccurred: { error: Error }
}

// Usage
eventBus.emit('celestialBodySelected', { body })
eventBus.on('systemChanged', ({ from, to }) => { /* handle */ })
```
