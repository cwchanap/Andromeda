import * as THREE from "three";
import type { CelestialBodyData } from "../../types/game";
import type { CelestialBodyManager } from "./CelestialBodyManager";

interface InteractionEvents {
    onPlanetSelect?: (planet: CelestialBodyData) => void;
    onPlanetHover?: (planet: CelestialBodyData | null) => void;
}

/**
 * Manages user interactions with the solar system
 */
export class InteractionManager {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private hoveredObject: THREE.Mesh | null = null;
    private celestialBodyManager: CelestialBodyManager | null = null;

    constructor(
        private container: HTMLElement,
        private camera: THREE.PerspectiveCamera,
        private scene: THREE.Scene,
        private events: InteractionEvents = {},
    ) {}

    /**
     * Initializes interaction system
     */
    initialize(celestialBodyManager: CelestialBodyManager): void {
        this.celestialBodyManager = celestialBodyManager;
        this.setupEventListeners();
    }

    /**
     * Sets up DOM event listeners
     */
    private setupEventListeners(): void {
        this.container.addEventListener(
            "mousemove",
            this.handleMouseMove.bind(this),
        );
        this.container.addEventListener("click", this.handleClick.bind(this));
        this.container.addEventListener(
            "touchmove",
            this.handleTouchMove.bind(this),
        );
        this.container.addEventListener(
            "touchend",
            this.handleTouchEnd.bind(this),
        );
    }

    /**
     * Handles mouse movement for hover effects
     */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);
        const intersectedObject = this.findIntersectedObject();
        this.updateHoverState(intersectedObject);
        this.updateCursor(intersectedObject);
    }

    /**
     * Handles mouse clicks for selection
     */
    private handleClick(event: MouseEvent): void {
        this.updateMousePosition(event);
        const intersectedObject = this.findIntersectedObject();

        if (intersectedObject && this.celestialBodyManager) {
            const celestialBody =
                this.celestialBodyManager.getBodyData(intersectedObject);
            if (celestialBody) {
                this.events.onPlanetSelect?.(celestialBody);
            }
        }
    }

    /**
     * Handles touch movement
     */
    private handleTouchMove(event: TouchEvent): void {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.updateMousePosition(touch);
            const intersectedObject = this.findIntersectedObject();
            this.updateHoverState(intersectedObject);
        }
    }

    /**
     * Handles touch end for selection
     */
    private handleTouchEnd(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            this.updateMousePosition(touch);
            const intersectedObject = this.findIntersectedObject();

            if (intersectedObject && this.celestialBodyManager) {
                const celestialBody =
                    this.celestialBodyManager.getBodyData(intersectedObject);
                if (celestialBody) {
                    this.events.onPlanetSelect?.(celestialBody);
                }
            }
        }
    }

    /**
     * Updates mouse position in normalized device coordinates
     */
    private updateMousePosition(event: MouseEvent | Touch): void {
        const rect = this.container.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Finds intersected celestial body
     */
    private findIntersectedObject(): THREE.Mesh | null {
        if (!this.celestialBodyManager) return null;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const celestialBodies = this.celestialBodyManager.getAllBodies();
        const intersects = this.raycaster.intersectObjects(celestialBodies);

        return intersects.length > 0
            ? (intersects[0].object as THREE.Mesh)
            : null;
    }

    /**
     * Updates hover state and visual feedback
     */
    private updateHoverState(hoveredMesh: THREE.Mesh | null): void {
        // Reset previous hover state
        if (this.hoveredObject && this.hoveredObject !== hoveredMesh) {
            this.resetMaterialHover(this.hoveredObject);
        }

        // Set new hover state
        if (hoveredMesh) {
            this.setMaterialHover(hoveredMesh);
        }

        // Update hover object reference
        this.hoveredObject = hoveredMesh;

        // Notify hover event
        if (this.celestialBodyManager) {
            const celestialBody = hoveredMesh
                ? this.celestialBodyManager.getBodyData(hoveredMesh)
                : null;
            this.events.onPlanetHover?.(celestialBody);
        }
    }

    /**
     * Sets hover effect on material
     */
    private setMaterialHover(mesh: THREE.Mesh): void {
        const material = mesh.material;

        if (material instanceof THREE.MeshStandardMaterial) {
            // For standard materials (planets), adjust emissive color
            if (!material.userData.originalEmissive) {
                material.userData.originalEmissive = material.emissive.clone();
            }
            material.emissive.setHex(0x333333);
        } else if (material instanceof THREE.MeshBasicMaterial) {
            // For basic materials (stars), adjust opacity or add outline effect
            if (!material.userData.originalOpacity) {
                material.userData.originalOpacity = material.opacity;
            }
            material.opacity = Math.min(1.0, material.opacity * 1.2);
        } else if (material instanceof THREE.MeshPhongMaterial) {
            // Fallback for any remaining phong materials
            material.emissive.setHex(0x333333);
        }
    }

    /**
     * Resets hover effect on material
     */
    private resetMaterialHover(mesh: THREE.Mesh): void {
        const material = mesh.material;

        if (material instanceof THREE.MeshStandardMaterial) {
            // Reset emissive color
            if (material.userData.originalEmissive) {
                material.emissive.copy(material.userData.originalEmissive);
            } else {
                material.emissive.setHex(0x000000);
            }
        } else if (material instanceof THREE.MeshBasicMaterial) {
            // Reset opacity
            if (material.userData.originalOpacity !== undefined) {
                material.opacity = material.userData.originalOpacity;
            }
        } else if (material instanceof THREE.MeshPhongMaterial) {
            // Fallback for any remaining phong materials
            material.emissive.setHex(0x000000);
        }
    }

    /**
     * Updates cursor style based on hover state
     */
    private updateCursor(hoveredMesh: THREE.Mesh | null): void {
        this.container.style.cursor = hoveredMesh ? "pointer" : "default";
    }

    /**
     * Removes event listeners and cleans up
     */
    dispose(): void {
        this.container.removeEventListener(
            "mousemove",
            this.handleMouseMove.bind(this),
        );
        this.container.removeEventListener(
            "click",
            this.handleClick.bind(this),
        );
        this.container.removeEventListener(
            "touchmove",
            this.handleTouchMove.bind(this),
        );
        this.container.removeEventListener(
            "touchend",
            this.handleTouchEnd.bind(this),
        );

        // Reset hover state
        if (this.hoveredObject) {
            const material = this.hoveredObject
                .material as THREE.MeshPhongMaterial;
            material.emissive.setHex(0x000000);
            this.hoveredObject = null;
        }

        this.celestialBodyManager = null;
    }
}
