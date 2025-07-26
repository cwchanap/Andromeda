<script lang="ts">
  import Button from "./ui/Button.svelte";
  import Card from "./ui/Card.svelte";
  import CardContent from "./ui/CardContent.svelte";
  import CardHeader from "./ui/CardHeader.svelte";
  import CardTitle from "./ui/CardTitle.svelte";
  import { createEventDispatcher } from 'svelte';

  interface WebGLFallbackProps {
    showRetry?: boolean;
    showGoHome?: boolean;
  }

  export let showRetry: boolean = true;
  export let showGoHome: boolean = true;

  const dispatch = createEventDispatcher<{
    retry: void;
    goHome: void;
  }>();

  function handleRetry() {
    dispatch('retry');
  }

  function handleGoHome() {
    dispatch('goHome');
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
  <Card className="w-full max-w-2xl border-slate-700 bg-slate-800">
    <CardHeader className="text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
        <svg class="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <CardTitle className="text-2xl text-slate-100">
        3D Graphics Not Available
      </CardTitle>
      <p class="text-base text-slate-400">
        Your browser or device doesn't support WebGL, which is required for
        the 3D solar system experience.
      </p>
    </CardHeader>

    <CardContent className="space-y-6">
      <!-- Troubleshooting Steps -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-slate-200">Try These Solutions:</h3>
        
        <div class="space-y-3">
          <div class="flex items-start gap-3 rounded-lg bg-slate-700/50 p-3">
            <svg class="mt-0.5 h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <h4 class="font-medium text-slate-200">Update Your Browser</h4>
              <p class="text-sm text-slate-400">
                Make sure you're using the latest version of Chrome, Firefox, Safari, or Edge.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-lg bg-slate-700/50 p-3">
            <svg class="mt-0.5 h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <h4 class="font-medium text-slate-200">Enable Hardware Acceleration</h4>
              <p class="text-sm text-slate-400">
                Check your browser settings and enable hardware acceleration if it's disabled.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3 rounded-lg bg-slate-700/50 p-3">
            <svg class="mt-0.5 h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
            </svg>
            <div class="min-w-0 flex-1">
              <h4 class="font-medium text-slate-200">Try a Different Browser</h4>
              <p class="text-sm text-slate-400">
                If you're using an older browser, try Chrome, Firefox, or Edge for the best experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Browser Support Info -->
      <div class="rounded-lg bg-slate-700/30 p-4">
        <h4 class="mb-2 font-medium text-slate-200">Supported Browsers:</h4>
        <div class="grid grid-cols-2 gap-2 text-sm text-slate-400">
          <div>• Chrome 9+</div>
          <div>• Firefox 4+</div>
          <div>• Safari 5.1+</div>
          <div>• Edge 12+</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 justify-center">
        {#if showRetry}
          <Button variant="outline" on:click={handleRetry}>
            Try Again
          </Button>
        {/if}
        {#if showGoHome}
          <Button on:click={handleGoHome}>
            Go to Home
          </Button>
        {/if}
      </div>

      <p class="text-center text-xs text-slate-500">
        For more help, contact support or visit our FAQ section
      </p>
    </CardContent>
  </Card>
</div>
