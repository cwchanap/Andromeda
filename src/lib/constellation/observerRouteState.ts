export type ParsedObserverQuery =
    | { kind: "missing" }
    | { kind: "explicit-sol" }
    | { kind: "candidate"; observerId: string }
    | { kind: "malformed"; reason: "empty"; requestedObserver: "" }
    | { kind: "malformed"; reason: "duplicate"; requestedObserver: null };

export function parseObserverQuery(
    searchParams: URLSearchParams,
): ParsedObserverQuery {
    const values = searchParams.getAll("observer");

    if (values.length === 0) return { kind: "missing" };

    if (values.length > 1) {
        return {
            kind: "malformed",
            reason: "duplicate",
            requestedObserver: null,
        };
    }

    const [observerId] = values;

    if (observerId === "") {
        return {
            kind: "malformed",
            reason: "empty",
            requestedObserver: "",
        };
    }

    if (observerId === "sol") return { kind: "explicit-sol" };

    return { kind: "candidate", observerId };
}

export function serializeObserverQuery(
    observerId: string | "sol" | null | undefined,
): string {
    if (observerId == null || observerId === "sol") return "";

    const params = new URLSearchParams();
    params.set("observer", observerId);
    return `?${params.toString()}`;
}

export interface ObserverCandidate {
    id: string;
    position: { x: number; y: number; z: number };
}

export type ObserverEligibility =
    | { eligible: true }
    | {
          eligible: false;
          reason: "invalid-coordinates" | "origin-collision";
      };

export function isObserverCandidateEligible(
    candidate: ObserverCandidate,
): ObserverEligibility {
    const { position } = candidate;
    if (position == null) {
        return { eligible: false, reason: "invalid-coordinates" };
    }

    const { x, y, z } = position;

    if (![x, y, z].every(Number.isFinite)) {
        return { eligible: false, reason: "invalid-coordinates" };
    }

    if (x === 0 && y === 0 && z === 0) {
        return { eligible: false, reason: "origin-collision" };
    }

    return { eligible: true };
}

export type ResolvedObserverState =
    | {
          kind: "sol";
          observerId: "sol";
          source: "missing" | "explicit-sol";
      }
    | { kind: "system"; observerId: string }
    | {
          kind: "fallback";
          observerId: "sol";
          requestedObserver: string | null;
          reason:
              | "empty"
              | "duplicate"
              | "unknown-system"
              | "invalid-coordinates"
              | "origin-collision";
      };

export function resolveObserverState(
    parsed: ParsedObserverQuery,
    candidates: readonly ObserverCandidate[],
): ResolvedObserverState {
    if (parsed.kind === "missing" || parsed.kind === "explicit-sol") {
        return {
            kind: "sol",
            observerId: "sol",
            source: parsed.kind,
        };
    }

    if (parsed.kind === "malformed") {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.requestedObserver,
            reason: parsed.reason,
        };
    }

    const candidate = candidates.find(({ id }) => id === parsed.observerId);
    if (!candidate) {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.observerId,
            reason: "unknown-system",
        };
    }

    const eligibility = isObserverCandidateEligible(candidate);
    if (!eligibility.eligible) {
        return {
            kind: "fallback",
            observerId: "sol",
            requestedObserver: parsed.observerId,
            reason: eligibility.reason,
        };
    }

    return { kind: "system", observerId: parsed.observerId };
}
