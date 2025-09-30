# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**

- `npm run dev` or `npm start` - Start development server (port 4321)
- `npm run build` - Build for production (configured for Vercel deployment)
- `npm run preview` - Preview production build
- `npm run clean` - Clean build artifacts

**Code Quality:**

- `npm run type-check` or `npm run astro check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run ci:test` - Full CI pipeline (lint, type-check, test coverage, build)

**Testing:**

- `npm run test` - Run unit tests with Vitest in watch mode
- `npm run test:run` - Run unit tests once
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Run tests with coverage report (70% threshold)
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:ui` - Run e2e tests with UI
- `npm run test:e2e:smoke` - Run only smoke tests (@smoke tag)
- `npm run test:all` - Run both unit and e2e tests

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
- **Shadow System**: Explicitly disabled throughout for performance (`castShadow: false`)

**State Management Pattern:**

- Svelte stores with action creators (`gameActions`)
- Components subscribe with `$gameState` syntax
- No prop drilling - communication via stores

**Accessibility Integration:**

- Built-in high contrast mode, reduced motion, keyboard navigation
- Screen reader support with scene change announcements
- WCAG compliance with aria-live regions

### Critical Loading Sequence

The `SolarSystemWrapper.svelte` follows a specific initialization pattern:

1. DOM mounting with container waiting (`getElementById('solar-system-renderer')`)
2. Progress simulation before 3D initialization
3. Async renderer creation with error handling
4. Event binding for planet selection and camera changes

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
- Dev server automatically started on localhost:4321
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

Use Playwright MCP to interact with browser for testing. Check if dev server is already running at http://localhost:4321/ before starting it.
