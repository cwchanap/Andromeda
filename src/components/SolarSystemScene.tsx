import { useEffect, useRef, memo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { solarSystemData } from "../data/celestialBodies";
import type { CelestialBodyData } from "../types/game";
import type { MobileOptimizationSettings } from "../hooks/useMobileOptimization";

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
  mobileOptimization?: MobileOptimizationSettings;
}

function SolarSystemScene({
  initialCameraPosition,
  enableControls = true,
  onPlanetSelect,
  selectedPlanetId,
  onZoomChange,
  onZoomControlsReady,
  mobileOptimization,
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

    // Keyboard controls for enhanced navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!controlsRef.current || !cameraRef.current) return;

      const controls = controlsRef.current;
      const camera = cameraRef.current;

      switch (event.code) {
        case "KeyW":
        case "ArrowUp": {
          // Move forward
          event.preventDefault();
          const forwardDirection = new THREE.Vector3(0, 0, -1);
          forwardDirection.applyQuaternion(camera.quaternion);
          camera.position.add(forwardDirection.multiplyScalar(2));
          controls.target.add(forwardDirection.multiplyScalar(2));
          break;
        }

        case "KeyS":
        case "ArrowDown": {
          // Move backward
          event.preventDefault();
          const backwardDirection = new THREE.Vector3(0, 0, 1);
          backwardDirection.applyQuaternion(camera.quaternion);
          camera.position.add(backwardDirection.multiplyScalar(2));
          controls.target.add(backwardDirection.multiplyScalar(2));
          break;
        }

        case "KeyA":
        case "ArrowLeft": {
          // Move left
          event.preventDefault();
          const leftDirection = new THREE.Vector3(-1, 0, 0);
          leftDirection.applyQuaternion(camera.quaternion);
          camera.position.add(leftDirection.multiplyScalar(2));
          controls.target.add(leftDirection.multiplyScalar(2));
          break;
        }

        case "KeyD":
        case "ArrowRight": {
          // Move right
          event.preventDefault();
          const rightDirection = new THREE.Vector3(1, 0, 0);
          rightDirection.applyQuaternion(camera.quaternion);
          camera.position.add(rightDirection.multiplyScalar(2));
          controls.target.add(rightDirection.multiplyScalar(2));
          break;
        }

        case "Equal":
        case "NumpadAdd":
          // Zoom in
          event.preventDefault();
          break;

        case "Minus":
        case "NumpadSubtract":
          // Zoom out
          event.preventDefault();
          break;

        case "KeyR":
        case "Home":
          // Reset view
          event.preventDefault();
          break;
      }

      controls.update();
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

    // Renderer setup with mobile optimization
    const renderer = new THREE.WebGLRenderer({
      antialias: mobileOptimization?.antialias ?? true,
    });
    rendererRef.current = renderer;

    // Apply mobile optimization settings
    const pixelRatio =
      mobileOptimization?.pixelRatio ?? window.devicePixelRatio;
    renderer.setPixelRatio(Math.min(pixelRatio, 2)); // Cap at 2x for performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011);

    // Enable/disable shadow maps based on mobile optimization
    if (mobileOptimization?.shadowMapEnabled ?? true) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    mountRef.current.appendChild(renderer.domElement);

    // Camera controls setup
    let controls: OrbitControls | null = null;
    if (enableControls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;

      // Configure controls for solar system exploration with smooth constraints
      controls.enableDamping = true;
      controls.dampingFactor = 0.08; // Slightly more damping for smoother movement
      controls.screenSpacePanning = true; // Allow panning to move around freely
      controls.enablePan = true; // Enable panning
      controls.enableRotate = true; // Enable rotation/orbiting
      controls.enableZoom = true; // Enable zooming

      // Enhanced distance constraints for better exploration
      controls.minDistance = 5;
      controls.maxDistance = 300;

      // Vertical rotation constraints to prevent disorientation
      controls.maxPolarAngle = Math.PI * 0.95; // Prevent going completely under
      controls.minPolarAngle = Math.PI * 0.05; // Prevent going completely over

      // Horizontal rotation is unlimited for full exploration
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;

      // Set initial target but allow it to move with panning
      controls.target.set(0, 0, 0);

      // Configure movement speeds for smooth and intuitive control
      controls.panSpeed = 0.8; // Slightly slower panning for precision
      controls.rotateSpeed = 0.5; // Moderate rotation speed
      controls.zoomSpeed = 0.6; // Controlled zoom speed

      // Enable auto-rotation stop when user interacts
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0; // Configure mouse button behavior for intuitive camera control
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN, // Left click + drag = pan camera
        MIDDLE: THREE.MOUSE.DOLLY, // Middle click + drag = zoom
        RIGHT: THREE.MOUSE.ROTATE, // Right click + drag = rotate/orbit camera
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

    // Function to create a celestial body mesh with mobile optimization
    const createCelestialBodyMesh = (
      bodyData: CelestialBodyData,
    ): THREE.Mesh => {
      // Use optimized geometry segments for mobile
      const segments = mobileOptimization?.sphereSegments ?? 32;
      const geometry = new THREE.SphereGeometry(
        bodyData.scale,
        segments,
        segments,
      );

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

    // Add keyboard event listener for camera controls
    window.addEventListener("keydown", handleKeyDown);

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
      window.removeEventListener("keydown", handleKeyDown);

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

  // Create zoom control methods with smooth transitions
  useEffect(() => {
    if (onZoomControlsReady && controlsRef.current && cameraRef.current) {
      // Animation state
      let isAnimating = false;

      const animateCamera = (
        targetPosition: THREE.Vector3,
        targetLookAt: THREE.Vector3,
        duration: number = 500,
      ) => {
        if (isAnimating || !cameraRef.current || !controlsRef.current) return;

        isAnimating = true;
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Smooth easing function
          const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          const easedProgress = easeInOutCubic(progress);

          // Interpolate camera position
          camera.position.lerpVectors(
            startPosition,
            targetPosition,
            easedProgress,
          );
          controls.target.lerpVectors(startTarget, targetLookAt, easedProgress);

          controls.update();

          if (onZoomChange) {
            onZoomChange(camera.position.distanceTo(controls.target));
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            isAnimating = false;
          }
        };

        requestAnimationFrame(animate);
      };

      const zoomControls = {
        zoomIn: () => {
          if (controlsRef.current && cameraRef.current && !isAnimating) {
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
            const targetPosition = controls.target
              .clone()
              .add(direction.multiplyScalar(newDistance));

            animateCamera(targetPosition, controls.target.clone(), 300);
          }
        },
        zoomOut: () => {
          if (controlsRef.current && cameraRef.current && !isAnimating) {
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
            const targetPosition = controls.target
              .clone()
              .add(direction.multiplyScalar(newDistance));

            animateCamera(targetPosition, controls.target.clone(), 300);
          }
        },
        resetView: () => {
          if (cameraRef.current && controlsRef.current && !isAnimating) {
            const defaultPosition =
              initialCameraPosition || new THREE.Vector3(0, 20, 50);
            const defaultTarget = new THREE.Vector3(0, 0, 0);

            animateCamera(defaultPosition, defaultTarget, 800);
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
