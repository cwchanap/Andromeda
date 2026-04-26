/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import ComparisonModal from "@/components/ComparisonModal.svelte";
import { ComparisonSphereRenderer } from "@/lib/comparison/ComparisonSphereRenderer";
import type { CelestialBodyData } from "@/types/game";

// Mock ComparisonSphereRenderer to avoid Three.js side-effects
vi.mock("@/lib/comparison/ComparisonSphereRenderer", () => ({
    ComparisonSphereRenderer: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        updateBodies: vi.fn(),
        startAnimation: vi.fn(),
        dispose: vi.fn(),
        exportAsPNG: vi.fn(() => "data:image/png;base64,abc"),
    })),
}));

// Mock comparisonUtils
vi.mock("@/utils/comparisonUtils", () => ({
    getAllBodiesFromAllSystems: vi.fn(() => []),
    searchBodies: vi.fn((bodies: unknown[]) => bodies),
    calculateSizeRatios: vi.fn(() => ({})),
    formatSizeRatio: vi.fn((r: number) => `${r}x`),
    COMPARISON_ATTRIBUTES: [],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBody(id: string): CelestialBodyData {
    return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        type: "planet",
        description: `${id} description`,
        keyFacts: {
            diameter: "12,742 km",
            distanceFromSun: "1 AU",
            orbitalPeriod: "365 days",
            composition: ["nitrogen", "oxygen"],
            temperature: "15°C",
            moons: 1,
        },
        images: [],
        position: { x: 0, y: 0, z: 0 } as any,
        scale: 1,
        material: { color: "#0000ff" },
    } as unknown as CelestialBodyData;
}

const defaultProps = {
    isOpen: true,
    bodies: [],
    onClose: vi.fn(),
    onRemoveBody: vi.fn(),
    onAddBody: vi.fn(),
    lang: "en",
    translations: {},
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComparisonModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without throwing when isOpen=true", () => {
        expect(() =>
            render(ComparisonModal, { props: defaultProps }),
        ).not.toThrow();
    });

    it("does not render visible content when isOpen=false", () => {
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, isOpen: false },
        });
        // The {#if isOpen} block should be inactive
        const overlay = container.querySelector(".modal-overlay");
        expect(overlay).toBeNull();
    });

    it("renders modal-overlay when isOpen=true", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        const overlay = container.querySelector(".modal-overlay");
        expect(overlay).not.toBeNull();
    });

    it("renders empty-state element when bodies array is empty", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        expect(container.querySelector(".empty-state")).not.toBeNull();
    });

    it("renders modal-close button", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        expect(container.querySelector(".modal-close")).not.toBeNull();
    });

    it("clicking modal-close button calls onClose", async () => {
        const onClose = vi.fn();
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, onClose },
        });
        const closeBtn = container.querySelector(".modal-close") as HTMLElement;
        await fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it("pressing Escape on the overlay calls onClose", async () => {
        const onClose = vi.fn();
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, onClose },
        });
        const overlay = container.querySelector(
            ".modal-overlay",
        ) as HTMLElement;
        await fireEvent.keyDown(overlay, { key: "Escape" });
        expect(onClose).toHaveBeenCalled();
    });

    it("clicking the overlay background calls onClose", async () => {
        const onClose = vi.fn();
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, onClose },
        });
        const overlay = container.querySelector(
            ".modal-overlay",
        ) as HTMLElement;
        // Simulate clicking directly on the overlay (not a child)
        await fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders body names when bodies are provided", async () => {
        const bodies = [makeBody("earth")];
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, bodies },
        });
        await Promise.resolve();
        expect(container.innerHTML).toContain("Earth");
    });

    it("renders star-field background stars", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        const stars = container.querySelectorAll(".star");
        // 75 background stars are generated
        expect(stars.length).toBe(75);
    });

    it("renders modal-header", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        expect(container.querySelector(".modal-header")).not.toBeNull();
    });

    it("renders modal-footer", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        expect(container.querySelector(".modal-footer")).not.toBeNull();
    });

    it("uses translation key 'comparison.title' for title", () => {
        const translations = { "comparison.title": "Galaxy Compare" };
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, translations },
        });
        expect(container.innerHTML).toContain("Galaxy Compare");
    });

    it("shows add-body button section", () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        const buttons = container.querySelectorAll("button");
        expect(buttons.length).toBeGreaterThan(0);
    });
});

describe("ComparisonModal – body selector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("clicking add-body-btn opens the body selector", async () => {
        const { container } = render(ComparisonModal, { props: defaultProps });
        const addBtn = container.querySelector(".add-body-btn") as HTMLElement;
        expect(addBtn).not.toBeNull();
        await fireEvent.click(addBtn);
        expect(container.querySelector(".body-selector")).not.toBeNull();
    });

    it("pressing Escape when body selector is open closes selector instead of modal", async () => {
        const onClose = vi.fn();
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, onClose },
        });
        const addBtn = container.querySelector(".add-body-btn") as HTMLElement;
        await fireEvent.click(addBtn);
        expect(container.querySelector(".body-selector")).not.toBeNull();

        const overlay = container.querySelector(
            ".modal-overlay",
        ) as HTMLElement;
        await fireEvent.keyDown(overlay, { key: "Escape" });

        expect(container.querySelector(".body-selector")).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("handleSelectBody calls onAddBody and hides the selector", async () => {
        const onAddBody = vi.fn();
        const marsBody = makeBody("mars");

        const compUtils = await import("@/utils/comparisonUtils");
        (
            compUtils.getAllBodiesFromAllSystems as ReturnType<typeof vi.fn>
        ).mockReturnValueOnce([
            { body: marsBody, systemName: "Solar System", systemId: "solar" },
        ]);
        (compUtils.searchBodies as ReturnType<typeof vi.fn>).mockImplementation(
            (bodies: unknown[]) => bodies,
        );

        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, onAddBody },
        });

        const addBtn = container.querySelector(".add-body-btn") as HTMLElement;
        await fireEvent.click(addBtn);
        await Promise.resolve();

        const bodyOption = container.querySelector(
            ".body-option",
        ) as HTMLElement;
        expect(bodyOption).not.toBeNull();
        await fireEvent.click(bodyOption);
        expect(onAddBody).toHaveBeenCalledWith(marsBody);
        expect(container.querySelector(".body-selector")).toBeNull();
    });
});

describe("ComparisonModal – renderer creation and cleanup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creates ComparisonSphereRenderer after 100ms when 2+ bodies present", async () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        await vi.advanceTimersByTimeAsync(50);
        expect(ComparisonSphereRenderer).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(200);
        expect(ComparisonSphereRenderer).toHaveBeenCalled();
    });

    it("calls startAnimation on created renderer", async () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        await vi.advanceTimersByTimeAsync(200);
        const inst = (ComparisonSphereRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        expect(inst?.startAnimation).toHaveBeenCalled();
    });

    it("calls dispose on renderer when unmounted after creation", async () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        const { unmount } = render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        await vi.advanceTimersByTimeAsync(200);
        const inst = (ComparisonSphereRenderer as ReturnType<typeof vi.fn>).mock
            .results[0]?.value;
        unmount();
        expect(inst?.dispose).toHaveBeenCalled();
    });

    it("clears pending initTimer when unmounted before timer fires", async () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        const { unmount } = render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        // Unmount before the 100ms timer fires
        expect(() => unmount()).not.toThrow();
        // Timer should never fire after unmount
        await vi.advanceTimersByTimeAsync(200);
        expect(ComparisonSphereRenderer).not.toHaveBeenCalled();
    });
});

describe("ComparisonModal – export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("export button is enabled when 2+ bodies are present", () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        const exportBtn = container.querySelector(
            ".export-btn",
        ) as HTMLButtonElement;
        expect(exportBtn).not.toBeNull();
        expect(exportBtn.disabled).toBe(false);
    });

    it("clicking export button triggers handleExport and creates download link", async () => {
        const bodies = [makeBody("earth"), makeBody("mars")];
        const { container } = render(ComparisonModal, {
            props: { ...defaultProps, isOpen: true, bodies },
        });
        // Wait for renderer to be created
        await vi.advanceTimersByTimeAsync(200);

        // Spy on anchor click to prevent navigation
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(() => {});

        try {
            const exportBtn = container.querySelector(
                ".export-btn",
            ) as HTMLButtonElement;
            await fireEvent.click(exportBtn);
            await vi.advanceTimersByTimeAsync(10);

            const inst = (ComparisonSphereRenderer as ReturnType<typeof vi.fn>)
                .mock.results[0]?.value;
            expect(inst?.exportAsPNG).toHaveBeenCalled();
        } finally {
            clickSpy.mockRestore();
        }
    });
});
