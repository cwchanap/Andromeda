# Testing Guide

Comprehensive testing strategy and examples for the Andromeda 3D Solar System Explorer.

## Testing Architecture

The application uses a multi-layered testing approach:

- **Unit Tests**: Individual component and service testing with Vitest
- **Integration Tests**: Component interaction and data flow testing
- **End-to-End Tests**: Complete user journey testing with Playwright
- **Smoke Tests**: Critical path testing for fast CI feedback
- **Performance Tests**: 3D rendering and memory usage validation
- **Accessibility Tests**: WCAG compliance and screen reader compatibility

## Continuous Integration

### GitHub Actions Workflows

The project uses two main workflows:

#### 1. CI Pipeline (`ci.yml`)
Runs on every push and pull request to main:

- **Lint and Type Check**: ESLint and TypeScript validation
- **Unit Tests**: Full test suite with coverage reporting
- **E2E Tests**: Complete end-to-end test suite
- **Build**: Production build verification

#### 2. PR Quality Check (`pr-quality.yml`)
Additional quality gates for pull requests:

- **Code Formatting**: Prettier format validation
- **Coverage Threshold**: Ensures coverage standards
- **Smoke Tests**: Fast critical path validation

### Test Commands

```bash
# Development
npm run test              # Unit tests (watch mode)
npm run test:ui           # Vitest UI
npm run test:e2e:ui       # Playwright UI

# CI/Local validation
npm run test:run          # Unit tests (single run)
npm run test:coverage     # Unit tests with coverage
npm run test:e2e          # Full E2E suite
npm run test:e2e:smoke    # Smoke tests only
npm run ci:test           # Full CI pipeline locally
```

## Test Setup

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '$lib': './src',
      '$app': './src/app'
    }
  }
})
```

### Global Test Setup

```typescript
// src/test/setup.ts
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn()
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn()
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas')
  })),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  Sphere: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  TextureLoader: vi.fn(() => ({
    load: vi.fn((url, onLoad) => {
      onLoad({ image: { width: 256, height: 256 } })
    })
  }))
}))

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any
```

## Unit Testing

### Testing Data Models

```typescript
// src/data/__tests__/celestialBodies.test.ts
import { describe, it, expect } from 'vitest'
import { celestialBodies } from '../celestialBodies'
import type { CelestialBody } from '../../types/game'

describe('celestialBodies', () => {
  it('should contain valid celestial body data', () => {
    expect(celestialBodies).toBeDefined()
    expect(Array.isArray(celestialBodies)).toBe(true)
    expect(celestialBodies.length).toBeGreaterThan(0)
  })
  
  it('should have required properties for each body', () => {
    celestialBodies.forEach(body => {
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('name')
      expect(body).toHaveProperty('type')
      expect(body).toHaveProperty('mass')
      expect(body).toHaveProperty('radius')
      expect(body).toHaveProperty('position')
      
      expect(typeof body.id).toBe('string')
      expect(typeof body.name).toBe('string')
      expect(typeof body.mass).toBe('number')
      expect(typeof body.radius).toBe('number')
      expect(body.mass).toBeGreaterThan(0)
      expect(body.radius).toBeGreaterThan(0)
    })
  })
  
  it('should have unique IDs for all bodies', () => {
    const ids = celestialBodies.map(body => body.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
  
  it('should have the sun as the first body', () => {
    expect(celestialBodies[0].name).toBe('Sun')
    expect(celestialBodies[0].type).toBe('star')
  })
})
```

### Testing Utility Functions

```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { 
  formatDistance, 
  formatMass, 
  calculateOrbitalVelocity,
  validateCelestialBody 
} from '../utils'

describe('formatDistance', () => {
  it('should format distances correctly', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
    expect(formatDistance(1500000)).toBe('1.50 million km')
    expect(formatDistance(150000000)).toBe('150.00 million km')
  })
  
  it('should handle zero and negative values', () => {
    expect(formatDistance(0)).toBe('0.00 km')
    expect(formatDistance(-1000)).toBe('0.00 km')
  })
})

describe('formatMass', () => {
  it('should format mass in appropriate units', () => {
    expect(formatMass(5.972e24)).toBe('5.97 × 10²⁴ kg')
    expect(formatMass(1.989e30)).toBe('1.99 × 10³⁰ kg')
  })
})

describe('calculateOrbitalVelocity', () => {
  it('should calculate orbital velocity correctly', () => {
    const mass = 1.989e30 // Sun mass in kg
    const distance = 149597870700 // 1 AU in meters
    
    const velocity = calculateOrbitalVelocity(mass, distance)
    
    // Earth's orbital velocity should be approximately 29.78 km/s
    expect(velocity).toBeCloseTo(29780, -2)
  })
})

describe('validateCelestialBody', () => {
  it('should validate correct celestial body data', () => {
    const validBody = {
      id: 'earth',
      name: 'Earth',
      type: 'planet' as const,
      mass: 5.972e24,
      radius: 6371,
      position: { x: 149597870.7, y: 0, z: 0 },
      velocity: { x: 0, y: 29.78, z: 0 }
    }
    
    const result = validateCelestialBody(validBody)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('should reject invalid celestial body data', () => {
    const invalidBody = {
      id: '',
      name: 'Test',
      type: 'invalid' as any,
      mass: -1000,
      radius: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0, z: 0 }
    }
    
    const result = validateCelestialBody(invalidBody)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

### Testing Svelte Components

```typescript
// src/components/__tests__/Button.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import Button from '../ui/Button.svelte'

describe('Button', () => {
  it('should render with default props', () => {
    const { getByRole } = render(Button, {
      props: { children: 'Click me' }
    })
    
    const button = getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })
  
  it('should apply variant classes correctly', () => {
    const { getByRole } = render(Button, {
      props: {
        variant: 'primary',
        children: 'Primary Button'
      }
    })
    
    const button = getByRole('button')
    expect(button).toHaveClass('btn-primary')
  })
  
  it('should handle click events', async () => {
    const handleClick = vi.fn()
    
    const { getByRole, component } = render(Button, {
      props: { children: 'Click me' }
    })
    
    component.$on('click', handleClick)
    
    const button = getByRole('button')
    await fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(Button, {
      props: {
        disabled: true,
        children: 'Disabled Button'
      }
    })
    
    const button = getByRole('button')
    expect(button).toBeDisabled()
  })
})
```

### Testing Stores

```typescript
// src/stores/__tests__/gameStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { gameStore } from '../gameStore'
import type { CelestialBody } from '../../types/game'

describe('gameStore', () => {
  beforeEach(() => {
    gameStore.reset()
  })
  
  it('should have initial state', () => {
    const state = get(gameStore)
    
    expect(state.selectedBody).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.currentView).toBe('menu')
    expect(state.error).toBeNull()
  })
  
  it('should select a celestial body', () => {
    const body: CelestialBody = {
      id: 'earth',
      name: 'Earth',
      type: 'planet',
      mass: 5.972e24,
      radius: 6371,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 }
    }
    
    gameStore.selectBody(body)
    
    const state = get(gameStore)
    expect(state.selectedBody).toEqual(body)
  })
  
  it('should update loading state', () => {
    gameStore.setLoading(true)
    expect(get(gameStore).isLoading).toBe(true)
    
    gameStore.setLoading(false)
    expect(get(gameStore).isLoading).toBe(false)
  })
  
  it('should change views', () => {
    gameStore.setView('solar-system')
    expect(get(gameStore).currentView).toBe('solar-system')
    
    gameStore.setView('settings')
    expect(get(gameStore).currentView).toBe('settings')
  })
  
  it('should handle errors', () => {
    const errorMessage = 'Test error'
    
    gameStore.setError(errorMessage)
    expect(get(gameStore).error).toBe(errorMessage)
    
    gameStore.setError(null)
    expect(get(gameStore).error).toBeNull()
  })
})
```

## Integration Testing

### Testing Component Integration

```typescript
// src/components/__tests__/SolarSystemWrapper.integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/svelte'
import SolarSystemWrapper from '../SolarSystemWrapper.svelte'
import { celestialBodies } from '../../data/celestialBodies'

// Mock Three.js renderer
const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
  dispose: vi.fn(),
  setCameraTarget: vi.fn(),
  onObjectClick: vi.fn(),
  onHover: vi.fn()
}

vi.mock('../../lib/solar-system/SolarSystemRenderer', () => ({
  SolarSystemRenderer: vi.fn(() => mockRenderer)
}))

describe('SolarSystemWrapper Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should initialize 3D scene on mount', async () => {
    const solarSystemData = {
      id: 'test-system',
      name: 'Test System',
      description: 'Test system',
      star: celestialBodies[0],
      planets: celestialBodies.slice(1, 4),
      moons: [],
      metadata: {
        age: 4.6,
        diameter: 0.001,
        totalMass: 1.0,
        habitableZone: { inner: 0.95, outer: 1.37 },
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    }
    
    render(SolarSystemWrapper, {
      props: { data: solarSystemData }
    })
    
    await waitFor(() => {
      expect(mockRenderer.initialize).toHaveBeenCalledTimes(1)
    })
  })
  
  it('should handle body selection events', async () => {
    const handleBodySelected = vi.fn()
    
    const { component } = render(SolarSystemWrapper, {
      props: {
        data: {
          id: 'test-system',
          name: 'Test System',
          description: 'Test system',
          star: celestialBodies[0],
          planets: celestialBodies.slice(1, 4),
          moons: [],
          metadata: {
            age: 4.6,
            diameter: 0.001,
            totalMass: 1.0,
            habitableZone: { inner: 0.95, outer: 1.37 },
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: '1.0.0'
          }
        }
      }
    })
    
    component.$on('bodySelected', handleBodySelected)
    
    await waitFor(() => {
      expect(mockRenderer.onObjectClick).toHaveBeenCalled()
    })
    
    // Simulate object click
    const clickCallback = mockRenderer.onObjectClick.mock.calls[0][0]
    clickCallback({ userData: { celestialBody: celestialBodies[1] } })
    
    expect(handleBodySelected).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { body: celestialBodies[1] }
      })
    )
  })
})
```

### Testing Store Integration

```typescript
// src/stores/__tests__/integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { gameStore } from '../gameStore'
import { universeStore } from '../universeStore'
import { UniverseManager } from '../../lib/universe/UniverseManager'

describe('Store Integration', () => {
  let universeManager: UniverseManager
  
  beforeEach(() => {
    universeManager = new UniverseManager()
    gameStore.reset()
    universeStore.reset()
  })
  
  it('should sync game state with universe changes', async () => {
    const testSystem = {
      id: 'test-system',
      name: 'Test System',
      description: 'A test star system',
      star: {
        id: 'test-star',
        name: 'Test Star',
        type: 'star' as const,
        mass: 1.989e30,
        radius: 696340,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
      },
      planets: [],
      moons: [],
      position: { rightAscension: 0, declination: 0, distance: 0 },
      distance: 10,
      status: 'active' as const,
      metadata: {
        age: 4.6,
        diameter: 0.001,
        totalMass: 1.0,
        habitableZone: { inner: 0.95, outer: 1.37 },
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    }
    
    // Add system to universe
    universeManager.addSystem(testSystem)
    await universeManager.setActiveSystem('test-system')
    
    // Verify store synchronization
    const universeState = get(universeStore)
    expect(universeState.activeSystemId).toBe('test-system')
    expect(universeState.systems).toContainEqual(testSystem)
  })
})
```

## End-to-End Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI
  }
})
```

### User Journey Tests

```typescript
// e2e/solar-system-exploration.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Solar System Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })
  
  test('should navigate from menu to solar system view', async ({ page }) => {
    // Wait for main menu to load
    await expect(page.getByRole('button', { name: 'Explore Solar System' })).toBeVisible()
    
    // Click explore button
    await page.getByRole('button', { name: 'Explore Solar System' }).click()
    
    // Wait for 3D scene to initialize
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
    
    // Verify we're in solar system view
    await expect(page.getByRole('button', { name: 'Back to Menu' })).toBeVisible()
  })
  
  test('should interact with celestial bodies', async ({ page }) => {
    // Navigate to solar system
    await page.getByRole('button', { name: 'Explore Solar System' }).click()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
    
    // Wait for scene to fully load
    await page.waitForTimeout(2000)
    
    // Click on canvas (simulating planet selection)
    const canvas = page.locator('canvas')
    await canvas.click({ position: { x: 400, y: 300 } })
    
    // Check if information panel appears
    await expect(page.getByTestId('celestial-body-info')).toBeVisible({ timeout: 5000 })
  })
  
  test('should handle keyboard navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Solar System' }).click()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
    
    // Test keyboard controls
    await page.keyboard.press('ArrowUp') // Move camera up
    await page.keyboard.press('ArrowDown') // Move camera down
    await page.keyboard.press('ArrowLeft') // Rotate left
    await page.keyboard.press('ArrowRight') // Rotate right
    await page.keyboard.press('Space') // Pause/play
    
    // Verify no errors occurred
    const errors = await page.evaluate(() => {
      return window.console.error.calls?.length || 0
    })
    expect(errors).toBe(0)
  })
})
```

### Accessibility Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('should meet WCAG guidelines on main page', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/')
    
    // Test ARIA labels
    await expect(page.getByRole('main')).toHaveAttribute('aria-label', 'Main content')
    await expect(page.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation')
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // Verify first heading is h1
    await expect(page.locator('h1').first()).toBeVisible()
  })
  
  test('should support keyboard-only navigation', async ({ page }) => {
    await page.goto('/')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Explore Solar System' })).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Settings' })).toBeFocused()
    
    // Test escape key functionality
    await page.keyboard.press('Escape')
    // Verify any modal or overlay closes
  })
  
  test('should provide alternative text for images', async ({ page }) => {
    await page.goto('/')
    
    const images = await page.locator('img').all()
    
    for (const image of images) {
      const altText = await image.getAttribute('alt')
      expect(altText).toBeTruthy()
      expect(altText!.length).toBeGreaterThan(0)
    }
  })
})
```

### Performance Testing

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Performance', () => {
  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 seconds max
  })
  
  test('should maintain smooth frame rate in 3D view', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Explore Solar System' }).click()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
    
    // Measure frame rate
    const frameRates = await page.evaluate(() => {
      return new Promise((resolve) => {
        const rates: number[] = []
        let lastTime = performance.now()
        let frameCount = 0
        
        function measureFPS() {
          const currentTime = performance.now()
          frameCount++
          
          if (currentTime - lastTime >= 1000) {
            rates.push(frameCount)
            frameCount = 0
            lastTime = currentTime
            
            if (rates.length >= 5) {
              resolve(rates)
            } else {
              requestAnimationFrame(measureFPS)
            }
          } else {
            requestAnimationFrame(measureFPS)
          }
        }
        
        requestAnimationFrame(measureFPS)
      })
    })
    
    const averageFPS = (frameRates as number[]).reduce((a, b) => a + b) / (frameRates as number[]).length
    expect(averageFPS).toBeGreaterThan(30) // Minimum 30 FPS
  })
  
  test('should not cause memory leaks', async ({ page }) => {
    await page.goto('/')
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Navigate to solar system and back multiple times
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Explore Solar System' }).click()
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
      await page.getByRole('button', { name: 'Back to Menu' }).click()
      await expect(page.getByRole('button', { name: 'Explore Solar System' })).toBeVisible()
    }
    
    // Force garbage collection and check memory
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Memory should not have grown significantly
    const memoryGrowth = finalMemory - initialMemory
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024) // Less than 50MB growth
  })
})
```

## Running Tests

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e",
    "test:ci": "npm run test:coverage && npm run test:e2e"
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Best Practices

### Writing Effective Tests

1. **Follow the AAA pattern**: Arrange, Act, Assert
2. **Use descriptive test names**: Clearly state what is being tested
3. **Test behavior, not implementation**: Focus on what the code does, not how
4. **Keep tests independent**: Each test should be able to run in isolation
5. **Use appropriate matchers**: Choose the most specific assertion available

### Performance Testing Guidelines

1. **Set realistic performance budgets**: Based on user expectations
2. **Test on various devices**: Include low-end devices in testing
3. **Monitor memory usage**: Check for leaks and excessive allocation
4. **Test network conditions**: Simulate slow connections
5. **Measure real user metrics**: Focus on metrics that matter to users

### Accessibility Testing Checklist

- [ ] Keyboard navigation works throughout the application
- [ ] Screen readers can access all content
- [ ] Color contrast meets WCAG guidelines
- [ ] All images have meaningful alt text
- [ ] Form inputs have proper labels
- [ ] ARIA attributes are used correctly
- [ ] Focus indicators are visible
- [ ] Content is logically structured

This comprehensive testing approach ensures the Andromeda application is reliable, performant, and accessible to all users.
