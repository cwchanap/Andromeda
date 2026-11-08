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

  // Helper function to update speed in store and notify callback
  const updateSpeed = (value: number) => {
    isUserInteracting = true;
    settings.update(s => ({ ...s, orbitSpeedMultiplier: value }));
    onSpeedChange(value);

    // Reset interaction flag after a short delay
    setTimeout(() => {
      isUserInteracting = false;
    }, 100);
  };

  const handleSpeedChange = () => {
    // First, get the actual clamped value from the DOM element
    if (sliderElement) {
      const clampedValue = parseFloat(sliderElement.value);
      if (clampedValue !== localSpeed) {
        localSpeed = clampedValue;
      }
    }

    updateSpeed(localSpeed);
  };

  const resetSpeed = () => {
    localSpeed = 1.0;
    updateSpeed(1.0);
  };
</script>

<div class="ui-panel orbit-speed-control">
  <div class="control-header">
    <h3 class="ui-caption">{t ? t('controls.orbitSpeed') : 'Orbit Speed'}</h3>
    <button
      on:click={resetSpeed}
      class="ui-btn ui-btn--sm reset-button"
      title={t ? t('controls.resetTitle') : 'Reset to normal speed'}
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
  
  <div class="speed-display" data-testid="speed-display">
    {localSpeed === 0 ? (t ? t('controls.paused') : 'Paused') : `${localSpeed.toFixed(1)}x`}
  </div>
</div>

<style>
  .orbit-speed-control {
    min-width: 200px;
    padding: 14px 16px;
    user-select: none;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .control-header h3 {
    margin: 0;
  }

  .speed-slider-container {
    margin-bottom: 8px;
  }

  .speed-slider {
    width: 100%;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .speed-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .speed-display {
    padding-top: 6px;
    border-top: 1px solid var(--color-line);
    text-align: center;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    color: var(--color-accent);
  }

  @media (max-width: 768px) {
    .orbit-speed-control {
      min-width: 160px;
      padding: 12px;
    }
    .speed-display {
      font-size: 18px;
    }
  }
</style>
