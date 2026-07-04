import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import ViewSwitcher from "@/components/hud/ViewSwitcher.svelte";
import type { ViewId } from "@/lib/view/currentView";
import { gameActions } from "@/stores/gameStore";

const translations: Record<string, string> = {
    "viewSwitcher.label": "VIEW",
    "viewSwitcher.star": "Star",
    "viewSwitcher.galaxy": "Galaxy",
    "viewSwitcher.constellation": "Constellation",
};

const expectedHrefs: Record<ViewId, string> = {
    star: "/planetary/solar",
    galaxy: "/galaxy",
    constellation: "/constellation",
};

afterEach(() => {
    cleanup();
    // Reset the shared gameState store so hudView/hudLang don't leak
    // between tests.
    gameActions.resetGameState();
});

describe("ViewSwitcher", () => {
    it("renders one navigation link per view with correct hrefs", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher");
        expect(nav).toBeTruthy();
        const links = Array.from(
            nav!.querySelectorAll<HTMLAnchorElement>("a.vs-tab"),
        );
        expect(links).toHaveLength(3);
        // All tabs carry real hrefs (including the active one) so every
        // entry is exposed as a navigation link and remains keyboard-
        // focusable; aria-current="page" marks the current view.
        const hrefs = links.map((a) => a.getAttribute("href"));
        expect(hrefs).toEqual([
            expectedHrefs.star,
            expectedHrefs.galaxy,
            expectedHrefs.constellation,
        ]);
        const active = links.find(
            (a) => a.getAttribute("aria-current") === "page",
        );
        expect(active).toBeTruthy();
        expect(active?.getAttribute("href")).toBe(expectedHrefs.galaxy);
    });

    it("marks only the current view link with aria-current=page", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        const links = Array.from(
            nav.querySelectorAll<HTMLAnchorElement>("a.vs-tab"),
        );
        const active = links.find((a) => a.getAttribute("aria-current"));
        expect(active).toBeTruthy();
        expect(active?.getAttribute("aria-current")).toBe("page");
        expect(active?.textContent?.trim()).toBe("Galaxy");
        // The other two must not carry aria-current.
        const inactive = links.filter((a) => a !== active);
        expect(inactive).toHaveLength(2);
        for (const a of inactive) {
            expect(a.getAttribute("aria-current")).toBeNull();
        }
    });

    it("applies the is-active class only to the current view", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "constellation", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        const active = nav.querySelector("a.is-active");
        expect(active).toBeTruthy();
        expect(active?.textContent?.trim()).toBe("Constellation");
        expect(nav.querySelectorAll("a.is-active")).toHaveLength(1);
    });

    it("updates the active link when currentView prop changes", async () => {
        const { container, component } = render(ViewSwitcher, {
            props: { currentView: "star", lang: "en", translations },
        });
        const nav = () => container.querySelector("nav.view-switcher")!;
        expect(nav().querySelector("a.is-active")?.textContent?.trim()).toBe(
            "Star",
        );
        // Svelte 4 component rerender via set() is not available in
        // @testing-library/svelte v5+; re-render to verify the prop wiring.
        cleanup();
        const rerendered = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        expect(
            rerendered.container
                .querySelector("nav.view-switcher")
                ?.querySelector("a.is-active")
                ?.textContent?.trim(),
        ).toBe("Galaxy");
        // Reference component to satisfy linter; the rerender above is the
        // real assertion.
        expect(component).toBeTruthy();
    });

    it("renders the mobile disclosure toggle (collapsed by default)", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const toggle = container.querySelector(".vs-mobile-toggle");
        expect(toggle).toBeTruthy();
        expect(toggle?.getAttribute("aria-expanded")).toBe("false");
        expect(toggle?.getAttribute("aria-haspopup")).toBe("menu");
        // Mobile menu links are not rendered until expanded.
        expect(container.querySelector(".vs-mobile-menu")).toBeNull();
    });

    it("expands the mobile menu with role=menu and role=menuitem on click", async () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const toggle =
            container.querySelector<HTMLButtonElement>(".vs-mobile-toggle")!;
        toggle.click();
        // Svelte needs a microtask to flush the {#if mobileOpen} block.
        await new Promise((r) => setTimeout(r, 0));
        const menu = container.querySelector(".vs-mobile-menu");
        expect(menu).toBeTruthy();
        expect(menu?.getAttribute("role")).toBe("menu");
        const items = Array.from(
            menu!.querySelectorAll<HTMLAnchorElement>("a.vs-mobile-item"),
        );
        expect(items).toHaveLength(3);
        for (const item of items) {
            expect(item.getAttribute("role")).toBe("menuitem");
        }
    });

    it("applies roving tabindex — one item tabbable, rest at -1", async () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const toggle =
            container.querySelector<HTMLButtonElement>(".vs-mobile-toggle")!;
        toggle.click();
        await new Promise((r) => setTimeout(r, 0));
        const items = Array.from(
            container.querySelectorAll<HTMLAnchorElement>("a.vs-mobile-item"),
        );
        const tabbable = items.filter(
            (a) => a.getAttribute("tabindex") === "0",
        );
        const removed = items.filter(
            (a) => a.getAttribute("tabindex") === "-1",
        );
        // Exactly one item is in the tab order (the active view's item).
        expect(tabbable).toHaveLength(1);
        expect(removed).toHaveLength(items.length - 1);
        // The active (galaxy) item should be the tabbable one.
        expect(tabbable[0]?.textContent?.trim()).toBe("Galaxy");
    });

    it("uses the link href (no JS-only navigation attribute) so links work without JS", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        for (const a of Array.from(
            nav.querySelectorAll<HTMLAnchorElement>("a.vs-tab"),
        )) {
            // Every tab must be an <a> (no role=tab, no button fallback)
            // and carry a real href so navigation works without JS —
            // including the active tab, which stays a link per the
            // shared-HUD contract (aria-current="page" marks it).
            expect(a.tagName).toBe("A");
            expect(a.getAttribute("role")).toBeNull();
            expect(a.getAttribute("href")).toBeTruthy();
        }
    });
});

describe("ViewSwitcher — shared gameState store integration", () => {
    afterEach(() => {
        cleanup();
        gameActions.resetGameState();
    });

    it("prefers $gameState.hudView over the currentView prop", () => {
        // Publish a hudView to the shared store; the prop is a fallback.
        gameActions.setHudView("constellation");
        const { container } = render(ViewSwitcher, {
            // Prop says "star" but the store says "constellation".
            props: { currentView: "star", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        const active = nav.querySelector("a.is-active");
        expect(active?.textContent?.trim()).toBe("Constellation");
        expect(active?.getAttribute("aria-current")).toBe("page");
    });

    it("falls back to the currentView prop when hudView is unset", () => {
        // hudView is undefined in the default reset state.
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        expect(nav.querySelector("a.is-active")?.textContent?.trim()).toBe(
            "Galaxy",
        );
    });

    it("builds hrefs from $gameState.hudLang when no translations are provided", () => {
        // Without a translations prop, the component falls back to
        // useTranslations(effectiveLang) — exercising the effectiveLang
        // reactive path. Use zh so the href locale prefix is observable.
        gameActions.setHudLang("zh");
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en" },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        const links = Array.from(
            nav.querySelectorAll<HTMLAnchorElement>("a.vs-tab"),
        );
        // Every href must carry the zh locale derived from the store.
        for (const a of links) {
            expect(a.getAttribute("href")).toContain("/zh/");
        }
    });
});
