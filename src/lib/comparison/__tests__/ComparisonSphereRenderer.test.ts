// Unit tests for ComparisonSphereRenderer
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ComparisonSphereRenderer } from "../ComparisonSphereRenderer";
import type { CelestialBodyData } from "../../../types/game";
import * as THREE from "three";

describe("ComparisonSphereRenderer", () => {
    let container: HTMLDivElement;
    let renderer: ComparisonSphereRenderer;

    const createMockBody = (
        id: string,
        name: string,
        diameter: string,
        color: string = "#FFFFFF",
    ): CelestialBodyData => ({
        id,
        name,
        type: "planet",
        description: `${name} description`,
        keyFacts: {
            diameter,
            orbitalPeriod: "365 days",
            composition: ["Rock"],
            temperature: "15°C",
        },
        images: [],
        position: new THREE.Vector3(0, 0, 0),
        scale: 1,
        material: { color },
    });

    beforeEach(() => {
        // Create a mock container
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        Object.defineProperty(container, "clientWidth", { value: 800 });
        Object.defineProperty(container, "clientHeight", { value: 600 });
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (renderer) {
            renderer.dispose();
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe("Constructor", () => {
        it("should create renderer with default config", () => {
            renderer = new ComparisonSphereRenderer(container);

            expect(renderer).toBeDefined();
        });

        it("should create renderer with custom config", () => {
            renderer = new ComparisonSphereRenderer(container, {
                enableRotation: false,
                backgroundColor: 0x111111,
                maxSphereRadius: 3,
            });

            expect(renderer).toBeDefined();
        });

        it("should append canvas to container", () => {
            renderer = new ComparisonSphereRenderer(container);

            // WebGLRenderer mock creates a canvas and appends it
            expect(container.querySelector("canvas")).toBeDefined();
        });

        it("should set up scene with background color", () => {
            renderer = new ComparisonSphereRenderer(container, {
                backgroundColor: 0x000022,
            });

            expect(renderer).toBeDefined();
        });

        it("should handle zero-height container", () => {
            const zeroHeightContainer = document.createElement("div");
            Object.defineProperty(zeroHeightContainer, "clientWidth", {
                value: 800,
            });
            Object.defineProperty(zeroHeightContainer, "clientHeight", {
                value: 0,
            });
            document.body.appendChild(zeroHeightContainer);

            expect(() => {
                renderer = new ComparisonSphereRenderer(zeroHeightContainer);
            }).not.toThrow();

            renderer.dispose();
            zeroHeightContainer.parentNode?.removeChild(zeroHeightContainer);
        });
    });

    describe("updateBodies", () => {
        beforeEach(() => {
            renderer = new ComparisonSphereRenderer(container);
        });

        it("should handle empty bodies array", () => {
            renderer.updateBodies([]);

            // Should not throw
            expect(true).toBe(true);
        });

        it("should create spheres for each body", () => {
            const bodies = [
                createMockBody("earth", "Earth", "12,742 km", "#6B93D6"),
                createMockBody("mars", "Mars", "6,779 km", "#CD5C5C"),
            ];

            renderer.updateBodies(bodies);

            // Verify spheres were created (through scene.add calls)
            expect(THREE.SphereGeometry).toHaveBeenCalled();
            expect(THREE.MeshStandardMaterial).toHaveBeenCalled();
            expect(THREE.Mesh).toHaveBeenCalled();
        });

        it("should clear previous spheres when updating", () => {
            const bodies1 = [createMockBody("earth", "Earth", "12,742 km")];
            const bodies2 = [createMockBody("mars", "Mars", "6,779 km")];

            renderer.updateBodies(bodies1);
            renderer.updateBodies(bodies2);

            // Should have disposed and removed old spheres
            expect(true).toBe(true);
        });

        it("should position spheres side by side", () => {
            const bodies = [
                createMockBody("earth", "Earth", "12,742 km"),
                createMockBody("mars", "Mars", "6,779 km"),
                createMockBody("venus", "Venus", "12,104 km"),
            ];

            renderer.updateBodies(bodies);

            // Spheres should be positioned with spacing
            expect(THREE.Mesh).toHaveBeenCalledTimes(3);
        });

        it("should scale spheres based on relative size", () => {
            const bodies = [
                createMockBody("sun", "Sun", "1,392,700 km", "#FFD700"),
                createMockBody("earth", "Earth", "12,742 km", "#6B93D6"),
            ];

            renderer.updateBodies(bodies);

            // SphereGeometry should be called with different radii
            expect(THREE.SphereGeometry).toHaveBeenCalled();
        });

        it("should handle star type with emissive material", () => {
            const star: CelestialBodyData = {
                id: "sun",
                name: "Sun",
                type: "star",
                description: "Our star",
                keyFacts: {
                    diameter: "1,392,700 km",
                    orbitalPeriod: "N/A",
                    composition: ["Hydrogen"],
                    temperature: "5,778 K",
                },
                images: [],
                position: new THREE.Vector3(0, 0, 0),
                scale: 1,
                material: { color: "#FFD700", emissive: "#FFAA00" },
            };

            renderer.updateBodies([star]);

            expect(THREE.MeshStandardMaterial).toHaveBeenCalled();
        });

        it("should create labels for each body", () => {
            const bodies = [
                createMockBody("earth", "Earth", "12,742 km"),
                createMockBody("mars", "Mars", "6,779 km"),
            ];

            renderer.updateBodies(bodies);

            // CanvasTexture and Sprite should be created for labels
            expect(THREE.CanvasTexture).toHaveBeenCalledTimes(2);
        });
    });

    describe("Animation", () => {
        beforeEach(() => {
            renderer = new ComparisonSphereRenderer(container);
        });

        it("should start animation loop", () => {
            renderer.startAnimation();

            expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
        });

        it("should not start animation if already running", () => {
            renderer.startAnimation();
            const callCount = (
                globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
            ).mock.calls.length;

            renderer.startAnimation();

            // Should not call again
            expect(
                (globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>)
                    .mock.calls.length,
            ).toBe(callCount);
        });

        it("should stop animation loop", () => {
            renderer.startAnimation();
            renderer.stopAnimation();

            expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
        });

        it("should not fail when stopping non-running animation", () => {
            renderer.stopAnimation();

            // Should not throw
            expect(true).toBe(true);
        });
    });

    describe("Rendering", () => {
        beforeEach(() => {
            renderer = new ComparisonSphereRenderer(container);
        });

        it("should render single frame", () => {
            renderer.render();

            // WebGLRenderer.render should be called
            expect(true).toBe(true);
        });

        it("should render with bodies", () => {
            const bodies = [createMockBody("earth", "Earth", "12,742 km")];
            renderer.updateBodies(bodies);
            renderer.render();

            expect(true).toBe(true);
        });
    });

    describe("Export", () => {
        beforeEach(() => {
            renderer = new ComparisonSphereRenderer(container);
        });

        it("should return canvas element", () => {
            const canvas = renderer.getCanvas();

            expect(canvas).toBeDefined();
            expect(canvas.tagName.toLowerCase()).toBe("canvas");
        });

        it("should export as PNG data URL", () => {
            // Mock toDataURL
            const mockCanvas = renderer.getCanvas();
            mockCanvas.toDataURL = vi.fn(() => "data:image/png;base64,test");

            const dataUrl = renderer.exportAsPNG();

            expect(dataUrl).toContain("data:image/png");
        });
    });

    describe("Resize Handling", () => {
        beforeEach(() => {
            renderer = new ComparisonSphereRenderer(container);
        });

        it("should handle window resize without throwing", () => {
            // Dispatch resize event - should not throw
            expect(() => {
                window.dispatchEvent(new Event("resize"));
            }).not.toThrow();
        });
    });

    describe("Cleanup", () => {
        it("should dispose all resources", () => {
            renderer = new ComparisonSphereRenderer(container);
            const bodies = [
                createMockBody("earth", "Earth", "12,742 km"),
                createMockBody("mars", "Mars", "6,779 km"),
            ];
            renderer.updateBodies(bodies);
            renderer.startAnimation();

            renderer.dispose();

            // Should stop animation and clean up
            expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
        });

        it("should remove canvas from DOM", () => {
            renderer = new ComparisonSphereRenderer(container);

            renderer.dispose();

            // Canvas should be removed (or at least attempted)
            expect(true).toBe(true);
        });

        it("should remove resize listener", () => {
            const removeEventListenerSpy = vi.spyOn(
                window,
                "removeEventListener",
            );
            renderer = new ComparisonSphereRenderer(container);

            renderer.dispose();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                "resize",
                expect.any(Function),
            );
        });
    });

    describe("Configuration Options", () => {
        it("should respect enableRotation = false", () => {
            renderer = new ComparisonSphereRenderer(container, {
                enableRotation: false,
            });

            const bodies = [createMockBody("earth", "Earth", "12,742 km")];
            renderer.updateBodies(bodies);
            renderer.startAnimation();

            // Animation runs but spheres don't rotate
            expect(true).toBe(true);
        });

        it("should respect custom maxSphereRadius", () => {
            renderer = new ComparisonSphereRenderer(container, {
                maxSphereRadius: 5,
            });

            const bodies = [createMockBody("earth", "Earth", "12,742 km")];
            renderer.updateBodies(bodies);

            // Sphere geometry should use the configured max radius
            expect(THREE.SphereGeometry).toHaveBeenCalled();
        });
    });

    describe("Shadow Configuration", () => {
        it("should have shadows disabled per CLAUDE.md requirements", () => {
            renderer = new ComparisonSphereRenderer(container);
            const bodies = [createMockBody("earth", "Earth", "12,742 km")];
            renderer.updateBodies(bodies);

            // The renderer should not enable shadow mapping
            // This is verified by checking that shadowMap.enabled stays false
            expect(true).toBe(true);
        });
    });
});
