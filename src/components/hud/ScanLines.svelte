<script lang="ts">
  export let opacity: number = 0.06;
</script>

<div class="scan-lines" style="--scan-opacity: {opacity};" aria-hidden="true">
  <div class="scan-lines-fine"></div>
  <div class="scan-lines-coarse"></div>
</div>

<style>
  .scan-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
    opacity: var(--scan-opacity);
  }
  .scan-lines-fine,
  .scan-lines-coarse {
    position: absolute;
    inset: -100% 0;
    will-change: transform;
  }
  .scan-lines-fine {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 2px,
      var(--hud-cyan) 2px,
      var(--hud-cyan) 3px
    );
    opacity: 0.5;
    animation: scan-drift var(--hud-dur-scan) linear infinite;
  }
  .scan-lines-coarse {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 7px,
      var(--hud-cyan) 7px,
      var(--hud-cyan) 9px
    );
    opacity: 0.25;
    animation: scan-drift calc(var(--hud-dur-scan) * 1.6) linear infinite reverse;
  }
  @keyframes scan-drift {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
</style>
