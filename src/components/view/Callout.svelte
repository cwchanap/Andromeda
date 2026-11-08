<script lang="ts">
  export let x: number = 0;
  export let y: number = 0;
  export let title: string = "";
  export let lines: string[] = [];
  export let offset: number = 32;
</script>

<div class="callout-leader" style="transform: translate({x}px, {y}px); width: {offset}px;" aria-hidden="true">
  <svg width={offset} height="2" viewBox={`0 0 ${offset} 2`}>
    <line x1="0" y1="1" x2={offset} y2="1" stroke="var(--color-accent)" stroke-width="1" />
  </svg>
</div>

<div
  class="callout-card"
  role="tooltip"
  style="transform: translate({x + offset}px, {y}px);"
>
  <div class="callout-title">{title}</div>
  {#each lines as line}
    <div class="callout-line">{line}</div>
  {/each}
</div>

<style>
  .callout-leader {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    transform-origin: 0 0;
  }
  .callout-card {
    --callout-vertical-shift: -28px; /* lifts card so leader line meets card mid-height */
    position: absolute;
    top: var(--callout-vertical-shift);
    left: 0;
    pointer-events: none;
    background: var(--color-surface);
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-control);
    padding: 6px 10px;
    min-width: 120px;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-text-soft);
    box-shadow: var(--shadow-panel);
  }
  .callout-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: 2px;
  }
  .callout-line { color: var(--color-text-soft); }
</style>
