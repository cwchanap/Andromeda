<script lang="ts">
  import { cn } from "@/lib/utils";
  import { createEventDispatcher } from 'svelte';

  interface DialogProps {
    open?: boolean;
    className?: string;
    showCloseButton?: boolean;
  }

  export let open: boolean = false;
  export let className: string = "";
  export let showCloseButton: boolean = true;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 z-50 bg-black/50"
    on:click={handleOverlayClick}
    on:keydown={handleKeyDown}
    role="button"
    tabindex="0"
  >
    <!-- Dialog Content -->
    <div 
      class={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-lg border bg-background p-6 shadow-lg",
        className
      )}
      on:click|stopPropagation
      on:keydown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabindex="0"
    >
      {#if showCloseButton}
        <button
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          on:click={handleClose}
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span class="sr-only">Close</span>
        </button>
      {/if}
      
      <slot />
    </div>
  </div>
{/if}
