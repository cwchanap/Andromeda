<script lang="ts">
  import Button from "./ui/Button.svelte";
  import Card from "./ui/Card.svelte";
  import CardContent from "./ui/CardContent.svelte";
  import { createEventDispatcher } from 'svelte';
  
  interface ErrorInfo {
    id: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    code?: string;
    timestamp: number;
  }

  interface ErrorNotificationProps {
    error: ErrorInfo;
    showDevInfo?: boolean;
  }

  export let error: ErrorInfo;
  export let showDevInfo: boolean = false;

  const dispatch = createEventDispatcher<{
    dismiss: ErrorInfo;
  }>();

  const severityColors = {
    low: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    high: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
    critical: "border-red-500 bg-red-50 dark:bg-red-900/20",
  };

  const severityIcons = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🔶",
    critical: "🚨",
  };

  function handleDismiss() {
    dispatch('dismiss', error);
  }
</script>

<Card className={`mb-2 ${severityColors[error.severity]} border-l-4`}>
  <CardContent className="p-4">
    <div class="flex items-start gap-3">
      <span class="mt-0.5 text-lg">
        {severityIcons[error.severity]}
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
          {error.message}
        </p>

        {#if showDevInfo && error.code}
          <p class="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
            [{error.code}] {error.message}
          </p>
        {/if}
      </div>

      <Button
        variant="ghost"
        size="sm"
        on:click={handleDismiss}
        className="h-6 w-6 p-0"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span class="sr-only">Dismiss</span>
      </Button>
    </div>
  </CardContent>
</Card>
