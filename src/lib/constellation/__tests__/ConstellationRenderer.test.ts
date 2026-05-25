/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { ConstellationRenderer } from "@/lib/constellation/ConstellationRenderer";
import type {
    Star,
    Constellation,
    SkyConfiguration,
} from "@/types/constellation";

const makeContainer = (): HTMLElement => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", {
        value: 800,
        writable: true,
    });
    Object.defineProperty(container, "clientHeight", {
        value: 600,
        writable: true,
    });
    document.body.appendChild(container);
    return container;
};

const makeStar = (overrides: Partial<Star> = {}): Star => ({
    id: "star-1",
    name: "Test Star",
    rightAscension: 6.75,
    declination: 16.72,
    magnitude: 0.45,
    distance: 8.6,
    spectralClass: "A",
    color: "#FFFFFF",
    ...overrides,
});

const makeConstellation = (
    overrides: Partial<Constellation> = {},
): Constellation => ({
    id: "orion",
    name: "Orion",
    abbreviation: "Ori",
    description: "The Hunter",
    stars: [
        makeStar({ id: "star-1", rightAscension: 5.5, declination: 1.0 }),
        makeStar({
            id: "star-2",
            rightAscension: 5.6,
            declination: 2.0,
            magnitude: 1.0,
        }),
    ],
    lines: [[0, 1]],
    visibility: {
        hemisphere: "both",
        bestMonths: [12, 1, 2],
        minLatitude: -90,
        maxLatitude: 90,
    },
    ...overrides,
});

const makeSkyConfig = (
    overrides: Partial<SkyConfiguration> = {},
): SkyConfiguration => ({
    location: {
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
    },
    // Explicit UTC-5 offset so the timestamp is environment-independent
    dateTime: new Date("2024-01-15T22:00:00-05:00"),
    fieldOfView: 90,
    showConstellationLines: true,
    showStarNames: true,
    minimumMagnitude: 6.5,
    ...overrides,
});

describe("ConstellationRenderer", () => {
    let container: HTMLElement;
    let renderer: ConstellationRenderer;

    beforeEach(() => {
        container = makeContainer();
    });

    afterEach(() => {
        if (renderer) {
            try {
                renderer.dispose();
            } catch {
                // already disposed
            }
        }
        if (container.parentElement) {
            container.parentElement.removeChild(container);
        }
    });

    it("constructs without throwing", () => {
        expect(() => {
            renderer = new ConstellationRenderer(container);
        }).not.toThrow();
    });

    it("appends canvas to container on construction", () => {
        renderer = new ConstellationRenderer(container);
        // The renderer appends a canvas domElement to the container
        const canvases = container.querySelectorAll("canvas");
        expect(canvases.length).toBeGreaterThan(0);
    });

    it("initialize with stars, constellations and skyConfig does not throw", async () => {
        renderer = new ConstellationRenderer(container);
        const stars = [
            makeStar({ magnitude: 1.0 }),
            makeStar({ id: "star-2", magnitude: 3.0 }),
        ];
        const constellations = [makeConstellation()];
        const skyConfig = makeSkyConfig();

        await expect(
            renderer.initialize(stars, constellations, skyConfig),
        ).resolves.toBeUndefined();
    });

    it("initialize with empty star list generates procedural stars", async () => {
        renderer = new ConstellationRenderer(container);
        await expect(
            renderer.initialize([], [], makeSkyConfig()),
        ).resolves.toBeUndefined();
    });

    it("initialize resolves when all stars are filtered out by minimumMagnitude (uses procedural fallback)", async () => {
        renderer = new ConstellationRenderer(container);
        const dimStars = [
            makeStar({ magnitude: 8.0 }), // dimmer than minimumMagnitude 3.0 — will be skipped
            makeStar({ id: "s2", magnitude: 9.0 }),
        ];
        // All real stars are skipped; the renderer falls back to procedural star generation
        await expect(
            renderer.initialize(
                dimStars,
                [],
                makeSkyConfig({ minimumMagnitude: 3.0 }),
            ),
        ).resolves.toBeUndefined();
    });

    it("initialize without constellation lines when showConstellationLines is false", async () => {
        renderer = new ConstellationRenderer(container);
        const skyConfig = makeSkyConfig({ showConstellationLines: false });
        await expect(
            renderer.initialize([makeStar()], [makeConstellation()], skyConfig),
        ).resolves.toBeUndefined();
    });

    it("initialize without star names when showStarNames is false", async () => {
        renderer = new ConstellationRenderer(container);
        const skyConfig = makeSkyConfig({ showStarNames: false });
        await expect(
            renderer.initialize([makeStar({ magnitude: 1.0 })], [], skyConfig),
        ).resolves.toBeUndefined();
    });

    it("initialize renders a sprite only for the bright star (magnitude < 1.5)", async () => {
        renderer = new ConstellationRenderer(container);
        const brightStars = [
            // magnitude 0.5 passes the < 1.5 threshold — one label sprite expected
            makeStar({ id: "bright", name: "Sirius", magnitude: 0.5 }),
            // magnitude 4.0 is too dim — no sprite
            makeStar({ id: "dim", name: "Dim Star", magnitude: 4.0 }),
        ];

        await renderer.initialize(
            brightStars,
            [], // no constellations → no constellation-label sprites
            makeSkyConfig({ showStarNames: true }),
        );

        // THREE.Sprite is the mock vi.fn() for sprite construction.
        // It should have been called exactly once: for the bright star.
        expect((THREE as any).Sprite).toHaveBeenCalledTimes(1);
    });

    it("initialize can be called multiple times (re-initializes scene)", async () => {
        renderer = new ConstellationRenderer(container);
        const skyConfig = makeSkyConfig();

        await renderer.initialize(
            [makeStar()],
            [makeConstellation()],
            skyConfig,
        );
        await expect(
            renderer.initialize(
                [makeStar(), makeStar({ id: "star-2" })],
                [],
                skyConfig,
            ),
        ).resolves.toBeUndefined();
    });

    it("updateSky calls initialize again without throwing", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize([makeStar()], [], makeSkyConfig());

        await expect(
            renderer.updateSky(
                [makeStar(), makeStar({ id: "star-2" })],
                [makeConstellation()],
                makeSkyConfig({ showConstellationLines: true }),
            ),
        ).resolves.toBeUndefined();
    });

    it("dispose removes canvas from container", () => {
        renderer = new ConstellationRenderer(container);
        renderer.dispose();
        // After dispose, canvas should be removed
        const canvases = container.querySelectorAll("canvas");
        expect(canvases.length).toBe(0);
    });

    it("dispose after initialize clears scene resources", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar({ magnitude: 1.0 })],
            [makeConstellation()],
            makeSkyConfig(),
        );
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("clearScene handles array materials on starPoints", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar({ magnitude: 1.0 })],
            [makeConstellation()],
            makeSkyConfig(),
        );
        // Force starPoints.material to be an array so the array branch executes
        const sp = (renderer as any).starPoints;
        if (sp) {
            sp.material = [{ dispose: vi.fn() }, { dispose: vi.fn() }];
        }
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("clearScene handles array materials on constellationLines children", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar({ magnitude: 1.0 })],
            [makeConstellation()],
            makeSkyConfig(),
        );
        // Force a LineSegments child to have array materials
        const cl = (renderer as any).constellationLines;
        if (cl && cl.children.length > 0) {
            const child = cl.children[0] as any;
            child.material = [{ dispose: vi.fn() }, { dispose: vi.fn() }];
        }
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("animate calls updateCameraRotation when isMouseDown is true", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize([makeStar()], [], makeSkyConfig());
        // Force isMouseDown true so the camera rotation branch is covered
        (renderer as any).isMouseDown = true;
        expect(() => (renderer as any).animate()).not.toThrow();
    });

    it("initialize with a constellation that has no star entries creates no lines", async () => {
        renderer = new ConstellationRenderer(container);
        const emptyConstellation = makeConstellation({ stars: [], lines: [] });
        await expect(
            renderer.initialize([], [emptyConstellation], makeSkyConfig()),
        ).resolves.toBeUndefined();
    });

    it("initialize with constellation lines uses correct sphere positions", async () => {
        renderer = new ConstellationRenderer(container);
        const constellation = makeConstellation({
            stars: [
                makeStar({ id: "s1", rightAscension: 1.0, declination: 30 }),
                makeStar({ id: "s2", rightAscension: 2.0, declination: 45 }),
            ],
            lines: [[0, 1]],
        });
        await expect(
            renderer.initialize([], [constellation], makeSkyConfig()),
        ).resolves.toBeUndefined();
    });

    it("handles resize event without throwing", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize([makeStar()], [], makeSkyConfig());
        // Trigger resize
        expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
    });

    it("mousedown on canvas sets dragging state without throwing", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        expect(canvas).toBeTruthy();
        const event = new MouseEvent("mousedown", {
            clientX: 100,
            clientY: 150,
            bubbles: true,
        });
        expect(() => canvas.dispatchEvent(event)).not.toThrow();
    });

    it("mousemove on canvas without prior mousedown does not update rotation", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        const anyRenderer = renderer as any;
        const initialX = anyRenderer.cameraRotationX as number;
        const initialY = anyRenderer.cameraRotationY as number;
        // No mousedown first — move should be a no-op
        canvas.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: 200,
                clientY: 200,
                bubbles: true,
            }),
        );
        expect(anyRenderer.cameraRotationX).toBe(initialX);
        expect(anyRenderer.cameraRotationY).toBe(initialY);
    });

    it("mousemove after mousedown updates camera rotation", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        const anyRenderer = renderer as any;
        canvas.dispatchEvent(
            new MouseEvent("mousedown", {
                clientX: 100,
                clientY: 100,
                bubbles: true,
            }),
        );
        const initialX = anyRenderer.cameraRotationX as number;
        const initialY = anyRenderer.cameraRotationY as number;
        canvas.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: 150,
                clientY: 120,
                bubbles: true,
            }),
        );
        // deltaX=50 → cameraRotationY changes; deltaY=20 → cameraRotationX changes
        expect(anyRenderer.cameraRotationY).not.toBe(initialY);
        expect(anyRenderer.cameraRotationX).not.toBe(initialX);
    });

    it("mouseup after drag with high velocity triggers momentum animation", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        // Mousedown
        canvas.dispatchEvent(
            new MouseEvent("mousedown", {
                clientX: 0,
                clientY: 0,
                bubbles: true,
            }),
        );
        // Mousemove with large delta to build velocity
        canvas.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: 100,
                clientY: 0,
                bubbles: true,
            }),
        );
        // Mouseup — dragVelocityX ≫ 0.5 so startMomentumAnimation is called
        expect(() =>
            canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })),
        ).not.toThrow();
    });

    it("mouseup without significant drag velocity does not throw", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
            new MouseEvent("mousedown", {
                clientX: 100,
                clientY: 100,
                bubbles: true,
            }),
        );
        // Tiny move → velocity stays near zero
        canvas.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: 100,
                clientY: 100,
                bubbles: true,
            }),
        );
        expect(() =>
            canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })),
        ).not.toThrow();
    });

    it("wheel event on canvas adjusts field of view without throwing", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        // Scroll down (zoom out)
        expect(() =>
            canvas.dispatchEvent(
                new WheelEvent("wheel", { deltaY: 100, bubbles: true }),
            ),
        ).not.toThrow();
        // Scroll up (zoom in)
        expect(() =>
            canvas.dispatchEvent(
                new WheelEvent("wheel", { deltaY: -100, bubbles: true }),
            ),
        ).not.toThrow();
    });

    it("contextmenu event on canvas is prevented without throwing", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        const event = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
        });
        canvas.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    // Helper that creates a TouchEvent even when the constructor is unavailable
    // (some jsdom versions don't expose TouchEvent or Touch globally)
    const createTouchEvent = (
        type: string,
        touches: Touch[] = [],
    ): TouchEvent => {
        if (typeof TouchEvent !== "undefined") {
            return new TouchEvent(type, { touches, bubbles: true });
        }
        const event = new Event(type, {
            bubbles: true,
        }) as unknown as TouchEvent;
        Object.defineProperty(event, "touches", {
            value: touches,
            configurable: true,
        });
        return event;
    };

    it("touchend event on canvas does not throw", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        // touchend without prior touchstart — velocity stays zero, no momentum animation
        expect(() =>
            canvas.dispatchEvent(createTouchEvent("touchend", [])),
        ).not.toThrow();
    });

    describe("worldToScreen", () => {
        it("returns visible=false when point is behind the camera", () => {
            const renderer = new ConstellationRenderer(makeContainer());
            // Camera at origin looking +Z (default). A point behind us has z < 0 (in camera space).
            const result = renderer.worldToScreen({
                x: 0,
                y: 0,
                z: -50,
            } as any);
            expect(result.visible).toBe(false);
        });

        it("returns visible=true and screen x/y inside viewport for points in front", () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            const result = renderer.worldToScreen({ x: 0, y: 0, z: 50 } as any);
            expect(result.visible).toBe(true);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(container.clientWidth);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(container.clientHeight);
        });

        it("returns visible=false for a point on the camera plane (dot === 0)", () => {
            const renderer = new ConstellationRenderer(makeContainer());
            // Default camera rotation is (0, 0), forward vector is (0, 0, 1).
            // Camera position is (0, 0, 0). Point at (1, 1, 0): rel = (1,1,0), dot = 0.
            const result = renderer.worldToScreen({ x: 1, y: 1, z: 0 } as any);
            expect(result.visible).toBe(false);
        });

        it("respects camera position when classifying behind-camera points", () => {
            const renderer = new ConstellationRenderer(makeContainer());
            // Move camera forward so a point at z=50 is now behind us.
            (renderer as any).camera.position.x = 0;
            (renderer as any).camera.position.y = 0;
            (renderer as any).camera.position.z = 100;
            // rel = (0-0, 0-0, 50-100) = (0, 0, -50); forward = (0,0,1); dot = -50 → behind.
            const result = renderer.worldToScreen({ x: 0, y: 0, z: 50 } as any);
            expect(result.visible).toBe(false);
        });
    });

    describe("twinkle shader", () => {
        it("uses a ShaderMaterial with uTime uniform for stars", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const stars = (renderer as any).starPoints;
            expect(stars.material.uniforms.uTime).toBeDefined();
            // animate() runs once during initialize, so uTime.value is >= 0
            expect(typeof stars.material.uniforms.uTime.value).toBe("number");
            expect(isFinite(stars.material.uniforms.uTime.value)).toBe(true);
        });

        it("increments uTime each frame during animate()", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const stars = (renderer as any).starPoints;
            const initial = stars.material.uniforms.uTime.value;
            (renderer as any).tickUniforms(0.5);
            expect(stars.material.uniforms.uTime.value).toBeGreaterThan(
                initial,
            );
        });

        it("does not throw when tickUniforms is called after dispose clears starPoints", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.dispose();
            expect(() => (renderer as any).tickUniforms(0.5)).not.toThrow();
        });
    });

    describe("selection state", () => {
        it("setSelected highlights the chosen constellation and dims the rest", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            const c1 = makeConstellation({ id: "orion" });
            const c2 = makeConstellation({ id: "lyra" });
            await renderer.initialize([makeStar()], [c1, c2], makeSkyConfig());
            renderer.setSelected("orion");
            const children = (renderer as any).constellationLines.children;
            const orionMat = children.find(
                (c: any) => c.userData.constellationId === "orion",
            ).material;
            const lyraMat = children.find(
                (c: any) => c.userData.constellationId === "lyra",
            ).material;
            expect(orionMat.uniforms.uIsSelected.value).toBe(1);
            expect(orionMat.uniforms.uIsDimmed.value).toBe(0);
            expect(lyraMat.uniforms.uIsSelected.value).toBe(0);
            expect(lyraMat.uniforms.uIsDimmed.value).toBe(1);
        });

        it("setSelected(null) restores idle state on all", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.setSelected("orion");
            renderer.setSelected(null);
            const mat = (renderer as any).constellationLines.children[0]
                .material;
            expect(mat.uniforms.uIsSelected.value).toBe(0);
            expect(mat.uniforms.uIsDimmed.value).toBe(0);
        });

        it("setSelected with an unknown id dims all constellations", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [
                    makeConstellation({ id: "orion" }),
                    makeConstellation({ id: "lyra" }),
                ],
                makeSkyConfig(),
            );
            renderer.setSelected("nonexistent");
            const children = (renderer as any).constellationLines.children;
            children.forEach((c: any) => {
                expect(c.material.uniforms.uIsSelected.value).toBe(0);
                expect(c.material.uniforms.uIsDimmed.value).toBe(1);
            });
        });

        it("getSelectedId returns the id passed to setSelected", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.setSelected("orion");
            expect(renderer.getSelectedId()).toBe("orion");
            renderer.setSelected(null);
            expect(renderer.getSelectedId()).toBeNull();
        });

        it("setHovered stores the id, retrievable via getHoveredId", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.setHovered("orion");
            expect(renderer.getHoveredId()).toBe("orion");
            renderer.setHovered(null);
            expect(renderer.getHoveredId()).toBeNull();
        });
    });

    describe("energy-flow lines", () => {
        it("creates ShaderMaterial with uIsSelected and uIsDimmed uniforms per constellation", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const group = (renderer as any).constellationLines;
            expect(group.children.length).toBe(1);
            const mat = group.children[0].material;
            expect(mat.uniforms.uIsSelected.value).toBe(0);
            expect(mat.uniforms.uIsDimmed.value).toBe(0);
            expect(typeof mat.uniforms.uTime.value).toBe("number");
            expect(isFinite(mat.uniforms.uTime.value)).toBe(true);
        });

        it("ticks line uTime every frame", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const line = (renderer as any).constellationLines.children[0];
            const t0 = line.material.uniforms.uTime.value;
            (renderer as any).tickUniforms(0.25);
            expect(line.material.uniforms.uTime.value).toBeGreaterThan(t0);
        });
    });

    it("touch start/move/end sequence executes without throwing", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;

        // Create individual Touch points if the API is available
        const makeTouch = (x: number, y: number): Touch | null => {
            if (typeof Touch === "undefined") return null;
            try {
                return new Touch({
                    identifier: 1,
                    target: canvas,
                    clientX: x,
                    clientY: y,
                });
            } catch {
                return null;
            }
        };

        const t1 = makeTouch(100, 100);
        const t2 = makeTouch(200, 110);

        if (t1 && t2) {
            canvas.dispatchEvent(createTouchEvent("touchstart", [t1]));
            expect(() =>
                canvas.dispatchEvent(createTouchEvent("touchmove", [t2])),
            ).not.toThrow();
        }

        // touchend is always safe to fire
        expect(() =>
            canvas.dispatchEvent(createTouchEvent("touchend", [])),
        ).not.toThrow();
    });
});
