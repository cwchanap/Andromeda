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
 * `knownExoplanetCount` mismatch or a missing key fact — and should be
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

        // ─── HARD: duplicate id within a system ─────────────────────
        // A duplicate id makes orbit.centerId references ambiguous, so it
        // is a hard error regardless of which entity collides (star, body,
        // or orbit anchor).
        const checkDuplicate = (id: string, kind: string) => {
            if (validIds.has(id)) {
                issues.push({
                    level: "error",
                    message: `Duplicate ${kind} id "${id}" in system "${sys.id}"`,
                });
            } else {
                validIds.add(id);
            }
        };
        checkDuplicate(sys.systemData.star.id, "star");
        for (const body of sys.systemData.celestialBodies) {
            checkDuplicate(body.id, "body");
        }
        for (const anchor of sys.systemData.orbitAnchors ?? []) {
            checkDuplicate(anchor.id, "anchor");
        }

        const allBodies = [
            sys.systemData.star,
            ...sys.systemData.celestialBodies,
        ];

        // ─── HARD: orbit.centerId missing, empty, or dangling ───────
        for (const body of allBodies) {
            const orbit = body.orbit;
            if (!orbit) continue; // a body with no orbit is fine
            const centerId = orbit.centerId;
            if (typeof centerId !== "string" || centerId.trim() === "") {
                issues.push({
                    level: "error",
                    message: `Body "${body.id}" in system "${sys.id}" has an orbit with an empty or whitespace-only centerId`,
                });
            } else if (!validIds.has(centerId)) {
                issues.push({
                    level: "error",
                    message: `Body "${body.id}" in system "${sys.id}" has orbit.centerId "${centerId}" referencing non-existent id`,
                });
            }
        }

        // ─── SOFT: knownExoplanetCount mismatch ──────────────────
        // The CSV `number_of_known_exoplanets` column counts every
        // non-candidate planet (confirmed + controversial); candidates are
        // excluded because their existence is unconfirmed. Mirror that
        // definition here so the cross-check is apples-to-apples.
        const expected = sys.systemData.metadata?.knownExoplanetCount ?? 0;
        const actual = sys.systemData.celestialBodies.filter(
            (b) => b.type !== "star" && b.status !== "candidate",
        ).length;
        if (expected !== actual) {
            issues.push({
                level: "warn",
                message: `System "${sys.id}": knownExoplanetCount=${expected} but found ${actual} known (non-candidate) non-star bodies`,
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
