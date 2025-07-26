# Copilot Instructions for Andromeda Solar System Explorer

## Project Architecture

**Andromeda** is an educational 3D solar system explorer built with Astro, Svelte, Three.js, and TypeScript. The architecture separates concerns into distinct layers:

- **Pages**: Astro static routes (`src/pages/`) with SSR for fast initial loads
- **Components**: Svelte 5 components with reactive state management (`src/components/`)
- **3D Engine**: Framework-agnostic Three.js renderer system (`src/lib/solar-system/`)
- **State**: Svelte stores for global game state (`src/stores/gameStore.ts`)
- **Data**: Static celestial body definitions (`src/data/celestialBodies.ts`)

## Core Patterns

### 1. Astro + Svelte Integration
```astro
<!-- Pages use client:only directive for full Svelte components -->
<SolarSystemWrapper client:only="svelte" />
```
Pages are minimal Astro containers that hydrate Svelte components with `client:only="svelte"`. The main application logic runs entirely client-side.

### 2. Framework-Agnostic 3D Architecture
The `SolarSystemRenderer` class is intentionally framework-agnostic, taking DOM containers and event callbacks:
```typescript
const renderer = new SolarSystemRenderer(container, config, events);
await renderer.initialize(celestialBodies);
```
Events flow through callbacks (`onPlanetSelect`, `onCameraChange`) from Three.js back to Svelte stores.

### 3. Svelte Store Pattern
State flows through reactive Svelte stores with action creators:
```typescript
export const gameActions = {
  selectCelestialBody: (body: CelestialBodyData) => {
    gameState.update(state => ({ ...state, selectedBody: body }));
  }
};
```
Components subscribe with `$gameState` syntax and dispatch actions via `gameActions`.

### 4. Manager-Based 3D System
Three.js complexity is isolated into specialized managers:
- `SceneManager`: Lighting, particles, background
- `CelestialBodyManager`: Planet meshes, materials, effects
- `CameraController`: OrbitControls, smooth transitions
- `InteractionManager`: Raycasting, click/hover detection

## Key Integration Points

### Critical Loading Sequence
The `SolarSystemWrapper.svelte` follows a specific initialization pattern:
1. DOM mounting with container waiting (`getElementById('solar-system-renderer')`)
2. Progress simulation before 3D initialization 
3. Async renderer creation with error handling
4. Event binding for planet selection and camera changes

### Component Communication
- Svelte components communicate via stores, not props drilling
- 3D renderer receives callbacks for events: `onPlanetSelect`, `onCameraChange`
- Store updates automatically trigger reactive UI updates (`$gameState`, `$settings`)

### Data Flow
1. Static data in `celestialBodies.ts` defines planets with Three.js `Vector3` positions
2. `SolarSystemRenderer.initialize()` creates 3D meshes from data
3. User interactions update stores via `gameActions`
4. Store changes trigger reactive UI and 3D scene updates

### Shadow System (Critical)
All shadow rendering is explicitly disabled throughout the system:
- Renderer: `this.renderer.shadowMap.enabled = false`
- Lights: `light.castShadow = false` on all lights  
- Meshes: `mesh.castShadow = false` and `mesh.receiveShadow = false` on all objects
- Groups: Shadow properties disabled on THREE.Group containers

This is a project-wide architectural decision to avoid shadow artifacts and performance issues.

## Development Workflows

### Essential Commands
```bash
npm run dev          # Start dev server (usually port 4321/4322)
npm run build        # Production build
npm run type-check   # TypeScript validation 
npm run lint         # ESLint check
npm run format       # Prettier formatting
npm run clean        # Remove dist and .astro directories
```

### Adding New Celestial Bodies
1. Add data to `solarSystemData` in `celestialBodies.ts`
2. Include required properties: `id`, `name`, `type`, `position`, `scale`, `material`
3. Set `orbitRadius` and `orbitSpeed` for orbital animation
4. The system automatically creates meshes, materials, and interactions

### Debugging 3D Issues
- Check browser console for Three.js errors
- Use `debugInfo` state in `SolarSystemWrapper.svelte` for loading status
- Verify container element exists before renderer initialization (`attempts < 10` retry loop)
- Shadow artifacts indicate missing `castShadow: false` properties

### Component Development
- Svelte components in `src/components/` use TypeScript (`<script lang="ts">`)
- UI components in `src/components/ui/` follow shadcn/ui patterns with Radix UI primitives
- Always use reactive statements (`$:`) for store subscriptions
- Handle loading states explicitly in 3D-dependent components
- Use `client:only="svelte"` for components requiring client-side rendering

## Project-Specific Conventions

### File Organization
- 3D logic stays in `src/lib/solar-system/` (framework-agnostic)
- Svelte components handle UI concerns only
- Types defined in `src/types/` are shared across layers
- Utilities in `src/utils/` for data processing and formatting
- UI components in `src/components/ui/` use Radix UI + Tailwind patterns

### Naming Patterns
- CelestialBodyData interfaces use scientific naming
- Three.js managers use class-based architecture
- Svelte components use PascalCase, stores use camelCase
- IDs use lowercase with hyphens: "saturn", "jupiter"

### Performance Considerations
- `SolarSystemRenderer` includes performance modes: "low" | "medium" | "high"
- Geometry detail varies by celestial body importance (Sun=64 segments, others vary)
- Particle systems are configurable via `particleCount` in config
- Mobile optimization available via `enableMobileOptimization` flag

### Dependencies & Stack
- **Astro 5**: Static site generation with component hydration
- **Svelte 5**: Reactive UI components with new stores API
- **Three.js**: 3D rendering engine (version 0.178+)
- **Tailwind 4**: Utility-first CSS with Vite plugin
- **TypeScript**: Strict mode enabled throughout
- **Radix UI**: Accessible UI primitives for React components

This codebase emphasizes separation of concerns between Astro SSR, Svelte reactivity, and Three.js 3D rendering while maintaining TypeScript safety throughout.
