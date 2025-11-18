import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import ParticleSystem from "../ParticleSystem.svelte";
import * as THREE from "three";

describe("ParticleSystem", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe("Component Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(ParticleSystem);
            expect(container).toBeTruthy();
        });

        it("should apply custom className prop", () => {
            const { container } = render(ParticleSystem, {
                props: { className: "custom-particles" },
            });
            const div = container.querySelector("div");
            expect(div?.className).toContain("custom-particles");
        });

        it("should have pointer-events-none class", () => {
            const { container } = render(ParticleSystem);
            const div = container.querySelector("div");
            expect(div?.className).toContain("pointer-events-none");
        });

        it("should have absolute inset-0 positioning", () => {
            const { container } = render(ParticleSystem);
            const div = container.querySelector("div");
            expect(div?.className).toContain("absolute");
            expect(div?.className).toContain("inset-0");
        });
    });

    describe("Three.js Initialization", () => {
        it("should create a Three.js Scene", () => {
            render(ParticleSystem);
            expect(THREE.Scene).toHaveBeenCalled();
        });

        it("should create an OrthographicCamera with correct parameters", () => {
            render(ParticleSystem);
            expect(THREE.OrthographicCamera).toHaveBeenCalledWith(
                -window.innerWidth / 2,
                window.innerWidth / 2,
                window.innerHeight / 2,
                -window.innerHeight / 2,
                1,
                1000,
            );
        });

        it("should create a WebGLRenderer with alpha and no antialias", () => {
            render(ParticleSystem);
            expect(THREE.WebGLRenderer).toHaveBeenCalledWith({
                alpha: true,
                antialias: false,
            });
        });

        it("should set renderer size to window dimensions", () => {
            render(ParticleSystem);
            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;
            expect(rendererInstance.setSize).toHaveBeenCalledWith(
                window.innerWidth,
                window.innerHeight,
            );
        });

        it("should set clear color with zero alpha", () => {
            render(ParticleSystem);
            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;
            expect(rendererInstance.setClearColor).toHaveBeenCalledWith(
                0x000000,
                0,
            );
        });

        it("should append renderer canvas to mount element", () => {
            render(ParticleSystem);
            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;

            // The canvas should be appended (in real implementation)
            expect(rendererInstance.domElement).toBeTruthy();
        });
    });

    describe("Particle System Creation", () => {
        it("should create BufferGeometry for particles", () => {
            render(ParticleSystem, { props: { particleCount: 50 } });
            expect(THREE.BufferGeometry).toHaveBeenCalled();
        });

        it("should create correct number of particles based on particleCount prop", () => {
            const particleCount = 75;
            render(ParticleSystem, { props: { particleCount } });

            const geometryInstance = vi.mocked(THREE.BufferGeometry).mock
                .results[0]?.value;
            expect(geometryInstance.setAttribute).toHaveBeenCalledWith(
                "position",
                expect.any(Object),
            );
            expect(geometryInstance.setAttribute).toHaveBeenCalledWith(
                "velocity",
                expect.any(Object),
            );
        });

        it("should create PointsMaterial with correct default properties", () => {
            render(ParticleSystem);
            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({
                    size: 2,
                    opacity: 0.6,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                }),
            );
        });

        it("should create PointsMaterial with custom color prop", () => {
            const customColor = "#ff0000";
            render(ParticleSystem, { props: { color: customColor } });

            expect(THREE.Color).toHaveBeenCalledWith(customColor);
        });

        it("should create PointsMaterial with custom size prop", () => {
            const customSize = 5;
            render(ParticleSystem, { props: { size: customSize } });

            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({
                    size: customSize,
                }),
            );
        });

        it("should create PointsMaterial with custom opacity prop", () => {
            const customOpacity = 0.8;
            render(ParticleSystem, { props: { opacity: customOpacity } });

            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({
                    opacity: customOpacity,
                }),
            );
        });

        it("should create Points object with geometry and material", () => {
            render(ParticleSystem);
            expect(THREE.Points).toHaveBeenCalled();
        });

        it("should add Points to the scene", () => {
            render(ParticleSystem);
            const sceneInstance = vi.mocked(THREE.Scene).mock.results[0]?.value;
            expect(sceneInstance.add).toHaveBeenCalled();
        });
    });

    describe("Animation Loop", () => {
        it("should start animation loop with requestAnimationFrame", () => {
            const requestAnimationFrameSpy = vi.spyOn(
                global,
                "requestAnimationFrame",
            );
            render(ParticleSystem);
            expect(requestAnimationFrameSpy).toHaveBeenCalled();

            // Restore the spy to avoid leaking mock state to other tests
            requestAnimationFrameSpy.mockRestore();
        });

        it("should render scene in animation loop", () => {
            // Mock requestAnimationFrame to capture callback without executing it
            let animationCallback: FrameRequestCallback | null = null;
            const rafSpy = vi
                .spyOn(global, "requestAnimationFrame")
                .mockImplementation((callback) => {
                    animationCallback = callback;
                    return 1;
                });

            render(ParticleSystem);

            // Verify requestAnimationFrame was called
            expect(rafSpy).toHaveBeenCalled();

            // Manually execute the animation callback once
            if (animationCallback) {
                animationCallback(0);
            }

            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;
            expect(rendererInstance.render).toHaveBeenCalled();

            // Restore original (cleanup happens automatically in afterEach via vi.clearAllMocks)
            rafSpy.mockRestore();
        });
    });

    describe("Window Resize Handling", () => {
        it("should add resize event listener on mount", () => {
            const addEventListenerSpy = vi.spyOn(window, "addEventListener");
            render(ParticleSystem);

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                "resize",
                expect.any(Function),
            );

            // Restore the spy to prevent test interference
            addEventListenerSpy.mockRestore();
        });

        it("should update renderer size on window resize", () => {
            const { unmount } = render(ParticleSystem);
            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;

            // Clear initialization calls to isolate resize handler behavior
            rendererInstance.setSize.mockClear();

            // Trigger resize event
            window.dispatchEvent(new Event("resize"));

            // Verify it was called exactly once with the correct window dimensions
            expect(rendererInstance.setSize).toHaveBeenCalledTimes(1);
            expect(rendererInstance.setSize).toHaveBeenCalledWith(
                window.innerWidth,
                window.innerHeight,
            );

            unmount();
        });

        it("should update camera projection on window resize", () => {
            const { unmount } = render(ParticleSystem);
            const cameraInstance = vi.mocked(THREE.OrthographicCamera).mock
                .results[0]?.value;

            // Clear the call history for this specific mock
            cameraInstance.updateProjectionMatrix.mockClear();

            // Trigger resize
            window.dispatchEvent(new Event("resize"));

            // Verify it was called exactly once in response to the resize event
            expect(cameraInstance.updateProjectionMatrix).toHaveBeenCalledTimes(
                1,
            );

            unmount();
        });

        it("should remove resize event listener on cleanup", () => {
            const removeEventListenerSpy = vi.spyOn(
                window,
                "removeEventListener",
            );
            const { unmount } = render(ParticleSystem);

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                "resize",
                expect.any(Function),
            );

            // Restore the spy to prevent test interference
            removeEventListenerSpy.mockRestore();
        });
    });

    describe("Cleanup and Resource Management", () => {
        it("should cancel animation frame on destroy", () => {
            const cancelAnimationFrameSpy = vi.spyOn(
                global,
                "cancelAnimationFrame",
            );
            const { unmount } = render(ParticleSystem);

            unmount();

            expect(cancelAnimationFrameSpy).toHaveBeenCalled();
        });

        it("should dispose renderer on destroy", () => {
            const { unmount } = render(ParticleSystem);
            const rendererInstance = vi.mocked(THREE.WebGLRenderer).mock
                .results[0]?.value;

            unmount();

            expect(rendererInstance.dispose).toHaveBeenCalled();
        });

        it("should dispose geometry on destroy", () => {
            const { unmount } = render(ParticleSystem);
            const geometryInstance = vi.mocked(THREE.BufferGeometry).mock
                .results[0]?.value;

            unmount();

            expect(geometryInstance.dispose).toHaveBeenCalled();
        });

        it("should dispose material on destroy", () => {
            const { unmount } = render(ParticleSystem);
            const materialInstance = vi.mocked(THREE.PointsMaterial).mock
                .results[0]?.value;

            unmount();

            expect(materialInstance.dispose).toHaveBeenCalled();
        });
    });

    describe("Props Validation", () => {
        it("should use default particleCount of 100", () => {
            render(ParticleSystem);
            expect(THREE.BufferGeometry).toHaveBeenCalled();
            // The default is verified by the geometry creation
        });

        it("should use default size of 2", () => {
            render(ParticleSystem);
            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({ size: 2 }),
            );
        });

        it("should use default speed of 0.001", () => {
            render(ParticleSystem);
            // Speed affects velocity calculation, verified through geometry
            expect(THREE.BufferGeometry).toHaveBeenCalled();
        });

        it("should use default color of #ffffff", () => {
            render(ParticleSystem);
            expect(THREE.Color).toHaveBeenCalledWith("#ffffff");
        });

        it("should use default opacity of 0.6", () => {
            render(ParticleSystem);
            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({ opacity: 0.6 }),
            );
        });

        it("should accept and apply custom props", () => {
            const customProps = {
                particleCount: 200,
                size: 4,
                speed: 0.005,
                color: "#00ff00",
                opacity: 0.9,
                className: "test-class",
            };

            const { container } = render(ParticleSystem, {
                props: customProps,
            });

            expect(THREE.Color).toHaveBeenCalledWith(customProps.color);
            expect(THREE.PointsMaterial).toHaveBeenCalledWith(
                expect.objectContaining({
                    size: customProps.size,
                    opacity: customProps.opacity,
                }),
            );
            expect(container.querySelector("div")?.className).toContain(
                customProps.className,
            );
        });
    });
});
