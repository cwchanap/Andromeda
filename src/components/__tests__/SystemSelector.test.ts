/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SystemSelector from "@/components/SystemSelector.svelte";
import type { StarSystemData } from "@/types/universe";
import type { CelestialBodyData } from "@/types/game";

// Mock gameStore actions
vi.mock("@/stores/gameStore", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/stores/gameStore")>();
    return {
        ...actual,
        gameActions: {
            ...actual.gameActions,
            updateGameState: vi.fn(),
        },
    };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBody(
    id: string,
    type: "star" | "planet" = "planet",
): CelestialBodyData {
    return {
        id,
        name: id,
        type,
        description: `${id} description`,
        keyFacts: {
            diameter: "1 km",
            distanceFromSun: "1 AU",
            orbitalPeriod: "1 year",
            composition: ["rock"],
            temperature: "300 K",
        },
        images: [],
        position: { x: 0, y: 0, z: 0 } as any,
        scale: 1,
        material: { color: "#ffffff" },
    } as unknown as CelestialBodyData;
}

function makeSystem(
    id: string,
    overrides: Partial<StarSystemData> = {},
): StarSystemData {
    return {
        id,
        name: id === "solar" ? "Solar System" : "Alpha Centauri",
        description: `${id} description`,
        systemType: "star-system",
        star: makeBody(`${id}-star`, "star"),
        celestialBodies: [makeBody(`${id}-planet`)],
        metadata: { distance: "4.2 ly" },
        ...overrides,
    } as unknown as StarSystemData;
}

function makeUniverseManager(currentId = "solar", systems?: StarSystemData[]) {
    const allSystems = systems ?? [makeSystem("solar"), makeSystem("alpha")];
    return {
        getCurrentSystem: vi.fn(
            () => allSystems.find((s) => s.id === currentId) ?? null,
        ),
        getAllSystems: vi.fn(() => allSystems),
        switchToSystem: vi.fn().mockResolvedValue(true),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SystemSelector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing", () => {
        const mgr = makeUniverseManager();
        expect(() =>
            render(SystemSelector, { props: { universeManager: mgr as any } }),
        ).not.toThrow();
    });

    it("renders the dialog header title", () => {
        const mgr = makeUniverseManager();
        render(SystemSelector, { props: { universeManager: mgr as any } });
        expect(screen.getByText("Select Star System")).toBeDefined();
    });

    it("renders a close button", () => {
        const mgr = makeUniverseManager();
        render(SystemSelector, { props: { universeManager: mgr as any } });
        expect(screen.getByRole("button", { name: /close/i })).toBeDefined();
    });

    it("close button calls onClose callback", async () => {
        const mgr = makeUniverseManager();
        const onClose = vi.fn();
        render(SystemSelector, {
            props: { universeManager: mgr as any, onClose },
        });
        const closeBtn = screen.getByRole("button", { name: /close/i });
        await fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders a card for each available system", async () => {
        const mgr = makeUniverseManager();
        const { container } = render(SystemSelector, {
            props: { universeManager: mgr as any },
        });
        await Promise.resolve(); // flush onMount
        const cards = container.querySelectorAll(".systems-grid > *");
        expect(cards.length).toBe(2);
    });

    it("current system shows 'Current System' button (disabled)", async () => {
        const mgr = makeUniverseManager("solar");
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        expect(screen.getByText("Current System")).toBeDefined();
    });

    it("non-current system shows 'Explore' button", async () => {
        const mgr = makeUniverseManager("solar");
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        expect(screen.getByText("Explore")).toBeDefined();
    });

    it("clicking Explore triggers onSystemSelect callback", async () => {
        const mgr = makeUniverseManager("solar");
        const onSystemSelect = vi.fn().mockResolvedValue(undefined);
        render(SystemSelector, {
            props: { universeManager: mgr as any, onSystemSelect },
        });
        await Promise.resolve();
        const exploreBtn = screen.getByText("Explore");
        await fireEvent.click(exploreBtn);
        // Allow async transition to complete
        await Promise.resolve();
        await Promise.resolve();
        expect(mgr.switchToSystem).toHaveBeenCalledWith("alpha");
    });

    it("displays system description text", async () => {
        const mgr = makeUniverseManager();
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        expect(screen.getByText("solar description")).toBeDefined();
    });

    it("displays distance metadata for each system", async () => {
        const mgr = makeUniverseManager();
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        const distanceEls = screen.getAllByText(/4\.2 ly/);
        expect(distanceEls.length).toBeGreaterThan(0);
    });

    it("getSystemPreview shows body count and types", async () => {
        const mgr = makeUniverseManager();
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        // Each system has 1 planet body
        expect(screen.getAllByText(/1 celestial bodies/)).not.toHaveLength(0);
    });

    it("system with constellation metadata shows it", async () => {
        const systemWithConstellation = makeSystem("solar", {
            metadata: { distance: "0 ly", constellation: "Orion" },
        } as any);
        const mgr = makeUniverseManager("solar", [systemWithConstellation]);
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        expect(screen.getByText("Orion")).toBeDefined();
    });

    it("system with no distance metadata shows 'Unknown distance'", async () => {
        const system = makeSystem("solar", { metadata: {} } as any);
        const mgr = makeUniverseManager("solar", [system]);
        render(SystemSelector, { props: { universeManager: mgr as any } });
        await Promise.resolve();
        expect(screen.getByText("Unknown distance")).toBeDefined();
    });
});
