import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import LanguageSelector from "@/components/LanguageSelector.svelte";

describe("LanguageSelector", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    describe("Rendering", () => {
        it("should render without crashing", () => {
            const { container } = render(LanguageSelector);
            expect(container).toBeTruthy();
        });

        it("should render the language toggle button", () => {
            const { container } = render(LanguageSelector);
            const button = container.querySelector("button");
            expect(button).toBeTruthy();
        });

        it("should show globe icon", () => {
            const { container } = render(LanguageSelector);
            expect(container.textContent).toContain("🌐");
        });

        it("should show expand arrow", () => {
            const { container } = render(LanguageSelector);
            expect(container.textContent).toContain("▼");
        });

        it("should not show language dropdown by default", () => {
            const { queryByText } = render(LanguageSelector);
            expect(queryByText("Select Language")).toBeNull();
        });
    });

    describe("Toggle Behavior", () => {
        it("should show dropdown when toggle button is clicked", async () => {
            const { container, getByText } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);

            expect(getByText("Select Language")).toBeTruthy();
        });

        it("should hide dropdown when toggle button is clicked again", async () => {
            const { container, queryByText } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);
            await fireEvent.click(toggleBtn);

            expect(queryByText("Select Language")).toBeNull();
        });

        it("should close dropdown when Cancel button is clicked", async () => {
            const { container, queryByText } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);
            // Find the Cancel button
            const cancelBtn = Array.from(
                document.querySelectorAll("button"),
            ).find((b) => b.textContent?.includes("Cancel"));
            if (cancelBtn) {
                await fireEvent.click(cancelBtn);
            }

            expect(queryByText("Select Language")).toBeNull();
        });
    });

    describe("Language Options", () => {
        it("should show all language options in dropdown", async () => {
            const { container, getAllByText, getByText } =
                render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);

            // English may appear in both the toggle button and the dropdown list
            expect(getAllByText("English").length).toBeGreaterThan(0);
            // These only appear in the dropdown
            expect(getByText("中文")).toBeTruthy();
            expect(getByText("日本語")).toBeTruthy();
        });

        it("should close dropdown on Escape key", async () => {
            const { container, queryByText } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);
            await fireEvent.keyDown(window, { key: "Escape" });

            expect(queryByText("Select Language")).toBeNull();
        });
    });

    describe("Language Change Navigation", () => {
        it("should navigate to correct URL when a language is selected", async () => {
            vi.stubGlobal("location", {
                href: "http://localhost/",
            });

            const { container, getByText } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);

            // Click on the Japanese (日本語) language button — should navigate to /ja/
            const jaButton = getByText("日本語");
            await fireEvent.click(jaButton);

            expect(window.location.href).toBe("/ja/");
        });
    });

    describe("Accessibility", () => {
        it("should have aria-expanded on toggle button", () => {
            const { container } = render(LanguageSelector);
            const toggleBtn = container.querySelector("button");
            expect(toggleBtn?.getAttribute("aria-expanded")).toBe("false");
        });

        it("should update aria-expanded when dropdown is open", async () => {
            const { container } = render(LanguageSelector);
            const toggleBtn = container.querySelector(
                "button",
            ) as HTMLButtonElement;

            await fireEvent.click(toggleBtn);

            expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");
        });
    });
});
