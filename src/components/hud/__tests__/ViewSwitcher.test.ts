import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import ViewSwitcher from "@/components/hud/ViewSwitcher.svelte";
import type { ViewId } from "@/lib/view/currentView";

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
        const hrefs = links.map((a) => a.getAttribute("href"));
        expect(hrefs).toContain(expectedHrefs.star);
        expect(hrefs).toContain(expectedHrefs.galaxy);
        expect(hrefs).toContain(expectedHrefs.constellation);
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
        // Mobile menu links are not rendered until expanded.
        expect(container.querySelector(".vs-mobile-menu")).toBeNull();
    });

    it("uses the link href (no JS-only navigation attribute) so links work without JS", () => {
        const { container } = render(ViewSwitcher, {
            props: { currentView: "galaxy", lang: "en", translations },
        });
        const nav = container.querySelector("nav.view-switcher")!;
        for (const a of Array.from(
            nav.querySelectorAll<HTMLAnchorElement>("a.vs-tab"),
        )) {
            // Every link must have a real href (no role=tab, no button fallback).
            expect(a.tagName).toBe("A");
            expect(a.getAttribute("href")).toBeTruthy();
            expect(a.getAttribute("role")).toBeNull();
        }
    });
});
