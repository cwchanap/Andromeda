import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraState } from "./types";

interface CameraControllerEvents {
    onCameraChange?: (camera: CameraState) => void;
    onZoomChange?: (zoom: number) => void;
}

/**
 * Manages camera controls and animations
 */
export class CameraController {
    private controls: OrbitControls | null = null;
    private transitionState: {
        isTransitioning: boolean;
        startTime: number;
        duration: number;
        startPosition: THREE.Vector3;
        targetPosition: THREE.Vector3;
        startTarget: THREE.Vector3;
        targetTarget: THREE.Vector3;
    } | null = null;

    constructor(
        private camera: THREE.PerspectiveCamera,
        private events: CameraControllerEvents = {},
    ) {}

    /**
     * Initializes camera controls
     */
    initialize(domElement: HTMLElement): void {
        this.controls = new OrbitControls(this.camera, domElement);

        // Configure controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        // Swap left/right mouse drag actions
        this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

        // Set limits - increased max distance by 50x for deeper zoom out
        this.controls.maxDistance = 25000; // Was 500, now 50x more
        this.controls.minDistance = 5;
        this.controls.maxPolarAngle = Math.PI;

        // Set initial target
        this.controls.target.set(0, 0, 0);

        // Setup event listeners
        this.controls.addEventListener("change", () => {
            this.events.onCameraChange?.(this.getCameraState());
            this.events.onZoomChange?.(this.getZoom());
        });
    }

    /**
     * Updates controls (should be called in render loop)
     */
    update(): void {
        if (this.controls) {
            this.controls.update();
        }

        this.updateTransition();
    }

    /**
     * Updates camera transition animation
     */
    private updateTransition(): void {
        if (!this.transitionState || !this.transitionState.isTransitioning)
            return;

        const elapsed = performance.now() - this.transitionState.startTime;
        const progress = Math.min(elapsed / this.transitionState.duration, 1);

        // Smooth easing function
        const easeProgress = this.easeInOutCubic(progress);

        // Interpolate position
        this.camera.position.lerpVectors(
            this.transitionState.startPosition,
            this.transitionState.targetPosition,
            easeProgress,
        );

        // Interpolate target
        if (this.controls) {
            this.controls.target.lerpVectors(
                this.transitionState.startTarget,
                this.transitionState.targetTarget,
                easeProgress,
            );
        }

        // Check if transition is complete
        if (progress >= 1) {
            this.transitionState.isTransitioning = false;
            this.transitionState = null;
        }
    }

    /**
     * Easing function for smooth transitions
     */
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Animates camera to a new position
     */
    animateToPosition(
        targetPosition: THREE.Vector3,
        targetTarget: THREE.Vector3,
        duration: number = 2000,
    ): void {
        if (!this.controls) return;

        this.transitionState = {
            isTransitioning: true,
            startTime: performance.now(),
            duration,
            startPosition: this.camera.position.clone(),
            targetPosition: targetPosition.clone(),
            startTarget: this.controls.target.clone(),
            targetTarget: targetTarget.clone(),
        };
    }

    /**
     * Sets camera position immediately
     */
    setCameraPosition(position: THREE.Vector3, target?: THREE.Vector3): void {
        this.camera.position.copy(position);

        if (target && this.controls) {
            this.controls.target.copy(target);
        }

        if (this.controls) {
            this.controls.update();
        }
    }

    /**
     * Sets camera target
     */
    setTarget(target: THREE.Vector3): void {
        if (this.controls) {
            this.controls.target.copy(target);
            this.controls.update();
        }
    }

    /**
     * Gets current camera target
     */
    getTarget(): THREE.Vector3 {
        return this.controls
            ? this.controls.target.clone()
            : new THREE.Vector3();
    }

    /**
     * Zooms camera in
     */
    zoomIn(): void {
        if (!this.controls) return;

        const direction = new THREE.Vector3();
        direction
            .subVectors(this.controls.target, this.camera.position)
            .normalize();
        this.camera.position.add(direction.multiplyScalar(10));
        this.controls.update();
    }

    /**
     * Zooms camera out
     */
    zoomOut(): void {
        if (!this.controls) return;

        const direction = new THREE.Vector3();
        direction
            .subVectors(this.camera.position, this.controls.target)
            .normalize();
        this.camera.position.add(direction.multiplyScalar(10));
        this.controls.update();
    }

    /**
     * Resets camera to default view
     */
    resetView(): void {
        this.animateToPosition(
            new THREE.Vector3(0, 50, 100),
            new THREE.Vector3(0, 0, 0),
        );
    }

    /**
     * Gets current zoom level (distance from target)
     */
    getZoom(): number {
        if (!this.controls) return 50;
        return this.camera.position.distanceTo(this.controls.target);
    }

    /**
     * Enables or disables controls
     */
    enableControls(enabled: boolean): void {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
    }

    /**
     * Gets current camera state
     */
    getCameraState(): CameraState {
        return {
            position: this.camera.position.clone(),
            target: this.getTarget(),
            zoom: this.getZoom(),
        };
    }

    /**
     * Disposes of camera controls
     */
    dispose(): void {
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }

        this.transitionState = null;
    }
}
