# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**
- `npm run dev` or `npm start` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run clean` - Clean build artifacts

**Code Quality:**
- `npm run type-check` or `npm run astro check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

**Testing:**
- No test scripts are currently configured in package.json

## Project Architecture

This is an **Astro-based 3D space exploration game** with Svelte components, using Three.js for 3D rendering and TailwindCSS for styling.

### Core Architecture Layers

**Frontend Framework:** Astro with Svelte integration for interactive components
**3D Rendering:** Three.js through a custom `SolarSystemRenderer` class
**State Management:** Svelte stores (`gameStore.ts`) for reactive state
**Styling:** TailwindCSS with custom accessibility themes

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
- `/src/components/` - Svelte UI components  
- `/src/stores/` - Svelte reactive stores
- `/src/types/` - TypeScript type definitions
- `/src/pages/` - Astro page components

**Key Type Systems:**
- `CelestialBodyData` - Defines planets, stars, moons with material properties
- `GameState` - Central game state interface with UI and camera state
- `StarSystemData` - Multi-system universe structure
- Plugin interfaces for extensibility

### Development Patterns

**Component Architecture:**
- Astro pages (.astro) for routing and SSG
- Svelte components (.svelte) for interactive UI
- TypeScript throughout with strict type checking

**3D Rendering Approach:**
- Modular manager classes for different 3D concerns
- Performance monitoring and LOD (Level of Detail) systems
- Framework-agnostic renderer design for potential framework migration

**Accessibility Integration:**
- Built-in high contrast mode, reduced motion, keyboard navigation
- Screen reader support with scene change announcements
- Separate CSS files for accessibility themes

### Import Path Configuration

Uses `@/*` path mapping to `./src/*` for cleaner imports.

### Key Dependencies

**Core:** Astro, Svelte, Three.js, TailwindCSS
**UI:** Radix UI components, Lucide icons
**Development:** ESLint, Prettier, TypeScript, Husky for git hooks