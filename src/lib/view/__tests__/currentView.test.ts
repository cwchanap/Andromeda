import { describe, it, expect } from "vitest";
import { getCurrentView } from "../currentView";

describe("getCurrentView", () => {
    it("detects galaxy from unlocalized path", () => {
        expect(getCurrentView("/galaxy")).toBe("galaxy");
    });

    it("detects galaxy from localized path", () => {
        expect(getCurrentView("/zh/galaxy")).toBe("galaxy");
    });

    it("detects constellation", () => {
        expect(getCurrentView("/constellation")).toBe("constellation");
        expect(getCurrentView("/ja/constellation")).toBe("constellation");
    });

    it("detects star (planetary) view", () => {
        expect(getCurrentView("/planetary/solar")).toBe("star");
        expect(getCurrentView("/zh/planetary/trappist-1")).toBe("star");
    });

    it("returns null for home / unknown", () => {
        expect(getCurrentView("/")).toBeNull();
        expect(getCurrentView("/zh/")).toBeNull();
        expect(getCurrentView("/unknown")).toBeNull();
    });
});
