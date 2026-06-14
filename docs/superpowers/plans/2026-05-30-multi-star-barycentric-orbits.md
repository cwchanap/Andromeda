# Multi-Star Barycentric Orbits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic orbital-elements support with invisible barycenters, then migrate Alpha Centauri to barycentric star motion while preserving legacy orbit behavior for unmigrated systems.

**Architecture:** Add typed orbit data, pure orbital math, and an `OrbitResolver` that `CelestialBodyManager` delegates to for bodies with `orbit`. Existing `orbitRadius`, `orbitSpeed`, and `parentId` stay as the compatibility path for systems without the new model.

**Tech Stack:** Astro 5, Svelte 5, Three.js, TypeScript, Vitest, Testing Library.

---

## File Structure

- Create `src/lib/planetary-system/orbits/orbitalElements.ts`: pure orbital-elements math with no scene dependencies.
- Create `src/lib/planetary-system/orbits/OrbitResolver.ts`: runtime registry for anchors, visible body objects, center resolution, elapsed simulation time, and orbit-line point generation.
- Create `src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts`: deterministic math tests.
- Create `src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts`: resolver tests without the full renderer.
- Modify `src/types/game.ts`: add `OrbitalElementsData` and `CelestialBodyData.orbit`.
- Modify `src/lib/planetary-system/types.ts`: add `OrbitAnchorData` and `PlanetarySystemData.orbitAnchors`.
- Modify `src/types/universe.ts`: add `orbitAnchors` to `StarSystemData`.
- Modify `src/lib/planetary-system/AlphaCentauri.ts`: add the AB barycenter and authored orbital elements for Alpha Centauri A, B, Proxima, Proxima b, and Proxima c.
- Modify `src/lib/planetary-system/__tests__/PlanetarySystems.test.ts`: assert Alpha Centauri data uses barycentric orbital elements.
- Modify `src/lib/planetary-system/graphics/CelestialBodyManager.ts`: register anchors, use `OrbitResolver` for new orbits, create elliptical orbit lines, and expose barycenter overlay controls.
- Modify `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`: verify renderer integration and legacy behavior.
- Modify `src/lib/planetary-system/graphics/SolarSystemRenderer.ts`: pass system anchors into `CelestialBodyManager` and expose overlay controls.
- Modify `src/lib/planetary-system/graphics/types.ts`: extend `SolarSystemControls` with barycenter overlay methods.
- Modify `src/lib/planetary-system/PlanetarySystemRenderer.ts`: expose `hasOrbitAnchors()` and `setBarycenterOverlayVisible()`.
- Modify `src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts`: verify renderer facade methods.
- Modify `src/components/PlanetarySystemWrapper.svelte`: add a non-persisted barycenter overlay toggle in the existing controls panel.
- Modify `src/components/__tests__/PlanetarySystemWrapper.test.ts`: verify the toggle only appears for systems with anchors and calls the renderer.
- Modify `src/lib/universe/UniverseManager.ts`: preserve anchors during conversion and warn on invalid orbit references or element values.
- Modify `src/lib/universe/__tests__/UniverseManager.test.ts`: verify conversion and warning behavior.
- Modify `src/test/setup.ts`: store mocked LineGeometry positions so ellipse tests can inspect sampled orbit lines.

---

### Task 1: Data Contracts And Alpha Centauri Orbit Data

**Files:**

- Modify: `src/types/game.ts`
- Modify: `src/lib/planetary-system/types.ts`
- Modify: `src/types/universe.ts`
- Modify: `src/lib/planetary-system/AlphaCentauri.ts`
- Test: `src/lib/planetary-system/__tests__/PlanetarySystems.test.ts`

- [ ] **Step 1: Write failing Alpha Centauri data tests**

Append this block inside the existing `describe("alphaCentauriSystem", () => { ... })` in `src/lib/planetary-system/__tests__/PlanetarySystems.test.ts`:

```ts
const findAlphaBody = (id: string) =>
  [
    alphaCentauriSystem.systemData.star,
    ...alphaCentauriSystem.systemData.celestialBodies,
  ].find((body) => body.id === id);

it("declares the Alpha Centauri AB barycenter anchor", () => {
  expect(alphaCentauriSystem.systemData.orbitAnchors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "alpha-centauri-ab-barycenter",
        name: "Alpha Centauri AB Barycenter",
        type: "barycenter",
      }),
    ]),
  );
});

it("models Alpha Centauri A and B around the AB barycenter", () => {
  const starA = alphaCentauriSystem.systemData.star;
  const starB = findAlphaBody("alpha-centauri-b");

  expect(starA.orbit).toMatchObject({
    centerId: "alpha-centauri-ab-barycenter",
    eccentricity: 0.519,
    periodYears: 79.91,
    phaseDeg: 0,
  });
  expect(starB?.orbit).toMatchObject({
    centerId: "alpha-centauri-ab-barycenter",
    eccentricity: 0.519,
    periodYears: 79.91,
    phaseDeg: 180,
  });
  expect(starB?.orbit?.semiMajorAxis).toBeGreaterThan(
    starA.orbit?.semiMajorAxis ?? 0,
  );
});

it("keeps Alpha Centauri AB orbit radii in the expected mass ratio", () => {
  const starA = alphaCentauriSystem.systemData.star;
  const starB = findAlphaBody("alpha-centauri-b");
  const expectedRatio = 1.1055 / 0.9373;
  const actualRatio =
    (starB?.orbit?.semiMajorAxis ?? 0) / (starA.orbit?.semiMajorAxis ?? 1);

  expect(actualRatio).toBeCloseTo(expectedRatio, 2);
});

it("models Proxima and its planets with orbital elements", () => {
  const proxima = findAlphaBody("proxima-centauri");
  const proximaB = findAlphaBody("proxima-b");
  const proximaC = findAlphaBody("proxima-c");

  expect(proxima?.orbit).toMatchObject({
    centerId: "alpha-centauri-ab-barycenter",
    periodYears: 547000,
  });
  expect(proxima?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
  expect(proximaB?.orbit).toMatchObject({
    centerId: "proxima-centauri",
    periodDays: 11.2,
  });
  expect(proximaC?.orbit).toMatchObject({
    centerId: "proxima-centauri",
    periodYears: 5.2,
  });
  expect(proximaB?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
  expect(proximaC?.orbit?.visualPeriodSeconds).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the data tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
```

Expected: FAIL because `orbitAnchors` and `orbit` are not defined or not populated on Alpha Centauri.

- [ ] **Step 3: Add the orbit data contracts**

In `src/types/game.ts`, add this interface near the top of the file after the imports:

```ts
export interface OrbitalElementsData {
  centerId: string;
  semiMajorAxis: number;
  eccentricity?: number;
  inclinationDeg?: number;
  longitudeOfAscendingNodeDeg?: number;
  argumentOfPeriapsisDeg?: number;
  phaseDeg?: number;
  periodDays?: number;
  periodYears?: number;
  visualPeriodSeconds?: number;
  clockwise?: boolean;
  line?: {
    visible?: boolean;
    color?: string;
    opacity?: number;
  };
}
```

In the `CelestialBodyData` interface in `src/types/game.ts`, add this field immediately after `parentId?: string;`:

```ts
    orbit?: OrbitalElementsData;
```

In `src/lib/planetary-system/types.ts`, update the imports:

```ts
import type { Vector3 } from "three";
import type { CelestialBodyData, OrbitalElementsData } from "../../types/game";
```

Then add this interface before `PlanetarySystemData`:

```ts
export interface OrbitAnchorData {
  id: string;
  name: string;
  type: "barycenter";
  description?: string;
  position?: Vector3;
  orbit?: OrbitalElementsData;
  overlay?: {
    visibleByDefault?: boolean;
    color?: string;
    label?: string;
  };
}
```

In `PlanetarySystemData`, add this field after `systemType`:

```ts
    orbitAnchors?: OrbitAnchorData[];
```

In `src/types/universe.ts`, add this import and add the same field to `StarSystemData`:

```ts
import type { OrbitAnchorData } from "../lib/planetary-system/types";
```

```ts
    orbitAnchors?: OrbitAnchorData[];
```

- [ ] **Step 4: Add Alpha Centauri barycenter constants and orbit data**

In `src/lib/planetary-system/AlphaCentauri.ts`, add these constants after the imports:

```ts
const ALPHA_CENTAURI_AB_BARYCENTER_ID = "alpha-centauri-ab-barycenter";
const ALPHA_CENTAURI_AB_RELATIVE_AXIS = 25;
const ALPHA_CENTAURI_A_MASS = 1.1055;
const ALPHA_CENTAURI_B_MASS = 0.9373;
const ALPHA_CENTAURI_TOTAL_MASS = ALPHA_CENTAURI_A_MASS + ALPHA_CENTAURI_B_MASS;
const ALPHA_CENTAURI_A_AXIS =
  (ALPHA_CENTAURI_AB_RELATIVE_AXIS * ALPHA_CENTAURI_B_MASS) /
  ALPHA_CENTAURI_TOTAL_MASS;
const ALPHA_CENTAURI_B_AXIS =
  (ALPHA_CENTAURI_AB_RELATIVE_AXIS * ALPHA_CENTAURI_A_MASS) /
  ALPHA_CENTAURI_TOTAL_MASS;
const ALPHA_CENTAURI_AB_PERIOD_YEARS = 79.91;
const ALPHA_CENTAURI_AB_ECCENTRICITY = 0.519;
```

In `systemData`, add `orbitAnchors` after `systemCenter`:

```ts
        orbitAnchors: [
            {
                id: ALPHA_CENTAURI_AB_BARYCENTER_ID,
                name: "Alpha Centauri AB Barycenter",
                type: "barycenter",
                description:
                    "The common center of mass shared by Alpha Centauri A and B.",
                position: new THREE.Vector3(0, 0, 0),
                overlay: {
                    visibleByDefault: false,
                    color: "#7dd3fc",
                    label: "AB barycenter",
                },
            },
        ],
```

Add this `orbit` object to Alpha Centauri A:

```ts
            orbit: {
                centerId: ALPHA_CENTAURI_AB_BARYCENTER_ID,
                semiMajorAxis: ALPHA_CENTAURI_A_AXIS,
                eccentricity: ALPHA_CENTAURI_AB_ECCENTRICITY,
                periodYears: ALPHA_CENTAURI_AB_PERIOD_YEARS,
                visualPeriodSeconds: 80,
                phaseDeg: 0,
                inclinationDeg: 79.2,
                longitudeOfAscendingNodeDeg: 204.9,
                argumentOfPeriapsisDeg: 231.6,
            },
```

Add this `orbit` object to Alpha Centauri B:

```ts
                orbit: {
                    centerId: ALPHA_CENTAURI_AB_BARYCENTER_ID,
                    semiMajorAxis: ALPHA_CENTAURI_B_AXIS,
                    eccentricity: ALPHA_CENTAURI_AB_ECCENTRICITY,
                    periodYears: ALPHA_CENTAURI_AB_PERIOD_YEARS,
                    visualPeriodSeconds: 80,
                    phaseDeg: 180,
                    inclinationDeg: 79.2,
                    longitudeOfAscendingNodeDeg: 204.9,
                    argumentOfPeriapsisDeg: 231.6,
                },
```

Add this `orbit` object to Proxima Centauri:

```ts
                orbit: {
                    centerId: ALPHA_CENTAURI_AB_BARYCENTER_ID,
                    semiMajorAxis: 150,
                    eccentricity: 0.5,
                    periodYears: 547000,
                    visualPeriodSeconds: 240,
                    phaseDeg: 35,
                    inclinationDeg: 107.6,
                    longitudeOfAscendingNodeDeg: 126,
                    argumentOfPeriapsisDeg: 72,
                },
```

Add this `orbit` object to Proxima b:

```ts
                orbit: {
                    centerId: "proxima-centauri",
                    semiMajorAxis: 2,
                    eccentricity: 0.02,
                    periodDays: 11.2,
                    visualPeriodSeconds: 12,
                    phaseDeg: 20,
                },
```

Add this `orbit` object to Proxima c:

```ts
                orbit: {
                    centerId: "proxima-centauri",
                    semiMajorAxis: 5,
                    eccentricity: 0.04,
                    periodYears: 5.2,
                    visualPeriodSeconds: 36,
                    phaseDeg: 130,
                },
```

Keep existing legacy `orbitRadius`, `orbitSpeed`, and `parentId` fields in this task so renderer behavior stays unchanged until the new runtime path exists.

- [ ] **Step 5: Run the data tests to verify they pass**

Run:

```bash
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/game.ts src/lib/planetary-system/types.ts src/types/universe.ts src/lib/planetary-system/AlphaCentauri.ts src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
git commit -m "feat(planetary): add orbital element data contracts"
```

---

### Task 2: Pure Orbital Elements Math

**Files:**

- Create: `src/lib/planetary-system/orbits/orbitalElements.ts`
- Test: `src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts`

- [ ] **Step 1: Write failing orbit math tests**

Create `src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  getOrbitAngle,
  getVisualPeriodSeconds,
  positionFromOrbitalElements,
  sampleOrbitLinePositions,
} from "../orbitalElements";
import type { OrbitalElementsData } from "@/types/game";

describe("orbitalElements", () => {
  it("computes circular orbit positions in the XZ plane", () => {
    const orbit: OrbitalElementsData = {
      centerId: "center",
      semiMajorAxis: 10,
      eccentricity: 0,
      phaseDeg: 0,
      visualPeriodSeconds: 40,
    };

    const position = positionFromOrbitalElements(
      orbit,
      10,
      new THREE.Vector3(1, 0, 2),
    );

    expect(position.x).toBeCloseTo(1, 5);
    expect(position.y).toBeCloseTo(0, 5);
    expect(position.z).toBeCloseTo(12, 5);
  });

  it("computes eccentric periapsis and apoapsis positions", () => {
    const orbit: OrbitalElementsData = {
      centerId: "center",
      semiMajorAxis: 10,
      eccentricity: 0.5,
      visualPeriodSeconds: 100,
    };

    const periapsis = positionFromOrbitalElements(
      orbit,
      0,
      new THREE.Vector3(0, 0, 0),
    );
    const apoapsis = positionFromOrbitalElements(
      orbit,
      50,
      new THREE.Vector3(0, 0, 0),
    );

    expect(periapsis.x).toBeCloseTo(5, 5);
    expect(periapsis.z).toBeCloseTo(0, 5);
    expect(apoapsis.x).toBeCloseTo(-15, 5);
    expect(apoapsis.z).toBeCloseTo(0, 5);
  });

  it("applies inclination as vertical displacement", () => {
    const orbit: OrbitalElementsData = {
      centerId: "center",
      semiMajorAxis: 10,
      eccentricity: 0,
      visualPeriodSeconds: 40,
      inclinationDeg: 90,
    };

    const position = positionFromOrbitalElements(
      orbit,
      10,
      new THREE.Vector3(0, 0, 0),
    );

    expect(position.x).toBeCloseTo(0, 5);
    expect(position.y).toBeCloseTo(-10, 5);
    expect(position.z).toBeCloseTo(0, 5);
  });

  it("uses phase offsets for opposite binary positions", () => {
    const starA: OrbitalElementsData = {
      centerId: "barycenter",
      semiMajorAxis: 4,
      visualPeriodSeconds: 80,
      phaseDeg: 0,
    };
    const starB: OrbitalElementsData = {
      centerId: "barycenter",
      semiMajorAxis: 6,
      visualPeriodSeconds: 80,
      phaseDeg: 180,
    };

    const a = positionFromOrbitalElements(starA, 0, new THREE.Vector3(0, 0, 0));
    const b = positionFromOrbitalElements(starB, 0, new THREE.Vector3(0, 0, 0));

    expect(a.x).toBeCloseTo(4, 5);
    expect(b.x).toBeCloseTo(-6, 5);
  });

  it("uses visual period overrides before real periods", () => {
    const orbit: OrbitalElementsData = {
      centerId: "center",
      semiMajorAxis: 1,
      periodYears: 1000,
      visualPeriodSeconds: 20,
    };

    expect(getVisualPeriodSeconds(orbit)).toBe(20);
    expect(getOrbitAngle(orbit, 10)).toBeCloseTo(Math.PI, 5);
  });

  it("samples eccentric orbit line positions as a flat XYZ array", () => {
    const orbit: OrbitalElementsData = {
      centerId: "center",
      semiMajorAxis: 10,
      eccentricity: 0.5,
    };

    const points = sampleOrbitLinePositions(orbit, 4);

    expect(points).toHaveLength(15);
    expect(points[0]).toBeCloseTo(5, 5);
    expect(points[1]).toBeCloseTo(0, 5);
    expect(points[2]).toBeCloseTo(0, 5);
    expect(points[6]).toBeCloseTo(-15, 5);
  });
});
```

- [ ] **Step 2: Run the orbit math tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts
```

Expected: FAIL because `orbitalElements.ts` does not exist.

- [ ] **Step 3: Implement pure orbital math**

Create `src/lib/planetary-system/orbits/orbitalElements.ts`:

```ts
import * as THREE from "three";
import type { OrbitalElementsData } from "@/types/game";

const TWO_PI = Math.PI * 2;
const SECONDS_PER_DAY = 86400;
const DAYS_PER_YEAR = 365.25;

export function degToRad(degrees = 0): number {
  return (degrees * Math.PI) / 180;
}

export function getVisualPeriodSeconds(
  orbit: OrbitalElementsData,
): number | null {
  if (orbit.visualPeriodSeconds && orbit.visualPeriodSeconds > 0) {
    return orbit.visualPeriodSeconds;
  }

  if (orbit.periodDays && orbit.periodDays > 0) {
    return orbit.periodDays * SECONDS_PER_DAY;
  }

  if (orbit.periodYears && orbit.periodYears > 0) {
    return orbit.periodYears * DAYS_PER_YEAR * SECONDS_PER_DAY;
  }

  return null;
}

export function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function getOrbitAngle(
  orbit: OrbitalElementsData,
  elapsedSeconds: number,
): number {
  const phase = degToRad(orbit.phaseDeg ?? 0);
  const periodSeconds = getVisualPeriodSeconds(orbit);
  if (!periodSeconds) {
    return normalizeAngle(phase);
  }

  const direction = orbit.clockwise ? -1 : 1;
  return normalizeAngle(
    phase + direction * TWO_PI * (elapsedSeconds / periodSeconds),
  );
}

export function solveEccentricAnomaly(
  meanAnomaly: number,
  eccentricity: number,
): number {
  if (eccentricity === 0) {
    return meanAnomaly;
  }

  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 8; i += 1) {
    const numerator =
      eccentricAnomaly -
      eccentricity * Math.sin(eccentricAnomaly) -
      meanAnomaly;
    const denominator = 1 - eccentricity * Math.cos(eccentricAnomaly);
    eccentricAnomaly -= numerator / denominator;
  }
  return eccentricAnomaly;
}

function rotateAroundY(point: THREE.Vector3, radians: number): THREE.Vector3 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x = point.x * cos - point.z * sin;
  const z = point.x * sin + point.z * cos;
  return new THREE.Vector3(x, point.y, z);
}

function rotateAroundX(point: THREE.Vector3, radians: number): THREE.Vector3 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const y = point.y * cos - point.z * sin;
  const z = point.y * sin + point.z * cos;
  return new THREE.Vector3(point.x, y, z);
}

export function localPositionFromOrbitalElements(
  orbit: OrbitalElementsData,
  elapsedSeconds: number,
): THREE.Vector3 {
  const eccentricity = orbit.eccentricity ?? 0;
  const meanAnomaly = getOrbitAngle(orbit, elapsedSeconds);
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const semiMajorAxis = orbit.semiMajorAxis;
  const semiMinorAxis =
    semiMajorAxis * Math.sqrt(Math.max(0, 1 - eccentricity ** 2));

  let point = new THREE.Vector3(
    semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity),
    0,
    semiMinorAxis * Math.sin(eccentricAnomaly),
  );

  point = rotateAroundY(point, degToRad(orbit.argumentOfPeriapsisDeg ?? 0));
  point = rotateAroundX(point, degToRad(orbit.inclinationDeg ?? 0));
  point = rotateAroundY(
    point,
    degToRad(orbit.longitudeOfAscendingNodeDeg ?? 0),
  );

  return point;
}

export function positionFromOrbitalElements(
  orbit: OrbitalElementsData,
  elapsedSeconds: number,
  center: THREE.Vector3,
): THREE.Vector3 {
  const local = localPositionFromOrbitalElements(orbit, elapsedSeconds);
  return new THREE.Vector3(
    center.x + local.x,
    center.y + local.y,
    center.z + local.z,
  );
}

export function sampleOrbitLinePositions(
  orbit: OrbitalElementsData,
  segments = 128,
): number[] {
  const points: number[] = [];
  const sampleOrbit: OrbitalElementsData = {
    ...orbit,
    visualPeriodSeconds: segments,
    periodDays: undefined,
    periodYears: undefined,
  };

  for (let i = 0; i <= segments; i += 1) {
    const point = localPositionFromOrbitalElements(sampleOrbit, i);
    points.push(point.x, point.y, point.z);
  }

  return points;
}
```

- [ ] **Step 4: Run the orbit math tests to verify they pass**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/planetary-system/orbits/orbitalElements.ts src/lib/planetary-system/orbits/__tests__/orbitalElements.test.ts
git commit -m "feat(planetary): add deterministic orbital element math"
```

---

### Task 3: Orbit Resolver Runtime Registry

**Files:**

- Create: `src/lib/planetary-system/orbits/OrbitResolver.ts`
- Test: `src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Create `src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OrbitResolver } from "../OrbitResolver";
import type { CelestialBodyData } from "@/types/game";
import type { OrbitAnchorData } from "@/lib/planetary-system/types";

const makeBody = (
  overrides: Partial<CelestialBodyData> = {},
): CelestialBodyData => ({
  id: "planet",
  name: "Planet",
  type: "planet",
  description: "Test planet",
  keyFacts: {
    diameter: "1 km",
    orbitalPeriod: "1 year",
    composition: ["rock"],
    temperature: "300 K",
  },
  images: [],
  position: new THREE.Vector3(0, 0, 0),
  scale: 1,
  material: { color: "#fff" },
  ...overrides,
});

describe("OrbitResolver", () => {
  it("updates a body around an invisible anchor", () => {
    const resolver = new OrbitResolver();
    const anchor: OrbitAnchorData = {
      id: "barycenter",
      name: "Barycenter",
      type: "barycenter",
      position: new THREE.Vector3(10, 0, 0),
    };
    const group = new THREE.Group();
    const body = makeBody({
      orbit: {
        centerId: "barycenter",
        semiMajorAxis: 4,
        visualPeriodSeconds: 40,
      },
    });

    resolver.registerAnchors([anchor]);
    resolver.registerBody(body, group);
    resolver.update(10, 1);

    expect(group.position.x).toBeCloseTo(10, 5);
    expect(group.position.z).toBeCloseTo(4, 5);
  });

  it("updates a body around a moving visible body", () => {
    const resolver = new OrbitResolver();
    const starGroup = new THREE.Group();
    const planetGroup = new THREE.Group();

    resolver.registerAnchors([
      {
        id: "barycenter",
        name: "Barycenter",
        type: "barycenter",
        position: new THREE.Vector3(0, 0, 0),
      },
    ]);
    resolver.registerBody(
      makeBody({
        id: "star",
        type: "star",
        orbit: {
          centerId: "barycenter",
          semiMajorAxis: 10,
          visualPeriodSeconds: 100,
        },
      }),
      starGroup,
    );
    resolver.registerBody(
      makeBody({
        id: "planet",
        orbit: {
          centerId: "star",
          semiMajorAxis: 2,
          visualPeriodSeconds: 20,
        },
      }),
      planetGroup,
    );

    resolver.update(5, 1);

    expect(planetGroup.position.distanceTo(starGroup.position)).toBeCloseTo(
      2,
      5,
    );
  });

  it("warns and keeps fallback position for missing centers", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolver = new OrbitResolver();
    const group = new THREE.Group();
    const body = makeBody({
      position: new THREE.Vector3(3, 0, 7),
      orbit: {
        centerId: "missing",
        semiMajorAxis: 4,
        visualPeriodSeconds: 40,
      },
    });

    resolver.registerBody(body, group);
    resolver.update(10, 1);

    expect(group.position.x).toBe(3);
    expect(group.position.z).toBe(7);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("missing"));
    warnSpy.mockRestore();
  });

  it("returns sampled orbit-line points for registered orbital bodies", () => {
    const resolver = new OrbitResolver();
    const group = new THREE.Group();
    resolver.registerBody(
      makeBody({
        orbit: {
          centerId: "barycenter",
          semiMajorAxis: 10,
          eccentricity: 0.5,
        },
      }),
      group,
    );

    const points = resolver.getOrbitLinePositions("planet", 4);

    expect(points).toHaveLength(15);
    expect(points[0]).toBeCloseTo(5, 5);
    expect(points[6]).toBeCloseTo(-15, 5);
  });
});
```

- [ ] **Step 2: Run the resolver tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts
```

Expected: FAIL because `OrbitResolver.ts` does not exist.

- [ ] **Step 3: Implement `OrbitResolver`**

Create `src/lib/planetary-system/orbits/OrbitResolver.ts`:

```ts
import * as THREE from "three";
import type { CelestialBodyData } from "@/types/game";
import type { OrbitAnchorData } from "@/lib/planetary-system/types";
import {
  positionFromOrbitalElements,
  sampleOrbitLinePositions,
} from "./orbitalElements";

interface RegisteredBody {
  data: CelestialBodyData;
  object: THREE.Object3D;
  fallbackPosition: THREE.Vector3;
}

interface RegisteredAnchor {
  data: OrbitAnchorData;
  position: THREE.Vector3;
  fallbackPosition: THREE.Vector3;
  marker?: THREE.Object3D;
}

export class OrbitResolver {
  private anchors = new Map<string, RegisteredAnchor>();
  private bodies = new Map<string, RegisteredBody>();
  private elapsedSeconds = 0;
  private warnedMissingCenters = new Set<string>();

  registerAnchors(anchors: OrbitAnchorData[] = []): void {
    anchors.forEach((anchor) => {
      const fallbackPosition =
        anchor.position?.clone() ?? new THREE.Vector3(0, 0, 0);
      this.anchors.set(anchor.id, {
        data: anchor,
        position: fallbackPosition.clone(),
        fallbackPosition,
      });
    });
  }

  registerAnchorMarker(anchorId: string, marker: THREE.Object3D): void {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return;
    anchor.marker = marker;
    marker.position.copy(anchor.position);
    marker.visible = anchor.data.overlay?.visibleByDefault ?? false;
  }

  registerBody(data: CelestialBodyData, object: THREE.Object3D): void {
    const fallbackPosition = data.position.clone();
    this.bodies.set(data.id, {
      data,
      object,
      fallbackPosition,
    });

    if (data.orbit) {
      const position = this.resolveBodyPosition(data.id, new Set());
      object.position.copy(position);
    }
  }

  hasAnchors(): boolean {
    return this.anchors.size > 0;
  }

  setAnchorOverlayVisible(visible: boolean): void {
    this.anchors.forEach((anchor) => {
      if (anchor.marker) {
        anchor.marker.visible = visible;
      }
    });
  }

  update(deltaTime: number, orbitSpeedMultiplier: number): void {
    this.elapsedSeconds += deltaTime * orbitSpeedMultiplier;

    this.anchors.forEach((anchor) => {
      anchor.position.copy(this.resolveAnchorPosition(anchor.data.id));
      if (anchor.marker) {
        anchor.marker.position.copy(anchor.position);
      }
    });

    this.bodies.forEach((body) => {
      if (!body.data.orbit) return;
      body.object.position.copy(
        this.resolveBodyPosition(body.data.id, new Set()),
      );
    });
  }

  getCenterPosition(centerId: string): THREE.Vector3 | null {
    const anchor = this.anchors.get(centerId);
    if (anchor) {
      return anchor.position.clone();
    }

    const body = this.bodies.get(centerId);
    if (body) {
      return body.object.position.clone();
    }

    return null;
  }

  getOrbitLinePositions(bodyId: string, segments = 128): number[] {
    const body = this.bodies.get(bodyId);
    if (!body?.data.orbit) return [];
    return sampleOrbitLinePositions(body.data.orbit, segments);
  }

  private resolveAnchorPosition(anchorId: string): THREE.Vector3 {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      return new THREE.Vector3(0, 0, 0);
    }

    if (!anchor.data.orbit) {
      return anchor.fallbackPosition.clone();
    }

    const center = this.getCenterPosition(anchor.data.orbit.centerId);
    if (!center) {
      this.warnMissingCenter(anchorId, anchor.data.orbit.centerId);
      return anchor.fallbackPosition.clone();
    }

    return positionFromOrbitalElements(
      anchor.data.orbit,
      this.elapsedSeconds,
      center,
    );
  }

  private resolveBodyPosition(
    bodyId: string,
    visited: Set<string>,
  ): THREE.Vector3 {
    const body = this.bodies.get(bodyId);
    if (!body) {
      return new THREE.Vector3(0, 0, 0);
    }

    if (!body.data.orbit) {
      return body.object.position.clone();
    }

    if (visited.has(bodyId)) {
      console.warn(`Orbit cycle detected while resolving '${bodyId}'.`);
      return body.fallbackPosition.clone();
    }
    visited.add(bodyId);

    let center = this.anchors.get(body.data.orbit.centerId)?.position;
    const centerBody = this.bodies.get(body.data.orbit.centerId);
    if (!center && centerBody) {
      center = centerBody.data.orbit
        ? this.resolveBodyPosition(centerBody.data.id, visited)
        : centerBody.object.position.clone();
    }

    if (!center) {
      this.warnMissingCenter(bodyId, body.data.orbit.centerId);
      return body.fallbackPosition.clone();
    }

    return positionFromOrbitalElements(
      body.data.orbit,
      this.elapsedSeconds,
      center,
    );
  }

  private warnMissingCenter(objectId: string, centerId: string): void {
    const warningKey = `${objectId}:${centerId}`;
    if (this.warnedMissingCenters.has(warningKey)) return;
    this.warnedMissingCenters.add(warningKey);
    console.warn(
      `Orbit center '${centerId}' not found for '${objectId}'. Keeping authored fallback position.`,
    );
  }
}
```

- [ ] **Step 4: Run resolver tests to verify they pass**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all orbit tests**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/planetary-system/orbits/OrbitResolver.ts src/lib/planetary-system/orbits/__tests__/OrbitResolver.test.ts
git commit -m "feat(planetary): add orbit resolver"
```

---

### Task 4: Celestial Body Manager Integration

**Files:**

- Modify: `src/test/setup.ts`
- Modify: `src/lib/planetary-system/graphics/CelestialBodyManager.ts`
- Test: `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`

- [ ] **Step 1: Update the LineGeometry mock to store sampled positions**

In `src/test/setup.ts`, replace the `LineGeometry` mock with:

```ts
vi.mock("three/examples/jsm/lines/LineGeometry.js", () => {
  class LineGeometry {
    positions: number[] = [];
    setPositions = vi.fn((arr: number[]) => {
      this.positions = arr;
    });
    dispose = vi.fn();
  }
  return { LineGeometry };
});
```

- [ ] **Step 2: Add failing CelestialBodyManager tests for orbital elements and anchors**

Append these tests inside `describe("CelestialBodyManager", () => { ... })` in `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`:

```ts
it("orbits a body around an invisible barycenter anchor", async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const manager = new CelestialBodyManager(scene, camera);

  manager.registerOrbitAnchors([
    {
      id: "barycenter",
      name: "Barycenter",
      type: "barycenter",
      position: new THREE.Vector3(10, 0, 0),
    },
  ]);

  const body = await manager.createCelestialBody(
    makeBodyData({
      id: "orbiting-star",
      type: "star",
      position: new THREE.Vector3(14, 0, 0),
      orbit: {
        centerId: "barycenter",
        semiMajorAxis: 4,
        visualPeriodSeconds: 40,
      },
      orbitRadius: undefined,
      orbitSpeed: undefined,
    }),
  );

  manager.updateAnimations(10, 1);

  expect(body.position.x).toBeCloseTo(10, 5);
  expect(body.position.z).toBeCloseTo(4, 5);
});

it("orbits a body around another moving visible body with orbital elements", async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const manager = new CelestialBodyManager(scene, camera);

  manager.registerOrbitAnchors([
    {
      id: "barycenter",
      name: "Barycenter",
      type: "barycenter",
      position: new THREE.Vector3(0, 0, 0),
    },
  ]);

  const star = await manager.createCelestialBody(
    makeBodyData({
      id: "proxima",
      type: "star",
      orbit: {
        centerId: "barycenter",
        semiMajorAxis: 10,
        visualPeriodSeconds: 100,
      },
      orbitRadius: undefined,
      orbitSpeed: undefined,
    }),
  );
  const planet = await manager.createCelestialBody(
    makeBodyData({
      id: "proxima-b",
      orbit: {
        centerId: "proxima",
        semiMajorAxis: 2,
        visualPeriodSeconds: 20,
      },
      orbitRadius: undefined,
      orbitSpeed: undefined,
      parentId: undefined,
    }),
  );

  manager.updateAnimations(5, 1);

  expect(planet.position.distanceTo(star.position)).toBeCloseTo(2, 5);
});

it("creates elliptical orbit-line geometry for orbital elements", async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const manager = new CelestialBodyManager(scene, camera);

  manager.registerOrbitAnchors([
    {
      id: "barycenter",
      name: "Barycenter",
      type: "barycenter",
      position: new THREE.Vector3(0, 0, 0),
    },
  ]);

  await manager.createCelestialBody(
    makeBodyData({
      id: "eccentric",
      orbit: {
        centerId: "barycenter",
        semiMajorAxis: 10,
        eccentricity: 0.5,
        visualPeriodSeconds: 100,
      },
      orbitRadius: undefined,
      orbitSpeed: undefined,
    }),
  );

  const orbitLine = scene.children.find(
    (child) => child.name === "eccentric_orbit",
  ) as any;

  expect(orbitLine).toBeTruthy();
  expect(orbitLine.geometry.positions[0]).toBeCloseTo(5, 5);
  expect(orbitLine.geometry.positions[192]).toBeCloseTo(-15, 5);
});

it("keeps barycenter overlay markers hidden until toggled", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const manager = new CelestialBodyManager(scene, camera);

  manager.registerOrbitAnchors([
    {
      id: "barycenter",
      name: "Barycenter",
      type: "barycenter",
      position: new THREE.Vector3(0, 0, 0),
    },
  ]);

  const marker = scene.children.find(
    (child) => child.name === "barycenter_anchor",
  ) as any;

  expect(marker).toBeTruthy();
  expect(marker.visible).toBe(false);
  manager.setBarycenterOverlayVisible(true);
  expect(marker.visible).toBe(true);
});

it("warns and keeps authored position when orbital element center is missing", async () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const manager = new CelestialBodyManager(scene, camera);

  const body = await manager.createCelestialBody(
    makeBodyData({
      id: "missing-center-body",
      position: new THREE.Vector3(3, 0, 7),
      orbit: {
        centerId: "missing-center",
        semiMajorAxis: 4,
        visualPeriodSeconds: 40,
      },
      orbitRadius: undefined,
      orbitSpeed: undefined,
    }),
  );

  manager.updateAnimations(10, 1);

  expect(body.position.x).toBe(3);
  expect(body.position.z).toBe(7);
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("missing-center"),
  );
  warnSpy.mockRestore();
});
```

- [ ] **Step 3: Run CelestialBodyManager tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
```

Expected: FAIL because `registerOrbitAnchors`, `setBarycenterOverlayVisible`, and orbital-element positioning are not integrated.

- [ ] **Step 4: Integrate `OrbitResolver` into `CelestialBodyManager`**

In `src/lib/planetary-system/graphics/CelestialBodyManager.ts`, add imports:

```ts
import type { OrbitAnchorData } from "../types";
import { OrbitResolver } from "../orbits/OrbitResolver";
```

Add this private field with the other manager fields:

```ts
    private orbitResolver = new OrbitResolver();
```

Add these public methods before `createCelestialBody`:

```ts
    registerOrbitAnchors(anchors: OrbitAnchorData[] = []): void {
        this.orbitResolver.registerAnchors(anchors);

        anchors.forEach((anchor) => {
            const marker = new THREE.Group();
            marker.name = `${anchor.id}_anchor`;
            marker.visible = anchor.overlay?.visibleByDefault ?? false;
            marker.position.copy(anchor.position ?? new THREE.Vector3(0, 0, 0));
            marker.userData = { orbitAnchorData: anchor };

            const markerMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: anchor.overlay?.color ?? "#7dd3fc",
                }),
            );
            markerMesh.name = `${anchor.id}_anchor_marker`;
            marker.add(markerMesh);

            this.scene.add(marker);
            this.orbitResolver.registerAnchorMarker(anchor.id, marker);
        });
    }

    hasOrbitAnchors(): boolean {
        return this.orbitResolver.hasAnchors();
    }

    setBarycenterOverlayVisible(visible: boolean): void {
        this.orbitResolver.setAnchorOverlayVisible(visible);
    }
```

In `createCelestialBody`, immediately after:

```ts
this.bodies.set(data.id, celestialGroup);
this.bodyData.set(data.id, data);
```

add:

```ts
this.orbitResolver.registerBody(data, celestialGroup);
```

Change orbit-line creation in `createCelestialBody` from the current unconditional visual radius path to:

```ts
if (data.orbit) {
  this.createOrbitalElementsOrbitLine(data);
} else {
  const visualOrbitRadius = this.getVisualOrbitRadius(data);
  if (visualOrbitRadius > 0) {
    this.visualOrbitRadii.set(data.id, visualOrbitRadius);
    this.createOrbitLine(data, visualOrbitRadius);
  }
}
```

Wrap the legacy initial-angle block so it only runs for bodies without `orbit`:

```ts
if (!data.orbit && data.orbitRadius && data.orbitSpeed) {
  // keep the existing legacy angle initialization block here unchanged
}
```

Add this private method before `createOrbitLine`:

```ts
    private createOrbitalElementsOrbitLine(data: CelestialBodyData): void {
        if (!data.orbit || data.orbit.line?.visible === false) {
            return;
        }

        const orbitPoints = this.orbitResolver.getOrbitLinePositions(data.id);
        if (orbitPoints.length === 0) {
            return;
        }

        const orbitGeometry = new LineGeometry();
        orbitGeometry.setPositions(orbitPoints);

        const orbitMaterial = new LineMaterial({
            color: data.orbit.line?.color ?? 0x444444,
            transparent: true,
            opacity: data.orbit.line?.opacity ?? 0.3,
            linewidth: 5,
        });

        const orbitLine = new Line2(orbitGeometry, orbitMaterial);
        orbitLine.name = `${data.id}_orbit`;

        const center = this.orbitResolver.getCenterPosition(data.orbit.centerId);
        if (!center) {
            console.warn(
                `Orbit center '${data.orbit.centerId}' not found for '${data.id}' during orbit line creation. Orbit line will be skipped.`,
            );
            return;
        }

        orbitLine.position.copy(center);
        this.orbitLines.set(data.id, orbitLine);
        this.scene.add(orbitLine);
    }
```

At the start of `updateAnimations`, after `const time = Date.now() * 0.001;`, add:

```ts
this.orbitResolver.update(deltaTime, orbitSpeedMultiplier);
```

In the legacy orbit branch, change:

```ts
            if (data.orbitRadius && data.orbitSpeed) {
```

to:

```ts
            if (!data.orbit && data.orbitRadius && data.orbitSpeed) {
```

After the legacy orbit branch, add this new-orbit line-center update:

```ts
if (data.orbit) {
  const orbitLine = this.orbitLines.get(id);
  const center = this.orbitResolver.getCenterPosition(data.orbit.centerId);
  if (orbitLine && center) {
    orbitLine.position.copy(center);
  }
}
```

In `dispose`, remove anchor markers by deleting scene children whose names end with `_anchor`:

```ts
this.scene.children
  .filter((child) => child.name.endsWith("_anchor"))
  .forEach((child) => this.scene.remove(child));
```

- [ ] **Step 5: Run CelestialBodyManager tests to verify they pass**

Run:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run orbit tests again**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/test/setup.ts src/lib/planetary-system/graphics/CelestialBodyManager.ts src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
git commit -m "feat(planetary): render orbital element paths"
```

---

### Task 5: Renderer Facade And Barycenter Overlay Toggle

**Files:**

- Modify: `src/lib/planetary-system/graphics/types.ts`
- Modify: `src/lib/planetary-system/graphics/SolarSystemRenderer.ts`
- Modify: `src/lib/planetary-system/PlanetarySystemRenderer.ts`
- Modify: `src/components/PlanetarySystemWrapper.svelte`
- Test: `src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts`
- Test: `src/components/__tests__/PlanetarySystemWrapper.test.ts`

- [ ] **Step 1: Write failing renderer facade tests**

Append these tests in `src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts`:

```ts
it("reports whether the loaded system has orbit anchors", async () => {
  renderer = new PlanetarySystemRenderer(container, makeConfig());
  await renderer.initialize(
    makeSystemData({
      orbitAnchors: [
        {
          id: "barycenter",
          name: "Barycenter",
          type: "barycenter",
          position: new THREE.Vector3(0, 0, 0),
        },
      ],
    }),
  );

  expect(renderer.hasOrbitAnchors()).toBe(true);
});

it("forwards barycenter overlay visibility to the underlying renderer", async () => {
  renderer = new PlanetarySystemRenderer(container, makeConfig());
  await renderer.initialize(
    makeSystemData({
      orbitAnchors: [
        {
          id: "barycenter",
          name: "Barycenter",
          type: "barycenter",
          position: new THREE.Vector3(0, 0, 0),
        },
      ],
    }),
  );

  expect(() => renderer.setBarycenterOverlayVisible(true)).not.toThrow();
});
```

- [ ] **Step 2: Write failing wrapper toggle tests**

In `src/components/__tests__/PlanetarySystemWrapper.test.ts`, update the Testing Library import:

```ts
import { fireEvent, render, waitFor } from "@testing-library/svelte";
```

Add `orbitAnchors` to `mockSystemData`:

```ts
    orbitAnchors: [
        {
            id: "alpha-centauri-ab-barycenter",
            name: "Alpha Centauri AB Barycenter",
            type: "barycenter",
            position: { x: 0, y: 0, z: 0 },
        },
    ],
```

Add `hasOrbitAnchors` and `setBarycenterOverlayVisible` to every mocked renderer object:

```ts
        hasOrbitAnchors: vi.fn(() => true),
        setBarycenterOverlayVisible: vi.fn(),
```

Append these tests in the main `describe("PlanetarySystemWrapper", () => { ... })`:

```ts
it("shows a barycenter overlay toggle for systems with orbit anchors", async () => {
  const { getByRole } = render(PlanetarySystemWrapper, {
    props: { systemId: "alpha-centauri" },
  });

  await waitFor(() =>
    expect(getByRole("button", { name: "Show barycenters" })).toBeTruthy(),
  );
});

it("toggles barycenter overlay visibility through the renderer", async () => {
  const { getByRole } = render(PlanetarySystemWrapper, {
    props: { systemId: "alpha-centauri" },
  });

  await waitFor(() =>
    expect(getByRole("button", { name: "Show barycenters" })).toBeTruthy(),
  );

  const mockInstance = (PlanetarySystemRenderer as ReturnType<typeof vi.fn>)
    .mock.results[0]?.value;

  await fireEvent.click(getByRole("button", { name: "Show barycenters" }));

  expect(mockInstance.setBarycenterOverlayVisible).toHaveBeenCalledWith(true);
  expect(getByRole("button", { name: "Hide barycenters" })).toBeTruthy();
});
```

- [ ] **Step 3: Run facade and wrapper tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts src/components/__tests__/PlanetarySystemWrapper.test.ts
```

Expected: FAIL because the public methods and toggle do not exist.

- [ ] **Step 4: Extend renderer controls and pass anchors into the manager**

In `src/lib/planetary-system/graphics/types.ts`, add these methods to `SolarSystemControls`:

```ts
    hasOrbitAnchors: () => boolean;
    setBarycenterOverlayVisible: (visible: boolean) => void;
```

In `src/lib/planetary-system/graphics/SolarSystemRenderer.ts`, inside `initialize`, before body creation, add:

```ts
this.celestialBodyManager.registerOrbitAnchors(systemData?.orbitAnchors ?? []);
```

In `getControls()`, add:

```ts
            hasOrbitAnchors: () =>
                this.celestialBodyManager.hasOrbitAnchors(),
            setBarycenterOverlayVisible: (visible: boolean) => {
                this.celestialBodyManager.setBarycenterOverlayVisible(visible);
            },
```

In `src/lib/planetary-system/PlanetarySystemRenderer.ts`, add these methods before `cleanup()`:

```ts
    hasOrbitAnchors(): boolean {
        const controls = this.solarSystemRenderer?.getControls();
        return controls?.hasOrbitAnchors() ?? false;
    }

    setBarycenterOverlayVisible(visible: boolean): void {
        const controls = this.solarSystemRenderer?.getControls();
        controls?.setBarycenterOverlayVisible(visible);
    }
```

- [ ] **Step 5: Add the Svelte overlay toggle**

In `src/components/PlanetarySystemWrapper.svelte`, add state near the other local variables:

```ts
let hasBarycenterOverlay = false;
let showBarycenterOverlay = false;
```

Add this handler near `handleZoomChange`:

```ts
const toggleBarycenterOverlay = () => {
  showBarycenterOverlay = !showBarycenterOverlay;
  planetarySystemRenderer?.setBarycenterOverlayVisible(showBarycenterOverlay);
};
```

After `zoomControls` is assigned during initialization, add:

```ts
hasBarycenterOverlay = planetarySystemRenderer.hasOrbitAnchors();
```

Inside `.controls-panel`, after the zoom controls block, add:

```svelte
      {#if hasBarycenterOverlay}
        <button
          on:click={toggleBarycenterOverlay}
          class="barycenter-toggle"
          aria-pressed={showBarycenterOverlay}
        >
          {showBarycenterOverlay ? 'Hide barycenters' : 'Show barycenters'}
        </button>
      {/if}
```

Add this style near `.zoom-controls button`:

```css
.barycenter-toggle {
  background: rgba(12, 74, 110, 0.75);
  color: white;
  border: 1px solid rgba(125, 211, 252, 0.6);
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  backdrop-filter: blur(10px);
}

.barycenter-toggle:hover {
  background: rgba(12, 74, 110, 0.95);
}
```

- [ ] **Step 6: Run facade and wrapper tests to verify they pass**

Run:

```bash
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts src/components/__tests__/PlanetarySystemWrapper.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/planetary-system/graphics/types.ts src/lib/planetary-system/graphics/SolarSystemRenderer.ts src/lib/planetary-system/PlanetarySystemRenderer.ts src/components/PlanetarySystemWrapper.svelte src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts src/components/__tests__/PlanetarySystemWrapper.test.ts
git commit -m "feat(planetary): add barycenter overlay toggle"
```

---

### Task 6: Universe Conversion And Orbit Validation Warnings

**Files:**

- Modify: `src/lib/universe/UniverseManager.ts`
- Test: `src/lib/universe/__tests__/UniverseManager.test.ts`

- [ ] **Step 1: Write failing UniverseManager tests**

In `src/lib/universe/__tests__/UniverseManager.test.ts`, add this test inside `describe("Planetary System Conversion", () => { ... })`:

```ts
it("preserves orbit anchors during PlanetarySystemData conversion", () => {
  const converted = UniverseManager.convertPlanetarySystemData({
    ...mockPlanetarySystemData,
    orbitAnchors: [
      {
        id: "barycenter",
        name: "Barycenter",
        type: "barycenter",
        position: new THREE.Vector3(0, 0, 0),
      },
    ],
  });

  expect(converted.orbitAnchors).toEqual([
    expect.objectContaining({ id: "barycenter" }),
  ]);
});
```

Add these tests inside `describe("DefaultSystemValidator (via UniverseManager)", () => { ... })`:

```ts
it("warns but succeeds when an orbit references a missing center", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const result = manager.addSystem({
    id: "x",
    name: "X",
    description: "",
    star: {
      ...validStar,
      orbit: {
        centerId: "missing-center",
        semiMajorAxis: 5,
        visualPeriodSeconds: 20,
      },
    },
    celestialBodies: [],
    systemScale: 1,
    systemCenter: new THREE.Vector3(0, 0, 0),
    systemType: "multiple",
  });

  expect(result).toBe(true);
  expect(warnSpy).toHaveBeenCalledWith(
    "System validation warnings:",
    expect.arrayContaining([
      expect.objectContaining({
        field: "star.orbit.centerId",
      }),
    ]),
  );
  warnSpy.mockRestore();
});

it("warns but succeeds for invalid orbital element values", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const result = manager.addSystem({
    id: "x",
    name: "X",
    description: "",
    star: validStar,
    celestialBodies: [
      {
        ...validStar,
        id: "planet",
        type: "planet" as const,
        orbit: {
          centerId: "star-1",
          semiMajorAxis: -1,
          eccentricity: 1.2,
          visualPeriodSeconds: -20,
        },
      },
    ],
    systemScale: 1,
    systemCenter: new THREE.Vector3(0, 0, 0),
    systemType: "solar",
  });

  expect(result).toBe(true);
  expect(warnSpy).toHaveBeenCalledWith(
    "System validation warnings:",
    expect.arrayContaining([
      expect.objectContaining({
        field: "celestialBodies[0].orbit.semiMajorAxis",
      }),
      expect.objectContaining({
        field: "celestialBodies[0].orbit.eccentricity",
      }),
      expect.objectContaining({
        field: "celestialBodies[0].orbit.visualPeriodSeconds",
      }),
    ]),
  );
  warnSpy.mockRestore();
});
```

- [ ] **Step 2: Run UniverseManager tests to verify they fail**

Run:

```bash
bunx vitest src/lib/universe/__tests__/UniverseManager.test.ts
```

Expected: FAIL because conversion does not preserve anchors and warnings are not emitted for orbital elements.

- [ ] **Step 3: Preserve anchors in conversion**

In `src/lib/universe/UniverseManager.ts`, update `convertPlanetarySystemData` to include:

```ts
            orbitAnchors: planetarySystem.orbitAnchors,
```

Place it after `systemType`.

- [ ] **Step 4: Emit validation warnings from `addSystem`**

In `addSystem`, after the invalid-system branch and before storing the system, add:

```ts
if (validation.warnings.length > 0) {
  console.warn("System validation warnings:", validation.warnings);
}
```

- [ ] **Step 5: Validate orbit anchors and orbital elements**

Inside `DefaultSystemValidator.validateStarSystem`, after the existing `celestialBodies` array validation, add:

```ts
const bodyIds = new Set<string>();
if (system.star?.id) {
  bodyIds.add(system.star.id);
}
if (Array.isArray(system.celestialBodies)) {
  system.celestialBodies.forEach((body) => {
    if (body.id) bodyIds.add(body.id);
  });
}

const anchorIds = new Set(
  system.orbitAnchors?.map((anchor) => anchor.id) ?? [],
);
const knownCenterIds = new Set([...bodyIds, ...anchorIds]);

const validateOrbit = (
  orbit: NonNullable<typeof system.star>["orbit"] | undefined,
  fieldPrefix: string,
) => {
  if (!orbit) return;

  if (!knownCenterIds.has(orbit.centerId)) {
    warnings.push({
      field: `${fieldPrefix}.centerId`,
      message: `Orbit center '${orbit.centerId}' does not exist in this system`,
      severity: "warning",
    });
  }

  if (orbit.semiMajorAxis <= 0) {
    warnings.push({
      field: `${fieldPrefix}.semiMajorAxis`,
      message: "Semi-major axis should be positive",
      severity: "warning",
    });
  }

  if (
    orbit.eccentricity !== undefined &&
    (orbit.eccentricity < 0 || orbit.eccentricity >= 1)
  ) {
    warnings.push({
      field: `${fieldPrefix}.eccentricity`,
      message:
        "Eccentricity should be greater than or equal to 0 and less than 1",
      severity: "warning",
    });
  }

  if (orbit.periodDays !== undefined && orbit.periodDays <= 0) {
    warnings.push({
      field: `${fieldPrefix}.periodDays`,
      message: "Period in days should be positive",
      severity: "warning",
    });
  }

  if (orbit.periodYears !== undefined && orbit.periodYears <= 0) {
    warnings.push({
      field: `${fieldPrefix}.periodYears`,
      message: "Period in years should be positive",
      severity: "warning",
    });
  }

  if (
    orbit.visualPeriodSeconds !== undefined &&
    orbit.visualPeriodSeconds <= 0
  ) {
    warnings.push({
      field: `${fieldPrefix}.visualPeriodSeconds`,
      message: "Visual period should be positive",
      severity: "warning",
    });
  }
};

validateOrbit(system.star?.orbit, "star.orbit");
system.orbitAnchors?.forEach((anchor, index) => {
  validateOrbit(anchor.orbit, `orbitAnchors[${index}].orbit`);
});
if (Array.isArray(system.celestialBodies)) {
  system.celestialBodies.forEach((body, index) => {
    validateOrbit(body.orbit, `celestialBodies[${index}].orbit`);
  });
}
```

- [ ] **Step 6: Run UniverseManager tests to verify they pass**

Run:

```bash
bunx vitest src/lib/universe/__tests__/UniverseManager.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/universe/UniverseManager.ts src/lib/universe/__tests__/UniverseManager.test.ts
git commit -m "feat(universe): validate orbital element references"
```

---

### Task 7: Final Alpha Centauri Migration Cleanup And Verification

**Files:**

- Modify: `src/lib/planetary-system/AlphaCentauri.ts`
- Modify: `src/lib/planetary-system/__tests__/PlanetarySystems.test.ts`

- [ ] **Step 1: Write failing tests that Alpha Centauri migrated bodies do not rely on legacy orbit fields**

Append this test inside `describe("alphaCentauriSystem", () => { ... })`:

```ts
it("does not rely on legacy orbit fields for migrated Alpha Centauri bodies", () => {
  const migratedBodyIds = [
    "alpha-centauri-b",
    "proxima-centauri",
    "proxima-b",
    "proxima-c",
  ];

  migratedBodyIds.forEach((id) => {
    const body = findAlphaBody(id);
    expect(body?.orbit).toBeDefined();
    expect(body?.orbitRadius).toBeUndefined();
    expect(body?.orbitSpeed).toBeUndefined();
    expect(body?.parentId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run Alpha Centauri data tests to verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
```

Expected: FAIL while Alpha Centauri bodies still carry legacy `orbitRadius`, `orbitSpeed`, or `parentId`.

- [ ] **Step 3: Remove legacy orbit fields from migrated Alpha Centauri bodies**

In `src/lib/planetary-system/AlphaCentauri.ts`, remove `orbitRadius`, `orbitSpeed`, and `parentId` from these objects:

```ts
alpha - centauri - b;
proxima - centauri;
proxima - b;
proxima - c;
```

Do not remove `position`; it remains the authored fallback position for graceful rendering if an orbit center cannot be resolved.

- [ ] **Step 4: Run focused verification**

Run:

```bash
bunx vitest src/lib/planetary-system/orbits
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
bunx vitest src/lib/planetary-system/__tests__/PlanetarySystemRenderer.test.ts
bunx vitest src/components/__tests__/PlanetarySystemWrapper.test.ts
bunx vitest src/lib/universe/__tests__/UniverseManager.test.ts
```

Expected: PASS for every command.

- [ ] **Step 5: Run type checking**

Run:

```bash
bun run type-check
```

Expected: PASS with no TypeScript or Astro template errors.

- [ ] **Step 6: Run production build**

Run:

```bash
bun run build
```

Expected: PASS and produce `dist/`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/planetary-system/AlphaCentauri.ts src/lib/planetary-system/__tests__/PlanetarySystems.test.ts
git commit -m "feat(planetary): migrate Alpha Centauri to barycentric orbits"
```

---

## Self-Review

Spec coverage:

- Invisible barycenters are represented by `OrbitAnchorData` in Task 1 and registered/rendered in Task 4.
- Orbital elements and hybrid periods are typed in Task 1 and computed in Task 2.
- Alpha Centauri is migrated in Tasks 1 and 7.
- Legacy behavior is preserved by Task 4 through the `!data.orbit` branch and existing tests.
- Barycenter overlay toggle is implemented in Task 5.
- Warnings for invalid data are implemented in Task 6.
- Verification commands cover orbit math, renderer integration, data, UI, validation, type checking, and build.

Type consistency:

- Data field name is `orbit` on `CelestialBodyData`.
- Anchor list field name is `orbitAnchors` on `PlanetarySystemData` and `StarSystemData`.
- Runtime class name is `OrbitResolver`.
- Public overlay methods are `hasOrbitAnchors()` and `setBarycenterOverlayVisible(visible)`.
