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

    describe("Composition Translation", () => {
        it("translates percentage elements via element.<name> key", () => {
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    composition: ["Iron (32%)", "Oxygen (30%)"],
                },
            };
            const zhTranslations: Record<string, string> = {
                "element.iron": "铁",
                "element.oxygen": "氧",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("铁 (32%)");
            expect(container.textContent).toContain("氧 (30%)");
        });

        it("translates full-string normalized composition (no percentage)", () => {
            // Regression for "Regolith" → previously normalized to "regolith"
            // which had no key (only element.regolithsurface existed).
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    composition: ["Regolith"],
                },
            };
            const zhTranslations: Record<string, string> = {
                "element.regolith": "风化层",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("风化层");
            expect(container.textContent).not.toContain("Regolith");
        });

        it("translates exoplanet compound composition atomically", () => {
            // Regression: 'No atmosphere (likely)' previously routed to the
            // percentage branch and emitted raw English 'likely' inside parens.
            // The full-string normalized key element.noatmospherelikely now
            // handles the entire phrase.
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    composition: [
                        "Rocky/icy",
                        "Possible ice caps",
                        "No atmosphere (likely)",
                    ],
                },
            };
            const zhTranslations: Record<string, string> = {
                "element.rockyicy": "岩石/冰",
                "element.possibleicecaps": "可能存在冰冠",
                "element.noatmospherelikely": "可能无大气层",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("岩石/冰");
            expect(container.textContent).toContain("可能存在冰冠");
            expect(container.textContent).toContain("可能无大气层");
            expect(container.textContent).not.toContain("Rocky/icy");
            expect(container.textContent).not.toContain("No atmosphere");
        });

        it("handles 'trace metals (X%)' as a special case", () => {
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    composition: ["Trace metals (1%)"],
                },
            };
            const zhTranslations: Record<string, string> = {
                "element.trace": "微量",
                "element.metals": "金属",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("微量 金属 (1%)");
        });

        it("falls back to raw composition when no key matches", () => {
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    composition: ["Totally Unknown Material"],
                },
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: {},
                },
            });
            expect(container.textContent).toContain("Totally Unknown Material");
        });
    });

    describe("Fact Value Translation — Temperature & Units", () => {
        it("translates Kelvin with modifier and million-scaled core temperature", () => {
            // Regression: '15 million K (core)' must keep number-scale-unit
            // ordering intact. If genericReplacements ran first, the 'million'
            // could be replaced before the K-modifier pattern consumed the
            // number-K pair, scrambling the output.
            const body: CelestialBodyData = {
                ...mockEarth,
                id: "sun",
                keyFacts: {
                    ...mockEarth.keyFacts,
                    temperature: "5,778 K (surface), 15 million K (core)",
                },
            };
            const zhTranslations: Record<string, string> = {
                "unit.kelvin": "K",
                "unit.million": "百万",
                "unit.surface": "表面",
                "unit.core": "核心",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("5,778 K (表面)");
            expect(container.textContent).toContain("15 百万 K (核心)");
            // The modifier word must remain untranslated as a standalone
            // token — it should only appear inside the translated phrase.
            expect(container.textContent).not.toContain("15 million K");
        });

        it("translates Celsius with day/night modifiers", () => {
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    temperature: "427°C (day), -173°C (night)",
                },
            };
            const zhTranslations: Record<string, string> = {
                "unit.celsius": "°C",
                "unit.day": "白天",
                "unit.night": "夜晚",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("427°C (白天)");
            expect(container.textContent).toContain("-173°C (夜晚)");
        });

        it("translates standalone 'X°C average' without modifier", () => {
            const body: CelestialBodyData = {
                ...mockEarth,
                keyFacts: {
                    ...mockEarth.keyFacts,
                    temperature: "15°C average",
                },
            };
            const jaTranslations: Record<string, string> = {
                "unit.celsius": "℃",
                "unit.average": "平均",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: body,
                    onClose: defaultOnClose,
                    translations: jaTranslations,
                },
            });
            expect(container.textContent).toContain("15℃");
        });
    });

    describe("Moon Distance Fact Overrides", () => {
        it("uses facts.<id>.distanceFromParent to localize parent name", () => {
            // Regression for mixed-language distance string:
            //   "384,400 km from Earth" → "384,400 公里 从 Earth" (English parent)
            // The fact-level key now localizes the entire phrase so the
            // parent body name is also translated.
            const luna: CelestialBodyData = {
                id: "luna",
                name: "Moon",
                description: "Earth's moon",
                type: "moon",
                scale: 0.27,
                images: [],
                position: {
                    x: 0,
                    y: 0,
                    z: 0,
                } as unknown as import("three").Vector3,
                material: { color: "#cccccc" },
                keyFacts: {
                    diameter: "3,474 km",
                    orbitalPeriod: "27.3 days",
                    composition: ["Rocky crust"],
                    temperature: "-23°C average",
                    moons: 0,
                },
                distanceFromParent: {
                    kilometers: 384400,
                    formattedString: "384,400 km from Earth",
                },
            };
            const zhTranslations: Record<string, string> = {
                "planet.luna.name": "月球",
                "planet.type.moon": "卫星",
                "facts.luna.distanceFromParent": "距离地球 384,400 公里",
            };
            const { container } = render(CelestialBodyInfoModal, {
                props: {
                    isOpen: true,
                    celestialBody: luna,
                    onClose: defaultOnClose,
                    translations: zhTranslations,
                },
            });
            expect(container.textContent).toContain("距离地球 384,400 公里");
            // English fragments from the raw fact must NOT leak through.
            expect(container.textContent).not.toContain("from Earth");
        });
    });
});
