<script lang="ts">
  import { onMount } from 'svelte';

  interface Planet {
    id: string;
    size: number;
    x: number;
    y: number;
    color: string;
    orbitRadius: number;
    orbitSpeed: number;
    glowColor: string;
  }

  const planets: Planet[] = [
    {
      id: 'jupiter',
      size: 80,
      x: 15,
      y: 20,
      color: 'from-orange-400 to-yellow-600',
      orbitRadius: 200,
      orbitSpeed: 0.0005,
      glowColor: 'shadow-orange-500/30'
    },
    {
      id: 'saturn',
      size: 70,
      x: 85,
      y: 25,
      color: 'from-yellow-300 to-amber-500',
      orbitRadius: 150,
      orbitSpeed: -0.0008,
      glowColor: 'shadow-yellow-500/25'
    },
    {
      id: 'earth',
      size: 50,
      x: 10,
      y: 70,
      color: 'from-blue-500 to-green-400',
      orbitRadius: 120,
      orbitSpeed: 0.001,
      glowColor: 'shadow-blue-500/40'
    },
    {
      id: 'mars',
      size: 40,
      x: 90,
      y: 75,
      color: 'from-red-500 to-orange-600',
      orbitRadius: 100,
      orbitSpeed: -0.0012,
      glowColor: 'shadow-red-500/35'
    },
    {
      id: 'neptune',
      size: 60,
      x: 50,
      y: 5,
      color: 'from-blue-600 to-indigo-700',
      orbitRadius: 180,
      orbitSpeed: 0.0003,
      glowColor: 'shadow-blue-600/30'
    }
  ];

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  {#each planets as planet}
    <div 
      class="floating-planet absolute pointer-events-none z-10"
      style="
        left: {planet.x}%; 
        top: {planet.y}%;
        --orbit-radius: {planet.orbitRadius}px;
        --orbit-speed: {planet.orbitSpeed * 1000}s;
      "
    >
      <!-- Planet with rings for Saturn -->
      <div class="relative planet-container">
        <div 
          class="planet bg-gradient-to-br {planet.color} rounded-full opacity-60 blur-[0.5px] {planet.glowColor} shadow-2xl animate-float"
          style="width: {planet.size}px; height: {planet.size}px;"
        ></div>
        
        <!-- Saturn's rings -->
        {#if planet.id === 'saturn'}
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="ring-1 border-2 border-yellow-400/40 rounded-full" style="width: {planet.size * 1.5}px; height: {planet.size * 0.3}px;"></div>
            <div class="ring-2 absolute border border-yellow-300/20 rounded-full" style="width: {planet.size * 1.8}px; height: {planet.size * 0.4}px;"></div>
          </div>
        {/if}

        <!-- Orbital path (visible on hover) -->
        <div 
          class="orbital-path absolute border border-white/10 rounded-full opacity-0 hover:opacity-20 transition-opacity duration-1000"
          style="
            width: {planet.orbitRadius * 2}px; 
            height: {planet.orbitRadius * 2}px;
            left: -{planet.orbitRadius - planet.size/2}px;
            top: -{planet.orbitRadius - planet.size/2}px;
          "
        ></div>
      </div>
    </div>
  {/each}
{/if}

<style>
  .floating-planet {
    animation: cosmic-drift var(--orbit-speed) ease-in-out infinite;
  }

  .planet {
    animation-delay: calc(var(--orbit-speed) * -0.3);
  }

  @keyframes cosmic-drift {
    0%, 100% {
      transform: translateX(0) translateY(0) rotate(0deg);
    }
    25% {
      transform: translateX(calc(var(--orbit-radius) * 0.3)) translateY(calc(var(--orbit-radius) * -0.2)) rotate(90deg);
    }
    50% {
      transform: translateX(calc(var(--orbit-radius) * 0.1)) translateY(calc(var(--orbit-radius) * 0.4)) rotate(180deg);
    }
    75% {
      transform: translateX(calc(var(--orbit-radius) * -0.2)) translateY(calc(var(--orbit-radius) * -0.1)) rotate(270deg);
    }
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px) scale(1);
    }
    50% {
      transform: translateY(-10px) scale(1.05);
    }
  }

  .ring-1, .ring-2 {
    transform: rotateX(75deg);
  }

  .ring-2 {
    animation: ring-rotation 20s linear infinite;
  }

  @keyframes ring-rotation {
    from {
      transform: rotateX(75deg) rotateZ(0deg);
    }
    to {
      transform: rotateX(75deg) rotateZ(360deg);
    }
  }
</style>
