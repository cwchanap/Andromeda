import { describe, expect, it } from "vitest";
import {
    parseObserverQuery,
    serializeObserverQuery,
} from "../observerRouteState";

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
