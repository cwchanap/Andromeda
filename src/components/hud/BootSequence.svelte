<script lang="ts">
  import { onMount } from "svelte";

  export let debugInfo: string = "";
  export let t: (key: string) => string = (key: string) => key;

  $: baseLines = [
    t("boot.init"),
    t("boot.geoLock"),
    t("boot.stellarDb"),
    t("boot.renderPipeline"),
    t("boot.awaitingTarget"),
  ];

  let revealedCount = 0;

  onMount(() => {
    const interval = setInterval(() => {
      revealedCount += 1;
      if (revealedCount >= baseLines.length) clearInterval(interval);
    }, 180);
    return () => clearInterval(interval);
  });

  $: lines = baseLines.map((line, i) => {
    if (i === baseLines.length - 1 && debugInfo) {
      return `> ${debugInfo}`;
    }
    return line;
  });
</script>

<div class="boot-sequence" role="status" aria-live="polite">
  <div class="boot-body">
    {#each lines as line, i}
      <div
        class="boot-line"
        class:boot-line--hidden={i > revealedCount}
        data-line={i}
        aria-hidden={i > revealedCount ? "true" : undefined}
      >{line}</div>
    {/each}
  </div>
  <div class="boot-scanbar" aria-hidden="true"></div>
</div>

<style>
  .boot-sequence {
    position: absolute;
    inset: 0;
    background: var(--hud-void);
    color: var(--hud-cyan);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 0 8vw;
    font-family: var(--hud-font-mono);
    font-size: 13px;
    line-height: 1.8;
    overflow: hidden;
  }
  .boot-line {
    text-shadow: 0 0 4px var(--hud-cyan);
    animation: boot-flicker 140ms steps(3, end);
  }
  .boot-line--hidden {
    visibility: hidden;
  }
  .boot-line:last-child {
    color: var(--hud-magenta);
    text-shadow: 0 0 6px var(--hud-magenta);
    text-transform: uppercase;
  }
  .boot-scanbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--hud-cyan), transparent);
    animation: boot-scan 1.6s linear infinite;
  }
  @keyframes boot-flicker {
    0%,
    100% {
      opacity: 1;
    }
    33% {
      opacity: 0.3;
    }
    66% {
      opacity: 0.8;
    }
  }
  @keyframes boot-scan {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(100%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .boot-scanbar {
      animation: none;
    }
    .boot-line {
      animation: none;
    }
  }
</style>
