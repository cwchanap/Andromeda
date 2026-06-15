import type { PlanetarySystem } from "../types";

export type ValidationLevel = "error" | "warn";

export interface ValidationIssue {
    level: ValidationLevel;
    message: string;
}

/**
 * Validate generated planetary systems for data integrity.
 *
 * Hard issues (`level: "error"`) indicate broken references or missing required
 * data (duplicate ids, no star, dangling orbit center) and should abort codegen.
 * Soft issues (`level: "warn"`) indicate suspicious but non-fatal data — e.g. a
 * `confirmedExoplanetCount` mismatch or a missing key fact — and should be
 * logged but not block generation.
 *
 * Extracted as a pure function from `scripts/gen-systems.ts` so it can be unit
 * tested without invoking the file-writing codegen script.
 */
export function validateSystems(systems: PlanetarySystem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // ─── HARD: duplicate system id ──────────────────────────────────
    const seen = new Set<string>();
    for (const sys of systems) {
        if (seen.has(sys.id)) {
            issues.push({
                level: "error",
                message: `Duplicate system id: "${sys.id}"`,
            });
        }
        seen.add(sys.id);
    }

    for (const sys of systems) {
        // ─── HARD: a system with no star ────────────────────────────
        if (!sys.systemData?.star) {
            issues.push({
                level: "error",
                message: `System "${sys.id}" has no star`,
            });
            continue; // cannot check body references without a star
        }

        const validIds = new Set<string>();
        validIds.add(sys.systemData.star.id);
        for (const body of sys.systemData.celestialBodies) {
            validIds.add(body.id);
        }
        for (const anchor of sys.systemData.orbitAnchors ?? []) {
            validIds.add(anchor.id);
        }

        const allBodies = [
            sys.systemData.star,
            ...sys.systemData.celestialBodies,
        ];

        // ─── HARD: orbit.centerId references a non-existent id ──────
        for (const body of allBodies) {
            const centerId = body.orbit?.centerId;
            if (centerId && !validIds.has(centerId)) {
                issues.push({
                    level: "error",
                    message: `Body "${body.id}" in system "${sys.id}" has orbit.centerId "${centerId}" referencing non-existent id`,
                });
            }
        }

        // ─── SOFT: confirmedExoplanetCount mismatch ────────────────
        const expected = sys.systemData.metadata?.confirmedExoplanetCount ?? 0;
        const confirmedCount = sys.systemData.celestialBodies.filter(
            (b) => b.status === "confirmed" && b.type !== "star",
        ).length;
        if (expected !== confirmedCount) {
            issues.push({
                level: "warn",
                message: `System "${sys.id}": confirmedExoplanetCount=${expected} but found ${confirmedCount} confirmed non-star bodies`,
            });
        }

        // ─── SOFT: any body missing diameter or temperature ────────
        for (const body of allBodies) {
            if (!body.keyFacts.diameter) {
                issues.push({
                    level: "warn",
                    message: `Body "${body.id}" in system "${sys.id}" is missing diameter`,
                });
            }
            if (!body.keyFacts.temperature) {
                issues.push({
                    level: "warn",
                    message: `Body "${body.id}" in system "${sys.id}" is missing temperature`,
                });
            }
        }
    }

    return issues;
}
