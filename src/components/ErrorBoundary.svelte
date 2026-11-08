<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import Button from "./ui/Button.svelte";

  interface ErrorBoundaryProps {
    fallback?: string;
    showReset?: boolean;
  }

  export let fallback: string = "Something went wrong";
  export let showReset: boolean = true;

  let hasError = false;
  let error: Error | null = null;
  let errorId = "";

  const dispatch = createEventDispatcher<{
    error: { error: Error; errorId: string };
    reset: void;
  }>();

  function handleError(errorEvent: ErrorEvent) {
    hasError = true;
    error = errorEvent.error;
    errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dispatch('error', { error: errorEvent.error, errorId });
  }

  function handleRejection(event: PromiseRejectionEvent) {
    hasError = true;
    error = new Error(event.reason);
    errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dispatch('error', { error: new Error(event.reason), errorId });
  }

  function handleReset() {
    hasError = false;
    error = null;
    errorId = "";
    dispatch('reset');
  }

  function handleReload() {
    window.location.reload();
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });
</script>

{#if hasError}
  <div class="error-screen">
    <section class="ui-panel error-card" role="alert">
      <p class="ui-caption">Error</p>
      <h2 class="error-title">Application Error</h2>
      <p class="error-message">{fallback}</p>

      {#if error}
        <details class="error-details">
          <summary>Technical Details</summary>
          <div class="error-trace">
            <p>Error ID: {errorId}</p>
            <p>{error.message}</p>
            {#if error.stack}
              <pre>{error.stack}</pre>
            {/if}
          </div>
        </details>
      {/if}

      <div class="error-actions">
        {#if showReset}
          <Button on:click={handleReset}>Try Again</Button>
        {/if}
        <Button variant="primary" on:click={handleReload}>Reload Page</Button>
      </div>

      <p class="error-footnote">If this problem persists, please refresh the page.</p>
    </section>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-screen {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--color-bg);
  }
  .error-card {
    width: min(440px, 100%);
    text-align: center;
  }
  .error-title {
    margin: 4px 0 10px;
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 600;
    color: var(--color-danger);
  }
  .error-message {
    margin: 0 0 16px;
    color: var(--color-text-soft);
  }
  .error-details {
    margin-bottom: 16px;
    text-align: left;
    font-size: 12px;
    color: var(--color-text-muted);
  }
  .error-details summary {
    cursor: pointer;
  }
  .error-trace {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid var(--color-line);
    border-radius: var(--radius-control);
    background: var(--color-bg);
  }
  .error-trace p {
    margin: 0 0 4px;
  }
  .error-trace pre {
    margin: 6px 0 0;
    white-space: pre-wrap;
    opacity: 0.75;
  }
  .error-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .error-footnote {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--color-text-muted);
  }
</style>
