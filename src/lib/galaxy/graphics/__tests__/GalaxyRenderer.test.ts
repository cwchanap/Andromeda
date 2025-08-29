/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { GalaxyRenderer } from "../GalaxyRenderer";
import { GalaxySceneManager } from "../GalaxySceneManager";
import type { GalaxyData, GalaxyConfig, GalaxyEvents } from "../../types";

describe("GalaxyRenderer", () => {
    let container: HTMLElement;
    let mockGalaxyData: GalaxyData;
    let mockConfig: Partial<GalaxyConfig>;
    let mockEvents: GalaxyEvents;

    beforeEach(() => {
        // Setup DOM container
        container = document.createElement("div");
        Object.defineProperty(container, "clientWidth", {
            value: 800,
            writable: true,
        });
        Object.defineProperty(container, "clientHeight", {
            value: 600,
            writable: true,
        });
        document.body.appendChild(container);

        // Mock galaxy data
        mockGalaxyData = {
            id: "milky-way",
            name: "Milky Way",
            description: "Our galaxy",
            starSystems: [
                {
                    id: "sol",
                    name: "Solar System",
                    description: "Our solar system",
                    systemType: "solar",
                    position: new THREE.Vector3(0, 0, 0),
                    distanceFromEarth: 0,
                    stars: [
                        {
                            id: "sun",
                            name: "Sun",
                            type: "star",
                            description:
                                "The star at the center of our solar system",
                            keyFacts: {
                                diameter: "1,392,700 km",
                                distanceFromSun: "0 km",
                                orbitalPeriod: "N/A",
                                composition: ["Hydrogen", "Helium"],
                                temperature: "5,500°C",
                            },
                            images: ["/images/sun.jpg"],
                            scale: 1.0,
                            position: new THREE.Vector3(0, 0, 0),
                            material: {
                                color: "#FFFF00",
                                emissive: "#444400",
                            },
                        },
                    ],
                    metadata: {
                        spectralClass: "G2V",
                        hasExoplanets: true,
                        numberOfPlanets: 8,
                        habitableZone: true,
                    },
                    visual: {
                        brightness: 1.0,
                        colorIndex: 0.65,
                        scale: 1.0,
                        glowIntensity: 0.5,
                    },
                },
            ],
            center: new THREE.Vector3(0, 0, 0),
            scale: 1.0,
            boundingRadius: 50000,
        };

        // Mock configuration
        mockConfig = {
            enableControls: true,
            enableAnimations: true,
            enableMobileOptimization: false,
            antialiasing: true,
            performanceMode: "medium",
            starFieldDensity: 1.0,
            backgroundStarCount: 2000,
            enableStarLabels: true,
            enableDistanceIndicators: true,
            maxRenderDistance: 50,
            enableBloom: false,
            enableStarGlow: true,
            starGlowIntensity: 1.0,
        };

        // Mock events
        mockEvents = {
            onStarSystemSelect: vi.fn(),
            onCameraChange: vi.fn(),
            onSystemLoad: vi.fn(),
            onError: vi.fn(),
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it("initializes with correct default configuration", () => {
        const renderer = new GalaxyRenderer(container);

        expect(renderer).toBeDefined();
        expect(container.children.length).toBe(1); // Canvas added during construction
        expect(container.children[0].tagName.toLowerCase()).toBe("canvas");
    });

    it("initializes with custom configuration", () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);

        expect(renderer).toBeDefined();
    });

    it("initializes successfully with galaxy data", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);

        await expect(
            renderer.initialize(mockGalaxyData),
        ).resolves.toBeUndefined();

        expect(mockEvents.onSystemLoad).toHaveBeenCalled();
        expect(container.children.length).toBe(1); // Canvas should be added
    });

    it("handles initialization errors gracefully", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);

        // Mock scene manager initialization to throw error
        const errorMessage = "Scene initialization failed";
        vi.spyOn(
            GalaxySceneManager.prototype,
            "initialize",
        ).mockRejectedValueOnce(new Error(errorMessage));

        await expect(renderer.initialize(mockGalaxyData)).rejects.toThrow(
            errorMessage,
        );
        expect(mockEvents.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("prevents double initialization", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);

        await renderer.initialize(mockGalaxyData);

        // Second initialization should be ignored
        const consoleSpy = vi.spyOn(console, "warn");
        await renderer.initialize(mockGalaxyData);

        expect(consoleSpy).toHaveBeenCalledWith(
            "GalaxyRenderer already initialized",
        );
    });

    it("sets up renderer with correct configuration", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Check that renderer was configured correctly
        const webGLRenderer = (renderer as any).renderer;
        expect(webGLRenderer.setSize).toHaveBeenCalledWith(800, 600);
        expect(webGLRenderer.setPixelRatio).toHaveBeenCalled();
        expect(webGLRenderer.shadowMap.enabled).toBe(false);
    });

    it("sets up camera with correct properties", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const camera = (renderer as any).camera;
        expect(camera.aspect).toBe(800 / 600);
        expect(camera.near).toBe(0.1);
        expect(camera.far).toBe(1000);
    });

    it("sets up orbit controls correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const controls = (renderer as any).controls;
        expect(controls.enableDamping).toBe(true);
        expect(controls.dampingFactor).toBe(0.05);
        expect(controls.enableZoom).toBe(true);
        expect(controls.enableRotate).toBe(true);
        expect(controls.enablePan).toBe(true);
    });

    it("handles window resize correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Change container size
        Object.defineProperty(container, "clientWidth", {
            value: 1024,
            writable: true,
        });
        Object.defineProperty(container, "clientHeight", {
            value: 768,
            writable: true,
        });

        renderer.onResize();

        const camera = (renderer as any).camera;
        const webGLRenderer = (renderer as any).renderer;

        expect(camera.aspect).toBe(1024 / 768);
        expect(webGLRenderer.setSize).toHaveBeenCalledWith(1024, 768);
    });

    it("starts and stops render loop correctly", async () => {
        // Mock requestAnimationFrame before initializing
        const mockRaf = vi
            .spyOn(global, "requestAnimationFrame")
            .mockImplementation((callback) => {
                // Execute callback once to simulate frame
                setTimeout(() => callback(performance.now()), 0);
                return 1;
            });

        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Check that animation loop is started
        expect((renderer as any).animationId).not.toBeNull();

        // The render loop should have been started during initialization
        expect(mockRaf).toHaveBeenCalled();

        mockRaf.mockRestore();
    });

    it("updates scene elements correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const updateSpy = vi.spyOn(renderer as any, "update");
        const renderSpy = vi.spyOn(renderer as any, "render");

        // Manually call update and render (normally done by animation loop)
        (renderer as any).update();
        (renderer as any).render();

        expect(updateSpy).toHaveBeenCalled();
        expect(renderSpy).toHaveBeenCalled();
    });

    it("handles mouse click events correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Create a mock star mesh
        const mockStarMesh = new THREE.Mesh();
        mockStarMesh.userData = { systemId: "sol" };

        // Mock the star system manager methods
        const starSystemManager = (renderer as any).starSystemManager;
        vi.spyOn(starSystemManager, "getAllStarMeshes").mockReturnValue([
            mockStarMesh,
        ]);
        vi.spyOn(starSystemManager, "getSystemIdFromMesh").mockReturnValue(
            "sol",
        );

        // Mock raycaster intersection
        globalThis.__threeRaycasterIntersects = [{ object: mockStarMesh }];

        // Create and dispatch click event
        const clickEvent = new MouseEvent("click", {
            clientX: 400,
            clientY: 300,
        });

        const canvas = container.querySelector("canvas");
        expect(canvas).toBeTruthy();

        canvas!.dispatchEvent(clickEvent);

        expect(mockEvents.onStarSystemSelect).toHaveBeenCalledWith(
            mockGalaxyData.starSystems[0],
        );
    });

    it("handles mouse move hover effects", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Create a mock star mesh
        const mockStarMesh = new THREE.Mesh();
        mockStarMesh.userData = { systemId: "sol" };

        // Mock the star system manager methods
        const starSystemManager = (renderer as any).starSystemManager;
        vi.spyOn(starSystemManager, "getAllStarMeshes").mockReturnValue([
            mockStarMesh,
        ]);
        vi.spyOn(starSystemManager, "getSystemIdFromMesh").mockReturnValue(
            "sol",
        );

        // Mock raycaster intersection
        globalThis.__threeRaycasterIntersects = [{ object: mockStarMesh }];

        // Create and dispatch mousemove event
        const moveEvent = new MouseEvent("mousemove", {
            clientX: 400,
            clientY: 300,
        });

        const canvas = container.querySelector("canvas");
        canvas!.dispatchEvent(moveEvent);

        // Should highlight the system
        expect((renderer as any).hoveredSystemId).toBe("sol");
    });

    it("focuses on star system correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        renderer.focusOnStarSystem("sol");

        const controls = (renderer as any).controls;
        expect(controls.target).toBeDefined();
        expect(controls.update).toHaveBeenCalled();
    });

    it("highlights star system correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        // Mock the star system manager method
        const starSystemManager = (renderer as any).starSystemManager;
        const highlightSpy = vi.spyOn(starSystemManager, "highlightStarSystem");

        renderer.highlightStarSystem("sol", true);

        // The star system manager should handle the highlighting
        expect(highlightSpy).toHaveBeenCalledWith("sol", true);
    });

    it("gets camera state correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const cameraState = renderer.getCameraState();

        expect(cameraState).toHaveProperty("position");
        expect(cameraState).toHaveProperty("target");
        expect(cameraState).toHaveProperty("zoom");
        expect(cameraState).toHaveProperty("fov");
    });

    it("sets camera state correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const newState = {
            position: new THREE.Vector3(10, 10, 10),
            target: new THREE.Vector3(0, 0, 0),
            fov: 60,
        };

        renderer.setCameraState(newState);

        const camera = (renderer as any).camera;
        const controls = (renderer as any).controls;

        expect(camera.position.x).toBe(newState.position.x);
        expect(camera.position.y).toBe(newState.position.y);
        expect(camera.position.z).toBe(newState.position.z);
        expect(controls.target.x).toBe(newState.target.x);
        expect(controls.target.y).toBe(newState.target.y);
        expect(controls.target.z).toBe(newState.target.z);
        expect(camera.fov).toBe(60);
    });

    it("gets rendering statistics correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const stats = renderer.getStats();

        expect(stats).toHaveProperty("fps");
        expect(stats).toHaveProperty("frameTime");
        expect(stats).toHaveProperty("starSystemCount");
        expect(stats).toHaveProperty("backgroundStarCount");
        expect(stats).toHaveProperty("renderCalls");
        expect(stats).toHaveProperty("triangleCount");
        expect(stats).toHaveProperty("memoryUsage");
    });

    it("updates configuration correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const newConfig = {
            enableControls: false,
            enableAnimations: false,
            maxRenderDistance: 100,
        };

        renderer.updateConfig(newConfig);

        const controls = (renderer as any).controls;
        expect(controls.enabled).toBe(false);
    });

    it("disposes resources correctly", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        const disposeSpy = vi.spyOn(console, "log");
        renderer.dispose();

        expect(disposeSpy).toHaveBeenCalledWith("GalaxyRenderer disposed");
        expect((renderer as any).isDisposed).toBe(true);
        expect((renderer as any).animationId).toBeNull();
    });

    it("prevents operations when disposed", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);

        renderer.dispose();

        // These operations should be no-ops when disposed
        renderer.onResize();
        renderer.focusOnStarSystem("sol");
        renderer.updateConfig({ enableControls: false });
    });
});
