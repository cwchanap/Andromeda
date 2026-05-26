<script lang="ts">
  import HudReticle from "@/components/hud/HudReticle.svelte";
  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;
  export let name: string = "";
</script>

{#if visible}
  <div class="target-lock" style="transform: translate({x}px, {y}px);">
    <HudReticle x={0} y={0} state="locked" />
    <div class="target-meta">
      <div class="target-name">{name}</div>
      <div class="target-badge">TARGET LOCKED</div>
    </div>
  </div>
{/if}

<style>
  .target-lock {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  .target-meta {
    position: absolute;
    top: 36px;
    left: 36px;
    color: var(--hud-ivory);
    font-family: var(--hud-font-display);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    text-shadow: 0 0 6px var(--hud-cyan);
  }
  .target-name {
    font-size: 14px;
    font-weight: 700;
  }
  .target-badge {
    font-family: var(--hud-font-mono);
    font-size: 10px;
    color: var(--hud-magenta);
    text-shadow: 0 0 4px var(--hud-magenta);
    margin-top: 2px;
    animation: badge-pulse 1.4s ease-in-out infinite;
  }
  @keyframes badge-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  @media (prefers-reduced-motion: reduce) {
    .target-badge {
      animation: none;
    }
  }
</style>
