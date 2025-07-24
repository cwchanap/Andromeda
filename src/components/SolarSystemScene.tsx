import { useEffect, useRef, memo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { solarSystemData } from "../data/celestialBodies";
import type { CelestialBodyData } from "../types/game";

interface SolarSystemSceneProps {
  initialCameraPosition?: THREE.Vector3;
  enableControls?: boolean;
  onPlanetSelect?: (planet: CelestialBodyData) => void;
  selectedPlanetId?: string;
  onZoomChange?: (zoom: number) => void;
  onZoomControlsReady?: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  }) => void;
}

function SolarSystemScene({
  initialCameraPosition,
  enableControls = true,
  onPlanetSelect,
  selectedPlanetId,
  onZoomChange,
  onZoomControlsReady,
}: SolarSystemSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const celestialBodiesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredObjectRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Interaction helper functions
    const updateMousePosition = (event: MouseEvent | TouchEvent) => {
      const rect = mountRef.current!.getBoundingClientRect();
      let clientX: number, clientY: number;

      if (event instanceof TouchEvent) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findIntersectedObject = (): THREE.Mesh | null => {
      if (!cameraRef.current || !sceneRef.current) return null;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const celestialBodies = Array.from(celestialBodiesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(celestialBodies);

      return intersects.length > 0
        ? (intersects[0].object as THREE.Mesh)
        : null;
    };

    const updateHoverState = (hoveredMesh: THREE.Mesh | null) => {
      // Reset previous hover state
      if (
        hoveredObjectRef.current &&
        hoveredObjectRef.current !== hoveredMesh
      ) {
        const material = hoveredObjectRef.current
          .material as THREE.MeshPhongMaterial;
        material.emissive.setHex(0x000000); // Reset emissive
      }

      // Set new hover state
      if (hoveredMesh) {
        const material = hoveredMesh.material as THREE.MeshPhongMaterial;
        material.emissive.setHex(0x333333); // Add subtle glow
      }

      hoveredObjectRef.current = hoveredMesh;
    };

    const findCelestialBodyById = (
      mesh: THREE.Mesh,
    ): CelestialBodyData | null => {
      return mesh.userData.celestialBodyData || null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateMousePosition(event);
      const intersectedObject = findIntersectedObject();
      updateHoverState(intersectedObject);

      // Update cursor style
      if (mountRef.current) {
        mountRef.current.style.cursor = intersectedObject
          ? "pointer"
          : "default";
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        updateMousePosition(event);
        const intersectedObject = findIntersectedObject();
        updateHoverState(intersectedObject);
      }
    };

    const handleClick = (event: MouseEvent) => {
      updateMousePosition(event);
      const intersectedObject = findIntersectedObject();

      if (intersectedObject && onPlanetSelect) {
        const celestialBody = findCelestialBodyById(intersectedObject);
        if (celestialBody) {
          onPlanetSelect(celestialBody);
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        updateMousePosition(touch as unknown as MouseEvent);
        const intersectedObject = findIntersectedObject();

        if (intersectedObject && onPlanetSelect) {
          const celestialBody = findCelestialBodyById(intersectedObject);
          if (celestialBody) {
            onPlanetSelect(celestialBody);
          }
        }
      }
    };

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
      controls.screenSpacePanning = true; // Allow panning to move around freely
      controls.enablePan = true; // Enable panning
      controls.enableRotate = true; // Enable rotation/orbiting
      controls.enableZoom = true; // Enable zooming
      controls.minDistance = 5;
      controls.maxDistance = 300;
      controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
      controls.minPolarAngle = 0; // Allow full vertical rotation

      // Set initial target but allow it to move with panning
      controls.target.set(0, 0, 0);

      // Configure panning behavior for better camera movement
      controls.panSpeed = 1.0; // Adjust panning speed
      controls.rotateSpeed = 1.0; // Adjust rotation speed
      controls.zoomSpeed = 1.0; // Adjust zoom speed

      // Configure mouse button behavior for intuitive camera control
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE, // Left click + drag = rotate/orbit camera
        MIDDLE: THREE.MOUSE.DOLLY, // Middle click + drag = zoom
        RIGHT: THREE.MOUSE.PAN, // Right click + drag = pan camera
      };

      // Configure touch behavior for mobile devices
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE, // One finger = rotate
        TWO: THREE.TOUCH.DOLLY_PAN, // Two fingers = zoom and pan
      };

      // Track zoom changes
      let lastZoom = camera.position.distanceTo(controls.target);
      controls.addEventListener("change", () => {
        if (controls) {
          const currentZoom = camera.position.distanceTo(controls.target);
          if (Math.abs(currentZoom - lastZoom) > 0.1 && onZoomChange) {
            onZoomChange(currentZoom);
            lastZoom = currentZoom;
          }
        }
      });
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

      // Add user data for identification
      mesh.userData = {
        celestialBodyId: bodyData.id,
        celestialBodyData: bodyData,
      };

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
      // Early return if component is unmounted or refs are cleared
      if (
        !mountRef.current ||
        !sceneRef.current ||
        !rendererRef.current ||
        !cameraRef.current
      ) {
        return;
      }

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

      // Only render if all required objects are available
      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (error) {
        console.warn("Three.js render error:", error);
      }
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

    // Add interaction event listeners
    if (mountRef.current) {
      mountRef.current.addEventListener("mousemove", handleMouseMove);
      mountRef.current.addEventListener("click", handleClick);
      mountRef.current.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      mountRef.current.addEventListener("touchend", handleTouchEnd);
    }

    // Function to update selection states
    const updateSelectionStates = () => {
      celestialBodies.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshPhongMaterial;
        const isSelected = selectedPlanetId === id;

        // Reset to base state first
        if (mesh.userData.celestialBodyData.type === "star") {
          // Keep star's natural emissive
          material.emissive.setHex(
            parseInt(
              mesh.userData.celestialBodyData.material.emissive?.replace(
                "#",
                "0x",
              ) || "0xFFA500",
            ),
          );
        } else {
          material.emissive.setHex(0x000000);
        }

        // Add selection highlight
        if (isSelected) {
          material.emissive.addScalar(0.2); // Brighten selected object
        }
      });
    };

    // Update selection states initially and when selectedPlanetId changes
    updateSelectionStates();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);

      // Remove interaction event listeners
      if (mountRef.current) {
        mountRef.current.removeEventListener("mousemove", handleMouseMove);
        mountRef.current.removeEventListener("click", handleClick);
        mountRef.current.removeEventListener("touchmove", handleTouchMove);
        mountRef.current.removeEventListener("touchend", handleTouchEnd);
      }

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

      // Dispose of renderer and remove canvas
      if (renderer) {
        if (
          mountRef.current &&
          renderer.domElement &&
          mountRef.current.contains(renderer.domElement)
        ) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer.forceContextLoss();
      }

      // Clear refs
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      celestialBodiesRef.current.clear();
    };
  }, [
    initialCameraPosition,
    enableControls,
    selectedPlanetId,
    onPlanetSelect,
    onZoomChange,
  ]);

  // Create zoom control methods
  useEffect(() => {
    if (onZoomControlsReady && controlsRef.current && cameraRef.current) {
      const zoomControls = {
        zoomIn: () => {
          if (controlsRef.current && cameraRef.current) {
            const controls = controlsRef.current;
            const camera = cameraRef.current;
            const currentDistance = camera.position.distanceTo(controls.target);
            const newDistance = Math.max(
              currentDistance * 0.8,
              controls.minDistance,
            );

            const direction = camera.position
              .clone()
              .sub(controls.target)
              .normalize();
            camera.position
              .copy(controls.target)
              .add(direction.multiplyScalar(newDistance));

            if (onZoomChange) {
              onZoomChange(newDistance);
            }
          }
        },
        zoomOut: () => {
          if (controlsRef.current && cameraRef.current) {
            const controls = controlsRef.current;
            const camera = cameraRef.current;
            const currentDistance = camera.position.distanceTo(controls.target);
            const newDistance = Math.min(
              currentDistance * 1.25,
              controls.maxDistance,
            );

            const direction = camera.position
              .clone()
              .sub(controls.target)
              .normalize();
            camera.position
              .copy(controls.target)
              .add(direction.multiplyScalar(newDistance));

            if (onZoomChange) {
              onZoomChange(newDistance);
            }
          }
        },
        resetView: () => {
          if (cameraRef.current && controlsRef.current) {
            const camera = cameraRef.current;
            const controls = controlsRef.current;
            const defaultPosition =
              initialCameraPosition || new THREE.Vector3(0, 20, 50);

            camera.position.copy(defaultPosition);
            controls.target.set(0, 0, 0);
            camera.lookAt(0, 0, 0);
            controls.update();

            if (onZoomChange) {
              onZoomChange(camera.position.distanceTo(controls.target));
            }
          }
        },
      };

      onZoomControlsReady(zoomControls);
    }
  }, []); // Empty dependency array - only run once

  // Update selection states when selectedPlanetId changes
  useEffect(() => {
    if (celestialBodiesRef.current.size > 0) {
      celestialBodiesRef.current.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshPhongMaterial;
        const isSelected = selectedPlanetId === id;

        // Reset to base state first
        if (mesh.userData.celestialBodyData.type === "star") {
          // Keep star's natural emissive
          const emissiveColor =
            mesh.userData.celestialBodyData.material.emissive || "#FFA500";
          material.emissive.setHex(parseInt(emissiveColor.replace("#", "0x")));
        } else {
          material.emissive.setHex(0x000000);
        }

        // Add selection highlight
        if (isSelected) {
          material.emissive.addScalar(0.2); // Brighten selected object
        }
      });
    }
  }, [selectedPlanetId]);

  return <div ref={mountRef} className="solar-system-scene" />;
}

// Memoize the component to prevent unnecessary re-renders
export default memo(SolarSystemScene);
