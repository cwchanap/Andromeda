import type { CelestialBodyData } from "@/types/game";

export type BadgeInfo = { label: string; className: string } | null;

export function getStatusBadge(body: CelestialBodyData): BadgeInfo {
    if (!body.status || body.status === "confirmed") return null;
    if (body.status === "candidate") {
        return {
            label: "status.candidate",
            className: "status-badge status-badge--candidate",
        };
    }
    if (body.status === "controversial") {
        return {
            label: "status.controversial",
            className: "status-badge status-badge--controversial",
        };
    }
    return null;
}

export function factOrUnknown(
    value: string | undefined,
    unknownLabel: string,
): string {
    // Generated bodies use "" (empty string) for missing facts rather than
    // undefined. Treat blank/whitespace-only values as unknown so the modal
    // renders the Unknown fallback instead of an empty cell.
    return value && value.trim() ? value : unknownLabel;
}
