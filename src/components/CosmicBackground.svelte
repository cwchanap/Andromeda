<script lang="ts"></script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  let mountElement: HTMLDivElement;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let stars: THREE.Points | null = null;
  let nebula: THREE.Points | null = null;
  let animationId: number | null = null;

  onMount(() => {
    if (!mountElement) return;

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountElement.appendChild(renderer.domElement);

    // Create starfield
    createStarfield();
    
    // Create nebula particles
    createNebula();

    // Animation loop
    const animate = () => {
      if (!renderer || !scene || !camera) return;

      // Rotate the starfield slowly
      if (stars) {
        stars.rotation.y += 0.0002;
        stars.rotation.x += 0.0001;
      }

      // Animate nebula
      if (nebula) {
        nebula.rotation.z += 0.0003;
        const positions = nebula.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
        }
        nebula.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  function createStarfield() {
    if (!scene) return;

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      // Random positions in a sphere
      const radius = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      // Star colors (white, blue, yellow, red)
      const colorType = Math.random();
      if (colorType < 0.6) {
        // White stars
        colors[i] = 1;
        colors[i + 1] = 1;
        colors[i + 2] = 1;
      } else if (colorType < 0.8) {
        // Blue stars
        colors[i] = 0.7;
        colors[i + 1] = 0.8;
        colors[i + 2] = 1;
      } else if (colorType < 0.95) {
        // Yellow stars
        colors[i] = 1;
        colors[i + 1] = 1;
        colors[i + 2] = 0.7;
      } else {
        // Red stars
        colors[i] = 1;
        colors[i + 1] = 0.5;
        colors[i + 2] = 0.5;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: Math.random() * 0.8 + 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  function createNebula() {
    if (!scene) return;

    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaCount = 500;
    const positions = new Float32Array(nebulaCount * 3);
    const colors = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 50;

      // Nebula colors (purple, blue, pink)
      const colorType = Math.random();
      if (colorType < 0.4) {
        // Purple
        colors[i] = 0.6;
        colors[i + 1] = 0.2;
        colors[i + 2] = 1;
      } else if (colorType < 0.7) {
        // Blue
        colors[i] = 0.2;
        colors[i + 1] = 0.4;
        colors[i + 2] = 1;
      } else {
        // Pink
        colors[i] = 1;
        colors[i + 1] = 0.2;
        colors[i + 2] = 0.8;
      }
    }

    nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const nebulaMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);
  }

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
    if (stars) {
      stars.geometry.dispose();
      if (Array.isArray(stars.material)) {
        stars.material.forEach(material => material.dispose());
      } else {
        stars.material.dispose();
      }
    }
    if (nebula) {
      nebula.geometry.dispose();
      if (Array.isArray(nebula.material)) {
        nebula.material.forEach(material => material.dispose());
      } else {
        nebula.material.dispose();
      }
    }
  });
</script>

<div 
  bind:this={mountElement}
  class="fixed inset-0 pointer-events-none z-[-1]"
></div>
