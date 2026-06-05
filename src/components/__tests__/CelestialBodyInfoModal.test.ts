import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import CelestialBodyInfoModal from "@/components/CelestialBodyInfoModal.svelte";
import type { CelestialBodyData } from "@/types/game";

const mockEarth: CelestialBodyData = {
    id: "earth",
    name: "Earth",
    description: "The third planet from the Sun",
    type: "planet",
    scale: 1,
    images: [],
    position: { x: 0, y: 0, z: 0 } as unknown as import("three").Vector3,
    material: {
        color: "#3b82f6",
        emissive: "#1a3a5c",
    },
    keyFacts: {
        diameter: "12,742 km",
        distanceFromSun: "1 AU (149.6 million km)",
        orbitalPeriod: "365.25 days",
        composition: ["Iron (32%)", "Oxygen (30%)"],
        temperature: "15°C average",
        moons: 1,
    },
};

const defaultOnClose = vi.fn();

describe("CelestialBodyInfoModal", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe("Closed State", () => {
        it("should not render content when isOpen is false", () => {
            const { queryByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: false,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(queryByText("Earth")).toBeNull();
        });

        it("should render nothing when isOpen is false and no celestialBody", () => {
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: false,
                    celestialBody: null,
                    onClose: defaultOnClose,
                },
            });
            expect(container.textContent?.trim()).toBe("");
        });
    });

    describe("Open State", () => {
        it("should render the celestial body name when open", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByText("Earth")).toBeTruthy();
        });

        it("should render the description", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByText("The third planet from the Sun")).toBeTruthy();
        });

        it("should render the planet type", () => {
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(container.textContent?.toUpperCase()).toContain("PLANET");
        });

        it("should render the diameter from keyFacts", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByText("12,742 km")).toBeTruthy();
        });

        it("should render the orbital period from keyFacts", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByText("365.25 days")).toBeTruthy();
        });

        it("should render temperature from keyFacts", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByText("15°C average")).toBeTruthy();
        });

        it("should render close button", () => {
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(container.querySelector("button")).toBeTruthy();
        });

        it("should have role=dialog on the overlay", () => {
            const { getByRole } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            expect(getByRole("dialog")).toBeTruthy();
        });

        it("should render moons count when moons exist", () => {
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                },
            });
            // moons: 1 is set in keyFacts
            expect(container.textContent).toContain("1");
        });
    });

    describe("Close Interactions", () => {
        it("should call onClose when close button is clicked", async () => {
            const onClose = vi.fn();
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose,
                },
            });

            const closeBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;
            await fireEvent.click(closeBtn);

            expect(onClose).toHaveBeenCalledOnce();
        });

        it("should call onClose on Escape key pressed on dialog", async () => {
            const onClose = vi.fn();
            const { getByRole } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose,
                },
            });

            const dialog = getByRole("dialog");
            await fireEvent.keyDown(dialog, { key: "Escape" });

            expect(onClose).toHaveBeenCalledOnce();
        });
    });

    describe("Null Celestial Body", () => {
        it("should render without crashing when celestialBody is null and isOpen", () => {
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: null,
                    onClose: defaultOnClose,
                },
            });
            expect(container).toBeTruthy();
        });
    });

    describe("Translations", () => {
        it("should use translation keys when provided", () => {
            const translations = {
                "planet.earth.name": "Tierra",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                    lang: "es",
                    translations,
                },
            });
            expect(container.textContent).toContain("Tierra");
        });

        it("should fall back to original name if no translation key found", () => {
            const { getByText } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: mockEarth,
                    onClose: defaultOnClose,
                    translations: {},
                },
            });
            expect(getByText("Earth")).toBeTruthy();
        });

        it("translates 'million km' atomically so km is also translated", () => {
            // Regression: previously "149.6 million km" with zh translations
            // became "149.6 百万 km" — the km was never translated to "公里"
            // because the scale word "百万" sat between the number and km.
            const earthWithMillionKm: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    distanceFromSun: "149.6 million km",
                    diameter: "12,742 km",
                },
            };
            const zhTranslations: Record<string, string> = {
                "unit.km": "公里",
                "unit.million": "百万",
                "unit.billion": "十亿",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: earthWithMillionKm,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("149.6 百万 公里");
            expect(container.textContent).toContain("12,742 公里");
            // Ensure the untranslated "km" no longer appears next to the
            // million-scaled distance.
            expect(container.textContent).not.toContain("百万 km");
        });

        it("translates 'billion km' atomically so km is also translated", () => {
            const bodyWithBillionKm: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    distanceFromSun: "1.434 billion km",
                },
            };
            const zhTranslations: Record<string, string> = {
                "unit.km": "公里",
                "unit.million": "百万",
                "unit.billion": "十亿",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: bodyWithBillionKm,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("1.434 十亿 公里");
            expect(container.textContent).not.toContain("十亿 km");
        });
    });
});
