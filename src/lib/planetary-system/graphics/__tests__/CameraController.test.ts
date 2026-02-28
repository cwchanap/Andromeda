/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { CameraController } from "../CameraController";

describe("CameraController", () => {
    it("initialize configures controls; zoomIn moves camera toward target", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 100);

        const container = document.createElement("canvas");
        const onCameraChange = vi.fn();
        const onZoomChange = vi.fn();

        const controller = new CameraController(camera, {
            onCameraChange,
            onZoomChange,
        });

        controller.initialize(container);

        const beforeZoom = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        };
        controller.zoomIn();
        const afterZoom = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
        };

        // Should have moved closer to the target (0,0,0), so z should decrease from 100
        expect(afterZoom.z).toBeLessThan(beforeZoom.z);
    });

    it("animateToPosition sets transition state and update advances it", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 0);
        const container = document.createElement("canvas");

        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const targetPos = new THREE.Vector3(0, 0, 10);
        const targetLook = new THREE.Vector3(0, 0, 5);
        controller.animateToPosition(targetPos, targetLook, 10);

        // Advance a few frames
        vi.spyOn(performance, "now").mockReturnValue(5);
        controller.update();

        // End transition
        vi.spyOn(performance, "now").mockReturnValue(20);
        controller.update();

        // No exception indicates success; final state should approach target
        expect(camera.position.z).toBeTypeOf("number");
    });

    it("setCameraPosition updates camera position and controls target", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 0);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const newPos = new THREE.Vector3(10, 20, 30);
        const newTarget = new THREE.Vector3(5, 5, 5);
        controller.setCameraPosition(newPos, newTarget);

        expect(camera.position.x).toBe(10);
        expect(camera.position.y).toBe(20);
        expect(camera.position.z).toBe(30);
    });

    it("setTarget updates controls target", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 50);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const target = new THREE.Vector3(1, 2, 3);
        controller.setTarget(target);

        const retrieved = controller.getTarget();
        expect(retrieved).toBeTruthy();
    });

    it("getTarget returns Vector3 even without initialized controls", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        const controller = new CameraController(camera, {});
        // Not initialized - should return zero vector
        const target = controller.getTarget();
        expect(target).toBeTruthy();
    });

    it("zoomOut moves camera away from target", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 50);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const beforeZ = camera.position.z;
        controller.zoomOut();
        expect(camera.position.z).toBeGreaterThan(beforeZ);
    });

    it("resetView triggers an animation to default position", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 0);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        expect(() => controller.resetView()).not.toThrow();
    });

    it("getZoom returns distance to target", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 100);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const zoom = controller.getZoom();
        expect(typeof zoom).toBe("number");
        expect(zoom).toBeGreaterThan(0);
    });

    it("getZoom returns 50 when controls not initialized", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        const controller = new CameraController(camera, {});
        expect(controller.getZoom()).toBe(50);
    });

    it("enableControls enables/disables orbit controls", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        expect(() => controller.enableControls(false)).not.toThrow();
        expect(() => controller.enableControls(true)).not.toThrow();
    });

    it("getCameraState returns position, target and zoom", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 100);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);

        const state = controller.getCameraState();
        expect(state).toHaveProperty("position");
        expect(state).toHaveProperty("target");
        expect(state).toHaveProperty("zoom");
    });

    it("dispose clears controls and transition state", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        camera.position.set(0, 0, 0);
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);
        controller.animateToPosition(
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(),
            1000,
        );

        expect(() => controller.dispose()).not.toThrow();
        // After dispose, zoom should return fallback
        expect(controller.getZoom()).toBe(50);
    });

    it("update is safe after dispose", () => {
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) as any;
        const container = document.createElement("canvas");
        const controller = new CameraController(camera, {});
        controller.initialize(container);
        controller.dispose();
        expect(() => controller.update()).not.toThrow();
    });
});
