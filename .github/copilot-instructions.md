# Copilot Instructions for Andromeda Space Explorer

## Project Architecture

**Andromeda** is an educational 3D space exploration platform built with **Astro 5 (SSR)**, **Svelte 5**, **Three.js**, and **TypeScript**. The architecture is multi-layered with framework-agnostic 3D rendering:

### Core Layers

- **Pages**: Astro SSR routes (`src/pages/`) - deployed to Vercel with server adapter
- **Components**: Svelte 5 components (`src/components/`) with reactive stores
- **3D Systems**: Framework-agnostic Three.js renderers in `src/lib/*/graphics/`
  - `planetary-system/` - Solar system renderer with managers (Scene, Camera, Celestial bodies, Interactions, Performance)
  - `galaxy/` - Galaxy-level rendering and star system management
  - `constellation/` - Constellation visualization
  - `universe/` - Multi-system universe management with plugin system
- **State Management**: Svelte stores (`src/stores/`) - `gameStore.ts`, `webglStore.ts`, `responsiveStore.ts`
- **Data**: Celestial body definitions in `src/lib/planetary-system/SolarSystem.ts` and `src/data/constellations.ts`

## Critical Patterns

### 1. Astro SSR + Svelte Client Hydration

```astro
<!-- Pages use client:only for full client-side Svelte components -->
<SolarSystemWrapper client:only="svelte" />
```

**Why**: Astro provides SSR shell, Svelte handles all interactive 3D UI. Uses Vercel adapter with `output: "server"` in `astro.config.mjs`.

### 2. Framework-Agnostic 3D Architecture

All renderers (SolarSystemRenderer, GalaxyRenderer, etc.) are framework-agnostic classes:

```typescript
// Accepts DOM container + callbacks, returns nothing to framework layer
const renderer = new SolarSystemRenderer(container, config, events);
await renderer.initialize(systemData);
```

**Why**: Enables potential framework migration, testability, and separation of concerns.

**Event Flow**: Three.js → callback → Svelte store update → reactive UI

### 3. Manager-Based Rendering

Each renderer delegates to specialized managers:

- **SceneManager**: Lighting, particles, background stars
- **CelestialBodyManager**: Mesh creation, materials, orbital animations
- **CameraController**: OrbitControls, smooth transitions, zoom
- **InteractionManager**: Raycasting, hover/click detection
- **PerformanceManager**: FPS monitoring, adaptive quality
- **AssetLoader**: Texture/model streaming, memory management

**Why**: Single responsibility, easier testing, memory cleanup

### 4. Svelte Store Pattern with Actions

```typescript
// Store with action creators (no direct mutations)
export const gameActions = {
  selectCelestialBody: (body: CelestialBodyData) => {
    gameState.update((state) => ({ ...state, selectedBody: body }));
  },
};

// Components subscribe reactively
$: selectedBody = $gameState.selectedBody;
```

**Why**: Predictable state updates, no prop drilling, easy debugging

### 5. Universe Plugin System

`UniverseManager` supports extensibility via plugins:

```typescript
export default class MyStarSystemPlugin implements GamePlugin {
  id = "custom-system";
  async initialize(context: PluginContext) {}
  provideSystems(): StarSystemData[] {
    return [mySystem];
  }
}
```

Plugins can add star systems, validators, and custom rendering logic.

## Critical Integration Points

### The SolarSystemWrapper Loading Dance

`src/components/SolarSystemWrapper.svelte` follows a **specific 6-step sequence**:

1. **DOM Mounting**: Polls for `#solar-system-renderer` container (max 10 attempts)
2. **WebGL Check**: Validates support via `webglStore` before renderer creation
3. **Progress Simulation**: Shows loading animation while awaiting resources
4. **Renderer Creation**: Async instantiation with error boundaries
5. **Event Binding**: Connects `onPlanetSelect`, `onCameraChange` to stores
6. **Cleanup**: Disposes Three.js resources on component destroy

**Why this order matters**: Skipping container check causes race conditions, missing WebGL check crashes on unsupported devices.

### Shadow System (NEVER ENABLE)

**All shadow rendering is permanently disabled project-wide**:

```typescript
renderer.shadowMap.enabled = false; // In all renderers
light.castShadow = false; // On all lights
mesh.castShadow = false; // On all meshes
mesh.receiveShadow = false; // On all meshes
```

**Why**: Performance on mobile + shadow artifacts with space backgrounds. Do not re-enable without extensive testing.

### Data Flow Architecture

1. **Static Data** → `src/lib/planetary-system/SolarSystem.ts` defines `solarSystemData: PlanetarySystemData`
2. **Renderer Init** → `SolarSystemRenderer.initialize(solarSystemData)` creates Three.js scene
3. **User Input** → `InteractionManager` detects clicks/hovers → fires callbacks
4. **Store Updates** → Callbacks invoke `gameActions` → update stores
5. **Reactive UI** → Svelte `$:` statements react to store changes → re-render

**Key Files**: `gameStore.ts` (central state), `SolarSystemWrapper.svelte` (integration layer)

## Development Workflows

### Essential Commands

```bash
bun run dev           # Dev server on :3600 (Astro + Vite HMR)
bun run build         # Production build (Vercel optimized)
bun run preview       # Test production build locally

bun run type-check    # TypeScript + Astro template validation
bun run lint          # ESLint (Astro/Svelte/a11y plugins)
bun run format        # Prettier + Tailwind class sorting

bun run test          # Vitest watch mode
bun run test:run      # Vitest single run
bun run test:coverage # Coverage report (70% threshold)
bun run test:ui       # Vitest UI interface

bun run test:e2e      # Playwright all browsers
bun run test:e2e:ui   # Playwright with UI
bun run test:e2e:smoke # Only @smoke tagged tests

bun run test:all      # Unit + E2E (CI simulation)
bun run ci:test       # Full CI: lint + type + coverage + build

bun run clean         # Remove dist/ and .astro/
```

**Pre-commit Hook**: Husky runs `lint-staged` → ESLint + Prettier on staged files

### Testing Strategy

**Unit Tests** (`*.test.ts`, `*.spec.ts` adjacent to source):

- Vitest with jsdom environment, Svelte plugin enabled
- Three.js mocked via `deps.inline: ["three"]` in `vitest.config.ts`
- Setup file: `src/test/setup.ts` with DOM mocks
- Coverage: 70% threshold (branches/functions/lines/statements)
- Example: `src/stores/__tests__/webglStore.test.ts` tests WebGL detection with error scenarios

**E2E Tests** (`e2e/*.spec.ts`):

- Playwright across Chrome/Firefox/Safari/Mobile Chrome/Mobile Safari
- Tag smoke tests with `@smoke` for fast feedback (see `e2e/main-user-journeys.spec.ts`)
- Dev server auto-starts on `:3600` via `webServer` config
- Uses `page.waitForSelector('#solar-system-renderer')` for 3D scene readiness
- Reports: HTML + JUnit XML (CI) or just HTML (local)

**When adding features**:

1. Write unit test for logic (managers, stores, utils)
2. Add E2E test for user journeys (navigation, interactions)
3. Run `bun run ci:test` before pushing

### Adding New Celestial Bodies

1. Edit `src/lib/planetary-system/SolarSystem.ts` → add to `planets` array:

```typescript
{
  id: "new-planet",
  name: "New Planet",
  type: "planet",
  position: new THREE.Vector3(x, y, z),
  scale: 2.0,
  orbitRadius: 100,
  orbitSpeed: 0.5,
  material: { /* texture/color */ },
  keyFacts: { /* educational data */ }
}
```

2. `CelestialBodyManager` automatically creates mesh, orbit path, interactions
3. Add corresponding data to `keyFacts` for info modal

### Debugging 3D Issues

- **Renderer not appearing**: Check `SolarSystemWrapper.svelte` → `debugInfo` state, container mount success
- **Black screen**: WebGL context lost → check `webglStore` error state
- **Performance drops**: Use `PerformanceManager` → check FPS, consider lowering `graphicsQuality` in settings
- **Click detection broken**: `InteractionManager` raycaster → verify mesh has `userData.celestialBodyData`
- **Memory leaks**: Ensure `dispose()` called on renderers in `onDestroy` lifecycle

### Browser Testing with MCP

**IMPORTANT**: Use Playwright MCP for browser interactions. **DO NOT** run `bun run dev` blindly:

1. First check if server already running: `curl http://localhost:3600/`
2. If running, use existing server
3. If not, start with `bun run dev` in background session

## Project-Specific Conventions

### File Organization

```
src/
├── components/          # Svelte UI components
│   ├── ui/             # Radix UI primitives (Button, Dialog, Progress)
│   └── *.svelte        # Feature components (modals, controls, wrappers)
├── lib/                # Framework-agnostic logic
│   ├── planetary-system/  # Solar system specific
│   │   ├── graphics/      # Three.js managers + renderer
│   │   └── SolarSystem.ts # Data definitions
│   ├── galaxy/         # Galaxy rendering
│   ├── constellation/  # Constellation rendering
│   ├── universe/       # Multi-system + plugins
│   └── performance/    # Performance utilities
├── stores/             # Svelte reactive stores
├── types/              # TypeScript interfaces
├── data/               # Static data (constellations)
├── utils/              # Pure functions
├── pages/              # Astro SSR routes
└── test/               # Shared test utilities
```

### Naming Conventions

- **Files**: Components `PascalCase.svelte`, modules `camelCase.ts`, tests `*.test.ts`
- **Classes**: `PascalCase` (SolarSystemRenderer, UniverseManager)
- **Stores**: `camelCase` (gameStore, webglStore)
- **Actions**: `camelCase` (gameActions.selectCelestialBody)
- **IDs**: `lowercase-with-hyphens` ("solar-system", "jupiter", "andromeda-galaxy")
- **Constants**: `SCREAMING_SNAKE_CASE` for configs

### TypeScript Patterns

- **Strict mode enabled** - no implicit any
- **Import aliases**: `@/*` maps to `./src/*` (configured in tsconfig.json)
- **Type imports**: Use `import type { }` for type-only imports
- **Shared types**: `src/types/game.ts` (celestial bodies), `src/types/universe.ts` (systems/plugins)

### Accessibility Integration

Built into `gameStore.ts` settings:

- `highContrastMode`: Toggle high contrast UI
- `reducedMotion`: Disables orbit animations
- `enableKeyboardNavigation`: Arrow key planet selection
- `announceSceneChanges`: ARIA live regions for screen readers
- `screenReaderMode`: Simplified 3D interactions

See `src/components/KeyboardNavigation.svelte` and `AccessibilityManager.svelte` for implementations.

### Performance Modes

`graphicsQuality` setting affects:

- **Low**: 16-segment spheres, 50 particles, no anti-aliasing
- **Medium** (default): 32-segment spheres, 200 particles, FXAA
- **High**: 64-segment spheres, 1000 particles, MSAA 4x
- **Mobile optimization**: Automatic LOD, reduced texture sizes, orbit simplification

### i18n Support

Astro config enables English (default), Chinese, Japanese:

```typescript
i18n: {
  defaultLocale: "en",
  locales: ["en", "zh", "ja"],
  routing: { prefixDefaultLocale: false }
}
```

Translation files in `src/i18n/`. Use `/zh/solar-system` or `/ja/solar-system` routes.

## Tech Stack Details

- **Astro 5.12+**: SSR with Vercel adapter (`output: "server"`)
- **Svelte 5.36+**: Runes API, new reactive system
- **Three.js 0.178+**: WebGL 2.0 required
- **Tailwind 4**: Vite plugin, no PostCSS
- **TypeScript 5.8+**: Strict mode
- **Vitest 3**: jsdom + Svelte plugin
- **Playwright 1.54+**: Cross-browser E2E
- **Radix UI**: Accessible React components (used in React islands)
- **Lucide**: Icon library

## Common Gotchas

1. **Svelte 5 stores**: Use `$` prefix only in `.svelte` files, `get()` in `.ts`
2. **Three.js memory**: Always call `.dispose()` on geometries/materials/textures
3. **Astro hydration**: Use `client:only="svelte"` for stores, not `client:load`
4. **Tailwind 4**: No `@tailwind` directives needed with Vite plugin
5. **Test isolation**: Mock Three.js to avoid WebGL in Node.js tests
6. **E2E timing**: Wait for `#solar-system-renderer` before interacting with 3D
7. **Type safety**: `CelestialBodyData` requires `keyFacts` for info modal
