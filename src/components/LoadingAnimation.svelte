<script lang="ts">
  import Progress from "./ui/Progress.svelte";
  import ParticleSystem from "./ParticleSystem.svelte";

  interface LoadingAnimationProps {
    progress?: number;
    message?: string;
    className?: string;
  }

  export let progress: number = 0;
  export let message: string = "Loading solar system...";
  export let className: string = "";
</script>

<div
  class={`bg-opacity-90 fixed inset-0 z-50 flex items-center justify-center bg-black ${className}`}
>
  <!-- Background particle effects -->
  <ParticleSystem />

  <div class="relative z-10 mx-4 flex w-full max-w-md flex-col items-center space-y-6 rounded-lg border border-gray-700 bg-gray-900 p-8">
    <!-- Animated solar system loader -->
    <div class="relative h-24 w-24">
      <!-- Sun -->
      <div class="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-yellow-400"></div>

      <!-- Orbiting planets -->
      <div
        class="absolute inset-0 animate-spin"
        style="animation-duration: 3s"
      >
        <div class="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 transform rounded-full bg-blue-400"></div>
      </div>

      <div
        class="absolute inset-2 animate-spin"
        style="animation-duration: 4s; animation-direction: reverse"
      >
        <div class="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 transform rounded-full bg-red-400"></div>
      </div>

      <div
        class="absolute inset-4 animate-spin"
        style="animation-duration: 5s"
      >
        <div class="absolute top-0 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-green-400"></div>
      </div>
    </div>

    <!-- Loading text -->
    <div class="space-y-2 text-center">
      <h2 class="text-xl font-semibold text-white">{message}</h2>
      <p class="text-sm text-gray-400">
        Initializing 3D engine and loading celestial data...
      </p>
    </div>

    <!-- Progress bar -->
    <div class="w-full space-y-2">
      <Progress value={progress} className="h-2" />
      <div class="flex justify-between text-xs text-gray-400">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>

    <!-- Loading steps indicator -->
    <div class="flex space-x-2">
      <div class={`h-2 w-2 rounded-full ${progress > 0 ? 'bg-blue-400' : 'bg-gray-600'} transition-colors duration-300`}></div>
      <div class={`h-2 w-2 rounded-full ${progress > 25 ? 'bg-blue-400' : 'bg-gray-600'} transition-colors duration-300`}></div>
      <div class={`h-2 w-2 rounded-full ${progress > 50 ? 'bg-blue-400' : 'bg-gray-600'} transition-colors duration-300`}></div>
      <div class={`h-2 w-2 rounded-full ${progress > 75 ? 'bg-blue-400' : 'bg-gray-600'} transition-colors duration-300`}></div>
      <div class={`h-2 w-2 rounded-full ${progress >= 100 ? 'bg-blue-400' : 'bg-gray-600'} transition-colors duration-300`}></div>
    </div>

    <!-- Fun facts -->
    <div class="text-center">
      <p class="text-xs text-gray-500 italic">
        {#if progress < 25}
          Did you know? The Sun contains 99.86% of the Solar System's mass!
        {:else if progress < 50}
          Fun fact: Jupiter has over 80 known moons!
        {:else if progress < 75}
          Amazing: Saturn's rings are made mostly of water ice!
        {:else if progress < 100}
          Incredible: Venus is the hottest planet in our solar system!
        {:else}
          Ready to explore! Click on planets to learn more.
        {/if}
      </p>
    </div>
  </div>
</div>
