/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    afterAll,
} from "vitest";
import * as THREE from "three";
import { ConstellationRenderer } from "@/lib/constellation/ConstellationRenderer";
import type { PreparedCatalogRenderSettings } from "@/lib/constellation/ConstellationRenderer";
import { ConstellationCatalogLayer } from "@/lib/constellation/ConstellationCatalogLayer";
import { adaptPreparedCatalog } from "@/lib/constellation/rendererCatalog";
import type {
    PreparedCatalogStar,
    PreparedConstellation,
    PreparedConstellationCatalog,
} from "@/lib/constellation/observerCatalog";
import { SYNTHETIC_SOL_STAR_ID } from "@/lib/constellation/observerCatalog";
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

/**
 * Prepared-catalog fixtures for the renderer suite. The prepared public API
 * is structurally fixed-equatorial: it accepts only
 * `{ minimumMagnitude, showConstellationLines, showStarNames }` settings and
 * never constructs location/date/timezone/FOV values.
 */
const preparedSettings = (
    overrides: Partial<PreparedCatalogRenderSettings> = {},
): PreparedCatalogRenderSettings => ({
    minimumMagnitude: 4,
    showConstellationLines: true,
    showStarNames: true,
    ...overrides,
});

const makePreparedCatalog = (
    stars: PreparedCatalogStar[] = [
        makeStar({ id: "prepared-star", magnitude: 1.5 }),
    ],
    constellations: PreparedConstellation[] = [],
): PreparedConstellationCatalog => ({
    stars,
    constellations,
});

const makePreparedConstellation = (): PreparedConstellation => ({
    id: "orion",
    name: "Orion",
    abbreviation: "Ori",
    description: "The Hunter",
    stars: [
        makeStar({ id: "ps1", rightAscension: 5.5, declination: 1.0 }),
        makeStar({
            id: "ps2",
            rightAscension: 5.6,
            declination: 2.0,
            magnitude: 1.0,
        }),
    ],
    lines: [[0, 1]] as const,
    visibility: {
        hemisphere: "both",
        bestMonths: [12, 1, 2],
        minLatitude: -90,
        maxLatitude: 90,
    },
});

describe("ConstellationRenderer", () => {
    let container: HTMLElement;
    let renderer: ConstellationRenderer;

    beforeEach(() => {
        container = makeContainer();
        // Ensure matchMedia is always a vi.fn() so tests that use mockReturnValueOnce
        // are not affected by a prior vi.spyOn + mockRestore() in sibling tests.
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
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
        // It should have been called 5 times: once for the bright star
        // label, plus 4 cardinal-direction labels (N/E/S/W) created by
        // createOrientationGuides().
        expect((THREE as any).Sprite).toHaveBeenCalledTimes(5);
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

    it("preserves starfield-background mesh across initialize() calls", async () => {
        renderer = new ConstellationRenderer(container);
        const anyRenderer = renderer as any;
        const scene = anyRenderer.scene as THREE.Scene;

        // The constructor creates a starfield-background mesh
        const bg = scene.getObjectByName("starfield-background");
        expect(bg).toBeTruthy();

        // initialize() calls clearScene() but should NOT remove it
        await renderer.initialize([makeStar()], [], makeSkyConfig());

        const bgAfter = scene.getObjectByName("starfield-background");
        expect(bgAfter).toBeTruthy();
        expect(bgAfter).toBe(bg);
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

    it("clearScene handles array materials on ordinary star points", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar({ magnitude: 1.0 })],
            [makeConstellation()],
            makeSkyConfig(),
        );
        // Force the layer's star-point material to be an array so the array
        // branch executes without throwing
        const points = (renderer as any).primaryLayer.ordinaryStarPoints;
        if (points) {
            points.material = [{ dispose: vi.fn() }, { dispose: vi.fn() }];
        }
        expect(() => renderer.dispose()).not.toThrow();
    });

    it("clearScene handles array materials on line hit objects", async () => {
        renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar({ magnitude: 1.0 })],
            [makeConstellation()],
            makeSkyConfig(),
        );
        // Force a line hit object to have array materials
        const lineObjects = (renderer as any).primaryLayer.lineHitObjects;
        if (lineObjects.length > 0) {
            const child = lineObjects[0] as any;
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

    it("clears isDragging on mouseup without momentum so auto-rotate can resume", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        const anyRenderer = renderer as unknown as {
            isDragging: boolean;
            isMouseDown: boolean;
        };
        // Mousedown latches isDragging
        canvas.dispatchEvent(
            new MouseEvent("mousedown", {
                clientX: 100,
                clientY: 100,
                bubbles: true,
            }),
        );
        expect(anyRenderer.isDragging).toBe(true);
        // Tiny move → velocity stays near zero, no momentum started
        canvas.dispatchEvent(
            new MouseEvent("mousemove", {
                clientX: 100,
                clientY: 100,
                bubbles: true,
            }),
        );
        canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        // Regression: previously isDragging stayed true forever, blocking
        // the auto-rotate gate in animate().
        expect(anyRenderer.isDragging).toBe(false);
        expect(anyRenderer.isMouseDown).toBe(false);
    });

    it("clears isDragging on touchend without momentum so auto-rotate can resume", () => {
        renderer = new ConstellationRenderer(container);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement;
        const anyRenderer = renderer as unknown as {
            isDragging: boolean;
            isMouseDown: boolean;
        };
        // touchstart latches isDragging
        const touch = { clientX: 50, clientY: 50 } as unknown as Touch;
        canvas.dispatchEvent(createTouchEvent("touchstart", [touch]));
        expect(anyRenderer.isDragging).toBe(true);
        // touchend with zero velocity → no momentum, must clear isDragging
        canvas.dispatchEvent(createTouchEvent("touchend", []));
        expect(anyRenderer.isDragging).toBe(false);
        expect(anyRenderer.isMouseDown).toBe(false);
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
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Camera at origin looking +Z (default). A point behind us has z < 0 (in camera space).
                const result = renderer.worldToScreen({
                    x: 0,
                    y: 0,
                    z: -50,
                } as any);
                expect(result.visible).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("returns visible=true and screen x/y inside viewport for points in front", () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const result = renderer.worldToScreen({
                    x: 0,
                    y: 0,
                    z: 50,
                } as any);
                expect(result.visible).toBe(true);
                expect(result.x).toBeGreaterThanOrEqual(0);
                expect(result.x).toBeLessThanOrEqual(container.clientWidth);
                expect(result.y).toBeGreaterThanOrEqual(0);
                expect(result.y).toBeLessThanOrEqual(container.clientHeight);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("returns visible=false for a point on the camera plane (dot === 0)", () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Default camera rotation is (0, 0), forward vector is (0, 0, 1).
                // Camera position is (0, 0, 0). Point at (1, 1, 0): rel = (1,1,0), dot = 0.
                const result = renderer.worldToScreen({
                    x: 1,
                    y: 1,
                    z: 0,
                } as any);
                expect(result.visible).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("respects camera position when classifying behind-camera points", () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Move camera forward so a point at z=50 is now behind us.
                (renderer as any).camera.position.x = 0;
                (renderer as any).camera.position.y = 0;
                (renderer as any).camera.position.z = 100;
                // rel = (0-0, 0-0, 50-100) = (0, 0, -50); forward = (0,0,1); dot = -50 → behind.
                const result = renderer.worldToScreen({
                    x: 0,
                    y: 0,
                    z: 50,
                } as any);
                expect(result.visible).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
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
            const stars = (renderer as any).primaryLayer.ordinaryStarPoints;
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
            const stars = (renderer as any).primaryLayer.ordinaryStarPoints;
            const initial = stars.material.uniforms.uTime.value;
            // The layer's tick drives the same point-material uTime that the
            // legacy renderer-owned tickUniforms used to advance.
            (renderer as any).primaryLayer.tick(0.5);
            expect(stars.material.uniforms.uTime.value).toBeGreaterThan(
                initial,
            );
        });

        it("does not throw when the primary layer tick is called with no points", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize([], [], makeSkyConfig());
            expect(() =>
                (renderer as any).primaryLayer.tick(0.5),
            ).not.toThrow();
        });
    });

    describe("selection state", () => {
        it("setSelected highlights the chosen constellation and dims the rest", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            const c1 = makeConstellation({ id: "orion" });
            const c2 = makeConstellation({ id: "lyra" });
            await renderer.initialize([makeStar()], [c1, c2], makeSkyConfig());
            renderer.setSelected("orion");
            const children = (renderer as any).primaryLayer.lineHitObjects;
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
            const mat = (renderer as any).primaryLayer.lineHitObjects[0]
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
            const children = (renderer as any).primaryLayer.lineHitObjects;
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
            const lineObjects = (renderer as any).primaryLayer.lineHitObjects;
            expect(lineObjects.length).toBe(1);
            const mat = lineObjects[0].material;
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
            const line = (renderer as any).primaryLayer.lineHitObjects[0];
            const t0 = line.material.uniforms.uTime.value;
            (renderer as any).primaryLayer.tick(0.25);
            expect(line.material.uniforms.uTime.value).toBeGreaterThan(t0);
        });
    });

    describe("tweenCameraTo", () => {
        it("reaches the target rotation within tolerance after duration", async () => {
            vi.useFakeTimers();
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.tweenCameraTo(0.5, 1.0, 100);
            // simulate frames
            for (let i = 0; i < 12; i++) {
                (renderer as any).tickTween(performance.now() + i * 16);
            }
            expect((renderer as any).cameraRotationX).toBeCloseTo(0.5, 1);
            expect((renderer as any).cameraRotationY).toBeCloseTo(1.0, 1);
            vi.useRealTimers();
        });

        it("cancels active drag momentum on tween start", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            (renderer as any).dragVelocityX = 5;
            (renderer as any).dragVelocityY = 5;
            renderer.tweenCameraTo(0, 0, 200);
            expect((renderer as any).dragVelocityX).toBe(0);
            expect((renderer as any).dragVelocityY).toBe(0);
        });

        it("deactivates the tween when t reaches 1", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.tweenCameraTo(0.3, 0.4, 100);
            // Advance well past duration:
            (renderer as any).tickTween(performance.now() + 500);
            expect((renderer as any).tweenState.active).toBe(false);
        });

        it("clamps targetRotX to ±π/2.2", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.tweenCameraTo(Math.PI, 0, 100);
            const limit = Math.PI / 2.2;
            expect((renderer as any).tweenState.targetX).toBeCloseTo(limit, 5);
        });

        it("normalizes targetRotY to the shortest arc relative to startY", async () => {
            vi.useFakeTimers();
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            // Simulate several full horizontal rotations (accumulated yaw)
            const twoPi = 2 * Math.PI;
            (renderer as any).cameraRotationY = 4 * twoPi; // ~25.13 rad

            // atan2 would give a value in [-π, π], e.g. 1.0
            renderer.tweenCameraTo(0, 1.0, 100);

            // targetY should be normalized so the tween travels the shortest
            // path, i.e. within ±π of startY
            const targetY = (renderer as any).tweenState.targetY;
            const startY = (renderer as any).tweenState.startY;
            expect(Math.abs(targetY - startY)).toBeLessThanOrEqual(
                Math.PI + 1e-10,
            );

            // After tween completes, camera should end at the correct angle
            for (let i = 0; i < 12; i++) {
                (renderer as any).tickTween(performance.now() + i * 16);
            }
            // The final Y should be equivalent to 1.0 modulo 2π
            const finalY = (renderer as any).cameraRotationY;
            expect(((finalY % twoPi) + twoPi) % twoPi).toBeCloseTo(
                ((1.0 % twoPi) + twoPi) % twoPi,
                1,
            );
            vi.useRealTimers();
        });

        it("snaps to target when reduced-motion is preferred", async () => {
            const mqlSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
                matches: true,
                media: "(prefers-reduced-motion: reduce)",
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            } as unknown as MediaQueryList);

            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.tweenCameraTo(0.3, 0.4, 1000);
            expect((renderer as any).cameraRotationX).toBeCloseTo(0.3, 5);
            expect((renderer as any).cameraRotationY).toBeCloseTo(0.4, 5);
            expect((renderer as any).tweenState.active).toBe(false);

            mqlSpy.mockRestore();
        });
    });

    describe("interaction callbacks", () => {
        it("fires onConstellationClick when raycaster hits a constellation line group", async () => {
            const onConstellationClick = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationClick,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );

            // Force the raycaster mock to return a hit on the orion line object
            const group = (renderer as any).primaryLayer.lineHitObjects;
            globalThis.__threeRaycasterIntersects = [{ object: group[0] }];

            // Set mouseDown position same as click position (no drag)
            (renderer as any).mouseDownX = 100;
            (renderer as any).mouseDownY = 100;

            // Simulate click
            (renderer as any).handleCanvasClick({
                clientX: 100,
                clientY: 100,
                preventDefault: () => {},
            });

            expect(onConstellationClick).toHaveBeenCalledWith("orion");
            globalThis.__threeRaycasterIntersects = undefined;
        });

        it("does not fire onConstellationClick when there are no hits", async () => {
            const onConstellationClick = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationClick,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            globalThis.__threeRaycasterIntersects = [];
            (renderer as any).handleCanvasClick({
                clientX: 100,
                clientY: 100,
                preventDefault: () => {},
            });
            expect(onConstellationClick).not.toHaveBeenCalled();
        });

        it("suppresses onConstellationClick when mouse moved more than drag threshold", async () => {
            const onConstellationClick = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationClick,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const group = (renderer as any).primaryLayer.lineHitObjects;
            globalThis.__threeRaycasterIntersects = [{ object: group[0] }];

            // Simulate mousedown at (0, 0) then click at (100, 0) — far apart = drag
            (renderer as any).mouseDownX = 0;
            (renderer as any).mouseDownY = 0;
            (renderer as any).handleCanvasClick({
                clientX: 100,
                clientY: 0,
                preventDefault: () => {},
            });

            expect(onConstellationClick).not.toHaveBeenCalled();
            globalThis.__threeRaycasterIntersects = undefined;
        });

        it("fires onConstellationClick when mouse barely moved (within threshold)", async () => {
            const onConstellationClick = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationClick,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const group = (renderer as any).primaryLayer.lineHitObjects;
            globalThis.__threeRaycasterIntersects = [{ object: group[0] }];

            // Simulate mousedown at (100, 100) then click at (102, 101) — within threshold
            (renderer as any).mouseDownX = 100;
            (renderer as any).mouseDownY = 100;
            (renderer as any).handleCanvasClick({
                clientX: 102,
                clientY: 101,
                preventDefault: () => {},
            });

            expect(onConstellationClick).toHaveBeenCalledWith("orion");
            globalThis.__threeRaycasterIntersects = undefined;
        });

        it("fires onConstellationHover with id and screen position on hit", async () => {
            const onConstellationHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationHover,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const group = (renderer as any).primaryLayer.lineHitObjects;
            globalThis.__threeRaycasterIntersects = [{ object: group[0] }];

            // First call sets lastHoverEmit; force enough time to elapse:
            (renderer as any).lastHoverEmit = 0;

            (renderer as any).onMouseMove({
                clientX: 150,
                clientY: 200,
                preventDefault: () => {},
            });

            expect(onConstellationHover).toHaveBeenCalledWith(
                "orion",
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                }),
            );
            globalThis.__threeRaycasterIntersects = undefined;
        });

        it("fires onConstellationHover with null when there is no hit", async () => {
            const onConstellationHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationHover,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            globalThis.__threeRaycasterIntersects = [];
            (renderer as any).lastHoverEmit = 0;

            (renderer as any).onMouseMove({
                clientX: 0,
                clientY: 0,
                preventDefault: () => {},
            });

            expect(onConstellationHover).toHaveBeenCalledWith(null, null);
        });

        it("suppresses hover callback within 16ms throttle window", async () => {
            const onConstellationHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationHover,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            globalThis.__threeRaycasterIntersects = [];
            const anyRenderer = renderer as any;

            // First call — set lastHoverEmit to a recent timestamp
            anyRenderer.lastHoverEmit = 0;
            anyRenderer.onMouseMove({
                clientX: 100,
                clientY: 100,
                preventDefault: () => {},
            });
            expect(onConstellationHover).toHaveBeenCalledTimes(1);

            // Second call within 16ms — should be suppressed
            const recentTime = performance.now() - 5; // 5ms ago
            anyRenderer.lastHoverEmit = recentTime;
            anyRenderer.onMouseMove({
                clientX: 200,
                clientY: 200,
                preventDefault: () => {},
            });
            expect(onConstellationHover).toHaveBeenCalledTimes(1); // still 1

            // Third call after 16ms — should fire
            anyRenderer.lastHoverEmit = performance.now() - 20; // 20ms ago
            anyRenderer.onMouseMove({
                clientX: 300,
                clientY: 300,
                preventDefault: () => {},
            });
            expect(onConstellationHover).toHaveBeenCalledTimes(2);

            globalThis.__threeRaycasterIntersects = undefined;
            renderer.dispose();
        });

        it("does not crash when handleCanvasClick is called with no callbacks configured", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            globalThis.__threeRaycasterIntersects = [];
            expect(() =>
                (renderer as any).handleCanvasClick({
                    clientX: 0,
                    clientY: 0,
                    preventDefault: () => {},
                }),
            ).not.toThrow();
        });

        it("mouseleave fires onConstellationHover and onStarHover with null", async () => {
            const onConstellationHover = vi.fn();
            const onStarHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationHover,
                onStarHover,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );

            const canvas = (renderer as any).canvas as HTMLCanvasElement;
            canvas.dispatchEvent(
                new MouseEvent("mouseleave", { bubbles: true }),
            );

            expect(onConstellationHover).toHaveBeenCalledWith(null, null);
            expect(onStarHover).toHaveBeenCalledWith(null, null);
            expect(renderer.getHoveredId()).toBeNull();
        });

        it("mousedown clears hover state", async () => {
            const onConstellationHover = vi.fn();
            const onStarHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onConstellationHover,
                onStarHover,
            });
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );

            // Simulate a hover first
            renderer.setHovered("orion");
            expect(renderer.getHoveredId()).toBe("orion");

            // Mousedown should clear it
            const canvas = (renderer as any).canvas as HTMLCanvasElement;
            canvas.dispatchEvent(
                new MouseEvent("mousedown", {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true,
                }),
            );

            expect(renderer.getHoveredId()).toBeNull();
            expect(onConstellationHover).toHaveBeenCalledWith(null, null);
            expect(onStarHover).toHaveBeenCalledWith(null, null);
        });
    });

    describe("layered interaction routing", () => {
        const makePreparedRenderer = async (
            callbacks: Record<string, unknown> = {},
        ): Promise<{
            container: HTMLElement;
            renderer: ConstellationRenderer;
        }> => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(
                container,
                callbacks as any,
            );
            const primaryCatalog = makePreparedCatalog(
                [
                    makeStar({
                        id: "p1",
                        magnitude: 1.0,
                        rightAscension: 5,
                        declination: 20,
                    }),
                    makeStar({
                        id: "p2",
                        magnitude: 2.0,
                        rightAscension: 6,
                        declination: 30,
                    }),
                ],
                [makePreparedConstellation()],
            );
            const referenceCatalog = makePreparedCatalog(
                [
                    makeStar({
                        id: "r1",
                        magnitude: 1.0,
                        rightAscension: 10,
                        declination: -10,
                    }),
                ],
                [makePreparedConstellation()],
            );
            await renderer.initializePreparedCatalogs(
                { primaryCatalog, referenceCatalog },
                preparedSettings(),
            );
            return { container, renderer };
        };

        const cleanup = (
            renderer: ConstellationRenderer,
            container: HTMLElement,
        ): void => {
            renderer.dispose();
            container.remove();
        };

        it("constellation hover raycasts the primary layer line objects only", async () => {
            const onConstellationHover = vi.fn();
            const { container, renderer } = await makePreparedRenderer({
                onConstellationHover,
            });
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;
                expect(referenceLayer.lineHitObjects.length).toBeGreaterThan(0);

                const intersectObjects = vi.fn<(objs: any[]) => any[]>(
                    () => [],
                );
                (renderer as any).raycaster.intersectObjects = intersectObjects;
                (renderer as any).lastHoverEmit = 0;
                (renderer as any).onMouseMove({
                    clientX: 150,
                    clientY: 200,
                    preventDefault: () => {},
                });

                expect(intersectObjects).toHaveBeenCalledTimes(1);
                expect(intersectObjects).toHaveBeenCalledWith(
                    primaryLayer.lineHitObjects,
                    false,
                );
                // Reference lines never enter the hover raycast
                const allRaycastObjects = intersectObjects.mock.calls.flatMap(
                    (call: any[]) => call[0],
                );
                for (const refLine of referenceLayer.lineHitObjects) {
                    expect(allRaycastObjects).not.toContain(refLine);
                }
            } finally {
                cleanup(renderer, container);
            }
        });

        it("constellation click raycasts the primary layer line objects only", async () => {
            const onConstellationClick = vi.fn();
            const { container, renderer } = await makePreparedRenderer({
                onConstellationClick,
            });
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;

                const intersectObjects = vi.fn<(objs: any[]) => any[]>(
                    () => [],
                );
                (renderer as any).raycaster.intersectObjects = intersectObjects;
                (renderer as any).mouseDownX = 100;
                (renderer as any).mouseDownY = 100;
                (renderer as any).handleCanvasClick({
                    clientX: 100,
                    clientY: 100,
                    preventDefault: () => {},
                });

                expect(intersectObjects).toHaveBeenCalledTimes(1);
                expect(intersectObjects).toHaveBeenCalledWith(
                    primaryLayer.lineHitObjects,
                    false,
                );
                const allRaycastObjects = intersectObjects.mock.calls.flatMap(
                    (call: any[]) => call[0],
                );
                for (const refLine of referenceLayer.lineHitObjects) {
                    expect(allRaycastObjects).not.toContain(refLine);
                }
                expect(onConstellationClick).not.toHaveBeenCalled();
            } finally {
                cleanup(renderer, container);
            }
        });

        it("ordinary-star hover maps the hit point index into the rendered ordinary stars", async () => {
            const onStarHover = vi.fn();
            const { container, renderer } = await makePreparedRenderer({
                onStarHover,
            });
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                (renderer as any).raycaster.intersectObjects = vi.fn(() => []);
                (renderer as any).raycaster.intersectObject = vi.fn(() => [
                    { index: 1 },
                ]);
                (renderer as any).lastHoverEmit = 0;
                (renderer as any).onMouseMove({
                    clientX: 100,
                    clientY: 100,
                    preventDefault: () => {},
                });

                expect(onStarHover).toHaveBeenCalledWith(
                    expect.objectContaining({ id: "p2" }),
                    expect.objectContaining({
                        x: expect.any(Number),
                        y: expect.any(Number),
                    }),
                );
                // The point raycast targets the primary layer's ordinary
                // points only, never the reference points.
                expect(
                    (renderer as any).raycaster.intersectObject,
                ).toHaveBeenCalledWith(primaryLayer.ordinaryStarPoints, false);
            } finally {
                cleanup(renderer, container);
            }
        });

        it("marker hover returns the complete RendererStar with its marker kind", async () => {
            const onStarHover = vi.fn();
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container, {
                onStarHover,
            });
            try {
                const solStar = {
                    ...makeStar({
                        id: SYNTHETIC_SOL_STAR_ID,
                        name: "Sol",
                        magnitude: 0,
                    }),
                    marker: { kind: "synthetic-sol" as const },
                } as PreparedCatalogStar;
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([solStar]),
                    },
                    preparedSettings(),
                );
                const primaryLayer = (renderer as any).primaryLayer;
                expect(primaryLayer.markerHitObjects.length).toBe(1);

                // In production the recursive marker raycast resolves to the
                // marker group's raycastable children (reticle/rays), never
                // the group itself — THREE.Group has no raycast, so a real
                // intersection carries a child mesh. The layer mirrors the
                // group's `{ role, starId, star }` userData onto each child;
                // seed the mock with a child so the resolution path matches
                // what production's recursive raycast actually returns.
                const markerGroup = primaryLayer.markerHitObjects[0];
                const reticle = markerGroup.children[0];
                expect(reticle.userData.star).toBeDefined();
                globalThis.__threeRaycasterIntersects = [{ object: reticle }];
                (renderer as any).lastHoverEmit = 0;
                (renderer as any).onMouseMove({
                    clientX: 100,
                    clientY: 100,
                    preventDefault: () => {},
                });

                expect(onStarHover).toHaveBeenCalledTimes(1);
                const [star] = onStarHover.mock.calls[0];
                expect(star).toMatchObject({
                    id: SYNTHETIC_SOL_STAR_ID,
                    name: "Sol",
                });
                // The marker record is preserved — never erased before the
                // callback fires.
                expect(star.marker?.kind).toBe("synthetic-sol");
            } finally {
                globalThis.__threeRaycasterIntersects = undefined;
                cleanup(renderer, container);
            }
        });

        it("reference star points are never star-hover targets", async () => {
            const onStarHover = vi.fn();
            const { container, renderer } = await makePreparedRenderer({
                onStarHover,
            });
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;
                expect(referenceLayer.ordinaryStarPoints).not.toBeNull();

                (renderer as any).raycaster.intersectObjects = vi.fn(() => []);
                const intersectObject = vi.fn<(obj: any) => any[]>(() => []);
                (renderer as any).raycaster.intersectObject = intersectObject;
                (renderer as any).lastHoverEmit = 0;
                (renderer as any).onMouseMove({
                    clientX: 100,
                    clientY: 100,
                    preventDefault: () => {},
                });

                expect(intersectObject).toHaveBeenCalledTimes(1);
                expect(intersectObject).toHaveBeenCalledWith(
                    primaryLayer.ordinaryStarPoints,
                    false,
                );
                expect(intersectObject.mock.calls[0][0]).not.toBe(
                    referenceLayer.ordinaryStarPoints,
                );
            } finally {
                cleanup(renderer, container);
            }
        });

        it("setSelected forwards to the primary layer only", async () => {
            const { container, renderer } = await makePreparedRenderer();
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;
                const primarySpy = vi.spyOn(
                    primaryLayer,
                    "setSelectedConstellation",
                );
                const referenceSpy = vi.spyOn(
                    referenceLayer,
                    "setSelectedConstellation",
                );

                renderer.setSelected("orion");

                expect(primarySpy).toHaveBeenCalledWith("orion");
                expect(referenceSpy).not.toHaveBeenCalled();
                expect(renderer.getSelectedId()).toBe("orion");
            } finally {
                cleanup(renderer, container);
            }
        });

        it("setHovered remains renderer-local state", async () => {
            const { container, renderer } = await makePreparedRenderer();
            try {
                const primaryLayer = (renderer as any).primaryLayer;
                const selectSpy = vi.spyOn(
                    primaryLayer,
                    "setSelectedConstellation",
                );
                const tickSpy = vi.spyOn(primaryLayer, "tick");

                renderer.setHovered("orion");
                expect(renderer.getHoveredId()).toBe("orion");
                renderer.setHovered(null);
                expect(renderer.getHoveredId()).toBeNull();

                expect(selectSpy).not.toHaveBeenCalled();
                expect(tickSpy).not.toHaveBeenCalled();
            } finally {
                cleanup(renderer, container);
            }
        });
    });

    describe("shooting stars", () => {
        it("does not spawn shooting stars when reduced-motion is preferred", async () => {
            (window.matchMedia as any).mockReturnValue({
                matches: true,
                media: "(prefers-reduced-motion: reduce)",
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const sceneAddCalls = ((renderer as any).scene.add as any).mock
                .calls.length;
            for (let i = 0; i < 1000; i++)
                (renderer as any).maybeSpawnShootingStar(
                    performance.now() + i * 100,
                );
            expect(((renderer as any).scene.add as any).mock.calls.length).toBe(
                sceneAddCalls,
            );
        });

        it("spawns at most one shooting star at a time", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            // Force-spawn by directly invoking
            (renderer as any).spawnShootingStar(1000);
            (renderer as any).spawnShootingStar(2000);
            expect((renderer as any).activeShootingStar).not.toBeNull();
            expect((renderer as any).shootingStarCount).toBe(1);
            renderer.dispose();
        });

        it("removes and disposes shooting star when t >= 1", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const anyRenderer = renderer as any;

            // Force-spawn a shooting star
            anyRenderer.spawnShootingStar(1000);
            expect(anyRenderer.activeShootingStar).not.toBeNull();
            expect(anyRenderer.shootingStarCount).toBe(1);

            // Spy on the geometry/material dispose methods
            const line = anyRenderer.activeShootingStar as THREE.LineSegments;
            const geomSpy = vi.spyOn(line.geometry, "dispose");
            const matSpy = vi.spyOn(line.material as THREE.Material, "dispose");

            // Advance well past the 700ms lifetime
            anyRenderer.tickShootingStar(1000 + 800);

            expect(anyRenderer.activeShootingStar).toBeNull();
            expect(anyRenderer.shootingStarCount).toBe(0);
            expect(geomSpy).toHaveBeenCalled();
            expect(matSpy).toHaveBeenCalled();

            renderer.dispose();
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

    describe("touch → click drag-threshold (P2 fix)", () => {
        it("touchstart mirrors coordinates into mouseDownX/mouseDownY", () => {
            renderer = new ConstellationRenderer(container);
            const canvas = container.querySelector(
                "canvas",
            ) as HTMLCanvasElement;

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

            const t = makeTouch(200, 150);
            if (t) {
                canvas.dispatchEvent(createTouchEvent("touchstart", [t]));
                expect((renderer as any).mouseDownX).toBe(200);
                expect((renderer as any).mouseDownY).toBe(150);
            }
        });

        it("synthesized click after touchstart is not falsely treated as a drag", () => {
            const onConstellationClick = vi.fn();
            renderer = new ConstellationRenderer(container, {
                onConstellationClick,
            });
            const canvas = container.querySelector(
                "canvas",
            ) as HTMLCanvasElement;

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

            const t = makeTouch(200, 150);
            if (t) {
                canvas.dispatchEvent(createTouchEvent("touchstart", [t]));
                canvas.dispatchEvent(createTouchEvent("touchend", []));

                // Now the browser synthesizes a click at the same position.
                // mouseDownX/Y should match so the click is not suppressed.
                const clickEvent = new MouseEvent("click", {
                    clientX: 200,
                    clientY: 150,
                    bubbles: true,
                });
                canvas.dispatchEvent(clickEvent);
                // Without the fix, mouseDownX/Y would still be (0, 0) and
                // the click would be suppressed as a drag. With the fix it
                // should proceed to raycasting. We can't easily verify the
                // callback fires (raycaster mock), but we can verify the
                // threshold check passes by ensuring mouseDown coords are set.
                expect((renderer as any).mouseDownX).toBe(200);
                expect((renderer as any).mouseDownY).toBe(150);
            }
        });
    });

    describe("tween cancellation on drag (P3 fix)", () => {
        it("mousedown cancels an active camera tween", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const canvas = container.querySelector(
                "canvas",
            ) as HTMLCanvasElement;

            // Start a tween
            renderer.tweenCameraTo(0.5, 1.0, 900);
            expect((renderer as any).tweenState.active).toBe(true);

            // User starts dragging — should cancel the tween
            canvas.dispatchEvent(
                new MouseEvent("mousedown", {
                    clientX: 100,
                    clientY: 100,
                    bubbles: true,
                }),
            );
            expect((renderer as any).tweenState.active).toBe(false);
        });

        it("touchstart cancels an active camera tween", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const canvas = container.querySelector(
                "canvas",
            ) as HTMLCanvasElement;

            renderer.tweenCameraTo(0.5, 1.0, 900);
            expect((renderer as any).tweenState.active).toBe(true);

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

            const t = makeTouch(100, 100);
            if (t) {
                canvas.dispatchEvent(createTouchEvent("touchstart", [t]));
                expect((renderer as any).tweenState.active).toBe(false);
            }
        });
    });

    describe("dispose cleanup", () => {
        it("sets _disposed flag and cancels rAF on dispose", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const anyRenderer = renderer as any;
            expect(anyRenderer._disposed).toBe(false);
            renderer.dispose();
            expect(anyRenderer._disposed).toBe(true);
            expect(anyRenderer._rafId).toBeNull();
        });

        it("animate() is a no-op after dispose", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            renderer.dispose();
            const anyRenderer = renderer as any;
            // Should not throw and should not schedule another frame
            expect(() => anyRenderer.animate()).not.toThrow();
        });

        it("removes all event listeners using stored references", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const anyRenderer = renderer as any;

            // Verify stored bound handlers exist
            expect(typeof anyRenderer._boundResize).toBe("function");
            expect(typeof anyRenderer._boundMouseDown).toBe("function");
            expect(typeof anyRenderer._boundMouseMove).toBe("function");
            expect(typeof anyRenderer._boundMouseUp).toBe("function");
            expect(typeof anyRenderer._boundMouseWheel).toBe("function");
            expect(typeof anyRenderer._boundContextMenu).toBe("function");
            expect(typeof anyRenderer._boundTouchStart).toBe("function");
            expect(typeof anyRenderer._boundTouchMove).toBe("function");
            expect(typeof anyRenderer._boundTouchEnd).toBe("function");
            expect(typeof anyRenderer._boundMouseLeave).toBe("function");

            // dispose should not throw
            expect(() => renderer.dispose()).not.toThrow();

            // Canvas should be removed from container
            const canvases = container.querySelectorAll("canvas");
            expect(canvases.length).toBe(0);
        });

        it("disposes starfield-background geometry and material on dispose", async () => {
            renderer = new ConstellationRenderer(container);
            const anyRenderer = renderer as any;
            const scene = anyRenderer.scene as THREE.Scene;

            const bg = scene.getObjectByName(
                "starfield-background",
            ) as THREE.Mesh | null;
            expect(bg).toBeTruthy();

            const geometrySpy = vi.spyOn(bg!.geometry, "dispose");
            const materialSpy = vi.spyOn(
                bg!.material as THREE.Material,
                "dispose",
            );

            renderer.dispose();

            expect(geometrySpy).toHaveBeenCalled();
            expect(materialSpy).toHaveBeenCalled();
            expect(scene.getObjectByName("starfield-background")).toBeNull();
        });

        it("cancels momentum rAF on dispose", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const anyRenderer = renderer as any;
            const canvas = container.querySelector(
                "canvas",
            ) as HTMLCanvasElement;

            // Start a drag with velocity to trigger momentum animation
            canvas.dispatchEvent(
                new MouseEvent("mousedown", {
                    clientX: 0,
                    clientY: 0,
                    bubbles: true,
                }),
            );
            canvas.dispatchEvent(
                new MouseEvent("mousemove", {
                    clientX: 100,
                    clientY: 0,
                    bubbles: true,
                }),
            );
            canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

            // If momentum rAF was scheduled, dispose should cancel it
            renderer.dispose();
            expect(anyRenderer._momentumRafId).toBeNull();
        });

        it("continues cleanup when clearScene throws", async () => {
            renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const anyRenderer = renderer as any;

            // Make clearScene throw by nuking the activeShootingStar
            Object.defineProperty(anyRenderer, "clearScene", {
                value: () => {
                    throw new Error("simulated clearScene failure");
                },
                configurable: true,
            });

            // dispose should not throw — each phase is wrapped in try/catch
            expect(() => renderer.dispose()).not.toThrow();

            // The WebGL renderer should still be disposed
            // (we can verify the canvas was removed from the container)
            const canvases = container.querySelectorAll("canvas");
            expect(canvases.length).toBe(0);
        });
    });

    describe("star hover raycasting", () => {
        it("fires onStarHover with star data and screen position on hit", async () => {
            const onStarHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onStarHover,
            });
            await renderer.initialize(
                [makeStar({ id: "sirius", name: "Sirius", magnitude: 0.5 })],
                [makeConstellation()],
                makeSkyConfig(),
            );

            // First call for constellation hover: no constellation hit
            // Second call for star hover: hit with index 0
            (renderer as any).raycaster.intersectObjects = vi.fn(() => []);
            (renderer as any).raycaster.intersectObject = vi.fn(() => [
                { index: 0 },
            ]);

            const anyRenderer = renderer as any;
            anyRenderer.lastHoverEmit = 0;
            anyRenderer.onMouseMove({
                clientX: 150,
                clientY: 200,
                preventDefault: () => {},
            });

            expect(onStarHover).toHaveBeenCalledWith(
                expect.objectContaining({ id: "sirius", name: "Sirius" }),
                expect.objectContaining({
                    x: expect.any(Number),
                    y: expect.any(Number),
                }),
            );
        });

        it("fires onStarHover with null when there are no star hits", async () => {
            const onStarHover = vi.fn();
            const renderer = new ConstellationRenderer(makeContainer(), {
                onStarHover,
            });
            await renderer.initialize([makeStar()], [], makeSkyConfig());

            (renderer as any).raycaster.intersectObject = vi.fn(() => []);
            const anyRenderer = renderer as any;
            anyRenderer.lastHoverEmit = 0;
            anyRenderer.onMouseMove({
                clientX: 100,
                clientY: 100,
                preventDefault: () => {},
            });

            expect(onStarHover).toHaveBeenCalledWith(null, null);
        });

        it("stores filtered stars in the primary layer for raycasting lookup", async () => {
            const renderer = new ConstellationRenderer(makeContainer());
            const brightStar = makeStar({ id: "bright", magnitude: 1.0 });
            const dimStar = makeStar({ id: "dim", magnitude: 8.0 });
            await renderer.initialize(
                [brightStar, dimStar],
                [],
                makeSkyConfig({ minimumMagnitude: 3.0 }),
            );

            // Only the bright star should be stored (dim is filtered out)
            const stars = (renderer as any).primaryLayer
                .renderedOrdinaryStars as Star[];
            expect(stars.length).toBe(1);
            expect(stars[0].id).toBe("bright");
        });
    });

    describe("worldToScreen with getWorldDirection", () => {
        it("uses camera.getWorldDirection for behind-camera detection", () => {
            container = makeContainer();
            renderer = new ConstellationRenderer(container);
            const camera = (renderer as any).camera;

            // Verify getWorldDirection is called during worldToScreen
            const getWorldDirSpy = vi.spyOn(camera, "getWorldDirection");

            renderer.worldToScreen({ x: 0, y: 0, z: 50 } as any);

            expect(getWorldDirSpy).toHaveBeenCalled();
        });

        it("returns visible=false for a point behind the camera", () => {
            container = makeContainer();
            renderer = new ConstellationRenderer(container);

            // Default mock getWorldDirection returns (0,0,1), so z < 0 is behind
            const result = renderer.worldToScreen({
                x: 0,
                y: 0,
                z: -50,
            } as any);
            expect(result.visible).toBe(false);
        });

        it("returns visible=true and screen coords for points in front", () => {
            container = makeContainer();
            renderer = new ConstellationRenderer(container);

            // Default mock getWorldDirection returns (0,0,1), so z > 0 is in front
            const result = renderer.worldToScreen({ x: 0, y: 0, z: 50 } as any);
            expect(result.visible).toBe(true);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe("ConstellationRenderer — orientation guides", () => {
        it("adds a horizon ring on the y=0 plane at radius ~100", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const ring = (renderer as any).scene.children.find(
                (c: any) => c.name === "horizon-ring",
            );
            expect(ring).toBeTruthy();
            const attr = ring.geometry.getAttribute("position");
            for (let i = 0; i < attr.count; i++) {
                const x = attr.array[i * 3];
                const y = attr.array[i * 3 + 1];
                const z = attr.array[i * 3 + 2];
                // Ring lies on the y=0 plane.
                expect(y).toBe(0);
                // And at radius ~100 (spec: "radius ~100, matching the star sphere").
                const r = Math.sqrt(x * x + z * z);
                expect(r).toBeCloseTo(100, 0);
            }
            renderer.dispose();
            container.remove();
        });

        it("adds four cardinal labels N/E/S/W", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const group = (renderer as any).scene.children.find(
                (c: any) => c.name === "cardinal-labels",
            );
            expect(group).toBeTruthy();
            const names = group.children.map((c: any) => c.name);
            expect(names).toContain("cardinal-N");
            expect(names).toContain("cardinal-E");
            expect(names).toContain("cardinal-S");
            expect(names).toContain("cardinal-W");
            expect(group.children.length).toBe(4);
            renderer.dispose();
            container.remove();
        });
    });

    describe("ConstellationRenderer — labels toggle", () => {
        it("setLabelsVisible(false) before initialize() is preserved across init", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Simulate the user toggling labels OFF while the view is
                // still loading (before initialize() runs). The Svelte
                // reactive block fires setLabelsVisible as soon as the
                // renderer instance exists.
                renderer.setLabelsVisible(false);

                await renderer.initialize(
                    [makeStar({ magnitude: 1.0 })],
                    [makeConstellation()],
                    // skyConfig defaults showStarNames=true, which would
                    // overwrite the user's OFF choice without the fix.
                    makeSkyConfig({ showStarNames: true }),
                );

                // Internal state must reflect the user's choice, not skyConfig.
                expect((renderer as any).labelsVisible).toBe(false);

                // Label visibility is delegated to the primary layer, which
                // lazily creates its label groups on the first enable. A
                // preserved OFF toggle must leave no label groups behind.
                const layer = (renderer as any).primaryLayer;
                expect(layer.root.getObjectByName("star-labels")).toBeNull();
                expect(
                    layer.root.getObjectByName("constellation-labels"),
                ).toBeNull();

                // Flipping the toggle ON through the renderer must lazily
                // create the primary layer's label groups and show them…
                renderer.setLabelsVisible(true);
                const starLabels = layer.root.getObjectByName("star-labels");
                const constellationLabels = layer.root.getObjectByName(
                    "constellation-labels",
                );
                expect(starLabels).not.toBeNull();
                expect((starLabels as THREE.Group).visible).toBe(true);
                expect(constellationLabels).not.toBeNull();
                expect((constellationLabels as THREE.Group).visible).toBe(true);

                // …and flipping it OFF again must hide the same groups.
                renderer.setLabelsVisible(false);
                expect((starLabels as THREE.Group).visible).toBe(false);
                expect((constellationLabels as THREE.Group).visible).toBe(
                    false,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setLabelsVisible(true) before initialize() is preserved across init", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                renderer.setLabelsVisible(true);

                await renderer.initialize(
                    [makeStar({ magnitude: 1.0 })],
                    [makeConstellation()],
                    makeSkyConfig({ showStarNames: false }),
                );

                expect((renderer as any).labelsVisible).toBe(true);

                // The preserved ON toggle must have created the primary
                // layer's label groups during init and shown them.
                const layer = (renderer as any).primaryLayer;
                const starLabels = layer.root.getObjectByName("star-labels");
                const constellationLabels = layer.root.getObjectByName(
                    "constellation-labels",
                );
                expect(starLabels).not.toBeNull();
                expect((starLabels as THREE.Group).visible).toBe(true);
                expect(constellationLabels).not.toBeNull();
                expect((constellationLabels as THREE.Group).visible).toBe(true);

                // Toggling OFF through the renderer hides the same groups.
                renderer.setLabelsVisible(false);
                expect((starLabels as THREE.Group).visible).toBe(false);
                expect((constellationLabels as THREE.Group).visible).toBe(
                    false,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("initialize() without a prior setLabelsVisible uses skyConfig.showStarNames", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar({ magnitude: 1.0 })],
                    [makeConstellation()],
                    makeSkyConfig({ showStarNames: false }),
                );

                expect((renderer as any).labelsVisible).toBe(false);

                // With labels off, the primary layer creates no label
                // groups (lazy creation on first enable).
                const layer = (renderer as any).primaryLayer;
                expect(layer.root.getObjectByName("star-labels")).toBeNull();
                expect(
                    layer.root.getObjectByName("constellation-labels"),
                ).toBeNull();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — compass", () => {
        it("getCameraAzimuth returns a normalized 0-360 degree value", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const az = renderer.getCameraAzimuth();
            expect(az).toBeGreaterThanOrEqual(0);
            expect(az).toBeLessThan(360);
            renderer.dispose();
            container.remove();
        });

        it("getCameraElevation returns a degree value within the clamp range", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            const el = renderer.getCameraElevation();
            // cameraRotationX is clamped to ±π/2.2 ≈ ±81.8°.
            expect(el).toBeGreaterThanOrEqual(-82);
            expect(el).toBeLessThanOrEqual(82);
            renderer.dispose();
            container.remove();
        });

        it("init points the tracked rotation at the zenith so the compass and auto-rotate start consistent", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            await renderer.initialize(
                [makeStar()],
                [makeConstellation()],
                makeSkyConfig(),
            );
            // setupSkyCamera() faces the camera toward the zenith. The tracked
            // cameraRotationX must reflect that, otherwise:
            //   - getCameraElevation() reports 0° (horizon) for a zenith view,
            //     so the HUD compass lies until the first drag/selection.
            //   - auto-rotate calls updateCameraRotation() with cameraRotationX=0,
            //     snapping the view from zenith to horizon on the first frame.
            const elevDeg = renderer.getCameraElevation();
            // Near-zenith: the elevation clamp max is π/2.2 ≈ 81.8°.
            expect(elevDeg).toBeGreaterThan(70);
            expect(elevDeg).toBeLessThanOrEqual(82);
            // And the camera's last lookAt target must derive from that tracked
            // rotation (high Y), not from a hardcoded zenith bypass.
            const cam = (renderer as any).camera as THREE.PerspectiveCamera;
            const lookAtCalls = (cam.lookAt as any).mock.calls;
            const lastCall = lookAtCalls[lookAtCalls.length - 1];
            // _getCameraForward at cameraRotationX=π/2.2, Y=0 → y ≈ 0.99, scaled ×10.
            expect(lastCall[1]).toBeGreaterThan(9);
            renderer.dispose();
            container.remove();
        });
    });

    describe("ConstellationRenderer — runtime reduced-motion / auto-rotate API", () => {
        it("setReducedMotion(true) snaps tweenCameraTo to target without a tween", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                // Use the runtime API (not matchMedia) so the
                // `this.reducedMotion` branch is exercised.
                renderer.setReducedMotion(true);
                renderer.tweenCameraTo(0.3, 0.4, 1000);
                expect((renderer as any).cameraRotationX).toBeCloseTo(0.3, 5);
                expect((renderer as any).cameraRotationY).toBeCloseTo(0.4, 5);
                // No tween scheduled.
                expect((renderer as any).tweenState.active).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setReducedMotion(true) suppresses shooting-star spawning", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                renderer.setReducedMotion(true);
                const sceneAddCalls = ((renderer as any).scene.add as any).mock
                    .calls.length;
                for (let i = 0; i < 1000; i++)
                    (renderer as any).maybeSpawnShootingStar(
                        performance.now() + i * 100,
                    );
                expect(
                    ((renderer as any).scene.add as any).mock.calls.length,
                ).toBe(sceneAddCalls);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setAutoRotate(true) advances camera yaw in animate() when idle", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                renderer.setAutoRotate(true);
                const before = (renderer as any).cameraRotationY as number;
                // animate() reads clock.getDelta(); force a positive delta so
                // the yaw advance is observable regardless of frame timing.
                (renderer as any).clock.getDelta = () => 1.0;
                (renderer as any).animate();
                const after = (renderer as any).cameraRotationY as number;
                expect(after).toBeGreaterThan(before);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setAutoRotate is ignored while dragging (isMouseDown latches)", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                renderer.setAutoRotate(true);
                (renderer as any).isMouseDown = true;
                const before = (renderer as any).cameraRotationY as number;
                (renderer as any).clock.getDelta = () => 1.0;
                (renderer as any).animate();
                expect((renderer as any).cameraRotationY).toBe(before);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setAutoRotate is ignored under reduced-motion", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                renderer.setAutoRotate(true);
                renderer.setReducedMotion(true);
                const before = (renderer as any).cameraRotationY as number;
                (renderer as any).clock.getDelta = () => 1.0;
                (renderer as any).animate();
                expect((renderer as any).cameraRotationY).toBe(before);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setAutoRotateSpeed changes the per-frame yaw advance", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                renderer.setAutoRotate(true);
                renderer.setAutoRotateSpeed(0.4);
                const before = (renderer as any).cameraRotationY as number;
                (renderer as any).clock.getDelta = () => 1.0;
                (renderer as any).animate();
                // 0.4 rad/s × 1.0s delta = 0.4 rad advance.
                expect((renderer as any).cameraRotationY).toBeCloseTo(
                    before + 0.4,
                    5,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — prepared initialization", () => {
        it("initializes primary and reference layers from prepared catalogs", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const primaryCatalog = makePreparedCatalog([
                    makeStar({ id: "p-star", magnitude: 1.0 }),
                ]);
                const referenceCatalog = makePreparedCatalog([
                    makeStar({ id: "r-star", magnitude: 2.0 }),
                ]);
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog,
                        referenceCatalog,
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );

                const anyRenderer = renderer as any;
                expect(anyRenderer.primaryLayer).toBeTruthy();
                expect(anyRenderer.referenceLayer).toBeTruthy();
                // referenceVisible:true makes the reference layer visible
                expect(anyRenderer.referenceLayer.root.visible).toBe(true);
                // Both roots are in the scene
                expect(anyRenderer.scene.children).toContain(
                    anyRenderer.primaryLayer.root,
                );
                expect(anyRenderer.scene.children).toContain(
                    anyRenderer.referenceLayer.root,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("initializes with only a primary catalog when reference is omitted", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const anyRenderer = renderer as any;
                expect(anyRenderer.primaryLayer).toBeTruthy();
                expect(anyRenderer.referenceLayer).toBeNull();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("updateSky remains legacy-only and delegates to initialize()", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const anyRenderer = renderer as any;
                // Prepared mode creates no Earth guides
                expect(
                    anyRenderer.scene.children.find(
                        (c: any) => c.name === "horizon-ring",
                    ),
                ).toBeFalsy();

                const stars = [makeStar({ id: "legacy", magnitude: 1.0 })];
                const constellations = [makeConstellation()];
                const skyConfig = makeSkyConfig();
                const initSpy = vi.spyOn(anyRenderer, "initialize");
                await renderer.updateSky(stars, constellations, skyConfig);
                expect(initSpy).toHaveBeenCalledWith(
                    stars,
                    constellations,
                    skyConfig,
                );
                initSpy.mockRestore();

                // A real legacy pass creates the Earth guides again
                await renderer.updateSky(stars, constellations, skyConfig);
                expect(
                    anyRenderer.scene.children.find(
                        (c: any) => c.name === "horizon-ring",
                    ),
                ).toBeTruthy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("referenceVisible persists across reinit when omitted from the next request", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const primaryCatalog = makePreparedCatalog([
                    makeStar({ id: "p-star", magnitude: 1.0 }),
                ]);
                const referenceCatalog = makePreparedCatalog([
                    makeStar({ id: "r-star", magnitude: 2.0 }),
                ]);
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog,
                        referenceCatalog,
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                expect((renderer as any).referenceVisible).toBe(true);

                // Omitted referenceVisible preserves the stored value
                await renderer.initializePreparedCatalogs(
                    { primaryCatalog },
                    preparedSettings(),
                );
                expect((renderer as any).referenceVisible).toBe(true);

                // A later request with a reference catalog inherits it
                await renderer.initializePreparedCatalogs(
                    { primaryCatalog, referenceCatalog },
                    preparedSettings(),
                );
                expect((renderer as any).referenceLayer.root.visible).toBe(
                    true,
                );

                // An explicit false updates stored state
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog,
                        referenceCatalog,
                        referenceVisible: false,
                    },
                    preparedSettings(),
                );
                expect((renderer as any).referenceVisible).toBe(false);
                expect((renderer as any).referenceLayer.root.visible).toBe(
                    false,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("prepared mode builds constellation lines when enabled", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [
                                makeStar({
                                    id: "p-star",
                                    magnitude: 1.0,
                                }),
                            ],
                            [makePreparedConstellation()],
                        ),
                    },
                    preparedSettings(),
                );
                const primaryLayer = (renderer as any).primaryLayer;
                expect(primaryLayer.lineHitObjects.length).toBe(1);
                expect(
                    primaryLayer.lineHitObjects[0].userData.constellationId,
                ).toBe("orion");
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — Earth regression and fixed frame", () => {
        it("Earth mode places ordinary stars via celestialToSphere at radius ~100", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [
                        makeStar({ id: "s1", magnitude: 1.0 }),
                        makeStar({ id: "s2", magnitude: 3.0 }),
                    ],
                    [],
                    makeSkyConfig(),
                );
                const attr = (
                    renderer as any
                ).primaryLayer.ordinaryStarPoints.geometry.getAttribute(
                    "position",
                );
                expect(attr.count).toBe(2);
                for (let i = 0; i < attr.count; i++) {
                    const x = attr.array[i * 3];
                    const y = attr.array[i * 3 + 1];
                    const z = attr.array[i * 3 + 2];
                    // celestialToSphere preserves the radius (100)
                    expect(Math.hypot(x, y, z)).toBeCloseTo(100, 3);
                }
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("prepared placement is fixed-equatorial at radius ~100 with no location/date state", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({
                                id: "p-star",
                                magnitude: 1.0,
                                rightAscension: 5,
                                declination: 20,
                            }),
                        ]),
                    },
                    preparedSettings(),
                );
                const attr = (
                    renderer as any
                ).primaryLayer.ordinaryStarPoints.geometry.getAttribute(
                    "position",
                );
                expect(attr.count).toBe(1);
                const x = attr.array[0];
                const y = attr.array[1];
                const z = attr.array[2];
                // radialToCartesian preserves the radius (100)
                expect(Math.hypot(x, y, z)).toBeCloseTo(100, 5);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("Earth mode creates horizon and cardinal guides", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const scene = (renderer as any).scene as THREE.Scene;
                expect(
                    scene.children.find((c: any) => c.name === "horizon-ring"),
                ).toBeTruthy();
                expect(
                    scene.children.find(
                        (c: any) => c.name === "cardinal-labels",
                    ),
                ).toBeTruthy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("prepared mode creates neither horizon nor cardinal guides", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const scene = (renderer as any).scene as THREE.Scene;
                expect(
                    scene.children.find((c: any) => c.name === "horizon-ring"),
                ).toBeFalsy();
                expect(
                    scene.children.find(
                        (c: any) => c.name === "cardinal-labels",
                    ),
                ).toBeFalsy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("cardinal labels use renderOrder 0.5, below catalog geometry", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const group = (renderer as any).scene.children.find(
                    (c: any) => c.name === "cardinal-labels",
                );
                expect(group).toBeTruthy();
                expect(group.children.length).toBe(4);
                group.children.forEach((sprite: any) => {
                    expect(sprite.renderOrder).toBe(0.5);
                });
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("horizon ring uses renderOrder 4.5", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const ring = (renderer as any).scene.children.find(
                    (c: any) => c.name === "horizon-ring",
                );
                expect(ring.renderOrder).toBe(4.5);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("shooting stars use renderOrder 8", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                (renderer as any).spawnShootingStar(1000);
                expect((renderer as any).activeShootingStar).not.toBeNull();
                expect((renderer as any).activeShootingStar.renderOrder).toBe(
                    8,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — decorative background mode switching", () => {
        const findAmbient = (renderer: any) =>
            renderer.decorativeRoot.children.find(
                (c: any) => c.name === "ambient-stars",
            );
        const findDecorativeRoots = (renderer: any) =>
            renderer.scene.children.filter(
                (c: any) => c.name === "decorative-background",
            );

        it("sparse Earth -> prepared: one ambient child exists but is hidden", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const ambient = findAmbient(anyRenderer);
                expect(ambient).toBeTruthy();
                expect(ambient.visible).toBe(true);

                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const ambientAfter = findAmbient(anyRenderer);
                expect(ambientAfter).toBe(ambient);
                expect(ambientAfter.visible).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("prepared -> sparse Earth: ambient child is created and visible", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                expect(findAmbient(renderer as any)).toBeFalsy();

                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const ambient = findAmbient(renderer as any);
                expect(ambient).toBeTruthy();
                expect(ambient.visible).toBe(true);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("sparse Earth -> prepared -> Earth: same ambient child identity is reused", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const ambient1 = findAmbient(anyRenderer);
                expect(ambient1).toBeTruthy();

                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                await renderer.initialize(
                    [makeStar({ id: "s2", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const ambient2 = findAmbient(anyRenderer);
                expect(ambient2).toBe(ambient1);
                expect(ambient2.visible).toBe(true);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("dense-only Earth (>= 100 ordinary stars) never creates an ambient child", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const denseStars = Array.from({ length: 110 }, (_, i) =>
                    makeStar({ id: `dense-${i}`, magnitude: 1.0 }),
                );
                await renderer.initialize(denseStars, [], makeSkyConfig());
                expect(findAmbient(renderer as any)).toBeFalsy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("repeated initialization keeps exactly one decorative root", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const anyRenderer = renderer as any;
                const roots = findDecorativeRoots(anyRenderer);
                expect(roots.length).toBe(1);
                const root = roots[0];

                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                await renderer.initialize(
                    [makeStar({ id: "s2", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );

                const rootsAfter = findDecorativeRoots(anyRenderer);
                expect(rootsAfter.length).toBe(1);
                expect(rootsAfter[0]).toBe(root);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("catalog point counts never include ambient points", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Sparse Earth renders 1 ordinary star; ambient adds 500
                // decorative points but they must stay out of the layer buffer.
                await renderer.initialize(
                    [makeStar({ id: "solo", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const primaryLayer = (renderer as any).primaryLayer;
                const earthCount =
                    primaryLayer.ordinaryStarPoints.geometry.getAttribute(
                        "position",
                    ).count;
                expect(earthCount).toBe(1);

                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p1", magnitude: 2 }),
                            makeStar({ id: "p2", magnitude: 3 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const preparedCount = (
                    renderer as any
                ).primaryLayer.ordinaryStarPoints.geometry.getAttribute(
                    "position",
                ).count;
                expect(preparedCount).toBe(2);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("animate() advances the ambient uTime uniform on a sparse Earth frame", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Sparse Earth pass: 1 ordinary star creates the decorative
                // ambient points child (visible = true).
                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const ambient = findAmbient(anyRenderer);
                expect(ambient).toBeTruthy();
                const ambientMaterial = ambient.material;
                const before = ambientMaterial.uniforms.uTime.value as number;
                // The ambient points are renderer-owned decorative state, not
                // a member of either catalog layer — their uTime is advanced
                // by the renderer's own decorative tick, never by the layers.
                expect(ambient).not.toBe(
                    anyRenderer.primaryLayer.ordinaryStarPoints,
                );
                expect(anyRenderer.referenceLayer).toBeNull();
                // Force a positive clock delta so the uTime advance is
                // observable regardless of frame timing, then run one
                // renderer frame (regression: the extracted ambient material
                // used to freeze because only the layers were ticked).
                anyRenderer.clock.getDelta = () => 1.0;
                anyRenderer.animate();
                expect(ambientMaterial.uniforms.uTime.value).toBeGreaterThan(
                    before,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — development warning adapter", () => {
        it("warns for a malformed prepared line through initializePreparedCatalogs", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            const warnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {});
            try {
                const primaryCatalog: PreparedConstellationCatalog = {
                    stars: [makeStar({ id: "p1", magnitude: 1.0 })],
                    constellations: [
                        {
                            id: "bad",
                            name: "Bad",
                            abbreviation: "BAD",
                            description: "Bad",
                            stars: [makeStar({ id: "p1", magnitude: 1.0 })],
                            // Out-of-range endpoint: index 99 with a single
                            // local star. adaptPreparedCatalog is a typed
                            // identity seam, so the malformed line reaches
                            // the layer's defensive guards.
                            lines: [[0, 99]],
                            visibility: {
                                hemisphere: "both",
                                bestMonths: [12],
                                minLatitude: -90,
                                maxLatitude: 90,
                            },
                        },
                    ],
                };
                await renderer.initializePreparedCatalogs(
                    { primaryCatalog },
                    preparedSettings(),
                );
                expect(warnSpy).toHaveBeenCalledWith(
                    "[constellation-renderer] skipped catalog object",
                    expect.objectContaining({
                        role: "primary",
                        objectKind: "constellation-line",
                        constellationId: "bad",
                        lineIndex: 0,
                    }),
                );
            } finally {
                warnSpy.mockRestore();
                renderer.dispose();
                container.remove();
            }
        });

        it("warns for an unexpected reference marker through initializePreparedCatalogs", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            const warnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {});
            try {
                // The reference role is comparison-only: any marker record —
                // including a valid synthetic-Sol marker — is unexpected and
                // must surface through the renderer's dev warning adapter.
                const referenceCatalog: PreparedConstellationCatalog = {
                    stars: [
                        {
                            ...makeStar({
                                id: SYNTHETIC_SOL_STAR_ID,
                                magnitude: 1.0,
                            }),
                            marker: { kind: "synthetic-sol" },
                        } as unknown as PreparedCatalogStar,
                    ],
                    constellations: [],
                };
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(),
                        referenceCatalog,
                    },
                    preparedSettings(),
                );
                expect(warnSpy).toHaveBeenCalledWith(
                    "[constellation-renderer] skipped catalog object",
                    expect.objectContaining({
                        role: "reference",
                        objectKind: "marker",
                        starId: SYNTHETIC_SOL_STAR_ID,
                    }),
                );
            } finally {
                warnSpy.mockRestore();
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — reference visibility", () => {
        const makePrimaryCatalog = (): PreparedConstellationCatalog =>
            makePreparedCatalog([makeStar({ id: "p1", magnitude: 1.0 })]);
        const makeReferenceCatalog = (): PreparedConstellationCatalog =>
            makePreparedCatalog([makeStar({ id: "r1", magnitude: 1.0 })]);

        it("setReferenceVisible before the reference layer exists persists into initialization", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                renderer.setReferenceVisible(true);
                expect((renderer as any).referenceVisible).toBe(true);

                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePrimaryCatalog(),
                        referenceCatalog: makeReferenceCatalog(),
                    },
                    preparedSettings(),
                );
                // The omitted request value preserved the setter's value
                expect((renderer as any).referenceVisible).toBe(true);
                expect((renderer as any).referenceLayer.root.visible).toBe(
                    true,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("setReferenceVisible updates stored state and forwards to the reference layer", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePrimaryCatalog(),
                        referenceCatalog: makeReferenceCatalog(),
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                const referenceLayer = (renderer as any).referenceLayer;
                const setVisibleSpy = vi.spyOn(referenceLayer, "setVisible");

                renderer.setReferenceVisible(false);
                expect((renderer as any).referenceVisible).toBe(false);
                expect(setVisibleSpy).toHaveBeenCalledWith(false);
                expect(referenceLayer.root.visible).toBe(false);

                renderer.setReferenceVisible(true);
                expect((renderer as any).referenceVisible).toBe(true);
                expect(setVisibleSpy).toHaveBeenCalledWith(true);
                expect(referenceLayer.root.visible).toBe(true);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("omitted request referenceVisible preserves the stored value across reinit", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const primaryCatalog = makePrimaryCatalog();
                const referenceCatalog = makeReferenceCatalog();
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog,
                        referenceCatalog,
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                renderer.setReferenceVisible(false);
                expect((renderer as any).referenceVisible).toBe(false);

                await renderer.initializePreparedCatalogs(
                    { primaryCatalog, referenceCatalog },
                    preparedSettings(),
                );
                expect((renderer as any).referenceVisible).toBe(false);
                expect((renderer as any).referenceLayer.root.visible).toBe(
                    false,
                );
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("visibility toggles preserve layer identity and dispose nothing", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePrimaryCatalog(),
                        referenceCatalog: makeReferenceCatalog(),
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                const anyRenderer = renderer as any;
                const primaryLayer = anyRenderer.primaryLayer;
                const referenceLayer = anyRenderer.referenceLayer;
                const primaryRoot = primaryLayer.root;
                const referenceRoot = referenceLayer.root;
                const disposeSpies = [
                    vi.spyOn(primaryLayer, "dispose"),
                    vi.spyOn(referenceLayer, "dispose"),
                ];
                const sceneChildren = anyRenderer.scene.children;

                renderer.setReferenceVisible(false);
                renderer.setReferenceVisible(true);
                renderer.setReferenceVisible(false);

                expect(anyRenderer.primaryLayer).toBe(primaryLayer);
                expect(anyRenderer.referenceLayer).toBe(referenceLayer);
                expect(primaryLayer.root).toBe(primaryRoot);
                expect(referenceLayer.root).toBe(referenceRoot);
                expect(sceneChildren).toContain(primaryRoot);
                expect(sceneChildren).toContain(referenceRoot);
                for (const spy of disposeSpies) {
                    expect(spy).not.toHaveBeenCalled();
                }
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — star world position and focus", () => {
        // The focus suite swaps the renderer's private primaryLayer with a
        // stub through the sanctioned test-only cast (never `as any`); the
        // production code paths do not cast through `unknown`.
        const focusContainer = makeContainer();
        const renderer = new ConstellationRenderer(focusContainer);
        const tweenSpy = vi.spyOn(renderer, "tweenCameraTo");

        afterEach(() => {
            tweenSpy.mockClear();
        });

        afterAll(() => {
            renderer.dispose();
            if (focusContainer.parentElement) {
                focusContainer.parentElement.removeChild(focusContainer);
            }
        });

        it.each([
            [{ x: 100, y: 0, z: 0 }, 0, Math.PI / 2],
            [{ x: 0, y: 0, z: 100 }, 0, 0],
            [
                { x: -50, y: 50, z: -50 },
                Math.asin(1 / Math.sqrt(3)),
                (-3 * Math.PI) / 4,
            ],
        ])("inverts the camera-forward mapping", (position, pitch, yaw) => {
            const primaryLayer = {
                getWorldPosition: vi.fn(
                    () => new THREE.Vector3(position.x, position.y, position.z),
                ),
            };
            (
                renderer as unknown as {
                    primaryLayer: typeof primaryLayer;
                }
            ).primaryLayer = primaryLayer;

            expect(renderer.focusStarById("target", 900)).toBe(true);
            expect(tweenSpy).toHaveBeenCalledWith(pitch, yaw, 900);
        });

        it("returns false when the primary layer has no position (absent or reference-only)", () => {
            const primaryLayer = {
                getWorldPosition: vi.fn(() => null),
            };
            (
                renderer as unknown as {
                    primaryLayer: typeof primaryLayer;
                }
            ).primaryLayer = primaryLayer;

            expect(renderer.focusStarById(SYNTHETIC_SOL_STAR_ID, 900)).toBe(
                false,
            );
            expect(tweenSpy).not.toHaveBeenCalled();
        });

        it("returns false for a zero-length position", () => {
            const primaryLayer = {
                getWorldPosition: vi.fn(() => new THREE.Vector3(0, 0, 0)),
            };
            (
                renderer as unknown as {
                    primaryLayer: typeof primaryLayer;
                }
            ).primaryLayer = primaryLayer;

            expect(renderer.focusStarById("target", 900)).toBe(false);
            expect(tweenSpy).not.toHaveBeenCalled();
        });

        it.each([
            [{ x: NaN, y: 0, z: 0 }],
            [{ x: Infinity, y: 0, z: 0 }],
            [{ x: 0, y: 0, z: -Infinity }],
        ])("returns false for non-finite positions", (position) => {
            const primaryLayer = {
                getWorldPosition: vi.fn(
                    () => new THREE.Vector3(position.x, position.y, position.z),
                ),
            };
            (
                renderer as unknown as {
                    primaryLayer: typeof primaryLayer;
                }
            ).primaryLayer = primaryLayer;

            expect(renderer.focusStarById("target", 900)).toBe(false);
            expect(tweenSpy).not.toHaveBeenCalled();
        });

        it("inherits the existing pitch clamp through tweenCameraTo", () => {
            // A zenith position yields pitch π/2, beyond the ±π/2.2 clamp;
            // the clamp lives in tweenCameraTo and must apply to focus too.
            tweenSpy.mockRestore();
            const primaryLayer = {
                getWorldPosition: vi.fn(() => new THREE.Vector3(0, 100, 0)),
            };
            (
                renderer as unknown as {
                    primaryLayer: typeof primaryLayer;
                }
            ).primaryLayer = primaryLayer;

            expect(renderer.focusStarById("target", 900)).toBe(true);
            expect((renderer as any).tweenState.targetX).toBeCloseTo(
                Math.PI / 2.2,
                5,
            );
            expect((renderer as any).tweenState.targetY).toBeCloseTo(0, 5);
        });

        it("focusStarById returns false for reference-only ids", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p1", magnitude: 1.0 }),
                        ]),
                        referenceCatalog: makePreparedCatalog([
                            makeStar({ id: "r1", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                expect(renderer.getStarWorldPosition("r1")).toBeNull();
                expect(renderer.focusStarById("r1", 900)).toBe(false);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("getStarWorldPosition returns a plain copy for a known primary star", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({
                                id: "p-star",
                                magnitude: 1.0,
                                rightAscension: 5,
                                declination: 20,
                            }),
                        ]),
                    },
                    preparedSettings(),
                );
                const position = renderer.getStarWorldPosition("p-star");
                // A plain {x,y,z} copy — never the layer's live Vector3
                expect(position).toEqual({
                    x: expect.any(Number),
                    y: expect.any(Number),
                    z: expect.any(Number),
                });
                expect(position).not.toHaveProperty("clone");
                expect(renderer.getStarWorldPosition("missing")).toBeNull();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — labels and layer ticking", () => {
        it("setLabelsVisible forwards to the primary layer only", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p1", magnitude: 1.0 }),
                        ]),
                        referenceCatalog: makePreparedCatalog([
                            makeStar({ id: "r1", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;
                const primarySpy = vi.spyOn(primaryLayer, "setLabelsVisible");
                const referenceSpy = vi.spyOn(
                    referenceLayer,
                    "setLabelsVisible",
                );

                renderer.setLabelsVisible(false);

                expect(primarySpy).toHaveBeenCalledWith(false);
                expect(referenceSpy).not.toHaveBeenCalled();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("animate() ticks both the primary and reference layers each frame", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [makeStar({ id: "p1", magnitude: 1.0 })],
                            [makePreparedConstellation()],
                        ),
                        referenceCatalog: makePreparedCatalog([
                            makeStar({ id: "r1", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const primaryLayer = (renderer as any).primaryLayer;
                const referenceLayer = (renderer as any).referenceLayer;
                const primaryTick = vi.spyOn(primaryLayer, "tick");
                const referenceTick = vi.spyOn(referenceLayer, "tick");
                const primaryU0 =
                    primaryLayer.ordinaryStarPoints.material.uniforms.uTime
                        .value;
                const referenceU0 =
                    referenceLayer.ordinaryStarPoints.material.uniforms.uTime
                        .value;
                const lineU0 =
                    primaryLayer.lineHitObjects[0].material.uniforms.uTime
                        .value;

                (renderer as any).animate();

                // The mocked Clock reports a 60fps delta
                expect(primaryTick).toHaveBeenCalledWith(0.016);
                expect(referenceTick).toHaveBeenCalledWith(0.016);
                // Legacy Earth twinkle/pulse and prepared-mode shader
                // animation both advance through the layer ticks
                expect(
                    primaryLayer.ordinaryStarPoints.material.uniforms.uTime
                        .value,
                ).toBeGreaterThan(primaryU0);
                expect(
                    referenceLayer.ordinaryStarPoints.material.uniforms.uTime
                        .value,
                ).toBeGreaterThan(referenceU0);
                expect(
                    primaryLayer.lineHitObjects[0].material.uniforms.uTime
                        .value,
                ).toBeGreaterThan(lineU0);
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — single animation loop", () => {
        it("repeated serialized initialization starts exactly one RAF chain", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            const rafSpy = vi.fn(() => 42);
            vi.stubGlobal("requestAnimationFrame", rafSpy);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                expect(rafSpy).toHaveBeenCalledTimes(1);
                expect((renderer as any).animationRunning).toBe(true);

                // Second serialized init reuses the running chain
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog([
                            makeStar({ id: "p-star", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                expect(rafSpy).toHaveBeenCalledTimes(1);
                expect((renderer as any).animationRunning).toBe(true);
            } finally {
                vi.unstubAllGlobals();
                renderer.dispose();
                container.remove();
            }
        });

        it("final disposal clears animationRunning and cancels the outstanding frame id", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            const rafSpy = vi.fn(() => 42);
            const cancelSpy = vi.fn();
            vi.stubGlobal("requestAnimationFrame", rafSpy);
            vi.stubGlobal("cancelAnimationFrame", cancelSpy);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                expect(anyRenderer._rafId).toBe(42);

                renderer.dispose();

                expect(anyRenderer.animationRunning).toBe(false);
                expect(anyRenderer._rafId).toBeNull();
                expect(cancelSpy).toHaveBeenCalledWith(42);
            } finally {
                vi.unstubAllGlobals();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — reinitialization cleanup", () => {
        const makePreparedConstellationWith = (
            id: string,
        ): PreparedConstellation => ({
            ...makePreparedConstellation(),
            id,
        });

        it("removes old layer roots from the scene and disposes old layers exactly once", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const primaryA = makePreparedCatalog(
                    [
                        makeStar({ id: "p1", magnitude: 1.0 }),
                        makeStar({ id: "p2", magnitude: 2.0 }),
                    ],
                    [makePreparedConstellationWith("orion")],
                );
                const referenceA = makePreparedCatalog([
                    makeStar({ id: "r1", magnitude: 1.0 }),
                ]);
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: primaryA,
                        referenceCatalog: referenceA,
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                const anyRenderer = renderer as any;
                const oldPrimary = anyRenderer.primaryLayer;
                const oldReference = anyRenderer.referenceLayer;
                const oldPrimaryRoot = oldPrimary.root;
                const oldReferenceRoot = oldReference.root;
                const primaryDisposeSpy = vi.spyOn(oldPrimary, "dispose");
                const referenceDisposeSpy = vi.spyOn(oldReference, "dispose");
                expect(anyRenderer.scene.children).toContain(oldPrimaryRoot);
                expect(anyRenderer.scene.children).toContain(oldReferenceRoot);

                // Reinitialize with a different catalog (new star ids, new
                // constellation id, same reference catalog).
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [makeStar({ id: "q1", magnitude: 1.0 })],
                            [makePreparedConstellationWith("lyra")],
                        ),
                        referenceCatalog: referenceA,
                    },
                    preparedSettings(),
                );

                // The old layer roots are detached from the scene by the
                // shared cleanup path, and each old layer is disposed
                // exactly once.
                expect(anyRenderer.scene.children).not.toContain(
                    oldPrimaryRoot,
                );
                expect(anyRenderer.scene.children).not.toContain(
                    oldReferenceRoot,
                );
                expect(primaryDisposeSpy).toHaveBeenCalledTimes(1);
                expect(referenceDisposeSpy).toHaveBeenCalledTimes(1);
                // New layers replaced the old ones.
                expect(anyRenderer.primaryLayer).not.toBe(oldPrimary);
                expect(anyRenderer.referenceLayer).not.toBe(oldReference);
                expect(anyRenderer.primaryLayer).toBeTruthy();
                expect(anyRenderer.referenceLayer).toBeTruthy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("resets selected/hovered ids and makes old positions and hit objects unreachable", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container, {
                onConstellationHover: vi.fn(),
                onStarHover: vi.fn(),
            });
            try {
                const solStar = {
                    ...makeStar({
                        id: SYNTHETIC_SOL_STAR_ID,
                        name: "Sol",
                        magnitude: 0,
                    }),
                    marker: { kind: "synthetic-sol" as const },
                } as PreparedCatalogStar;
                const primaryA = makePreparedCatalog(
                    [
                        makeStar({
                            id: "p1",
                            magnitude: 1.0,
                            rightAscension: 5,
                            declination: 20,
                        }),
                        solStar,
                    ],
                    [makePreparedConstellationWith("orion")],
                );
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: primaryA,
                        referenceCatalog: makePreparedCatalog([
                            makeStar({ id: "r1", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );
                const anyRenderer = renderer as any;
                const oldPrimary = anyRenderer.primaryLayer;
                const oldPoints = oldPrimary.ordinaryStarPoints;
                const oldLines = [...oldPrimary.lineHitObjects];
                const oldMarkers = [...oldPrimary.markerHitObjects];

                renderer.setSelected("orion");
                renderer.setHovered("orion");
                expect(renderer.getSelectedId()).toBe("orion");
                expect(renderer.getStarWorldPosition("p1")).not.toBeNull();
                expect(renderer.focusStarById("p1", 900)).toBe(true);

                // Reinitialize with a different catalog that has no marker
                // record and a different constellation.
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [
                                makeStar({
                                    id: "q1",
                                    magnitude: 1.0,
                                    rightAscension: 6,
                                    declination: 30,
                                }),
                            ],
                            [makePreparedConstellationWith("lyra")],
                        ),
                    },
                    preparedSettings(),
                );

                // Stale selection/hover ids are reset.
                expect(renderer.getSelectedId()).toBeNull();
                expect(renderer.getHoveredId()).toBeNull();
                // Old world positions return null (primary lookup is gone).
                expect(renderer.getStarWorldPosition("p1")).toBeNull();
                expect(
                    renderer.getStarWorldPosition(SYNTHETIC_SOL_STAR_ID),
                ).toBeNull();
                expect(renderer.focusStarById("p1", 900)).toBe(false);
                // Old point/marker/line hit objects are unreachable.
                const newPrimary = anyRenderer.primaryLayer;
                expect(newPrimary).not.toBe(oldPrimary);
                expect(newPrimary.ordinaryStarPoints).not.toBe(oldPoints);
                expect(newPrimary.markerHitObjects).toHaveLength(0);
                for (const oldLine of oldLines) {
                    expect(newPrimary.lineHitObjects).not.toContain(oldLine);
                }
                for (const oldMarker of oldMarkers) {
                    expect(newPrimary.markerHitObjects).not.toContain(
                        oldMarker,
                    );
                }
                // Hover raycasts target the new layer's objects only.
                const intersectObjects = vi.fn(() => []);
                anyRenderer.raycaster.intersectObjects = intersectObjects;
                anyRenderer.raycaster.intersectObject = vi.fn(() => []);
                anyRenderer.lastHoverEmit = 0;
                anyRenderer.onMouseMove({
                    clientX: 100,
                    clientY: 100,
                    preventDefault: () => {},
                });
                const raycastTargets = intersectObjects.mock.calls.flatMap(
                    (call: any[]) => call[0],
                );
                expect(intersectObjects).toHaveBeenCalledWith(
                    newPrimary.lineHitObjects,
                    false,
                );
                for (const oldLine of oldLines) {
                    expect(raycastTargets).not.toContain(oldLine);
                }
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("preserves label/reference preferences and decorative resources across reinit", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // A sparse Earth pass creates the ambient child and the
                // orientation guides.
                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const decorativeRoot = anyRenderer.decorativeRoot;
                const ambient = anyRenderer.decorativeRoot.children.find(
                    (c: any) => c.name === "ambient-stars",
                );
                expect(ambient).toBeTruthy();
                // User-set label preference and stored reference preference.
                renderer.setLabelsVisible(false);
                renderer.setReferenceVisible(true);

                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [makeStar({ id: "p1", magnitude: 1.0 })],
                            [makePreparedConstellationWith("orion")],
                        ),
                        referenceCatalog: makePreparedCatalog([
                            makeStar({ id: "r1", magnitude: 1.0 }),
                        ]),
                    },
                    preparedSettings(),
                );

                // Stored preferences survive the reinitialization.
                expect(anyRenderer.labelsVisible).toBe(false);
                expect(anyRenderer._labelsVisibleUserSet).toBe(true);
                expect(anyRenderer.referenceVisible).toBe(true);
                expect(anyRenderer.referenceLayer.root.visible).toBe(true);
                // The new primary layer applied the stored labels-off choice.
                expect(
                    anyRenderer.primaryLayer.root.getObjectByName(
                        "star-labels",
                    ),
                ).toBeNull();
                // Decorative root and ambient child identity survive, and
                // prepared mode hides the ambient points.
                expect(anyRenderer.decorativeRoot).toBe(decorativeRoot);
                const ambientAfter = anyRenderer.decorativeRoot.children.find(
                    (c: any) => c.name === "ambient-stars",
                );
                expect(ambientAfter).toBe(ambient);
                expect(ambientAfter.visible).toBe(false);
                // Earth guides from the legacy pass are gone.
                expect(
                    anyRenderer.scene.children.find(
                        (c: any) => c.name === "horizon-ring",
                    ),
                ).toBeFalsy();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });

        it("cleanup is safe when a previous initialization failed partway", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                // Simulate a failed previous initialization: a primary layer
                // exists but the reference never materialized and the
                // primary root was never added to the scene.
                const orphaned = new ConstellationCatalogLayer({
                    role: "primary",
                    catalog: adaptPreparedCatalog(
                        makePreparedCatalog([
                            makeStar({ id: "ghost", magnitude: 1.0 }),
                        ]),
                    ),
                    placementContext: { kind: "fixed-equatorial" },
                    settings: preparedSettings(),
                });
                const disposeSpy = vi.spyOn(orphaned, "dispose");
                const anyRenderer = renderer as any;
                anyRenderer.primaryLayer = orphaned;
                anyRenderer.referenceLayer = null;

                // A fresh init must clear the orphaned primary and rebuild
                // cleanly without throwing.
                await expect(
                    renderer.initializePreparedCatalogs(
                        {
                            primaryCatalog: makePreparedCatalog(
                                [makeStar({ id: "q1", magnitude: 1.0 })],
                                [makePreparedConstellationWith("lyra")],
                            ),
                            referenceCatalog: makePreparedCatalog([
                                makeStar({ id: "r1", magnitude: 1.0 }),
                            ]),
                        },
                        preparedSettings(),
                    ),
                ).resolves.toBeUndefined();
                expect(disposeSpy).toHaveBeenCalledTimes(1);
                expect(anyRenderer.primaryLayer).not.toBe(orphaned);
                expect(anyRenderer.referenceLayer).toBeTruthy();
                // The orphaned root never entered the scene and its world
                // positions are gone.
                expect(anyRenderer.scene.children).not.toContain(orphaned.root);
                expect(renderer.getStarWorldPosition("ghost")).toBeNull();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });

    describe("ConstellationRenderer — final disposal", () => {
        it("disposes layer resources, markers, labels, and line distance attributes exactly once", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const solStar = {
                    ...makeStar({
                        id: SYNTHETIC_SOL_STAR_ID,
                        name: "Sol",
                        magnitude: 0,
                    }),
                    marker: { kind: "synthetic-sol" as const },
                } as PreparedCatalogStar;
                const constellation = makePreparedConstellation();
                await renderer.initializePreparedCatalogs(
                    {
                        primaryCatalog: makePreparedCatalog(
                            [
                                solStar,
                                makeStar({ id: "alpha", magnitude: 1.0 }),
                            ],
                            [constellation],
                        ),
                        referenceCatalog: makePreparedCatalog(
                            [makeStar({ id: "r1", magnitude: 1.0 })],
                            [constellation],
                        ),
                        referenceVisible: true,
                    },
                    preparedSettings(),
                );
                // Labels are created lazily on the first enable.
                renderer.setLabelsVisible(true);

                const anyRenderer = renderer as any;
                const primaryLayer = anyRenderer.primaryLayer;
                const referenceLayer = anyRenderer.referenceLayer;
                const disposeSpies = [
                    vi.spyOn(primaryLayer, "dispose"),
                    vi.spyOn(referenceLayer, "dispose"),
                ];

                const disposables: { dispose: () => void }[] = [];
                const collect = (obj: any): void => {
                    if (obj?.dispose && !disposables.includes(obj)) {
                        disposables.push(obj);
                    }
                };
                for (const layer of [primaryLayer, referenceLayer]) {
                    const points = layer.ordinaryStarPoints;
                    if (points) {
                        collect(points.geometry);
                        collect(points.material);
                    }
                    for (const line of layer.lineHitObjects) {
                        collect(line.geometry);
                        collect(line.material);
                        // The mock attributes do not implement dispose();
                        // install a spy so the layer's guarded attribute
                        // disposal (including the line distance attributes)
                        // is observable.
                        const attributes = Object.values(
                            line.geometry.attributes,
                        ) as Array<{ dispose?: () => void }>;
                        for (const attr of attributes) {
                            if (typeof attr.dispose !== "function") {
                                attr.dispose = vi.fn();
                            }
                            collect(attr);
                        }
                    }
                    for (const marker of layer.markerHitObjects) {
                        const stack: any[] = [marker];
                        while (stack.length > 0) {
                            const node = stack.pop();
                            collect(node.geometry);
                            collect(node.material);
                            stack.push(...(node.children ?? []));
                        }
                    }
                    // Label sprites (star/constellation/marker label groups).
                    const walk = (node: any): void => {
                        for (const child of node.children ?? []) {
                            if (child.material) {
                                collect(child.material);
                                collect(child.material.map);
                            }
                            walk(child);
                        }
                    };
                    walk(layer.root);
                }
                expect(disposables.length).toBeGreaterThan(0);

                renderer.dispose();
                renderer.dispose();

                for (const spy of disposeSpies) {
                    expect(spy).toHaveBeenCalledTimes(1);
                }
                for (const resource of disposables) {
                    expect(resource.dispose).toHaveBeenCalledTimes(1);
                }
                // The disposed renderer no longer resolves old positions.
                expect(renderer.getStarWorldPosition("alpha")).toBeNull();
                expect(
                    renderer.getStarWorldPosition(SYNTHETIC_SOL_STAR_ID),
                ).toBeNull();
            } finally {
                try {
                    renderer.dispose();
                } catch {
                    // already disposed
                }
                container.remove();
            }
        });

        it("disposes Earth guides, ambient points, and the starfield sphere exactly once", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar({ id: "s1", magnitude: 1.0 })],
                    [],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const disposables: { dispose: () => void }[] = [];
                const collect = (obj: any): void => {
                    if (obj?.dispose && !disposables.includes(obj)) {
                        disposables.push(obj);
                    }
                };

                // Horizon ring geometry + material.
                const ring = anyRenderer.horizonRing;
                collect(ring.geometry);
                collect(ring.material);
                // Four cardinal label sprite materials + textures.
                for (const sprite of anyRenderer.cardinalLabels.children) {
                    collect(sprite.material);
                    collect(sprite.material.map);
                }
                // Ambient points geometry + material.
                const ambient = anyRenderer.ambientStarPoints;
                collect(ambient.geometry);
                collect(ambient.material);
                // Starfield sphere geometry + material.
                const starfield = anyRenderer.decorativeRoot.children.find(
                    (c: any) => c.name === "starfield-background",
                );
                collect(starfield.geometry);
                collect(starfield.material);

                renderer.dispose();
                renderer.dispose();

                for (const resource of disposables) {
                    expect(resource.dispose).toHaveBeenCalledTimes(1);
                }
                expect(anyRenderer.ambientStarPoints).toBeNull();
                expect(anyRenderer.scene.children).not.toContain(
                    anyRenderer.decorativeRoot,
                );
            } finally {
                try {
                    renderer.dispose();
                } catch {
                    // already disposed
                }
                container.remove();
            }
        });

        it("removes window/canvas listeners, removes the canvas, and disposes the WebGL renderer exactly once", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                const canvas = anyRenderer.canvas as HTMLCanvasElement;
                const windowRemoveSpy = vi.spyOn(window, "removeEventListener");
                const canvasRemoveSpy = vi.spyOn(canvas, "removeEventListener");
                const rendererDisposeSpy = vi.spyOn(
                    anyRenderer.renderer,
                    "dispose",
                );

                renderer.dispose();
                renderer.dispose();

                // The window resize listener is removed exactly once.
                expect(windowRemoveSpy).toHaveBeenCalledTimes(1);
                expect(windowRemoveSpy).toHaveBeenCalledWith(
                    "resize",
                    anyRenderer._boundResize,
                );
                // Each canvas listener is removed exactly once.
                const pairs: Array<[string, unknown]> = [
                    ["mousedown", anyRenderer._boundMouseDown],
                    ["mousemove", anyRenderer._boundMouseMove],
                    ["mouseup", anyRenderer._boundMouseUp],
                    ["mouseleave", anyRenderer._boundMouseLeave],
                    ["wheel", anyRenderer._boundMouseWheel],
                    ["contextmenu", anyRenderer._boundContextMenu],
                    ["click", anyRenderer._clickHandler],
                    ["touchstart", anyRenderer._boundTouchStart],
                    ["touchmove", anyRenderer._boundTouchMove],
                    ["touchend", anyRenderer._boundTouchEnd],
                ];
                for (const [type, handler] of pairs) {
                    expect(canvasRemoveSpy).toHaveBeenCalledWith(type, handler);
                }
                expect(canvasRemoveSpy.mock.calls.length).toBe(pairs.length);
                // The WebGL renderer is disposed exactly once.
                expect(rendererDisposeSpy).toHaveBeenCalledTimes(1);
                // The canvas is removed from the DOM and the renderer is
                // marked disposed with both animation chains stopped.
                expect(container.querySelectorAll("canvas")).toHaveLength(0);
                expect(anyRenderer._disposed).toBe(true);
                expect(anyRenderer._rafId).toBeNull();
                expect(anyRenderer._momentumRafId).toBeNull();
                expect(anyRenderer.animationRunning).toBe(false);
            } finally {
                try {
                    renderer.dispose();
                } catch {
                    // already disposed
                }
                container.remove();
            }
        });

        it("releases an active shooting star and cancels both animation frame ids exactly once", async () => {
            const container = makeContainer();
            const rafSpy = vi.fn(() => 7);
            const cancelSpy = vi.fn();
            vi.stubGlobal("requestAnimationFrame", rafSpy);
            vi.stubGlobal("cancelAnimationFrame", cancelSpy);
            const renderer = new ConstellationRenderer(container);
            try {
                await renderer.initialize(
                    [makeStar()],
                    [makeConstellation()],
                    makeSkyConfig(),
                );
                const anyRenderer = renderer as any;
                expect(anyRenderer._rafId).toBe(7);

                // Force an active shooting star and a momentum chain so both
                // RAF ids are outstanding at dispose time.
                anyRenderer.spawnShootingStar(1000);
                const line = anyRenderer.activeShootingStar;
                const geometrySpy = vi.spyOn(line.geometry, "dispose");
                const materialSpy = vi.spyOn(line.material, "dispose");
                anyRenderer.startMomentumAnimation();
                expect(anyRenderer._momentumRafId).toBe(7);

                renderer.dispose();
                renderer.dispose();

                // The shooting star resources are released exactly once and
                // both outstanding frame ids are cancelled exactly once.
                expect(geometrySpy).toHaveBeenCalledTimes(1);
                expect(materialSpy).toHaveBeenCalledTimes(1);
                expect(cancelSpy).toHaveBeenCalledTimes(2);
                expect(anyRenderer._rafId).toBeNull();
                expect(anyRenderer._momentumRafId).toBeNull();
            } finally {
                vi.unstubAllGlobals();
                container.remove();
            }
        });

        it("remains safe on a second call after constructor-only or partial initialization", async () => {
            // Constructor-only renderer: no initialization ever ran.
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            expect(() => renderer.dispose()).not.toThrow();
            expect(() => renderer.dispose()).not.toThrow();
            container.remove();

            // Partial initialization: a primary layer exists but was never
            // attached to the scene, and no reference layer exists.
            const container2 = makeContainer();
            const renderer2 = new ConstellationRenderer(container2);
            const orphaned = new ConstellationCatalogLayer({
                role: "primary",
                catalog: adaptPreparedCatalog(
                    makePreparedCatalog([
                        makeStar({ id: "ghost", magnitude: 1.0 }),
                    ]),
                ),
                placementContext: { kind: "fixed-equatorial" },
                settings: preparedSettings(),
            });
            const disposeSpy = vi.spyOn(orphaned, "dispose");
            (renderer2 as any).primaryLayer = orphaned;
            (renderer2 as any).referenceLayer = null;
            expect(() => renderer2.dispose()).not.toThrow();
            expect(disposeSpy).toHaveBeenCalledTimes(1);
            // A second call releases nothing further.
            expect(() => renderer2.dispose()).not.toThrow();
            expect(disposeSpy).toHaveBeenCalledTimes(1);
            container2.remove();
        });
    });

    describe("ConstellationRenderer — readonly input safety", () => {
        it("accepts deeply frozen prepared requests and settings without mutation", async () => {
            const container = makeContainer();
            const renderer = new ConstellationRenderer(container);
            try {
                const star = Object.freeze({
                    ...makeStar({
                        id: "p1",
                        magnitude: 1.0,
                        rightAscension: 5,
                        declination: 20,
                    }),
                });
                const primaryCatalog: PreparedConstellationCatalog =
                    Object.freeze({
                        stars: Object.freeze([star]),
                        constellations: Object.freeze([]),
                    });
                const settings = Object.freeze(preparedSettings());

                await renderer.initializePreparedCatalogs(
                    { primaryCatalog },
                    settings,
                );

                const attr = (
                    renderer as any
                ).primaryLayer.ordinaryStarPoints.geometry.getAttribute(
                    "position",
                );
                expect(attr.count).toBe(1);
                expect(renderer.getStarWorldPosition("p1")).not.toBeNull();
            } finally {
                renderer.dispose();
                container.remove();
            }
        });
    });
});
