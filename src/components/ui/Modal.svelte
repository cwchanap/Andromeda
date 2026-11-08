<script lang="ts">
  import { focusTrap } from "@/lib/hud/focusTrap";

  /**
   * Observatory modal. `placement="right"` docks it as a side panel so the
   * 3D scene stays visible (used for celestial body info).
   */
  export let isOpen = false;
  export let onClose: () => void = () => {};
  export let onEscape: (() => boolean) | undefined = undefined;
  export let closeLabel: string;
  export let ariaLabel: string | undefined = undefined;
  export let ariaLabelledby: string | undefined = undefined;
  export let ariaDescribedby: string | undefined = undefined;
  export let maxWidth = "640px";
  export let placement: "center" | "right" = "center";

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
    class="ui-modal-overlay"
    class:is-right={placement === "right"}
    use:focusTrap={".ui-modal-close"}
    on:click={handleBackdrop}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      class="ui-modal-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      style="max-width: {maxWidth};"
    >
      <button
        class="ui-modal-close"
        type="button"
        aria-label={closeLabel}
        on:click={onClose}
      >
        <span aria-hidden="true">✕</span>
      </button>

      <div class="ui-modal-header">
        <slot name="header" />
      </div>

      <div class="ui-modal-content">
        <slot />
      </div>

      {#if $$slots.notices}
        <div class="ui-modal-notices">
          <slot name="notices" />
        </div>
      {/if}

      {#if $$slots.actions}
        <div class="ui-modal-actions">
          <slot name="actions" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ui-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
    background: var(--color-scrim);
    animation: ui-modal-fade var(--dur-glide) var(--ease-glide) both;
  }

  .ui-modal-dialog {
    position: relative;
    display: flex;
    width: 100%;
    max-height: 90vh;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-panel);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-panel);
    font-family: var(--font-ui);
  }

  /* Docked right: lighter scrim so the selected body stays visible. */
  .ui-modal-overlay.is-right {
    justify-content: flex-end;
    align-items: stretch;
    padding: 64px 16px 16px;
    background: transparent;
  }
  .ui-modal-overlay.is-right .ui-modal-dialog {
    max-height: none;
    animation: ui-modal-slide var(--dur-glide) var(--ease-glide) both;
  }

  .ui-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 2;
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }
  .ui-modal-close:hover {
    border-color: var(--color-accent);
    background: var(--color-surface-2);
  }

  .ui-modal-header {
    flex: 0 0 auto;
    margin: 0 22px;
    padding: 22px 52px 14px 0;
    border-bottom: 3px double var(--color-line-strong);
  }

  .ui-modal-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 18px 22px 22px;
  }

  .ui-modal-notices {
    flex: 0 0 auto;
    padding: 0 22px 16px;
  }

  .ui-modal-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    padding: 16px 22px;
    border-top: 1px solid var(--color-line);
  }

  @keyframes ui-modal-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes ui-modal-slide {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 640px) {
    .ui-modal-overlay,
    .ui-modal-overlay.is-right {
      padding: 12px;
      align-items: flex-end;
    }
    .ui-modal-dialog {
      max-height: calc(100vh - 24px);
    }
    .ui-modal-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ui-modal-overlay,
    .ui-modal-overlay.is-right .ui-modal-dialog {
      animation: none;
    }
  }
</style>
