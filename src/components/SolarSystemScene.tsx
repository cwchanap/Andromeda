import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { solarSystemData } from "../data/celestialBodies";
import type { CelestialBodyData } from "../types/game";

interface SolarSystemSceneProps {
  initialCameraPosition?: THREE.Vector3;
  enableControls?: boolean;
}

export default function SolarSystemScene({
  initialCameraPosition,
  enableControls = true,
}: SolarSystemSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const celestialBodiesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    cameraRef.current = camera;

    if (initialCameraPosition) {
      camera.position.copy(initialCameraPosition);
    } else {
      // Position camera further back to see the whole solar system
      camera.position.set(0, 20, 50);
      camera.lookAt(0, 0, 0);
    }

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011);
    mountRef.current.appendChild(renderer.domElement);

    // Camera controls setup
    let controls: OrbitControls | null = null;
    if (enableControls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;

      // Configure controls for solar system exploration
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 10;
      controls.maxDistance = 200;
      controls.maxPolarAngle = Math.PI;
      controls.target.set(0, 0, 0); // Focus on the center of the solar system
    }

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Point light at the sun's position to simulate sunlight
    const sunLight = new THREE.PointLight(0xffffff, 2, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Function to create a celestial body mesh
    const createCelestialBodyMesh = (
      bodyData: CelestialBodyData,
    ): THREE.Mesh => {
      const geometry = new THREE.SphereGeometry(bodyData.scale, 32, 32);

      let material: THREE.Material;
      if (bodyData.type === "star") {
        // Sun uses a bright material that glows
        material = new THREE.MeshPhongMaterial({
          color: bodyData.material.color,
          emissive: bodyData.material.emissive || bodyData.material.color,
        });
      } else {
        // Planets use Phong material to respond to lighting
        material = new THREE.MeshPhongMaterial({
          color: bodyData.material.color,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);

      // Position the body
      if (bodyData.orbitRadius) {
        // Position planets in orbit around the sun
        mesh.position.set(bodyData.orbitRadius, 0, 0);
      } else {
        // Position the sun at center
        mesh.position.copy(bodyData.position);
      }

      return mesh;
    };

    // Create and add all celestial bodies
    const celestialBodies = new Map<string, THREE.Mesh>();

    // Create the sun
    const sunMesh = createCelestialBodyMesh(solarSystemData.sun);
    scene.add(sunMesh);
    celestialBodies.set(solarSystemData.sun.id, sunMesh);

    // Create all planets
    solarSystemData.planets.forEach((planet) => {
      const planetMesh = createCelestialBodyMesh(planet);
      scene.add(planetMesh);
      celestialBodies.set(planet.id, planetMesh);
    });

    celestialBodiesRef.current = celestialBodies;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update controls if enabled
      if (controls) {
        controls.update();
      }

      // Rotate the sun
      const sunMesh = celestialBodies.get("sun");
      if (sunMesh) {
        sunMesh.rotation.y += 0.01;
      }

      // Rotate planets on their axes
      celestialBodies.forEach((mesh, id) => {
        if (id !== "sun") {
          mesh.rotation.y += 0.02; // Planets rotate faster than the sun
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);

      // Dispose of controls
      if (controls) {
        controls.dispose();
      }

      // Dispose of all celestial body geometries and materials
      celestialBodies.forEach((mesh) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [initialCameraPosition, enableControls]);

  return <div ref={mountRef} className="solar-system-scene" />;
}
