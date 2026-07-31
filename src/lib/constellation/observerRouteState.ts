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
