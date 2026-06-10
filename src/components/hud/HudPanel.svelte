<script lang="ts">
  import HudFrame from "./HudFrame.svelte";
  /** Framed HUD panel with optional title header + animated entrance. */
  export let title: string | undefined = undefined;
  export let color = "var(--hud-cyan)";
  export let bracketLength = 18;
  export let glow = true;
  export let animate = true;
</script>

<div class:hud-panel-anim={animate}>
  <HudFrame {color} {bracketLength} {glow}>
    <div class="hud-panel">
      {#if title}
        <div class="hud-panel-header">
          <h3 class="hud-panel-title">{title}</h3>
          <span class="hud-panel-tick"></span>
        </div>
      {/if}
      <slot />
    </div>
  </HudFrame>
</div>
