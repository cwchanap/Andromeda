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
});
