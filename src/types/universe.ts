// Extensible type definitions for multi-system universe architecture
import type { CelestialBodyData, Vector3Like } from "./game";

/**
 * Generic star system interface that can represent any planetary system
 */
export interface StarSystemData {
    id: string;
    name: string;
    description: string;
    star: CelestialBodyData;
    celestialBodies: CelestialBodyData[]; // planets, moons, asteroids, etc.
    systemScale: number;
    systemCenter: Vector3Like;
    systemType: "solar" | "binary" | "multiple" | "exotic";
    metadata?: {
        discoveredBy?: string;
        discoveryDate?: string;
        distance?: string; // distance from Earth/reference point
        constellation?: string;
        spectralClass?: string;
        habitableZone?: {
            inner: number;
            outer: number;
        };
    };
}

/**
 * Universe data containing multiple star systems
 */
export interface UniverseData {
    systems: Map<string, StarSystemData>;
    currentSystemId: string;
    metadata: {
        name: string;
        description: string;
        version: string;
        lastUpdated: Date;
    };
}

/**
 * System selector interface for navigating between star systems
 */
export interface SystemSelector {
    availableSystems: Array<{
        id: string;
        name: string;
        description: string;
        thumbnail?: string;
        isLocked?: boolean;
        unlockConditions?: string[];
    }>;
    currentSystemId: string;
    onSystemChange: (systemId: string) => Promise<void>;
    onSystemPreview?: (systemId: string) => void;
}

/**
 * Plugin interface for extending functionality
 */
export interface GamePlugin {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;

    // Lifecycle methods
    initialize: (context: PluginContext) => Promise<void> | void;
    activate?: () => Promise<void> | void;
    deactivate?: () => Promise<void> | void;
    cleanup: () => Promise<void> | void;

    // Extension points
    components?: Record<string, unknown>; // Svelte components
    systems?: StarSystemData[]; // Additional star systems
    features?: PluginFeature[];

    // Dependencies and compatibility
    dependencies?: string[];
    compatibleVersions?: string[];
    requiredFeatures?: string[];
}

/**
 * Plugin context providing access to core functionality
 */
export interface PluginContext {
    universe: UniverseData;
    gameState: unknown; // Will be properly typed later
    renderer: unknown; // Three.js renderer context
    eventBus: PluginEventBus;
    logger: PluginLogger;
    storage: PluginStorage;
}

/**
 * Plugin feature definition
 */
export interface PluginFeature {
    id: string;
    name: string;
    type:
        | "ui-component"
        | "3d-effect"
        | "data-source"
        | "interaction"
        | "educational-content";
    configuration?: Record<string, unknown>;
    requiredPermissions?: string[];
}

/**
 * Event bus for plugin communication
 */
export interface PluginEventBus {
    emit: (event: string, data?: unknown) => void;
    on: (event: string, handler: (data: unknown) => void) => void;
    off: (event: string, handler: (data: unknown) => void) => void;
    once: (event: string, handler: (data: unknown) => void) => void;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: Error) => void;
}

/**
 * Plugin storage interface for persistent data
 */
export interface PluginStorage {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    keys: () => Promise<string[]>;
}

/**
 * System configuration for different celestial system types
 */
export interface SystemConfiguration {
    renderingConfig: {
        ambientLightIntensity: number;
        pointLightIntensity: number;
        shadowsEnabled: boolean;
        particleSystemConfig?: {
            count: number;
            spread: number;
            colors: string[];
        };
    };
    cameraConfig: {
        defaultPosition: Vector3Like;
        defaultTarget: Vector3Like;
        minDistance: number;
        maxDistance: number;
        enableAutoRotate?: boolean;
    };
    interactionConfig: {
        enableOrbitControls: boolean;
        enableCelestialBodySelection: boolean;
        enableZoom: boolean;
        customInteractions?: string[];
    };
    educationalConfig?: {
        informationDepth: "basic" | "intermediate" | "advanced";
        includeComparisons: boolean;
        customFactCategories?: string[];
    };
}

/**
 * Data validation interfaces
 */
export interface SystemValidator {
    validateStarSystem: (system: StarSystemData) => ValidationResult;
    validateUniverse: (universe: UniverseData) => ValidationResult;
    validatePlugin: (plugin: GamePlugin) => ValidationResult;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    severity: "error";
}

export interface ValidationWarning {
    field: string;
    message: string;
    severity: "warning";
    suggestion?: string;
}

/**
 * Extension point definitions for different aspects of the system
 */
export interface ExtensionPoints {
    // Data extensions
    "celestial-body-types": (existingTypes: string[]) => string[];
    "system-types": (existingTypes: string[]) => string[];

    // UI extensions
    "info-modal-tabs": (tabs: UITab[]) => UITab[];
    "settings-panels": (panels: SettingsPanel[]) => SettingsPanel[];
    "navigation-items": (items: NavigationItem[]) => NavigationItem[];

    // 3D extensions
    "renderer-effects": (effects: RendererEffect[]) => RendererEffect[];
    "material-types": (materials: MaterialType[]) => MaterialType[];
    "animation-types": (animations: AnimationType[]) => AnimationType[];

    // Educational content extensions
    "fact-categories": (categories: string[]) => string[];
    "educational-modules": (
        modules: EducationalModule[],
    ) => EducationalModule[];
    "assessment-types": (types: AssessmentType[]) => AssessmentType[];
}

// Supporting interfaces for extension points
export interface UITab {
    id: string;
    title: string;
    component: unknown; // Will be Svelte component
    order: number;
}

export interface SettingsPanel {
    id: string;
    title: string;
    component: unknown; // Will be Svelte component
    category: string;
    order: number;
}

export interface NavigationItem {
    id: string;
    label: string;
    icon?: string;
    action: () => void;
    order: number;
}

export interface RendererEffect {
    id: string;
    name: string;
    type: "post-processing" | "lighting" | "particle" | "shader";
    implementation: unknown; // Will be Three.js effect
}

export interface MaterialType {
    id: string;
    name: string;
    createMaterial: (options: Record<string, unknown>) => unknown; // Three.js Material
}

export interface AnimationType {
    id: string;
    name: string;
    createAnimation: (
        target: unknown,
        options: Record<string, unknown>,
    ) => unknown;
}

export interface EducationalModule {
    id: string;
    title: string;
    content: unknown; // Educational content structure
    interactivity: boolean;
}

export interface AssessmentType {
    id: string;
    name: string;
    createAssessment: (config: Record<string, unknown>) => unknown;
}
