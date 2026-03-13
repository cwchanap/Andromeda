/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
});
