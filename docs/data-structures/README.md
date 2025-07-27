# Data Structures and Types

This document describes the core data structures and TypeScript interfaces used throughout the Andromeda application.

## Core Data Types

### CelestialBody

Represents any celestial object in the solar system.

```typescript
interface CelestialBody {
  id: string
  name: string
  type: CelestialBodyType
  mass: number // kg
  radius: number // km
  position: Vector3D
  velocity: Vector3D
  texture?: string
  description?: string
  metadata?: CelestialBodyMetadata
}

type CelestialBodyType = 
  | 'star' 
  | 'planet' 
  | 'moon' 
  | 'asteroid' 
  | 'comet' 
  | 'dwarf-planet'

interface Vector3D {
  x: number
  y: number
  z: number
}

interface CelestialBodyMetadata {
  discoveryDate?: string
  discoveredBy?: string
  orbitalPeriod?: number // days
  rotationPeriod?: number // hours
  surfaceTemperature?: number // Kelvin
  atmosphere?: AtmosphereData
  moons?: string[] // IDs of moon objects
}

interface AtmosphereData {
  composition: { [gas: string]: number } // percentage
  pressure: number // atmospheres
  hasWeather: boolean
}
```

### SolarSystemData

Complete configuration for a solar system.

```typescript
interface SolarSystemData {
  id: string
  name: string
  description: string
  star: CelestialBody
  planets: CelestialBody[]
  moons: CelestialBody[]
  asteroids?: CelestialBody[]
  comets?: CelestialBody[]
  metadata: SolarSystemMetadata
}

interface SolarSystemMetadata {
  age: number // billion years
  diameter: number // light years
  totalMass: number // solar masses
  habitableZone: {
    inner: number // AU
    outer: number // AU
  }
  created: string // ISO date
  lastModified: string // ISO date
  version: string
}
```

## Universe and Extension Types

### StarSystemData

Extended solar system data for multi-system universe.

```typescript
interface StarSystemData extends SolarSystemData {
  position: GalacticCoordinates
  constellation?: string
  distance: number // light years from reference point
  spectralClass?: string
  status: SystemStatus
  discoveryData?: DiscoveryData
}

interface GalacticCoordinates {
  rightAscension: number // hours
  declination: number // degrees
  distance: number // parsecs
}

type SystemStatus = 'active' | 'inactive' | 'loading' | 'error'

interface DiscoveryData {
  discoveryMethod: string
  discoveryDate: string
  observatory?: string
  confirmedPlanets: number
  candidatePlanets: number
}
```

### UniverseData

Complete universe configuration with multiple star systems.

```typescript
interface UniverseData {
  id: string
  name: string
  description: string
  systems: StarSystemData[]
  activeSystemId?: string
  metadata: UniverseMetadata
}

interface UniverseMetadata {
  totalSystems: number
  totalPlanets: number
  totalExoplanets: number
  galaxies: string[]
  created: string
  lastModified: string
  version: string
}
```

### GamePlugin

Plugin interface for extending the application.

```typescript
interface GamePlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  
  // Plugin lifecycle
  initialize(context: PluginContext): Promise<void>
  dispose(): Promise<void>
  
  // Extension points
  provideSystems?(): StarSystemData[]
  provideComponents?(): ComponentDefinition[]
  provideServices?(): ServiceDefinition[]
  
  // Metadata
  metadata: PluginMetadata
}

interface PluginContext {
  universeManager: UniverseManager
  eventBus: EventBus
  services: ServiceRegistry
  logger: Logger
}

interface PluginMetadata {
  tags: string[]
  category: PluginCategory
  compatibleVersions: string[]
  dependencies: string[]
  permissions: PluginPermission[]
}

type PluginCategory = 
  | 'system-pack'
  | 'visual-enhancement'
  | 'educational-content'
  | 'interaction-tool'
  | 'utility'

type PluginPermission = 
  | 'read-systems'
  | 'write-systems'
  | 'modify-ui'
  | 'network-access'
  | 'local-storage'
```

## Game State Types

### GameState

Central application state structure.

```typescript
interface GameState {
  // Current state
  currentView: ViewType
  selectedBody: CelestialBody | null
  activeSystemId: string | null
  
  // UI state
  isLoading: boolean
  error: string | null
  settingsOpen: boolean
  
  // User preferences
  settings: AppSettings
  
  // Session data
  sessionStartTime: number
  visitedBodies: Set<string>
  achievements: Achievement[]
}

type ViewType = 
  | 'menu'
  | 'solar-system'
  | 'settings'
  | 'help'
  | 'about'

interface AppSettings {
  // Graphics
  quality: QualityLevel
  autoRotate: boolean
  showOrbits: boolean
  enableParticles: boolean
  
  // Accessibility
  highContrast: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
  keyboardNavigation: boolean
  
  // Audio
  enableSound: boolean
  soundVolume: number
  enableMusic: boolean
  musicVolume: number
  
  // AI Assistant
  enableAI: boolean
  aiPersonality: AIPersonality
  aiVerbosity: AIVerbosity
}

type QualityLevel = 'low' | 'medium' | 'high' | 'ultra'
type AIPersonality = 'professional' | 'friendly' | 'casual' | 'educational'
type AIVerbosity = 'brief' | 'normal' | 'detailed'
```

### Achievement

User achievement tracking.

```typescript
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

type AchievementCategory = 
  | 'exploration'
  | 'knowledge'
  | 'interaction'
  | 'time-based'
  | 'special'
```

## 3D Rendering Types

### Scene Configuration

```typescript
interface SceneConfig {
  // Camera
  camera: CameraConfig
  
  // Lighting
  lighting: LightingConfig
  
  // Rendering
  renderer: RendererConfig
  
  // Performance
  performance: PerformanceConfig
}

interface CameraConfig {
  type: 'perspective' | 'orthographic'
  fov: number
  near: number
  far: number
  position: Vector3D
  target: Vector3D
}

interface LightingConfig {
  ambient: {
    color: string
    intensity: number
  }
  directional: {
    color: string
    intensity: number
    position: Vector3D
    castShadow: boolean
  }
  point: PointLight[]
}

interface PointLight {
  color: string
  intensity: number
  position: Vector3D
  distance: number
  decay: number
}

interface RendererConfig {
  antialias: boolean
  shadowMap: boolean
  gammaCorrection: boolean
  toneMapping: string
  exposure: number
}

interface PerformanceConfig {
  maxObjects: number
  lodLevels: number
  cullingDistance: number
  updateFrequency: number
}
```

### Interaction Types

```typescript
interface InteractionEvent {
  type: InteractionType
  target: CelestialBody
  position: Vector3D
  timestamp: number
  metadata?: any
}

type InteractionType = 
  | 'click'
  | 'hover'
  | 'select'
  | 'focus'
  | 'drag'

interface RaycastResult {
  hit: boolean
  object?: THREE.Object3D
  point?: Vector3D
  distance?: number
  face?: THREE.Face3
}
```

## API Response Types

### System Validation

```typescript
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  field: string
  message: string
  code: ValidationErrorCode
  details?: any
}

interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

type ValidationErrorCode = 
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'DUPLICATE_ID'
  | 'INVALID_REFERENCE'
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  fps: number
  frameTime: number // ms
  drawCalls: number
  triangles: number
  memory: MemoryMetrics
  gpu: GPUMetrics
}

interface MemoryMetrics {
  used: number // MB
  total: number // MB
  geometries: number
  textures: number
  programs: number
}

interface GPUMetrics {
  vendor: string
  renderer: string
  version: string
  maxTextureSize: number
  maxRenderBufferSize: number
}
```

### AI Service Types

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  context?: ChatContext
}

interface ChatContext {
  currentSystem?: string
  selectedBody?: string
  userLocation?: string
  previousMessages: number
}

interface AIResponse {
  message: string
  confidence: number
  sources?: string[]
  suggestedActions?: SuggestedAction[]
}

interface SuggestedAction {
  type: ActionType
  label: string
  data: any
}

type ActionType = 
  | 'navigate-to-body'
  | 'open-info-panel'
  | 'change-view'
  | 'start-quiz'
  | 'show-comparison'
```

## Event System Types

```typescript
interface EventBus {
  on<T extends keyof EventMap>(
    event: T, 
    listener: (data: EventMap[T]) => void
  ): void
  
  off<T extends keyof EventMap>(
    event: T, 
    listener: (data: EventMap[T]) => void
  ): void
  
  emit<T extends keyof EventMap>(
    event: T, 
    data: EventMap[T]
  ): void
}

interface EventMap {
  'celestial-body-selected': { body: CelestialBody }
  'system-changed': { from: string, to: string }
  'view-changed': { view: ViewType }
  'settings-updated': { settings: AppSettings }
  'error-occurred': { error: Error }
  'performance-warning': { metrics: PerformanceMetrics }
  'achievement-unlocked': { achievement: Achievement }
  'plugin-loaded': { plugin: GamePlugin }
}
```

## Utility Types

### Generic Utility Types

```typescript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P]
}

// Make specific properties required
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Extract specific properties
type PickProperties<T, K extends keyof T> = Pick<T, K>

// Exclude specific properties
type OmitProperties<T, K extends keyof T> = Omit<T, K>

// Create update type for stores
type StoreUpdate<T> = Partial<T> | ((current: T) => Partial<T>)
```

### Configuration Types

```typescript
interface AppConfig {
  environment: 'development' | 'production' | 'test'
  apiEndpoint: string
  assetsPath: string
  enableDevtools: boolean
  logLevel: LogLevel
  features: FeatureFlags
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface FeatureFlags {
  enableAI: boolean
  enablePlugins: boolean
  enableMultipleSystems: boolean
  enablePerformanceMetrics: boolean
  enableExperimentalFeatures: boolean
}
```

This comprehensive type system ensures type safety throughout the application while providing flexibility for extensions and customization.
