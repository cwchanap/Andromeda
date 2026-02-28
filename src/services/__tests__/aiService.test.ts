/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIService, configureAIService, aiService } from "../aiService";
import type { CelestialBodyData } from "../../types/game";
import { APIErrorHandler, ErrorLogger } from "../../utils/errorHandling";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePlanet(
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData {
    return {
        id: "earth",
        name: "Earth",
        type: "planet",
        description: "Our home planet",
        keyFacts: {
            diameter: "12,742 km",
            distanceFromSun: "1 AU",
            orbitalPeriod: "365.25 days",
            composition: ["nitrogen", "oxygen"],
            temperature: "15°C average",
            moons: 1,
        },
        images: [],
        position: { x: 0, y: 0, z: 0 },
        scale: 1,
        material: { color: "#0000ff" },
        ...overrides,
    } as CelestialBodyData;
}

function makeStar(
    overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData {
    return makePlanet({
        id: "sun",
        name: "Sun",
        type: "star",
        description: "Our star",
        keyFacts: {
            diameter: "1,392,700 km",
            distanceFromSun: "0 AU",
            orbitalPeriod: "N/A",
            composition: ["hydrogen", "helium"],
            temperature: "5,500°C surface",
            moons: 0,
        },
        ...overrides,
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AIService", () => {
    let service: AIService;

    beforeEach(() => {
        service = new AIService();
        // Avoid actual delays by mocking the private simulateDelay method
        vi.spyOn(service as any, "simulateDelay").mockResolvedValue(undefined);
        // No random failure (0.5 > 0.1)
        vi.spyOn(Math, "random").mockReturnValue(0.5);
        // Not in offline mode
        localStorage.clear();
        // Reset ErrorLogger singleton so retry logs don't accumulate
        (ErrorLogger as any).instance = undefined;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("default exported aiService instance is an AIService", () => {
        expect(aiService).toBeInstanceOf(AIService);
    });

    it("configureAIService can be called without throwing", () => {
        expect(() =>
            configureAIService({ maxTokens: 1000, model: "gpt-4" }),
        ).not.toThrow();
    });

    it("accepts custom config in constructor", () => {
        const custom = new AIService({ maxTokens: 200, temperature: 0.3 });
        expect(custom).toBeInstanceOf(AIService);
    });

    // ─── Success path (no context) ─────────────────────────────────────────

    it("returns a non-empty string for a generic message", async () => {
        const result = await service.generateResponse("hello");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    it("returns solar-system–themed response for relevant keyword", async () => {
        const result = await service.generateResponse(
            "tell me about the solar system",
        );
        expect(result.toLowerCase()).toContain("solar system");
    });

    it("returns space-exploration response for astronaut keyword", async () => {
        const result = await service.generateResponse(
            "how do astronauts live in space?",
        );
        expect(result.toLowerCase()).toContain("space exploration");
    });

    // ─── Success path (with planet context) ──────────────────────────────

    it("returns contextual response mentioning the planet name", async () => {
        const result = await service.generateResponse(
            "tell me about this",
            makePlanet(),
        );
        expect(result).toContain("Earth");
    });

    it("responds to 'why' questions with context", async () => {
        const result = await service.generateResponse(
            "why is this planet special?",
            makePlanet(),
        );
        expect(result).toContain("Earth");
    });

    it("responds to 'how' questions with context", async () => {
        const result = await service.generateResponse(
            "how was this planet formed?",
            makePlanet(),
        );
        expect(result).toContain("Earth");
    });

    it("responds to composition questions with context", async () => {
        const result = await service.generateResponse(
            "what is it made of? composition?",
            makePlanet(),
        );
        expect(result).toContain("nitrogen");
    });

    it("responds to temperature questions with context", async () => {
        const result = await service.generateResponse(
            "what is the temperature there?",
            makePlanet(),
        );
        expect(result).toContain("Earth");
    });

    it("responds to size/diameter questions with context", async () => {
        const result = await service.generateResponse(
            "what is the diameter size",
            makePlanet(),
        );
        expect(result).toContain("12,742");
    });

    it("responds to moon questions when body has moons", async () => {
        const result = await service.generateResponse(
            "does it have any moon or satellite?",
            makePlanet(),
        );
        expect(result.toLowerCase()).toContain("moon");
    });

    it("responds to moon questions when body has no moons", async () => {
        const planet = makePlanet();
        delete (planet.keyFacts as any).moons;
        const result = await service.generateResponse(
            "does it have any moons?",
            planet,
        );
        expect(result).toMatch(/doesn't have any moons|has no moons/);
    });

    it("provides general response for unrecognised question with context", async () => {
        const result = await service.generateResponse(
            "zxyz completely random",
            makePlanet(),
        );
        expect(result).toContain("Earth");
    });

    // ─── Star-specific branches ────────────────────────────────────────────

    it("responds to size questions with star context (large diameter branch)", async () => {
        const result = await service.generateResponse(
            "what is the diameter size",
            makeStar(),
        );
        expect(result).toContain("Sun");
    });

    it("responds to temperature questions with star context", async () => {
        const result = await service.generateResponse(
            "what temperature is the star?",
            makeStar(),
        );
        expect(result).toContain("Sun");
    });

    it("responds to why questions with star context", async () => {
        const result = await service.generateResponse(
            "why is the sun important?",
            makeStar(),
        );
        expect(result).toContain("Sun");
    });

    // ─── Planet size variants ──────────────────────────────────────────────

    it("handles mid-range planet diameter in size response", async () => {
        const planet = makePlanet({
            keyFacts: { ...makePlanet().keyFacts, diameter: "30,000 km" },
        });
        // Use "size" or "diameter" keywords without "how" or "why" to hit the size branch
        const result = await service.generateResponse(
            "what is the diameter size of this",
            planet,
        );
        expect(result).toContain("30,000");
    });

    it("handles small planet diameter in size response", async () => {
        const planet = makePlanet({
            keyFacts: { ...makePlanet().keyFacts, diameter: "4,879 km" },
        });
        const result = await service.generateResponse(
            "what is the diameter size of this",
            planet,
        );
        expect(result).toContain("4,879");
    });

    // ─── Failure paths ─────────────────────────────────────────────────────

    it("returns fallback string when offline mode is enabled", async () => {
        localStorage.setItem("offlineMode", "true");
        // Reduce retries to 0 so no exponential-backoff delay needed
        const origRetries = (APIErrorHandler as any).maxRetries;
        (APIErrorHandler as any).maxRetries = 0;
        try {
            const result = await service.generateResponse("hello");
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        } finally {
            (APIErrorHandler as any).maxRetries = origRetries;
        }
    });

    it("returns fallback string on repeated network failure (random < 0.1)", async () => {
        vi.spyOn(Math, "random").mockReturnValue(0.05);
        const origRetries = (APIErrorHandler as any).maxRetries;
        (APIErrorHandler as any).maxRetries = 0;
        try {
            const result = await service.generateResponse("hello");
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        } finally {
            (APIErrorHandler as any).maxRetries = origRetries;
        }
    });
});
