<script lang="ts">
  import { settings } from '../stores/gameStore';
  import { getLangFromUrl, useTranslations } from '../i18n/utils';
  import { onMount } from 'svelte';
  
  export let onSpeedChange: (speed: number) => void = () => {};
  export let lang: 'en' | 'zh' | 'ja' = 'en';
  export let translations: Record<string, string> = {};
  
  // Translation function
  let t: (key: string) => string;
  let currentLang: 'en' | 'zh' | 'ja' = lang;
  
  // Initialize translations
  $: {
    currentLang = lang;
    if (Object.keys(translations).length > 0) {
      t = (key: string) => translations[key] || key;
    } else {
      t = useTranslations(currentLang);
    }
  }
  
  onMount(() => {
    if (typeof window !== 'undefined' && !lang) {
      currentLang = getLangFromUrl(new URL(window.location.href));
      t = useTranslations(currentLang);
    }
  });
  
  // Local reactive variable for smooth updates
  let localSpeed = $settings.orbitSpeedMultiplier;
  let isUserInteracting = false;
  let sliderElement: HTMLInputElement;
  
  // Update local speed when store changes (but only if user isn't actively using the slider)
  $: if ($settings.orbitSpeedMultiplier !== localSpeed && !isUserInteracting) {
    localSpeed = $settings.orbitSpeedMultiplier;
  }

  const handleSpeedChange = () => {
    // First, get the actual clamped value from the DOM element
    if (sliderElement) {
      const clampedValue = parseFloat(sliderElement.value);
      if (clampedValue !== localSpeed) {
        localSpeed = clampedValue;
      }
    }

    isUserInteracting = true;
    settings.update(s => ({ ...s, orbitSpeedMultiplier: localSpeed }));
    onSpeedChange(localSpeed);

    // Reset interaction flag after a short delay
    setTimeout(() => {
      isUserInteracting = false;
    }, 100);
  };

  const resetSpeed = () => {
    localSpeed = 1.0;
    isUserInteracting = true;
    // Update the store and call callback with the reset value
    settings.update(s => ({ ...s, orbitSpeedMultiplier: 1.0 }));
    onSpeedChange(1.0);

    // Reset interaction flag after a short delay
    setTimeout(() => {
      isUserInteracting = false;
    }, 100);
  };
</script>

<div class="orbit-speed-control">
  <div class="control-header">
    <h3>{t ? t('controls.orbitSpeed') : 'Orbit Speed'}</h3>
    <button 
      on:click={resetSpeed}
      class="reset-button"
      title={t ? t('controls.reset') : 'Reset to normal speed'}
    >
      {t ? t('controls.reset') : 'Reset'}
    </button>
  </div>
  
  <div class="speed-slider-container">
    <input
      type="range"
      min="0"
      max="100"
      step="0.1"
      bind:value={localSpeed}
      bind:this={sliderElement}
      on:input={handleSpeedChange}
      class="speed-slider"
      aria-label={t ? t('controls.orbitSpeed') : 'Orbit speed multiplier'}
    />
    <div class="speed-labels">
      <span class="label-start">{t ? t('controls.paused') : 'Paused'}</span>
      <span class="label-center">{t ? t('controls.normal') : 'Normal'}</span>
      <span class="label-end">{t ? t('controls.speed100x') : '100x'}</span>
    </div>
  </div>
  
  <div class="speed-display">
    {localSpeed === 0 ? (t ? t('controls.paused') : 'Paused') : `${Number(localSpeed).toFixed(1)}x`}
  </div>
</div>

<style>
  .orbit-speed-control {
    /* CSS custom properties for maintainable positioning */
    --controls-panel-height: 180px; /* Height to clear back button + zoom controls */
    --horizontal-offset: 20px;

    position: absolute;
    top: var(--controls-panel-height, 180px);
    right: var(--horizontal-offset, 20px);
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 16px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    min-width: 200px;
    z-index: 1000;
    user-select: none;
  }
  
  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .control-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .reset-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .reset-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .speed-slider-container {
    margin-bottom: 8px;
  }
  
  .speed-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.3);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }
  
  .speed-slider::-webkit-slider-thumb {
    appearance: -webkit-appearance;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a9eff;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .speed-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a9eff;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .speed-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 4px;
  }
  
  .speed-display {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: #4a9eff;
    padding: 4px;
    background: rgba(74, 158, 255, 0.1);
    border-radius: 6px;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .orbit-speed-control {
      --controls-panel-height: 160px; /* Adjusted for mobile layout */
      --horizontal-offset: 10px;

      top: var(--controls-panel-height, 160px);
      right: var(--horizontal-offset, 10px);
      min-width: 160px;
      padding: 12px;
    }
    
    .control-header h3 {
      font-size: 0.8rem;
    }
    
    .reset-button {
      font-size: 0.7rem;
      padding: 3px 6px;
    }
    
    .speed-display {
      font-size: 0.8rem;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .orbit-speed-control {
      background: black;
      border: 2px solid white;
    }
    
    .speed-slider::-webkit-slider-thumb {
      background: white;
      border: 2px solid black;
    }
    
    .speed-slider::-moz-range-thumb {
      background: white;
      border: 2px solid black;
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .reset-button {
      transition: none;
    }
  }
</style>
