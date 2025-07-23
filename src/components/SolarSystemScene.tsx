import { useEffect, useRef } from "react";
import * as THREE from "three";

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
      camera.position.set(0, 0, 10);
    }

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011);
    mountRef.current.appendChild(renderer.domElement);

    // Basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 0, 5);
    scene.add(directionalLight);

    // Placeholder for solar system objects (will be implemented in later tasks)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(geometry, material);
    scene.add(sun);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Basic rotation for the sun
      sun.rotation.y += 0.01;

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
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [initialCameraPosition, enableControls]);

  return <div ref={mountRef} className="solar-system-scene" />;
}
