/**
 * Codegen script: regenerates systems.ts and LocalGalaxy.ts from CSV data.
 * Run via: bun run gen:systems
 * Also runs automatically via prebuild hook before `astro build`.
 */
import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import {
    buildAllPlanetarySystems,
    buildLocalGalaxy,
} from "../src/lib/planetary-system/derive/buildAll";

const REPO_ROOT = resolve(process.cwd());
const SYSTEMS_OUT = join(REPO_ROOT, "src/lib/planetary-system/systems.ts");
const GALAXY_OUT = join(REPO_ROOT, "src/lib/galaxy/LocalGalaxy.ts");

// ─── Build ───────────────────────────────────────────────────────────

const systems = buildAllPlanetarySystems();
const galaxy = buildLocalGalaxy();

// ─── HARD validation (throw on failure) ──────────────────────────────

// 1. Duplicate system id
{
    const seen = new Set<string>();
    for (const sys of systems) {
        if (seen.has(sys.id)) {
            throw new Error(`Duplicate system id: "${sys.id}"`);
        }
        seen.add(sys.id);
    }
}

// 2. A system with no star
for (const sys of systems) {
    if (!sys.systemData?.star) {
        throw new Error(`System "${sys.id}" has no star`);
    }
}

// 3. A body whose orbit.centerId references a non-existent id
for (const sys of systems) {
    const validIds = new Set<string>();
    validIds.add(sys.systemData.star.id);
    for (const body of sys.systemData.celestialBodies) {
        validIds.add(body.id);
    }
    for (const anchor of sys.systemData.orbitAnchors ?? []) {
        validIds.add(anchor.id);
    }

    const allBodies = [sys.systemData.star, ...sys.systemData.celestialBodies];
    for (const body of allBodies) {
        const centerId = body.orbit?.centerId;
        if (centerId && !validIds.has(centerId)) {
            throw new Error(
                `Body "${body.id}" in system "${sys.id}" has orbit.centerId "${centerId}" referencing non-existent id`,
            );
        }
    }
}

// ─── SOFT validation (warn, continue) ────────────────────────────────

// 1. confirmedExoplanetCount mismatch
for (const sys of systems) {
    const expected = sys.systemData.metadata?.confirmedExoplanetCount ?? 0;
    const confirmedCount = sys.systemData.celestialBodies.filter(
        (b) => b.status === "confirmed" && b.type !== "star",
    ).length;
    if (expected !== confirmedCount) {
        console.warn(
            `[SOFT] System "${sys.id}": confirmedExoplanetCount=${expected} but found ${confirmedCount} confirmed non-star bodies`,
        );
    }
}

// 2. Any body missing diameter or temperature
for (const sys of systems) {
    const allBodies = [sys.systemData.star, ...sys.systemData.celestialBodies];
    for (const body of allBodies) {
        if (!body.keyFacts.diameter) {
            console.warn(
                `[SOFT] Body "${body.id}" in system "${sys.id}" is missing diameter`,
            );
        }
        if (!body.keyFacts.temperature) {
            console.warn(
                `[SOFT] Body "${body.id}" in system "${sys.id}" is missing temperature`,
            );
        }
    }
}

// ─── Serialize ───────────────────────────────────────────────────────

function serialize(obj: unknown): string {
    let json = JSON.stringify(obj, null, 4);
    // Convert {"x":N,"y":N,"z":N} to new THREE.Vector3(N,N,N)
    json = json.replace(
        /\{\s*"x":\s*(-?[\d.eE+-]+),\s*"y":\s*(-?[\d.eE+-]+),\s*"z":\s*(-?[\d.eE+-]+)\s*\}/g,
        (_match, x, y, z) => `new THREE.Vector3(${x}, ${y}, ${z})`,
    );
    return json;
}

// ─── Write systems.ts ────────────────────────────────────────────────

const systemsContent = `/** @source src/data/nearest_30_planetary_systems.csv — run gen:systems to regenerate */
import type { PlanetarySystem } from "./types";
import * as THREE from "three";

export const starSystems: PlanetarySystem[] = ${serialize(systems)};
`;

writeFileSync(SYSTEMS_OUT, systemsContent, "utf-8");

// ─── Write LocalGalaxy.ts ────────────────────────────────────────────

const galaxyContent = `/** @source src/data/nearest_30_planetary_systems.csv — run gen:systems to regenerate */
import * as THREE from "three";
import type { GalaxyData } from "./types";

export const localGalaxyData: GalaxyData = ${serialize(galaxy)};
`;

writeFileSync(GALAXY_OUT, galaxyContent, "utf-8");

// ─── Prettier ────────────────────────────────────────────────────────

execSync(`bunx prettier --write "${SYSTEMS_OUT}" "${GALAXY_OUT}"`, {
    stdio: "inherit",
});

// ─── Done ────────────────────────────────────────────────────────────

console.log(`Generated ${systems.length} systems`);
