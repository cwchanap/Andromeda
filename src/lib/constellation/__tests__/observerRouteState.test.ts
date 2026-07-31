import { describe, expect, it } from "vitest";
import {
    isObserverCandidateEligible,
    parseObserverQuery,
    resolveObserverState,
    serializeObserverQuery,
    type ObserverCandidate,
} from "../observerRouteState";

const eligibleCandidate: ObserverCandidate = {
    id: "alpha-centauri",
    position: { x: -1.58, y: -3.7, z: -1.32 },
};

describe("parseObserverQuery", () => {
    it("returns missing when observer is absent", () => {
        expect(parseObserverQuery(new URLSearchParams("foo=bar"))).toEqual({
            kind: "missing",
        });
    });

    it("returns explicit-sol for exactly one observer=sol", () => {
        expect(
            parseObserverQuery(new URLSearchParams("observer=sol")),
        ).toEqual({ kind: "explicit-sol" });
    });

    it("returns one exact non-empty candidate", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams("observer=alpha-centauri"),
            ),
        ).toEqual({
            kind: "candidate",
            observerId: "alpha-centauri",
        });
    });

    it("does not trim or lowercase candidate ids", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams("observer=%20Alpha-Centauri%20"),
            ),
        ).toEqual({
            kind: "candidate",
            observerId: " Alpha-Centauri ",
        });
    });

    it("preserves empty malformed provenance", () => {
        expect(parseObserverQuery(new URLSearchParams("observer="))).toEqual({
            kind: "malformed",
            reason: "empty",
            requestedObserver: "",
        });
    });

    it("rejects duplicates without selecting either value", () => {
        expect(
            parseObserverQuery(
                new URLSearchParams(
                    "observer=sol&observer=alpha-centauri",
                ),
            ),
        ).toEqual({
            kind: "malformed",
            reason: "duplicate",
            requestedObserver: null,
        });
    });
});

describe("serializeObserverQuery", () => {
    it.each(["sol", null, undefined])(
        "omits observer for %s",
        (observerId) => {
            expect(serializeObserverQuery(observerId)).toBe("");
        },
    );

    it("returns a leading-question-mark system suffix", () => {
        expect(serializeObserverQuery("alpha-centauri")).toBe(
            "?observer=alpha-centauri",
        );
    });

    it("uses URLSearchParams encoding", () => {
        expect(serializeObserverQuery("alpha centauri/β")).toBe(
            "?observer=alpha+centauri%2F%CE%B2",
        );
    });
});

describe("isObserverCandidateEligible", () => {
    it("accepts finite non-origin coordinates", () => {
        expect(isObserverCandidateEligible(eligibleCandidate)).toEqual({
            eligible: true,
        });
    });

    it.each([
        { x: Number.NaN, y: 1, z: 1 },
        { x: 1, y: Number.POSITIVE_INFINITY, z: 1 },
        { x: 1, y: 1, z: Number.NEGATIVE_INFINITY },
    ])("rejects non-finite coordinates: %j", (position) => {
        expect(
            isObserverCandidateEligible({ id: "broken", position }),
        ).toEqual({
            eligible: false,
            reason: "invalid-coordinates",
        });
    });

    it("rejects exact origin", () => {
        expect(
            isObserverCandidateEligible({
                id: "origin",
                position: { x: 0, y: 0, z: 0 },
            }),
        ).toEqual({
            eligible: false,
            reason: "origin-collision",
        });
    });
});

describe("resolveObserverState", () => {
    it("keeps missing and explicit Sol distinct", () => {
        expect(resolveObserverState({ kind: "missing" }, [])).toEqual({
            kind: "sol",
            observerId: "sol",
            source: "missing",
        });
        expect(resolveObserverState({ kind: "explicit-sol" }, [])).toEqual({
            kind: "sol",
            observerId: "sol",
            source: "explicit-sol",
        });
    });

    it("preserves malformed provenance", () => {
        expect(
            resolveObserverState(
                {
                    kind: "malformed",
                    reason: "empty",
                    requestedObserver: "",
                },
                [],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: "",
            reason: "empty",
        });

        expect(
            resolveObserverState(
                {
                    kind: "malformed",
                    reason: "duplicate",
                    requestedObserver: null,
                },
                [],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: null,
            reason: "duplicate",
        });
    });

    it("preserves the exact unknown id", () => {
        expect(
            resolveObserverState(
                { kind: "candidate", observerId: " Alpha-Centauri " },
                [eligibleCandidate],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: " Alpha-Centauri ",
            reason: "unknown-system",
        });
    });

    it("resolves a known eligible system", () => {
        expect(
            resolveObserverState(
                { kind: "candidate", observerId: "alpha-centauri" },
                [eligibleCandidate],
            ),
        ).toEqual({
            kind: "system",
            observerId: "alpha-centauri",
        });
    });

    it.each([
        {
            candidate: {
                id: "broken",
                position: { x: Number.NaN, y: 1, z: 1 },
            },
            reason: "invalid-coordinates" as const,
        },
        {
            candidate: {
                id: "origin",
                position: { x: 0, y: 0, z: 0 },
            },
            reason: "origin-collision" as const,
        },
    ])("matches shared $reason eligibility", ({ candidate, reason }) => {
        expect(
            resolveObserverState(
                { kind: "candidate", observerId: candidate.id },
                [candidate],
            ),
        ).toEqual({
            kind: "fallback",
            observerId: "sol",
            requestedObserver: candidate.id,
            reason,
        });
        expect(isObserverCandidateEligible(candidate)).toEqual({
            eligible: false,
            reason,
        });
    });
});
