// Unit tests for AlphaCentauri, KeplerSystems, and NearbyExoplanets systems
// Primary goal: exercise initialize() and cleanup() methods for coverage
import { describe, it, expect } from "vitest";

import { alphaCentauriSystem } from "@/lib/planetary-system/AlphaCentauri";
import {
    kepler442System,
    kepler438System,
} from "@/lib/planetary-system/KeplerSystems";
import {
    trappist1System,
    wolf359System,
    barnardsStarSystem,
    ross128System,
} from "@/lib/planetary-system/NearbyExoplanets";

// ─── AlphaCentauri ────────────────────────────────────────────────────────────

describe("alphaCentauriSystem", () => {
    it("has the correct id", () => {
        expect(alphaCentauriSystem.id).toBe("alpha-centauri");
    });

    it("has a systemData with a star", () => {
        expect(alphaCentauriSystem.systemData.star).toBeDefined();
        expect(alphaCentauriSystem.systemData.star.type).toBe("star");
    });

    it("has celestialBodies array", () => {
        expect(
            Array.isArray(alphaCentauriSystem.systemData.celestialBodies),
        ).toBe(true);
    });

    it("initialize() resolves without error", async () => {
        await expect(
            alphaCentauriSystem.initialize?.(),
        ).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(alphaCentauriSystem.cleanup?.()).resolves.toBeUndefined();
    });
});

// ─── KeplerSystems ────────────────────────────────────────────────────────────

describe("kepler442System", () => {
    it("has the correct id", () => {
        expect(kepler442System.id).toBe("kepler-442");
    });

    it("has a systemData with a star", () => {
        expect(kepler442System.systemData.star).toBeDefined();
        expect(kepler442System.systemData.star.type).toBe("star");
    });

    it("has celestialBodies array", () => {
        expect(Array.isArray(kepler442System.systemData.celestialBodies)).toBe(
            true,
        );
    });

    it("initialize() resolves without error", async () => {
        await expect(kepler442System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(kepler442System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("kepler438System", () => {
    it("has the correct id", () => {
        expect(kepler438System.id).toBe("kepler-438");
    });

    it("has a systemData with a star", () => {
        expect(kepler438System.systemData.star).toBeDefined();
        expect(kepler438System.systemData.star.type).toBe("star");
    });

    it("initialize() resolves without error", async () => {
        await expect(kepler438System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(kepler438System.cleanup?.()).resolves.toBeUndefined();
    });
});

// ─── NearbyExoplanets ─────────────────────────────────────────────────────────

describe("trappist1System", () => {
    it("has the correct id", () => {
        expect(trappist1System.id).toBe("trappist-1");
    });

    it("has multiple celestial bodies", () => {
        expect(
            trappist1System.systemData.celestialBodies.length,
        ).toBeGreaterThan(0);
    });

    it("initialize() resolves without error", async () => {
        await expect(trappist1System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(trappist1System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("wolf359System", () => {
    it("has the correct id", () => {
        expect(wolf359System.id).toBe("wolf-359");
    });

    it("has a star defined", () => {
        expect(wolf359System.systemData.star).toBeDefined();
        expect(wolf359System.systemData.star.type).toBe("star");
    });

    it("initialize() resolves without error", async () => {
        await expect(wolf359System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(wolf359System.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("barnardsStarSystem", () => {
    it("has the correct id", () => {
        expect(barnardsStarSystem.id).toBe("barnards-star");
    });

    it("has a star defined", () => {
        expect(barnardsStarSystem.systemData.star).toBeDefined();
    });

    it("initialize() resolves without error", async () => {
        await expect(
            barnardsStarSystem.initialize?.(),
        ).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(barnardsStarSystem.cleanup?.()).resolves.toBeUndefined();
    });
});

describe("ross128System", () => {
    it("has the correct id", () => {
        expect(ross128System.id).toBe("ross-128");
    });

    it("has celestialBodies array", () => {
        expect(Array.isArray(ross128System.systemData.celestialBodies)).toBe(
            true,
        );
    });

    it("initialize() resolves without error", async () => {
        await expect(ross128System.initialize?.()).resolves.toBeUndefined();
    });

    it("cleanup() resolves without error", async () => {
        await expect(ross128System.cleanup?.()).resolves.toBeUndefined();
    });
});
