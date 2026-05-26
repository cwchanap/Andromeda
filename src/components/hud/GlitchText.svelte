<script lang="ts">
  import { onDestroy } from "svelte";
  export let text: string = "";
  export let durationMs: number = 200;

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%*+";
  let display = text;
  let timer: ReturnType<typeof setInterval> | null = null;

  function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function scramble(targetLen: number): string {
    let s = "";
    for (let i = 0; i < targetLen; i++) {
      s += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return s;
  }

  function startAnimation(): void {
    // Clear any existing timer before starting a new one
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (prefersReducedMotion()) {
      display = text;
      return;
    }

    if (text === "") {
      display = "";
      return;
    }

    const target = text;
    display = scramble(target.length);
    const start = Date.now();
    timer = setInterval(() => {
      const t = (Date.now() - start) / durationMs;
      if (t >= 1) {
        display = target;
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      const settled = Math.floor(target.length * t);
      display = target.slice(0, settled) + scramble(target.length - settled);
    }, 50);
  }

  // Reactive statement runs on every text or durationMs change (including initial render)
  $: text, durationMs, startAnimation();

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<span data-testid="glitch-text" class="glitch-text" aria-label={text} aria-live="off">{display}</span>

<style>
  .glitch-text {
    font-family: var(--hud-font-display);
    letter-spacing: 0.08em;
    color: var(--hud-cyan);
    text-shadow: 0 0 6px var(--hud-cyan);
  }
</style>
