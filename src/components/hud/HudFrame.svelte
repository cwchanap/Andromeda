<script lang="ts">
  export let color: string = "var(--hud-cyan)";
  export let bracketLength: number = 14;
  export let glow: boolean = false;
</script>

<div
  class="hud-frame"
  class:hud-frame-glow={glow}
  style="--bracket-length: {bracketLength}px; --bracket-color: {color};"
>
  {#each ["tl", "tr", "bl", "br"] as corner}
    <svg
      data-corner={corner}
      class="hud-corner hud-corner-{corner}"
      width={bracketLength}
      height={bracketLength}
      viewBox="0 0 {bracketLength} {bracketLength}"
      overflow="visible"
      aria-hidden="true"
    >
      {#if corner === "tl"}
        <line x1="0" y1="0" x2={bracketLength} y2="0" stroke={color} stroke-width="1.5" />
        <line x1="0" y1="0" x2="0" y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else if corner === "tr"}
        <line x1="0" y1="0" x2={bracketLength} y2="0" stroke={color} stroke-width="1.5" />
        <line x1={bracketLength} y1="0" x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else if corner === "bl"}
        <line x1="0" y1={bracketLength} x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
        <line x1="0" y1="0" x2="0" y2={bracketLength} stroke={color} stroke-width="1.5" />
      {:else}
        <line x1="0" y1={bracketLength} x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
        <line x1={bracketLength} y1="0" x2={bracketLength} y2={bracketLength} stroke={color} stroke-width="1.5" />
      {/if}
    </svg>
  {/each}
  <div class="hud-frame-content">
    <slot />
  </div>
</div>

<style>
  .hud-frame {
    position: relative;
    display: block;
  }
  .hud-corner {
    position: absolute;
    pointer-events: none;
  }
  .hud-corner-tl { top: 0; left: 0; }
  .hud-corner-tr { top: 0; right: 0; }
  .hud-corner-bl { bottom: 0; left: 0; }
  .hud-corner-br { bottom: 0; right: 0; }
  .hud-frame-glow {
    filter: drop-shadow(0 0 6px var(--bracket-color));
  }
  .hud-frame-content {
    position: relative;
  }
</style>
