<script lang="ts">
  import Progress from "./ui/Progress.svelte";

  /** Percent complete; `null` shows an indeterminate loader (no bar). */
  export let progress: number | null = 0;
  export let message: string = "Loading solar system...";
  export let className: string = "";
</script>

<div class="loading-animation {className}" role="status" aria-live="polite">
  <div class="loading-card">
    <svg class="orrery" viewBox="0 0 96 96" aria-hidden="true">
      <circle class="orbit" cx="48" cy="48" r="44" />
      <circle class="orbit" cx="48" cy="48" r="30" />
      <circle class="orbit" cx="48" cy="48" r="16" />
      <circle class="sun" cx="48" cy="48" r="5" />
      <g class="arm arm-outer"><circle cx="48" cy="4" r="3" /></g>
      <g class="arm arm-mid"><circle cx="48" cy="18" r="2.5" /></g>
      <g class="arm arm-inner"><circle cx="48" cy="32" r="2" /></g>
    </svg>

    <h2 class="loading-message">{message}</h2>

    {#if progress !== null}
      <div class="loading-progress">
        <Progress value={progress} />
        <span class="loading-percent">{Math.round(progress)}%</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .loading-animation {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: radial-gradient(ellipse at center, var(--color-surface), var(--color-bg-deep) 70%);
  }

  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: min(360px, 100%);
    text-align: center;
  }

  .orrery {
    width: 112px;
    height: 112px;
  }
  .orbit {
    fill: none;
    stroke: var(--color-line-strong);
  }
  .sun {
    fill: var(--color-accent);
  }
  .arm {
    fill: var(--color-text);
    transform-origin: 48px 48px;
    animation: orbit linear infinite;
  }
  .arm-outer {
    animation-duration: 14s;
  }
  .arm-mid {
    animation-duration: 9s;
    animation-direction: reverse;
  }
  .arm-inner {
    animation-duration: 5s;
  }
  @keyframes orbit {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-message {
    margin: 0;
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--color-text);
  }

  .loading-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .loading-percent {
    min-width: 3ch;
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: right;
  }

  @media (prefers-reduced-motion: reduce) {
    .arm {
      animation: none;
    }
  }
</style>
