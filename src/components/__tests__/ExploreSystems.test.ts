import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/svelte";
import ExploreSystems from "@/components/ExploreSystems.svelte";
import { planetarySystemRegistry } from "@/lib/planetary-system";
import type { PlanetarySystem } from "@/lib/planetary-system/types";

const mockSystems = [
    {
        id: "solar",
        name: "Solar System",
        description: "Our home star system",
        systemData: {
            id: "solar",
            name: "Solar System",
            systemType: "star-system",
            celestialBodies: Array(8).fill({ id: "body" }),
            metadata: { distance: "0 ly", constellation: "Zodiac" },
        },
    },
    {
        id: "alpha-centauri",
        name: "Alpha Centauri",
        description: "Nearest star system",
        systemData: {
            id: "alpha-centauri",
            name: "Alpha Centauri",
            systemType: "binary-star",
            celestialBodies: Array(3).fill({ id: "body" }),
            metadata: { distance: "4.37 ly" },
        },
    },
];

const mockTranslations: Record<string, string> = {
    "explore.title": "Explore Systems",
    "explore.searchPlaceholder": "Search systems…",
    "explore.empty": "No systems match your search",
    "explore.knownPlanets": "Known Planets",
    "explore.distance": "Distance",
    "explore.current": "Current",
    "explore.action": "Select",
    "explore.prev": "Prev",
    "explore.next": "Next",
    "finder.close": "Close",
    // No systems.<id>.name keys here by design: this exercises the fallback
    // to the registry name, mirroring how useTranslations returns a falsy
    // value for missing keys.
};

vi.mock("@/lib/planetary-system", () => ({
    planetarySystemRegistry: {
        getAllSystems: vi.fn(() => mockSystems),
    },
}));

describe("ExploreSystems", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders all systems by default", () => {
        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });
        // Both system names appear via GlitchText (aria-label)
        const labels = Array.from(container.querySelectorAll("[aria-label]"))
            .filter((el) =>
                el.getAttribute("aria-label")?.match(/SYSTEM|CENTAURI/),
            )
            .map((el) => el.getAttribute("aria-label"));
        expect(labels).toContain("SOLAR SYSTEM");
        expect(labels).toContain("ALPHA CENTAURI");
    });

    it("uses the i18n system name when a translation exists", () => {
        // Provide a translated name for solar; assert it is rendered instead
        // of the raw registry name.
        const t = (k: string) =>
            k === "systems.solar.name" ? "Sol (i18n)" : "";
        const { container } = render(ExploreSystems, { props: { t } });
        const labels = Array.from(
            container.querySelectorAll("[aria-label]"),
        ).map((el) => el.getAttribute("aria-label") ?? "");
        expect(labels).toContain("SOL (I18N)");
        // The untranslated alpha-centauri must still fall back to registry name.
        expect(labels).toContain("ALPHA CENTAURI");
    });

    it("falls back to registry name when t returns the key unchanged", () => {
        // Mirrors the pre-computed translations prop path where missing
        // keys are returned as-is (identity function behaviour).
        const t = (k: string) => k;
        const { container } = render(ExploreSystems, { props: { t } });
        const labels = Array.from(
            container.querySelectorAll("[aria-label]"),
        ).map((el) => el.getAttribute("aria-label") ?? "");
        // Both systems lack translations, so both should show registry names.
        expect(labels).toContain("SOLAR SYSTEM");
        expect(labels).toContain("ALPHA CENTAURI");
        // Ensure raw translation keys never leak into the UI.
        expect(labels).not.toContain("SYSTEMS.SOLAR.NAME");
        expect(labels).not.toContain("SYSTEMS.ALPHA-CENTAURI.NAME");
    });

    it("calls onClose when close button is clicked", async () => {
        const onClose = vi.fn();
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
                onClose,
            },
        });
        const closeBtn = Array.from(container.querySelectorAll("button")).find(
            (b) => b.textContent?.includes("Close"),
        );
        expect(closeBtn).toBeTruthy();
        await fireEvent.click(closeBtn!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSelect with system id when Select button is clicked", async () => {
        const onSelect = vi.fn();
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
                onSelect,
            },
        });
        const selectButtons = Array.from(
            container.querySelectorAll("button"),
        ).filter((b) => b.textContent?.includes("Select"));
        expect(selectButtons.length).toBeGreaterThan(0);
        await fireEvent.click(selectButtons[0]);
        expect(onSelect).toHaveBeenCalledTimes(1);
        // Should be called with a system id from our mock data
        const calledId = onSelect.mock.calls[0][0];
        expect(["solar", "alpha-centauri"]).toContain(calledId);
    });

    it("shows disabled button for current system", () => {
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
                currentSystemId: "solar",
            },
        });
        const disabledBtn = Array.from(
            container.querySelectorAll("button"),
        ).find((b) => b.textContent?.includes("Current"));
        expect(disabledBtn).toBeTruthy();
        expect(disabledBtn?.hasAttribute("disabled")).toBe(true);
    });

    it("shows empty state when search matches nothing", async () => {
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
            },
        });
        const searchInput = container.querySelector("input");
        expect(searchInput).toBeTruthy();
        await fireEvent.input(searchInput!, {
            target: { value: "zzzznonexistent" },
        });
        expect(container.textContent).toContain("No systems match your search");
    });

    it("filters systems by name when typing in search", async () => {
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
            },
        });
        const searchInput = container.querySelector("input");
        expect(searchInput).toBeTruthy();
        await fireEvent.input(searchInput!, {
            target: { value: "alpha" },
        });
        const labels = Array.from(container.querySelectorAll("[aria-label]"))
            .filter((el) =>
                el.getAttribute("aria-label")?.match(/SYSTEM|CENTAURI/),
            )
            .map((el) => el.getAttribute("aria-label"));
        expect(labels).toContain("ALPHA CENTAURI");
        expect(labels).not.toContain("SOLAR SYSTEM");
    });

    it("has role=dialog with aria-modal", () => {
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
            },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
    });

    it("calls onClose when Escape is pressed on the dialog", async () => {
        const onClose = vi.fn();
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
                onClose,
            },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();
        await fireEvent.keyDown(dialog!, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("autofocuses the search input when rendered", async () => {
        const { container } = render(ExploreSystems, {
            props: {
                t: (k: string) => mockTranslations[k] || "",
            },
        });
        const searchInput = container.querySelector("input");
        expect(searchInput).toBeTruthy();
        // The autofocus attribute should be passed through to HudSearch
        // which will focus the input on mount
        expect(searchInput).toBe(document.activeElement);
    });

    it("renders pagination controls when there are enough systems", async () => {
        // Create 7+ systems to trigger pagination (PER_PAGE=6)
        const manySystems = Array.from({ length: 8 }, (_, i) => ({
            id: `system-${i}`,
            name: `System ${i}`,
            description: `Test system ${i}`,
            version: "1.0.0",
            systemData: {
                id: `system-${i}`,
                name: `System ${i}`,
                systemType: "star-system",
                celestialBodies: [],
                metadata: { distance: `${i} ly` },
            },
        }));

        vi.mocked(planetarySystemRegistry.getAllSystems).mockReturnValue(
            manySystems as unknown as PlanetarySystem[],
        );

        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });

        await waitFor(() =>
            expect(container.querySelector(".hud-pager")).not.toBeNull(),
        );

        // Prev should be disabled on page 1
        const prevBtn = Array.from(container.querySelectorAll("button")).find(
            (b) => b.textContent?.includes("Prev"),
        );
        expect(prevBtn?.hasAttribute("disabled")).toBe(true);

        const nextBtn = Array.from(container.querySelectorAll("button")).find(
            (b) => b.textContent?.includes("Next"),
        );
        expect(nextBtn?.hasAttribute("disabled")).toBe(false);

        // Page label should show "01 / 02"
        const label = container.querySelector(".hud-pager-label");
        expect(label?.textContent).toBe("01 / 02");
    });

    it("navigates to next page and back", async () => {
        const manySystems = Array.from({ length: 8 }, (_, i) => ({
            id: `system-${i}`,
            name: `System ${i}`,
            description: `Test system ${i}`,
            version: "1.0.0",
            systemData: {
                id: `system-${i}`,
                name: `System ${i}`,
                systemType: "star-system",
                celestialBodies: [],
                metadata: { distance: `${i} ly` },
            },
        }));

        vi.mocked(planetarySystemRegistry.getAllSystems).mockReturnValue(
            manySystems as unknown as PlanetarySystem[],
        );

        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });

        await waitFor(() =>
            expect(container.querySelector(".hud-pager")).not.toBeNull(),
        );

        const nextBtn = Array.from(container.querySelectorAll("button")).find(
            (b) => b.textContent?.includes("Next"),
        );
        await fireEvent.click(nextBtn!);

        const label = container.querySelector(".hud-pager-label");
        expect(label?.textContent).toBe("02 / 02");

        // Now prev should be enabled and next disabled
        const prevBtn = Array.from(container.querySelectorAll("button")).find(
            (b) => b.textContent?.includes("Prev"),
        );
        expect(prevBtn?.hasAttribute("disabled")).toBe(false);
        expect(nextBtn?.hasAttribute("disabled")).toBe(true);

        // Go back to page 1
        await fireEvent.click(prevBtn!);
        expect(container.querySelector(".hud-pager-label")?.textContent).toBe(
            "01 / 02",
        );
    });

    it("stops propagation of ArrowDown key inside dialog", async () => {
        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();

        const arrowEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
        });
        const spy = vi.spyOn(arrowEvent, "stopPropagation");
        dialog!.dispatchEvent(arrowEvent);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("stops propagation of Enter key inside dialog", async () => {
        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();

        const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
        });
        const spy = vi.spyOn(enterEvent, "stopPropagation");
        dialog!.dispatchEvent(enterEvent);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("stops propagation of Space key inside dialog", async () => {
        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();

        const spaceEvent = new KeyboardEvent("keydown", {
            key: " ",
            bubbles: true,
        });
        const spy = vi.spyOn(spaceEvent, "stopPropagation");
        dialog!.dispatchEvent(spaceEvent);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("does not stop propagation for unrelated keys", async () => {
        const { container } = render(ExploreSystems, {
            props: { t: (k: string) => mockTranslations[k] || "" },
        });
        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();

        const keyEvent = new KeyboardEvent("keydown", {
            key: "a",
            bubbles: true,
        });
        const spy = vi.spyOn(keyEvent, "stopPropagation");
        dialog!.dispatchEvent(keyEvent);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
