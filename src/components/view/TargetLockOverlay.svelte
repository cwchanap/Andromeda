<script lang="ts">
  import Reticle from "@/components/view/Reticle.svelte";
  export let x: number = 0;
  export let y: number = 0;
  export let name: string = "";
  export let lockedLabel: string = "TARGET LOCKED";
</script>

<div class="target-lock" style="transform: translate({x}px, {y}px);">
  <Reticle x={0} y={0} state="locked" />
  <div class="target-meta">
    <div class="target-name">{name}</div>
    <div class="target-badge">{lockedLabel}</div>
  </div>
</div>

<style>
  .target-lock {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  .target-meta {
    position: absolute;
    top: 34px;
    left: 34px;
    color: var(--color-text);
    text-shadow: 0 1px 3px var(--color-bg-deep);
  }
  .target-name {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    line-height: 1.1;
  }
  .target-badge {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin-top: 2px;
  }
</style>
