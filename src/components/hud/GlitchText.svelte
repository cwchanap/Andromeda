<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  export let text: string = "";
  export let durationMs: number = 200;

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%*+";
  let display = text;
  let timer: ReturnType<typeof setInterval> | null = null;

  function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function scramble(targetLen: number): string {
    let s = "";
    for (let i = 0; i < targetLen; i++) {
      s += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return s;
  }

  onMount(() => {
    if (prefersReducedMotion()) {
      display = text;
      return;
    }
    const start = Date.now();
    timer = setInterval(() => {
      const t = (Date.now() - start) / durationMs;
      if (t >= 1) {
        display = text;
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      const settled = Math.floor(text.length * t);
      display = text.slice(0, settled) + scramble(text.length - settled);
    }, 50);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  $: if (text) {
    // when text changes, restart animation
    display = prefersReducedMotion() ? text : scramble(text.length);
  }
</script>

<span data-testid="glitch-text" class="glitch-text">{display}</span>

<style>
  .glitch-text {
    font-family: var(--hud-font-display);
    letter-spacing: 0.08em;
    color: var(--hud-cyan);
    text-shadow: 0 0 6px var(--hud-cyan);
  }
</style>
