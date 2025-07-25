import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ParticleSystemProps {
  particleCount?: number;
  size?: number;
  speed?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function ParticleSystem({
  particleCount = 100,
  size = 2,
  speed = 0.001,
  color = "#ffffff",
  opacity = 0.6,
  className = "",
}: ParticleSystemProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

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
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false, // Disable for performance
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      color: color,
      size: size,
      opacity: opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    // Generate particle positions
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random positions across the screen
      positions[i * 3] = (Math.random() - 0.5) * window.innerWidth;
      positions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
      positions[i * 3 + 2] = Math.random() * 100;

      // Random velocities for floating effect
      velocities[i * 3] = (Math.random() - 0.5) * speed * 100;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 100;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed * 50;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.userData = { velocities };

    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !particlesRef.current) {
        return;
      }

      animationIdRef.current = requestAnimationFrame(animate);

      // Update particle positions
      const positions = particlesRef.current.geometry.attributes.position
        .array as Float32Array;
      const velocities = particlesRef.current.geometry.userData
        .velocities as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Update positions based on velocities
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Wrap particles around screen edges
        if (positions[i * 3] > window.innerWidth / 2) {
          positions[i * 3] = -window.innerWidth / 2;
        } else if (positions[i * 3] < -window.innerWidth / 2) {
          positions[i * 3] = window.innerWidth / 2;
        }

        if (positions[i * 3 + 1] > window.innerHeight / 2) {
          positions[i * 3 + 1] = -window.innerHeight / 2;
        } else if (positions[i * 3 + 1] < -window.innerHeight / 2) {
          positions[i * 3 + 1] = window.innerHeight / 2;
        }
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      rendererRef.current.render(sceneRef.current, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!rendererRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (particlesRef.current) {
        if (particlesRef.current.geometry) {
          particlesRef.current.geometry.dispose();
        }
        if (particlesRef.current.material) {
          (particlesRef.current.material as THREE.Material).dispose();
        }
      }

      if (rendererRef.current) {
        if (mountRef.current && rendererRef.current.domElement) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }

      sceneRef.current = null;
      rendererRef.current = null;
      particlesRef.current = null;
      animationIdRef.current = null;
    };
  }, [particleCount, size, speed, color, opacity]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      style={{
        background: "transparent",
        mixBlendMode: "screen",
      }}
    />
  );
}

// Floating dust particles for ambient effect
export function AmbientParticles() {
  return (
    <ParticleSystem
      particleCount={50}
      size={1}
      speed={0.0005}
      color="#ffffff"
      opacity={0.3}
      className="opacity-50"
    />
  );
}

// More dramatic space dust for loading screens
export function SpaceDust() {
  return (
    <ParticleSystem
      particleCount={200}
      size={1.5}
      speed={0.002}
      color="#4a90e2"
      opacity={0.7}
      className="opacity-70"
    />
  );
}
