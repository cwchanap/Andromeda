<script context="module" lang="ts">
  // Generator helpers live at module scope so they are defined once rather
  // than re-created per instance. Decoration arrays are created reactively
  // (see instance script) only for instances whose decoration is active, so
  // "none" instances never generate random data.
  function generateBackgroundStars() {
    return Array.from({ length: 75 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.8,
      scale: 0.3 + Math.random() * 1.2,
    }));
  }

  function generateBackgroundParticles() {
    return Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 4,
    }));
  }
</script>

<script lang="ts">
  import { focusTrap } from "@/lib/hud/focusTrap";

  export type ModalDecoration = "none" | "stars" | "cosmic";

  type BackgroundStar = {
    left: number;
    top: number;
    delay: number;
    opacity: number;
    scale: number;
  };
  type BackgroundParticle = {
    left: number;
    top: number;
    delay: number;
    duration: number;
  };

  let backgroundStars: BackgroundStar[] = [];
  let backgroundParticles: BackgroundParticle[] = [];
  // Generate decoration arrays only when the decoration is active so closed
  // or "none" instances skip the random generation entirely.
  $: backgroundStars = decoration !== "none" ? generateBackgroundStars() : [];
  $: backgroundParticles =
    decoration === "cosmic" ? generateBackgroundParticles() : [];

  export let isOpen = false;
  export let onClose: () => void = () => {};
  export let onEscape: (() => boolean) | undefined = undefined;
  export let closeLabel: string;
  export let ariaLabel: string | undefined = undefined;
  export let ariaLabelledby: string | undefined = undefined;
  export let ariaDescribedby: string | undefined = undefined;
  export let maxWidth = "700px";
  export let decoration: ModalDecoration = "none";
  export let theme: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    textColor?: string;
  } = {};

  function handleKeydown(event: KeyboardEvent) {
    // Keep modal keystrokes from reaching page-level navigation handlers.
    // focusTrap's Tab listener is attached to this same node, so it still runs.
    event.stopPropagation();
    if (event.key !== "Escape") return;
    if (onEscape?.() === true) return;
    onClose();
  }

  function handleBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }
</script>

{#if isOpen}
  <div
    class="modal-shell-overlay"
    use:focusTrap={".modal-shell-close"}
    on:click={handleBackdrop}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      class="modal-shell-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      style="
        max-width: {maxWidth};
        --primary-color: {theme.primary ?? '#60a5fa'};
        --secondary-color: {theme.secondary ?? '#3b82f6'};
        --accent-color: {theme.accent ?? '#ddd6fe'};
        {theme.background ? `--modal-background: ${theme.background};` : ''}
        {theme.textColor ? `--modal-text-color: ${theme.textColor};` : ''}
      "
    >
      {#if decoration !== "none"}
        <div class="modal-shell-decoration" aria-hidden="true">
          {#each backgroundStars as star}
            <span
              class="modal-shell-star"
              style="
                left: {star.left}%;
                top: {star.top}%;
                animation-delay: {star.delay}s;
                opacity: {star.opacity};
                transform: scale({star.scale});
              "
            ></span>
          {/each}

          {#if decoration === "cosmic"}
            {#each backgroundParticles as particle}
              <span
                class="modal-shell-particle"
                style="
                  left: {particle.left}%;
                  top: {particle.top}%;
                  animation-delay: {particle.delay}s;
                  animation-duration: {particle.duration}s;
                "
              ></span>
            {/each}
          {/if}
        </div>
      {/if}

      <button
        class="modal-shell-close"
        type="button"
        aria-label={closeLabel}
        on:click={onClose}
      >
        <span aria-hidden="true">×</span>
      </button>

      <div class="modal-shell-header">
        <slot name="header" />
      </div>

      <div class="modal-shell-content">
        <slot />
      </div>

      <div class="modal-shell-notices">
        <slot name="notices" />
      </div>

      <div class="modal-shell-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-shell-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
    background: rgba(2, 6, 23, 0.82);
    backdrop-filter: blur(6px);
    animation: modal-shell-enter 180ms ease-out both;
  }

  .modal-shell-dialog {
    position: relative;
    display: flex;
    width: 100%;
    max-height: 90vh;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--primary-color) 55%, transparent);
    border-radius: 16px;
    background: var(
      --modal-background,
      linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))
    );
    color: var(--modal-text-color, #f8fafc);
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.7),
      0 0 80px color-mix(in srgb, var(--secondary-color) 22%, transparent);
  }

  .modal-shell-decoration {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }

  .modal-shell-star,
  .modal-shell-particle {
    position: absolute;
    display: block;
    pointer-events: none;
  }

  .modal-shell-star {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--accent-color);
    animation: modal-shell-twinkle 4s ease-in-out infinite;
  }

  .modal-shell-particle {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--primary-color);
    box-shadow: 0 0 8px var(--primary-color);
    animation: modal-shell-particle-drift 6s ease-in-out infinite;
  }

  .modal-shell-close,
  .modal-shell-header,
  .modal-shell-content,
  .modal-shell-notices,
  .modal-shell-actions {
    position: relative;
    z-index: 1;
  }

  .modal-shell-close {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--accent-color) 45%, transparent);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.55);
    color: inherit;
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
  }

  .modal-shell-close:hover {
    background: color-mix(in srgb, var(--primary-color) 20%, transparent);
  }

  .modal-shell-close:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }

  .modal-shell-header {
    flex: 0 0 auto;
    padding: 24px 64px 16px 24px;
  }

  .modal-shell-content {
    min-height: 0;
    overflow-y: auto;
    padding: 0 24px 24px;
  }

  .modal-shell-notices {
    flex: 0 0 auto;
    padding: 0 24px 16px;
  }

  .modal-shell-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
    padding: 16px 24px 24px;
    border-top: 1px solid color-mix(in srgb, var(--accent-color) 22%, transparent);
  }

  @keyframes modal-shell-enter {
    from {
      opacity: 0;
      transform: scale(0.98);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes modal-shell-twinkle {
    0%,
    100% {
      opacity: 0.3;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes modal-shell-particle-drift {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
      opacity: 0.35;
    }

    50% {
      transform: translate3d(8px, -12px, 0);
      opacity: 0.9;
    }
  }

  @media (max-width: 480px) {
    .modal-shell-overlay {
      padding: 12px;
    }

    .modal-shell-dialog {
      max-height: calc(100vh - 24px);
    }

    .modal-shell-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-shell-overlay,
    .modal-shell-star,
    .modal-shell-particle {
      animation: none;
    }
  }
</style>
