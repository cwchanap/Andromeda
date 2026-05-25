<script lang="ts">
  export let x: number = 0;
  export let y: number = 0;
  export let title: string = "";
  export let lines: string[] = [];
  export let offset: number = 32;
</script>

<div class="callout-leader" style="transform: translate({x}px, {y}px); width: {offset}px;" aria-hidden="true">
  <svg width={offset} height="2" viewBox={`0 0 ${offset} 2`}>
    <line x1="0" y1="1" x2={offset} y2="1" stroke="var(--hud-cyan)" stroke-width="1" />
  </svg>
</div>

<div
  class="callout-card"
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
    position: absolute;
    top: -28px;
    left: 0;
    pointer-events: none;
    background: rgba(2, 4, 10, 0.85);
    border: 1px solid var(--hud-cyan);
    padding: 6px 10px;
    min-width: 120px;
    font-family: var(--hud-font-mono);
    font-size: 11px;
    color: var(--hud-ivory);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
    backdrop-filter: blur(6px);
  }
  .callout-title {
    color: var(--hud-cyan);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .callout-line { opacity: 0.85; }
</style>
