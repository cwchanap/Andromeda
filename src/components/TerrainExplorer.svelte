<script lang="ts">
  import LoadingAnimation from './LoadingAnimation.svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { gameState, gameActions } from '../stores/gameStore';
  import type { CelestialBodyData } from '../types/game';
  import { planetarySystemRegistry } from '../lib/planetary-system';
  import * as THREE from 'three';
  
  // Props
  export let planetId: string;
  export let lang: 'en' | 'zh' | 'ja' = 'en';
  export let translations: Record<string, string> = {};
  
  // Translation function
  $: t = (key: string) => translations[key] || key;
  
  // Component state
  let isLoading = true;
  let loadingProgress = 0;
  let isSceneReady = false;
  let loadingMessage = "Loading terrain...";
  let errorMessage = "";
  
  // 3D scene components
  let container: HTMLElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: any; // OrbitControls
  let animationFrameId: number;
  let planetData: CelestialBodyData | null = null;
  
  // Camera and interaction state
  let currentZoom = 5; // Start closer for terrain viewing
  let isMouseDown = false;
  let mousePosition = { x: 0, y: 0 };
  
  // Get planet data from the solar system
  const getPlanetData = async (): Promise<CelestialBodyData | null> => {
    try {
      const solarSystem = planetarySystemRegistry.getSystem('solar');
      if (!solarSystem) {
        throw new Error('Solar system not found');
      }
      
      const planet = solarSystem.systemData.celestialBodies.find(body => body.id === planetId);
      return planet || null;
    } catch (error) {
      console.error('Error getting planet data:', error);
      return null;
    }
  };
  
  // Initialize 3D scene
  const initializeScene = async () => {
    if (!container) return;
    
    try {
      loadingMessage = "Initializing 3D scene...";
      loadingProgress = 20;
      
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000011);
      
      // Create camera
      const aspect = container.clientWidth / container.clientHeight;
      camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      camera.position.set(2, 1, 2); // Position camera to get a good view of terrain
      
      // Create renderer
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false; // Disabled as per architecture
      container.appendChild(renderer.domElement);
      
      loadingProgress = 40;
      loadingMessage = "Loading planet data...";
      
      // Get planet data
      planetData = await getPlanetData();
      if (!planetData) {
        throw new Error(`Planet ${planetId} not found`);
      }
      
      loadingProgress = 60;
      loadingMessage = "Generating terrain...";
      
      // Create detailed terrain geometry for close viewing
      const terrainConfig = planetData.terrain;
      if (!terrainConfig) {
        throw new Error(`No terrain configuration found for ${planetId}`);
      }
      
      // --- Open world style flat terrain mesh ---
      // Parameters
      const size = 100; // 100x100 units
      const segments = 200; // 200x200 grid for detail
      // Create a plane geometry
      const terrainGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
      // Generate heightmap using simple noise
      function perlin(x, y) {
        // Simple pseudo-random noise for demo (replace with real Perlin/Simplex for realism)
        return (Math.sin(x * 0.15) + Math.cos(y * 0.18)) * 2 + Math.sin(x * 0.07 + y * 0.13) * 3;
      }
      const vertices = terrainGeometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const y = vertices.getY(i);
        // Height based on noise
        const height = perlin(x, y);
        vertices.setZ(i, height);
      }
      terrainGeometry.computeVertexNormals();
      // Material
      const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x888866,
        flatShading: true,
        wireframe: false,
      });
      // Mesh
      const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
      terrainMesh.receiveShadow = true;
      terrainMesh.castShadow = false;
      terrainMesh.rotation.x = -Math.PI / 2; // Make it horizontal
      scene.add(terrainMesh);
      loadingProgress = 80;
      loadingMessage = "Setting up lighting...";
      
      // Add lighting optimized for terrain viewing
      setupLighting();
      
      // Import and setup OrbitControls dynamically
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.minDistance = 2;
      controls.maxDistance = 20;
      controls.target.set(0, 0, 0);
      
      loadingProgress = 100;
      loadingMessage = "Ready!";
      
      // Start render loop
      startRenderLoop();
      
      isLoading = false;
      isSceneReady = true;
      
    } catch (error) {
      console.error('Error initializing terrain scene:', error);
      errorMessage = `Failed to load terrain: ${error.message}`;
      isLoading = false;
    }
  };
  
  // Setup lighting for terrain viewing
  const setupLighting = () => {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    ambientLight.castShadow = false;
    scene.add(ambientLight);
    
    // Main directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = false;
    scene.add(directionalLight);
    
    // Secondary light for terrain detail
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-3, 2, -2);
    fillLight.castShadow = false;
    scene.add(fillLight);
    
    // Add some point lights for atmospheric effect
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 10);
    pointLight1.position.set(2, 3, 2);
    pointLight1.castShadow = false;
    scene.add(pointLight1);
  };
  
  // Start render loop
  const startRenderLoop = () => {
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update controls
      if (controls) {
        controls.update();
      }
      
      // Render scene
      renderer.render(scene, camera);
    };
    
    animate();
  };
  
  // Handle window resize
  const handleResize = () => {
    if (!camera || !renderer || !container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  
  // Navigation functions
  const handleBackToSolar = () => {
    const solarUrl = lang === 'en' ? '/en/planetary/solar' : `/${lang}/planetary/solar`;
    window.location.href = solarUrl;
  };
  
  const handleResetView = () => {
    if (controls) {
      controls.reset();
      camera.position.set(0, 0, currentZoom);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };
  
  const handleToggleWireframe = () => {
    if (scene) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          const material = object.material as THREE.Material & { wireframe?: boolean };
          if ('wireframe' in material) {
            material.wireframe = !material.wireframe;
          }
        }
      });
    }
  };
  
  // Component lifecycle
  onMount(async () => {
    // Wait for container to be available
    let attempts = 0;
    while (!container && attempts < 10) {
      container = document.getElementById('terrain-container') as HTMLElement;
      if (!container) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    if (!container) {
      errorMessage = 'Terrain container not found';
      isLoading = false;
      return;
    }
    
    await initializeScene();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
  });
  
  onDestroy(() => {
    // Cleanup
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    if (controls) {
      controls.dispose();
    }
    
    if (renderer) {
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    }
    
    if (scene) {
      scene.clear();
    }
    
    window.removeEventListener('resize', handleResize);
  });
</script>

<div class="terrain-explorer">
  {#if isLoading}
    <LoadingAnimation 
      progress={loadingProgress} 
      message={loadingMessage} 
    />
  {:else if errorMessage}
    <ErrorBoundary>
      <div class="error-container">
        <h2>Error Loading Terrain</h2>
        <p>{errorMessage}</p>
        <button on:click={handleBackToSolar} class="error-button">
          Back to Solar System
        </button>
      </div>
    </ErrorBoundary>
  {/if}
  
  <!-- 3D Terrain Container -->
  <div id="terrain-container" class="terrain-container"></div>
  
  {#if isSceneReady && planetData}
    <!-- Planet Info Panel -->
    <div class="planet-info-panel">
      <div class="planet-header">
        <h1 class="planet-name">
          {t(`planet.${planetId}.name`) !== `planet.${planetId}.name` 
            ? t(`planet.${planetId}.name`) 
            : planetData.name} Terrain
        </h1>
        <span class="planet-type">{planetData.type.toUpperCase()}</span>
      </div>
      <p class="planet-description">
        Explore the detailed 3D terrain of {planetData.name}. Navigate with your mouse to examine surface features, craters, mountains, and valleys.
      </p>
      
      <!-- Terrain Features -->
      {#if planetData.terrain}
        <div class="terrain-features">
          <h3>Surface Features</h3>
          <div class="feature-tags">
            {#each planetData.terrain.features as feature}
              <span class="feature-tag">{feature.type}</span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Control Panel -->
    <div class="control-panel">
      <button on:click={handleBackToSolar} class="control-button back-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Back to Solar System
      </button>
      
      <div class="view-controls">
        <button on:click={handleResetView} class="control-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          Reset View
        </button>
        
        <button on:click={handleToggleWireframe} class="control-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.16.21 2.76.21 3.92 0 5.16-1 9-5.45 9-11V7l-10-5z"/>
            <path d="M12 22V12"/>
            <path d="M12 2v10"/>
            <path d="M22 7L12 12 2 7"/>
          </svg>
          Wireframe
        </button>
      </div>
    </div>
    
    <!-- Instructions Panel -->
    <div class="instructions-panel">
      <h4>Navigation Controls</h4>
      <div class="instruction-list">
        <div class="instruction-item">
          <strong>Rotate:</strong> Left click + drag
        </div>
        <div class="instruction-item">
          <strong>Zoom:</strong> Mouse wheel
        </div>
        <div class="instruction-item">
          <strong>Pan:</strong> Right click + drag
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .terrain-explorer {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: radial-gradient(ellipse at center, #001122 0%, #000011 100%);
  }
  
  .terrain-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .error-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
    background: rgba(0, 0, 0, 0.8);
    padding: 2rem;
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }
  
  .error-button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 1rem;
  }
  
  .error-button:hover {
    background: #dc2626;
  }
  
  .planet-info-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    max-width: 320px;
    background: rgba(0, 0, 17, 0.9);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    color: white;
    z-index: 10;
  }
  
  .planet-header {
    margin-bottom: 15px;
  }
  
  .planet-name {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(45deg, #60a5fa, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .planet-type {
    display: inline-block;
    background: rgba(96, 165, 250, 0.2);
    color: #a5b4fc;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    border: 1px solid rgba(96, 165, 250, 0.3);
  }
  
  .planet-description {
    margin: 0 0 20px 0;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }
  
  .terrain-features h3 {
    margin: 0 0 10px 0;
    font-size: 1rem;
    color: #34d399;
  }
  
  .feature-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .feature-tag {
    background: rgba(52, 211, 153, 0.2);
    color: #6ee7b7;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid rgba(52, 211, 153, 0.3);
  }
  
  .control-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10;
  }
  
  .view-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .control-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 17, 0.9);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px 15px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }
  
  .control-button:hover {
    background: rgba(0, 0, 17, 0.95);
    border-color: rgba(96, 165, 250, 0.5);
    transform: translateY(-1px);
  }
  
  .back-button {
    background: rgba(239, 68, 68, 0.9);
    border-color: rgba(239, 68, 68, 0.5);
  }
  
  .back-button:hover {
    background: rgba(220, 38, 38, 0.95);
    border-color: rgba(239, 68, 68, 0.7);
  }
  
  .instructions-panel {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 17, 0.9);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: white;
    z-index: 10;
    max-width: 250px;
  }
  
  .instructions-panel h4 {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    color: #fbbf24;
  }
  
  .instruction-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .instruction-item {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .instruction-item strong {
    color: #60a5fa;
    font-weight: 600;
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .planet-info-panel {
      max-width: calc(100vw - 40px);
      font-size: 0.875rem;
    }
    
    .planet-name {
      font-size: 1.25rem;
    }
    
    .control-panel {
      right: 10px;
      top: 10px;
    }
    
    .control-button {
      padding: 8px 12px;
      font-size: 0.8rem;
    }
    
    .instructions-panel {
      bottom: 10px;
      left: 10px;
      max-width: calc(100vw - 20px);
    }
  }
</style>
