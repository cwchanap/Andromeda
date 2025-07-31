<script lang="ts">
  import { settings } from '../stores/gameStore';
  
  export let onSpeedChange: (speed: number) => void = () => {};
  
  // Local reactive variable for smooth updates
  let localSpeed = $settings.orbitSpeedMultiplier;
  
  // Update local speed when store changes
  $: localSpeed = $settings.orbitSpeedMultiplier;
  
  const handleSpeedChange = () => {
    settings.update(s => ({ ...s, orbitSpeedMultiplier: localSpeed }));
    onSpeedChange(localSpeed);
  };
  
  const resetSpeed = () => {
    localSpeed = 1.0;
    handleSpeedChange();
  };
</script>

<div class="orbit-speed-control">
  <div class="control-header">
    <h3>Orbit Speed</h3>
    <button 
      on:click={resetSpeed}
      class="reset-button"
      title="Reset to normal speed"
    >
      Reset
    </button>
  </div>
  
  <div class="speed-slider-container">
    <input
      type="range"
      min="0"
      max="5"
      step="0.1"
      bind:value={localSpeed}
      on:input={handleSpeedChange}
      class="speed-slider"
      aria-label="Orbit speed multiplier"
    />
    <div class="speed-labels">
      <span class="label-start">Paused</span>
      <span class="label-center">Normal</span>
      <span class="label-end">5x</span>
    </div>
  </div>
  
  <div class="speed-display">
    {localSpeed === 0 ? 'Paused' : `${localSpeed.toFixed(1)}x`}
  </div>
</div>

<style>
  .orbit-speed-control {
    position: absolute;
    top: 20px;
    right: 20px;
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
      top: 10px;
      right: 10px;
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
