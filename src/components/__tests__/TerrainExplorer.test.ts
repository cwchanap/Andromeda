import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import TerrainExplorer from "@/components/TerrainExplorer.svelte";

// Mock the planetary system registry
vi.mock("@/lib/planetary-system", () => ({
    planetarySystemRegistry: {
        getSystem: vi.fn((id: string) => ({
            id,
            systemData: {
                id: "solar",
                name: "Solar System",
                star: {
                    id: "sun",
                    name: "Sun",
                    type: "star",
                },
                celestialBodies: [
                    {
                        id: "earth",
                        name: "Earth",
                        type: "planet",
                        description: "Our home planet",
                        keyFacts: {
                            diameter: "12,742 km",
                            distanceFromSun: "150 million km",
                            orbitalPeriod: "365.25 days",
                            composition: ["Rock", "Iron"],
                            temperature: "15°C",
                        },
                        images: [],
                        position: { x: 5, y: 0, z: 0 },
                        scale: 1,
                        material: { color: "#6B93D6" },
                        terrain: {
                            heightMap: "earth_terrain.png",
                            features: [
                                { type: "Mountains" },
                                { type: "Oceans" },
                                { type: "Plains" },
                            ],
                        },
                    },
                ],
            },
        })),
        getAllSystems: vi.fn(() => []),
        registerSystem: vi.fn(),
    },
}));

// Mock OrbitControls addon
vi.mock("three/addons/controls/OrbitControls.js", () => ({
    OrbitControls: vi.fn().mockImplementation(() => ({
        enabled: true,
        enableDamping: true,
        dampingFactor: 0.05,
        enableZoom: true,
        enableRotate: true,
        enablePan: true,
        minDistance: 2,
        maxDistance: 20,
        target: { set: vi.fn(), copy: vi.fn(), x: 0, y: 0, z: 0 },
        mouseButtons: {},
        update: vi.fn(),
        dispose: vi.fn(),
        addEventListener: vi.fn(),
    })),
}));

describe("TerrainExplorer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing with planetId prop", () => {
        expect(() =>
            render(TerrainExplorer, { props: { planetId: "earth" } }),
        ).not.toThrow();
    });

    it("renders the .terrain-explorer root element", () => {
        const { container } = render(TerrainExplorer, {
            props: { planetId: "earth" },
        });
        const root = container.querySelector(".terrain-explorer");
        expect(root).not.toBeNull();
    });

    it("renders the 3D terrain container", () => {
        const { container } = render(TerrainExplorer, {
            props: { planetId: "earth" },
        });
        const terrainContainer = container.querySelector("#terrain-container");
        expect(terrainContainer).not.toBeNull();
    });

    it("renders the terrain container element always", () => {
        const { container } = render(TerrainExplorer, {
            props: { planetId: "earth" },
        });
        // terrain-container is always in the DOM regardless of loading state
        const terrainContainer = container.querySelector("#terrain-container");
        expect(terrainContainer).not.toBeNull();
    });

    it("renders with lang prop", () => {
        expect(() =>
            render(TerrainExplorer, {
                props: { planetId: "earth", lang: "en" },
            }),
        ).not.toThrow();
    });

    it("renders with translations prop", () => {
        expect(() =>
            render(TerrainExplorer, {
                props: {
                    planetId: "earth",
                    translations: { "terrain.title": "Terrain Explorer" },
                },
            }),
        ).not.toThrow();
    });

    it("does not render error state initially", () => {
        const { container } = render(TerrainExplorer, {
            props: { planetId: "earth" },
        });
        const errorContainer = container.querySelector(".error-container");
        expect(errorContainer).toBeNull();
    });

    it("unmounts cleanly", () => {
        const { unmount } = render(TerrainExplorer, {
            props: { planetId: "earth" },
        });
        expect(() => unmount()).not.toThrow();
    });
});
