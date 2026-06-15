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
import { validateSystems } from "../src/lib/planetary-system/derive/validateSystems";

const REPO_ROOT = resolve(process.cwd());
const SYSTEMS_OUT = join(REPO_ROOT, "src/lib/planetary-system/systems.ts");
const GALAXY_OUT = join(REPO_ROOT, "src/lib/galaxy/LocalGalaxy.ts");

// ─── Build ───────────────────────────────────────────────────────────

const systems = buildAllPlanetarySystems();
const galaxy = buildLocalGalaxy();

// ─── Validation ──────────────────────────────────────────────────────
// Hard issues abort codegen; soft issues are logged but non-fatal.
const issues = validateSystems(systems);
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");
if (errors.length > 0) {
    throw new Error(errors[0].message);
}
for (const w of warnings) {
    console.warn(`[SOFT] ${w.message}`);
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
