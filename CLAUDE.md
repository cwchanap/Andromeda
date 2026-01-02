# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**

- `bun run dev` - Start development server (port 3600)
- `bun run build` - Build for production (Vercel deployment)
- `bun run preview` - Preview production build
- `bun run clean` - Remove dist/ and .astro/

**Code Quality:**

- `bun run type-check` - TypeScript + Astro template validation
- `bun run lint` - ESLint (Astro/Svelte/a11y plugins)
- `bun run format` - Prettier + Tailwind class sorting
- `bun run ci:test` - Full CI pipeline (lint, type-check, coverage, build)

**Testing:**

- `bun run test` - Unit tests in watch mode
- `bun run test:run` - Unit tests once
- `bun run test:coverage` - Coverage report (70% threshold)
- `bun run test:e2e` - Playwright E2E tests (Chromium)
- `bun run test:e2e:smoke` - Smoke tests only (@smoke tag)
- `bun run test:all` - Unit + E2E tests

**Running Specific Tests:**

- `bunx vitest src/stores/gameStore.test.ts` - Run single test file
- `bunx vitest -t "test name"` - Run tests matching name pattern
- `bunx playwright test e2e/main-user-journeys.spec.ts` - Run single E2E file
- `bunx playwright test --grep="@smoke"` - Run tagged E2E tests

## Project Architecture

This is an **Astro-based 3D space exploration game** with Svelte components, using Three.js for 3D rendering and TailwindCSS for styling.

### Core Architecture Layers

**Frontend Framework:** Astro 5 with Svelte 5 integration for interactive components
**3D Rendering:** Three.js through a custom `SolarSystemRenderer` class
**State Management:** Svelte stores (`gameStore.ts`) for reactive state
**Styling:** TailwindCSS 4 with custom accessibility themes
**Deployment:** Vercel adapter with server-side rendering

### Key Architectural Components

**Universe System Architecture:**

- `UniverseManager` - Manages multiple star systems with plugin extensibility
- `SolarSystemRenderer` - Framework-agnostic 3D renderer with performance optimization
- Plugin system via `PluginManager` for extending game functionality
- Validation system for star system data integrity

**Rendering Pipeline:**

- `SolarSystemRenderer` (main renderer) coordinates:
  - `SceneManager` - lighting, environment, particles
  - `CelestialBodyManager` - celestial body creation/management
  - `CameraController` - camera movement and controls
  - `InteractionManager` - mouse/touch interactions
  - `PerformanceMonitor` - FPS monitoring and optimization

**State Management:**

- `gameStore.ts` - Central Svelte store with actions for state updates
- Supports multi-system navigation with transition states
- Accessibility settings (high contrast, reduced motion, keyboard nav)

### Code Organization

**File Structure Patterns:**

- `/src/lib/` - Core game systems and utilities
  - `/src/lib/planetary-system/` - Solar system specific logic
  - `/src/lib/planetary-system/graphics/` - Framework-agnostic 3D rendering
  - `/src/lib/galaxy/` - Galaxy-level rendering and management
  - `/src/lib/constellation/` - Constellation rendering
  - `/src/lib/universe/` - Multi-system universe management
  - `/src/lib/performance/` - Performance optimization utilities
- `/src/components/` - Svelte UI components
- `/src/components/ui/` - Reusable UI components (Radix UI patterns)
- `/src/stores/` - Svelte reactive stores
- `/src/types/` - TypeScript type definitions
- `/src/pages/` - Astro page components
- `/src/data/` - Static celestial body data
- `/src/utils/` - Utility functions
- `/src/i18n/` - Internationalization (en, zh, ja)

**Key Type Systems:**

- `CelestialBodyData` - Defines planets, stars, moons with material properties
- `GameState` - Central game state interface with UI and camera state
- `StarSystemData` - Multi-system universe structure
- Plugin interfaces for extensibility

### Development Patterns

**Component Architecture:**

- Astro pages (.astro) for routing with SSR/SSG capability
- Svelte components (.svelte) for interactive UI with `client:only="svelte"`
- TypeScript throughout with strict type checking
- Vercel adapter configured for server-side rendering and deployment

**Framework Integration:**

- Astro pages use `client:only="svelte"` for hydrating Svelte components
- Framework-agnostic 3D renderer accepts DOM containers and event callbacks
- Event flow: Three.js → callbacks → Svelte stores → reactive UI updates

**3D Rendering Approach:**

- Modular manager classes for different 3D concerns
- Performance monitoring and LOD (Level of Detail) systems
- Framework-agnostic renderer design for potential framework migration

**CRITICAL - Shadow System (NEVER ENABLE):**

All shadow rendering is permanently disabled project-wide for performance on mobile and to avoid artifacts with space backgrounds:
```typescript
renderer.shadowMap.enabled = false;
light.castShadow = false;
mesh.castShadow = false;
mesh.receiveShadow = false;
```

**State Management Pattern:**

- Svelte stores with action creators (`gameActions`)
- Components subscribe with `$gameState` syntax
- No prop drilling - communication via stores

**Accessibility Integration:**

- Built-in high contrast mode, reduced motion, keyboard navigation
- Screen reader support with scene change announcements
- WCAG compliance with aria-live regions

### Critical Loading Sequence

The `SolarSystemWrapper.svelte` follows a specific 6-step initialization pattern:

1. **DOM Mounting**: Polls for `#solar-system-renderer` container (max 10 attempts)
2. **WebGL Check**: Validates support via `webglStore` before renderer creation
3. **Progress Simulation**: Shows loading animation while awaiting resources
4. **Renderer Creation**: Async instantiation with error boundaries
5. **Event Binding**: Connects `onPlanetSelect`, `onCameraChange` to stores
6. **Cleanup**: Disposes Three.js resources on component destroy

**Why this order matters**: Skipping container check causes race conditions, missing WebGL check crashes on unsupported devices.

### Import Path Configuration

Uses `@/*` path mapping to `./src/*` for cleaner imports.

### Key Dependencies

**Core:** Astro 5, Svelte 5, Three.js 0.178+, TailwindCSS 4
**UI:** Radix UI components, Lucide icons
**Testing:** Vitest (unit), Playwright (e2e), Testing Library
**Development:** ESLint, Prettier, TypeScript, Husky for git hooks
**Deployment:** Vercel adapter with SSR support

### Testing Configuration

**Unit Testing (Vitest):**

- Uses jsdom environment with Svelte plugin
- Coverage thresholds: 70% across all metrics
- Mocks Three.js for testing
- Setup file: `src/test/setup.ts`

**E2E Testing (Playwright):**

- Tests across Chrome, Firefox, Safari, Mobile Chrome/Safari
- Dev server automatically started on localhost:3600
- Smoke tests tagged with `@smoke`
- Reports in HTML format, JUnit XML for CI

### Internationalization

Supports English (en), Chinese (zh), and Japanese (ja) with fallback routing.

### Performance Considerations

- Adaptive quality settings: "low" | "medium" | "high"
- Mobile optimization flags available
- Particle systems configurable via `particleCount`
- Asset streaming and memory management
- Performance monitoring with FPS tracking

### Browser Testing

Use Playwright MCP to interact with browser for testing. Check if dev server is already running at http://localhost:3600/ before starting it.

## Common Gotchas

1. **Svelte 5 stores**: Use `$` prefix only in `.svelte` files, use `get()` in `.ts` files
2. **Three.js memory**: Always call `.dispose()` on geometries/materials/textures
3. **Astro hydration**: Use `client:only="svelte"` for stores, not `client:load`
4. **Tailwind 4**: No `@tailwind` directives needed with Vite plugin
5. **Test isolation**: Three.js is mocked via `deps.inline: ["three"]` in vitest.config.ts
6. **E2E timing**: Wait for `#solar-system-renderer` before interacting with 3D scene
7. **Type safety**: `CelestialBodyData` requires `keyFacts` for info modal
