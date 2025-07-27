<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '../stores/gameStore';
  import '../styles/high-contrast.css';
  import '../styles/reduced-motion.css';

  // Track previous settings to avoid unnecessary DOM updates
  let previousHighContrast = false;
  let previousReducedMotion = false;

  // Apply accessibility settings to document
  function applyAccessibilitySettings() {
    if (typeof document === 'undefined') return;

    const { highContrastMode, reducedMotion } = $settings;
    
    // Apply high contrast mode
    if (highContrastMode !== previousHighContrast) {
      document.documentElement.setAttribute('data-high-contrast', highContrastMode.toString());
      previousHighContrast = highContrastMode;
    }
    
    // Apply reduced motion
    if (reducedMotion !== previousReducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', reducedMotion.toString());
      previousReducedMotion = reducedMotion;
    }

    // Update CSS custom properties for theme consistency
    updateCSSCustomProperties();
  }

  function updateCSSCustomProperties() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { highContrastMode } = $settings;

    if (highContrastMode) {
      // Set high contrast CSS custom properties
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#ffffff');
      root.style.setProperty('--bg-primary', '#000000');
      root.style.setProperty('--bg-secondary', '#1a1a1a');
      root.style.setProperty('--border-color', '#ffffff');
      root.style.setProperty('--focus-color', '#ffff00');
    } else {
      // Reset to default theme
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--bg-secondary');
      root.style.removeProperty('--border-color');
      root.style.removeProperty('--focus-color');
    }
  }

  // Apply system preferences on mount
  function applySystemPreferences() {
    if (typeof window === 'undefined') return;

    // Check for system-level reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches && !$settings.reducedMotion) {
      // User has system-level reduced motion enabled, but our setting is off
      // We could optionally update our setting or just apply the styles
      document.documentElement.setAttribute('data-system-reduced-motion', 'true');
    }

    // Check for system-level high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    
    if (prefersHighContrast.matches && !$settings.highContrastMode) {
      // User has system-level high contrast enabled
      document.documentElement.setAttribute('data-system-high-contrast', 'true');
    }

    // Listen for system preference changes
    prefersReducedMotion.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-system-reduced-motion', e.matches.toString());
    });

    prefersHighContrast.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-system-high-contrast', e.matches.toString());
    });
  }

  // Announce theme changes to screen readers
  function announceThemeChange(setting: string, enabled: boolean) {
    const { announceSceneChanges } = $settings;
    if (!announceSceneChanges) return;

    const message = `${setting} ${enabled ? 'enabled' : 'disabled'}`;
    
    // Create temporary announcement element
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Watch for settings changes
  $: {
    if ($settings.highContrastMode !== previousHighContrast) {
      announceThemeChange('High contrast mode', $settings.highContrastMode);
    }
    if ($settings.reducedMotion !== previousReducedMotion) {
      announceThemeChange('Reduced motion', $settings.reducedMotion);
    }
    applyAccessibilitySettings();
  }

  onMount(() => {
    applySystemPreferences();
    applyAccessibilitySettings();
  });
</script>

<!-- This component has no visual representation -->
<!-- It only manages accessibility settings application -->

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
