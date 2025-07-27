# Component Documentation

This guide covers all UI components in the Andromeda application, including their props, events, and usage examples.

## Core Components

### SolarSystemWrapper.svelte

The main 3D scene wrapper component that initializes and manages the Three.js solar system renderer.

```svelte
<script>
  import SolarSystemWrapper from '$lib/components/SolarSystemWrapper.svelte'
  import { gameStore } from '$lib/stores/gameStore'
  
  let solarSystemData = {
    // Your solar system data
  }
</script>

<SolarSystemWrapper 
  data={solarSystemData}
  quality="high"
  autoRotate={true}
  enableInteraction={true}
  on:bodySelected={handleBodySelection}
  on:sceneReady={handleSceneReady}
  on:error={handleError}
/>
```

**Props:**
- `data: SolarSystemData` - The solar system configuration
- `quality?: 'low' | 'medium' | 'high'` - Rendering quality level (default: 'medium')
- `autoRotate?: boolean` - Enable automatic scene rotation (default: false)
- `enableInteraction?: boolean` - Allow user interaction (default: true)

**Events:**
- `bodySelected: { body: CelestialBody }` - Fired when a celestial body is clicked
- `sceneReady: { renderer: SolarSystemRenderer }` - Fired when the 3D scene is ready
- `error: { error: Error }` - Fired when an error occurs

### SystemSelector.svelte

UI component for selecting and switching between different star systems.

```svelte
<script>
  import SystemSelector from '$lib/components/SystemSelector.svelte'
  import { universeStore } from '$lib/stores/universeStore'
</script>

<SystemSelector
  systems={$universeStore.systems}
  activeSystemId={$universeStore.activeSystemId}
  showTransitions={true}
  on:systemSelected={handleSystemChange}
/>
```

**Props:**
- `systems: StarSystemData[]` - Available star systems
- `activeSystemId?: string` - Currently active system ID
- `showTransitions?: boolean` - Enable transition animations (default: true)

**Events:**
- `systemSelected: { systemId: string }` - Fired when a system is selected

### MainMenu.svelte

The main navigation menu with system selection and settings access.

```svelte
<script>
  import MainMenu from '$lib/components/MainMenu.svelte'
</script>

<MainMenu
  currentView={$gameStore.currentView}
  on:viewChanged={handleViewChange}
  on:systemSelected={handleSystemSelection}
/>
```

**Props:**
- `currentView: string` - Current application view
- `showSystemSelector?: boolean` - Show system selection (default: true)

**Events:**
- `viewChanged: { view: string }` - Fired when view changes
- `systemSelected: { systemId: string }` - Fired when system is selected

### SettingsModal.svelte

Modal dialog for application settings and preferences.

```svelte
<script>
  import SettingsModal from '$lib/components/SettingsModal.svelte'
  
  let isOpen = false
  let settings = {
    quality: 'medium',
    autoRotate: false,
    enableSound: true,
    // ... other settings
  }
</script>

<SettingsModal
  {isOpen}
  {settings}
  on:close={() => isOpen = false}
  on:settingsChanged={handleSettingsUpdate}
/>
```

**Props:**
- `isOpen: boolean` - Whether the modal is open
- `settings: AppSettings` - Current application settings

**Events:**
- `close: {}` - Fired when modal is closed
- `settingsChanged: { settings: AppSettings }` - Fired when settings are updated

### ParticleSystem.svelte

Animated background particle system for visual enhancement.

```svelte
<script>
  import ParticleSystem from '$lib/components/ParticleSystem.svelte'
</script>

<ParticleSystem
  particleCount={1000}
  speed={0.5}
  color="#ffffff"
  opacity={0.7}
/>
```

**Props:**
- `particleCount?: number` - Number of particles (default: 500)
- `speed?: number` - Animation speed multiplier (default: 1.0)
- `color?: string` - Particle color (default: '#ffffff')
- `opacity?: number` - Particle opacity (default: 0.5)

### LoadingAnimation.svelte

Loading indicator with space-themed animation.

```svelte
<script>
  import LoadingAnimation from '$lib/components/LoadingAnimation.svelte'
</script>

<LoadingAnimation
  message="Loading solar system..."
  progress={loadingProgress}
  showProgress={true}
/>
```

**Props:**
- `message?: string` - Loading message text
- `progress?: number` - Loading progress (0-100)
- `showProgress?: boolean` - Show progress bar (default: false)

## Accessibility Components

### AccessibilityManager.svelte

Manages accessibility features and ARIA announcements.

```svelte
<script>
  import AccessibilityManager from '$lib/components/AccessibilityManager.svelte'
</script>

<AccessibilityManager
  enableScreenReader={true}
  enableKeyboardNav={true}
  highContrast={false}
/>
```

**Props:**
- `enableScreenReader?: boolean` - Enable screen reader support (default: true)
- `enableKeyboardNav?: boolean` - Enable keyboard navigation (default: true)
- `highContrast?: boolean` - Enable high contrast mode (default: false)

### KeyboardNavigation.svelte

Handles keyboard navigation throughout the application.

```svelte
<script>
  import KeyboardNavigation from '$lib/components/KeyboardNavigation.svelte'
</script>

<KeyboardNavigation
  on:keyCommand={handleKeyCommand}
  on:focusChanged={handleFocusChange}
/>
```

**Events:**
- `keyCommand: { command: string, key: string }` - Fired when keyboard command is triggered
- `focusChanged: { element: HTMLElement }` - Fired when focus changes

## UI Library Components

### Button.svelte

Customizable button component with multiple variants.

```svelte
<script>
  import { Button } from '$lib/components/ui'
</script>

<Button
  variant="primary"
  size="medium"
  disabled={false}
  on:click={handleClick}
>
  Click me
</Button>
```

**Props:**
- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost'` - Button style variant
- `size?: 'small' | 'medium' | 'large'` - Button size
- `disabled?: boolean` - Whether button is disabled

### Card.svelte

Container component with consistent styling.

```svelte
<script>
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui'
</script>

<Card>
  <CardHeader>
    <CardTitle>Solar System</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Explore the wonders of our solar system...</p>
  </CardContent>
</Card>
```

### Dialog.svelte

Modal dialog component with backdrop and focus management.

```svelte
<script>
  import { Dialog } from '$lib/components/ui'
  
  let isOpen = false
</script>

<Dialog
  bind:open={isOpen}
  title="Confirm Action"
  on:close={handleClose}
>
  <p>Are you sure you want to proceed?</p>
  <div slot="actions">
    <Button on:click={() => isOpen = false}>Cancel</Button>
    <Button variant="primary" on:click={handleConfirm}>Confirm</Button>
  </div>
</Dialog>
```

### Progress.svelte

Progress bar component for loading states.

```svelte
<script>
  import { Progress } from '$lib/components/ui'
</script>

<Progress
  value={75}
  max={100}
  label="Loading assets..."
  showLabel={true}
/>
```

**Props:**
- `value: number` - Current progress value
- `max?: number` - Maximum value (default: 100)
- `label?: string` - Progress label text
- `showLabel?: boolean` - Show label text (default: false)

## Error Handling Components

### ErrorBoundary.svelte

Catches and displays JavaScript errors gracefully.

```svelte
<script>
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'
</script>

<ErrorBoundary
  fallback={CustomErrorComponent}
  on:error={handleError}
>
  <!-- Your components here -->
</ErrorBoundary>
```

**Props:**
- `fallback?: Component` - Custom error display component

**Events:**
- `error: { error: Error, errorInfo: ErrorInfo }` - Fired when error is caught

### ErrorNotification.svelte

Toast-style error notifications.

```svelte
<script>
  import ErrorNotification from '$lib/components/ErrorNotification.svelte'
</script>

<ErrorNotification
  message="Failed to load solar system data"
  type="error"
  duration={5000}
  dismissible={true}
/>
```

**Props:**
- `message: string` - Error message text
- `type?: 'error' | 'warning' | 'info'` - Notification type
- `duration?: number` - Auto-dismiss duration in milliseconds
- `dismissible?: boolean` - Allow manual dismissal

### WebGLFallback.svelte

Fallback UI when WebGL is not supported.

```svelte
<script>
  import WebGLFallback from '$lib/components/WebGLFallback.svelte'
</script>

<WebGLFallback
  message="WebGL is required for 3D visualization"
  showHelp={true}
  on:retryRequested={handleRetry}
/>
```

**Props:**
- `message?: string` - Fallback message
- `showHelp?: boolean` - Show help information (default: true)

**Events:**
- `retryRequested: {}` - Fired when user requests retry

## Component Best Practices

### State Management

```svelte
<script>
  import { gameStore } from '$lib/stores/gameStore'
  import { onMount, onDestroy } from 'svelte'
  
  // Subscribe to stores
  $: selectedBody = $gameStore.selectedBody
  
  // Local component state
  let isInitialized = false
  
  onMount(() => {
    // Initialize component
    isInitialized = true
  })
  
  onDestroy(() => {
    // Cleanup
    isInitialized = false
  })
</script>
```

### Event Handling

```svelte
<script>
  import { createEventDispatcher } from 'svelte'
  
  const dispatch = createEventDispatcher()
  
  function handleUserAction(data) {
    // Dispatch custom event
    dispatch('userAction', {
      type: 'click',
      data
    })
  }
</script>
```

### Accessibility

```svelte
<!-- Always include ARIA labels and roles -->
<button
  role="button"
  aria-label="Select solar system"
  tabindex="0"
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  {buttonText}
</button>

<!-- Use semantic HTML -->
<main role="main">
  <section aria-labelledby="system-title">
    <h2 id="system-title">Solar System</h2>
    <!-- Content -->
  </section>
</main>
```

### Responsive Design

```svelte
<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    .container {
      grid-template-columns: 1fr 2fr;
    }
  }
  
  @media (min-width: 1024px) {
    .container {
      grid-template-columns: 1fr 3fr 1fr;
    }
  }
</style>
```
