# Moon Orbit Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render existing moons visibly outside their parent planets while preserving parent-relative orbit behavior.

**Architecture:** Keep the existing scene-level body groups and `parentId` orbit model. Add private renderer-only effective orbit radii in `CelestialBodyManager`, computed from authored orbit radius plus rendered parent/child scales, and use those radii for orbit-line geometry and animated placement. Do not mutate `CelestialBodyData`.

**Tech Stack:** TypeScript, Three.js, Vitest, Bun.

---

## File Structure

- Modify `src/lib/planetary-system/graphics/CelestialBodyManager.ts`
  - Owns body groups, source data, orbit lines, orbit angles, and animation updates.
  - Add a private `visualOrbitRadii` map and helper methods for effective radius calculation.
  - Use effective radii in orbit-line creation and animation without changing source data.
- Modify `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`
  - Add focused tests for expanded parent-relative moon radius, preserved large moon radius, and unchanged non-parented planet radius.

## Task 1: Add Failing Orbit Radius Tests

**Files:**
- Modify: `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`

- [ ] **Step 1: Add parent-relative visual spacing tests**

First, in the existing `"moon orbits around parent body position, not system center"` test, replace:

```ts
        // Allow some floating point tolerance
        expect(distanceToParent).toBeCloseTo(0.5, 1);
```

with:

```ts
        // The visual orbit radius expands past the rendered parent radius.
        expect(distanceToParent).toBeCloseTo(1.44, 5);
```

Then add these tests inside the existing `describe("CelestialBodyManager", () => { ... })` block, after the current `"moon orbits around parent body position, not system center"` test:

```ts
    it("expands a too-small moon orbit radius outside the rendered parent", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const parentData = makeBodyData({
            id: "earth",
            position: new THREE.Vector3(15, 0, 0),
            scale: 1.0,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const parentGroup = await manager.createCelestialBody(parentData);

        const moonData = makeBodyData({
            id: "luna",
            name: "Moon",
            type: "moon",
            parentId: "earth",
            position: new THREE.Vector3(15.4, 0, 0),
            scale: 0.27,
            orbitRadius: 0.4,
            orbitSpeed: 1.0,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        manager.updateAnimations(0, 1.0);

        const distanceToParent = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );

        expect(distanceToParent).toBeCloseTo(1.42, 5);
        expect(moonData.orbitRadius).toBe(0.4);
    });

    it("preserves an already-large moon orbit radius", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const parentData = makeBodyData({
            id: "jupiter",
            position: new THREE.Vector3(20, 0, 0),
            scale: 1.2,
            orbitRadius: 0,
            orbitSpeed: 0,
        });
        const parentGroup = await manager.createCelestialBody(parentData);

        const moonData = makeBodyData({
            id: "ganymede",
            name: "Ganymede",
            type: "moon",
            parentId: "jupiter",
            position: new THREE.Vector3(22.5, 0, 0),
            scale: 0.3,
            orbitRadius: 2.5,
            orbitSpeed: 1.0,
        });
        const moonGroup = await manager.createCelestialBody(moonData);

        manager.updateAnimations(0, 1.0);

        const distanceToParent = Math.sqrt(
            Math.pow(moonGroup.position.x - parentGroup.position.x, 2) +
                Math.pow(moonGroup.position.z - parentGroup.position.z, 2),
        );

        expect(distanceToParent).toBeCloseTo(2.5, 5);
    });

    it("keeps non-parented planet orbit radius unchanged", async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const manager = new CelestialBodyManager(scene, camera);

        const data = makeBodyData({
            id: "mars",
            position: new THREE.Vector3(5, 0, 0),
            scale: 0.7,
            orbitRadius: 5,
            orbitSpeed: 1.0,
        });
        const group = await manager.createCelestialBody(data);

        manager.updateAnimations(0, 1.0);

        const distanceToSystemCenter = Math.sqrt(
            Math.pow(group.position.x, 2) + Math.pow(group.position.z, 2),
        );

        expect(distanceToSystemCenter).toBeCloseTo(5, 5);
    });
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts --run
```

Expected: at least the new `"expands a too-small moon orbit radius outside the rendered parent"` test fails because the current implementation uses `data.orbitRadius` directly and returns a parent distance of `0.4` instead of `1.42`.

## Task 2: Implement Effective Visual Orbit Radii

**Files:**
- Modify: `src/lib/planetary-system/graphics/CelestialBodyManager.ts`

- [ ] **Step 1: Add private state for visual orbit radii**

Near the existing private maps at the top of `CelestialBodyManager`, change this block:

```ts
    private bodies = new Map<string, THREE.Object3D>();
    private orbitLines = new Map<string, Line2>();
    private bodyData = new Map<string, CelestialBodyData>();
    private orbitAngles = new Map<string, number>(); // Track accumulated orbital angles
```

to:

```ts
    private bodies = new Map<string, THREE.Object3D>();
    private orbitLines = new Map<string, Line2>();
    private bodyData = new Map<string, CelestialBodyData>();
    private orbitAngles = new Map<string, number>(); // Track accumulated orbital angles
    private visualOrbitRadii = new Map<string, number>();
```

- [ ] **Step 2: Store the effective radius before creating the orbit line**

In `createCelestialBody`, replace:

```ts
        // Create orbit path visualization
        if (data.orbitRadius && data.orbitRadius > 0) {
            this.createOrbitLine(data);
        }

        // Store references
        this.bodies.set(data.id, celestialGroup);
        this.bodyData.set(data.id, data);
```

with:

```ts
        // Store references before orbit calculations so children can inspect parent data.
        this.bodies.set(data.id, celestialGroup);
        this.bodyData.set(data.id, data);

        const visualOrbitRadius = this.getVisualOrbitRadius(data);
        if (visualOrbitRadius > 0) {
            this.visualOrbitRadii.set(data.id, visualOrbitRadius);
            this.createOrbitLine(data, visualOrbitRadius);
        }
```

- [ ] **Step 3: Add helper methods for effective radius calculation**

Add these private methods immediately before `createOrbitLine`:

```ts
    private getVisualOrbitRadius(data: CelestialBodyData): number {
        if (!data.orbitRadius || data.orbitRadius <= 0) {
            return 0;
        }

        if (!data.parentId) {
            return data.orbitRadius;
        }

        const parentData = this.bodyData.get(data.parentId);
        if (!parentData) {
            return data.orbitRadius;
        }

        const minimumRadius = this.getMinimumParentRelativeOrbitRadius(
            parentData,
            data,
        );

        return Math.max(data.orbitRadius, minimumRadius);
    }

    private getMinimumParentRelativeOrbitRadius(
        parentData: CelestialBodyData,
        childData: CelestialBodyData,
    ): number {
        const clearance = Math.max(0.15, parentData.scale * 0.1);
        return parentData.scale + childData.scale + clearance;
    }
```

- [ ] **Step 4: Update orbit-line geometry to use the effective radius**

Change the `createOrbitLine` signature and guard from:

```ts
    private createOrbitLine(data: CelestialBodyData): void {
        if (!data.orbitRadius || data.orbitRadius <= 0) {
            return;
        }
```

to:

```ts
    private createOrbitLine(
        data: CelestialBodyData,
        orbitRadius: number,
    ): void {
        if (orbitRadius <= 0) {
            return;
        }
```

Then replace both geometry uses of `data.orbitRadius` inside the point loop:

```ts
            const x = Math.cos(angle) * data.orbitRadius;
            const z = Math.sin(angle) * data.orbitRadius;
```

with:

```ts
            const x = Math.cos(angle) * orbitRadius;
            const z = Math.sin(angle) * orbitRadius;
```

- [ ] **Step 5: Update direct private-method test call**

In `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`, replace the direct private call in `"createOrbitLine early-return when called directly with orbitRadius=0"`:

```ts
            (manager as any).createOrbitLine(
                makeBodyData({ id: "zero-orbit", orbitRadius: 0 }),
            ),
```

with:

```ts
            (manager as any).createOrbitLine(
                makeBodyData({ id: "zero-orbit", orbitRadius: 0 }),
                0,
            ),
```

- [ ] **Step 6: Use visual orbit radius during animation**

In `updateAnimations`, replace:

```ts
                // Calculate position from the smooth accumulated angle relative to orbit center
                body.position.x =
                    orbitCenterX + Math.cos(currentAngle) * data.orbitRadius;
                body.position.y = orbitCenterY; // Inherit parent's Y offset
                body.position.z =
                    orbitCenterZ + Math.sin(currentAngle) * data.orbitRadius;
```

with:

```ts
                const orbitRadius =
                    this.visualOrbitRadii.get(id) ?? data.orbitRadius;

                // Calculate position from the smooth accumulated angle relative to orbit center
                body.position.x =
                    orbitCenterX + Math.cos(currentAngle) * orbitRadius;
                body.position.y = orbitCenterY; // Inherit parent's Y offset
                body.position.z =
                    orbitCenterZ + Math.sin(currentAngle) * orbitRadius;
```

- [ ] **Step 7: Clear visual orbit radii during disposal**

In `dispose`, replace:

```ts
        this.bodies.clear();
        this.bodyData.clear();
        this.orbitLines.clear();
```

with:

```ts
        this.bodies.clear();
        this.bodyData.clear();
        this.orbitLines.clear();
        this.visualOrbitRadii.clear();
```

- [ ] **Step 8: Run the focused test file**

Run:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts --run
```

Expected: all tests in `CelestialBodyManager.test.ts` pass.

- [ ] **Step 9: Commit the renderer implementation**

Run:

```bash
git add src/lib/planetary-system/graphics/CelestialBodyManager.ts src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts
git commit -m "fix: render moons outside parent planets"
```

Expected: commit succeeds and includes only the renderer/test changes.

## Task 3: Verification

**Files:**
- Verify: `src/lib/planetary-system/graphics/CelestialBodyManager.ts`
- Verify: `src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts`

- [ ] **Step 1: Run type checking**

Run:

```bash
bun run type-check
```

Expected: command exits with status `0`.

- [ ] **Step 2: Run lint**

Run:

```bash
bun run lint
```

Expected: command exits with status `0`.

- [ ] **Step 3: Run the focused renderer tests again**

Run:

```bash
bunx vitest src/lib/planetary-system/graphics/__tests__/CelestialBodyManager.test.ts --run
```

Expected: all tests in `CelestialBodyManager.test.ts` pass.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes remain after the implementation commit.
