<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import Button from "./ui/Button.svelte";
  import Card from "./ui/Card.svelte";
  import CardContent from "./ui/CardContent.svelte";
  import CardHeader from "./ui/CardHeader.svelte";
  import CardTitle from "./ui/CardTitle.svelte";

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
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-purple-900 p-8">
    <Card className="mx-auto w-full max-w-md border-red-500">
      <CardHeader className="text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <CardTitle className="text-red-600 dark:text-red-400">Application Error</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 text-center">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {fallback}
        </p>

        {#if error}
          <details class="text-left">
            <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <div class="mt-2 rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-800">
              <p class="font-semibold">Error ID: {errorId}</p>
              <p class="mt-1">{error.message}</p>
              {#if error.stack}
                <pre class="mt-2 whitespace-pre-wrap text-xs opacity-70">{error.stack}</pre>
              {/if}
            </div>
          </details>
        {/if}

        <div class="flex gap-2 justify-center">
          {#if showReset}
            <Button variant="outline" on:click={handleReset}>
              Try Again
            </Button>
          {/if}
          <Button on:click={handleReload}>
            Reload Page
          </Button>
        </div>

        <p class="text-xs text-gray-500">
          If this problem persists, please refresh the page or contact support.
        </p>
      </CardContent>
    </Card>
  </div>
{:else}
  <slot />
{/if}
