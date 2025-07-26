<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  interface ParticleSystemProps {
    particleCount?: number;
    size?: number;
    speed?: number;
    color?: string;
    opacity?: number;
    className?: string;
  }

  export let particleCount: number = 100;
  export let size: number = 2;
  export let speed: number = 0.001;
  export let color: string = "#ffffff";
  export let opacity: number = 0.6;
  export let className: string = "";

  let mountElement: HTMLDivElement;
  let scene: THREE.Scene | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let particles: THREE.Points | null = null;
  let animationId: number | null = null;

  onMount(() => {
    if (!mountElement) return;

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      1,
      1000,
    );
    camera.position.z = 1;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountElement.appendChild(renderer.domElement);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * window.innerWidth;
      positions[i + 1] = (Math.random() - 0.5) * window.innerHeight;
      positions[i + 2] = (Math.random() - 0.5) * 100;

      velocities[i] = (Math.random() - 0.5) * speed * 200;
      velocities[i + 1] = (Math.random() - 0.5) * speed * 200;
      velocities[i + 2] = (Math.random() - 0.5) * speed * 200;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: size,
      opacity: opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Animation loop
    const animate = () => {
      if (!particles || !renderer || !scene) return;

      const positions = particles.geometry.attributes.position.array as Float32Array;
      const velocities = particles.geometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Wrap around screen
        if (positions[i] > window.innerWidth / 2) positions[i] = -window.innerWidth / 2;
        if (positions[i] < -window.innerWidth / 2) positions[i] = window.innerWidth / 2;
        if (positions[i + 1] > window.innerHeight / 2) positions[i + 1] = -window.innerHeight / 2;
        if (positions[i + 1] < -window.innerHeight / 2) positions[i + 1] = window.innerHeight / 2;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.left = -window.innerWidth / 2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
    if (particles) {
      particles.geometry.dispose();
      if (Array.isArray(particles.material)) {
        particles.material.forEach(material => material.dispose());
      } else {
        particles.material.dispose();
      }
    }
  });
</script>

<div 
  bind:this={mountElement}
  class={`absolute inset-0 pointer-events-none ${className}`}
></div>
