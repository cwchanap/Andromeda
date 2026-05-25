<script lang="ts">
  export let x: number = 0;
  export let y: number = 0;
  export let state: "hover" | "locked" = "hover";
  export let label: string | null = null;
</script>

<div
  class="hud-reticle"
  data-state={state}
  style="transform: translate(-50%, -50%) translate({x}px, {y}px);"
  role="img"
  aria-label={label ?? undefined}
>
  <svg class="reticle-svg" viewBox="-40 -40 80 80" width="80" height="80" aria-hidden="true">
    <circle class="ring" cx="0" cy="0" r="22" fill="none" stroke-width="1" />
    <line class="cross" x1="-32" y1="0" x2="-12" y2="0" />
    <line class="cross" x1="12" y1="0" x2="32" y2="0" />
    <line class="cross" x1="0" y1="-32" x2="0" y2="-12" />
    <line class="cross" x1="0" y1="12" x2="0" y2="32" />
    {#if state === "locked"}
      <circle class="dot" cx="0" cy="0" r="2" />
      <g class="ticks">
        {#each Array(8) as _, i}
          <line
            x1="0" y1="-28" x2="0" y2="-32"
            transform={`rotate(${i * 45})`}
          />
        {/each}
      </g>
    {/if}
  </svg>
  {#if label}
    <span class="reticle-label">{label}</span>
  {/if}
</div>

<style>
  .hud-reticle {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    color: var(--hud-cyan);
    transition: opacity var(--hud-dur-snap) var(--hud-ease-snap);
  }
  .ring {
    stroke: currentColor;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform var(--hud-dur-snap) var(--hud-ease-snap);
  }
  .cross {
    stroke: currentColor;
    stroke-width: 1;
  }
  .dot { fill: var(--hud-magenta); }
  .ticks line { stroke: var(--hud-cyan); stroke-width: 1.5; }
  [data-state="locked"] .ring {
    transform: scale(1.18);
  }
  [data-state="locked"] .ticks {
    transform-box: fill-box;
    transform-origin: center;
    animation: reticle-spin var(--hud-dur-scan) linear infinite;
  }
  .reticle-label {
    position: absolute;
    left: 48px;
    top: 50%;
    transform: translateY(-50%);
    font: 600 11px/1 var(--hud-font-mono);
    color: var(--hud-cyan);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    text-shadow: 0 0 4px var(--hud-cyan);
  }
  @keyframes reticle-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-state="locked"] .ticks {
      animation: none;
    }
  }
</style>
