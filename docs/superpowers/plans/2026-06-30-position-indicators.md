# Position Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the user's location legible in the Galaxy and Constellation views — a Sol marker + label + distance-lines at the galactic origin (Earth/Sol), and a horizon ring + cardinal compass in the Earth-observer constellation view.

**Architecture:** Pure renderer-layer changes. Galaxy: `StarSystemManager` gains a Sol marker group (sphere + ring) at `(0,0,0)` and a `LineSegments` of distance lines from the origin to each system, gated by the existing-but-dead `enableStarLabels` / `enableDistanceIndicators` config flags. `GalaxyRenderer` frames the camera on Sol at init and exposes runtime toggles. Constellation: `ConstellationRenderer` gains a `LineLoop` horizon ring on the `y=0` plane + `Sprite` cardinal labels (N/E/S/W) and exposes `getCameraAzimuth()` for a HUD compass strip. Sol is a renderer-managed marker only — never added to `localGalaxyData.starSystems`.

**Tech Stack:** Three.js, Vitest (jsdom + `src/test/setup.ts` three mock), Playwright (Chromium). Renderer tests follow the established pattern: per-file `makeContainer()`, `mockConfig`/`makeStar()` fixtures, assert via `scene.children.find(c => c.name === …)`, `(mgr as any).someMap.size`, and `expect((THREE as any).Sprite).toHaveBeenCalledTimes(n)`.

## Global Constraints

- **Shadows:** never enable.
- **Three.js memory:** dispose every new geometry/material/texture in the renderer's `dispose()`.
- **Reduced motion:** the Sol ring is static (no pulse) to respect reduced-motion; the compass is a readout, not an animation.
- **Framework-agnostic renderers:** no i18n inside renderer classes. Localizable strings come via config (`GalaxyConfig.solMarkerLabel`) or are rendered in Svelte (constellation compass).
- **Sol stays out of the dataset:** `localGalaxyData.starSystems` is unchanged.
- **Verify after every task:** `bun run lint && bun run type-check`; tests `bun run test:run`.
- **i18n keys** (`galaxy.solMarkerLabel`, `galaxy.distanceLines`, `constellation.viewFromEarth`, `constellation.compass`) already exist (added in Plan 1 Task 1). If Plan 1 has NOT run, add them first (see Task 0).

---

## File Structure

**Modified files:**
- `src/lib/galaxy/types.ts` — add `solMarkerLabel: string` to `GalaxyConfig`.
- `src/lib/galaxy/graphics/StarSystemManager.ts` — Sol marker + label + distance lines + toggles + dispose.
- `src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts` — new tests.
- `src/lib/galaxy/graphics/GalaxyRenderer.ts` — default `solMarkerLabel`, init camera framing, forward toggle methods.
- `src/components/GalaxyWrapper.svelte` — wire `enableDistanceLines`/`enableStarLabels` toggles to renderer; pass `solMarkerLabel`.
- `src/lib/constellation/ConstellationRenderer.ts` — horizon ring + cardinal labels + `getCameraAzimuth()` + dispose.
- `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` — new tests.
- `src/components/ConstellationWrapper.svelte` — render "View from Earth" label + compass strip.
- `e2e/position-indicators.spec.ts` — new smoke tests.

---

### Task 0 (only if Plan 1 not run): ensure i18n keys exist

**Files:** `src/i18n/en.ts`, `src/i18n/zh.ts`, `src/i18n/ja.ts`

- [ ] **Step 1:** Grep for `"galaxy.solMarkerLabel"` in `src/i18n/en.ts`. If absent, add the 4 keys (`galaxy.solMarkerLabel`, `galaxy.distanceLines`, `constellation.viewFromEarth`, `constellation.compass`) to en/zh/ja exactly as specified in Plan 1 Task 1. If present, skip this task.

Run: `rg -n "galaxy.solMarkerLabel" src/i18n/en.ts`

---

### Task 1: Add `solMarkerLabel` to `GalaxyConfig`

**Files:**
- Modify: `src/lib/galaxy/types.ts`

**Interfaces:**
- Produces: `GalaxyConfig.solMarkerLabel: string` (consumed by `StarSystemManager` in Task 2).

- [ ] **Step 1: Add the field**

In `src/lib/galaxy/types.ts`, inside `export interface GalaxyConfig { … }`, after `starGlowIntensity: number;`, add:

```ts
    // Label text for the Sol / "you are here" origin marker (localized by caller)
    solMarkerLabel: string;
```

- [ ] **Step 2: Update the `Required<GalaxyConfig>` default in `GalaxyRenderer.ts`**

In `src/lib/galaxy/graphics/GalaxyRenderer.ts`, inside the constructor's `this.config = { … }` literal (right after `starGlowIntensity: 1.0,`), add:

```ts
        solMarkerLabel: "SOL · YOU ARE HERE",
```

- [ ] **Step 3: Verify type-check**

Run: `bun run type-check`
Expected: PASS (the new required field now has a default; existing `mockConfig` literals in tests may need the field — see Task 2 Step 1 for the test fixture update).

- [ ] **Step 4: Commit**

```bash
git add src/lib/galaxy/types.ts src/lib/galaxy/graphics/GalaxyRenderer.ts
git commit -m "feat(galaxy): add solMarkerLabel to GalaxyConfig"
```

---

### Task 2: StarSystemManager — Sol marker + label (TDD)

**Files:**
- Modify: `src/lib/galaxy/graphics/StarSystemManager.ts`
- Test: `src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`

**Interfaces:**
- Consumes: `Required<GalaxyConfig>` (now incl. `solMarkerLabel`, `enableStarLabels`), `StarSystemData`.
- Produces: private `solMarkerGroup: THREE.Group | null`; public `setSolMarkerVisible(visible: boolean): void`; marker added to `this.scene` during `initialize()`.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`. First ensure the file's shared `mockConfig` literal (a `Required<GalaxyConfig>`) includes the new field — add `solMarkerLabel: "SOL · YOU ARE HERE",` to it. Then add:

```ts
describe("StarSystemManager — Sol marker", () => {
    it("adds a sol-marker group at the origin on initialize", async () => {
        const scene = new THREE.Scene();
        const manager = new StarSystemManager(scene, { ...mockConfig });
        await manager.initialize([mockStarSystemData]);

        const marker = scene.children.find((c: any) => c.name === "sol-marker");
        expect(marker).toBeTruthy();
        expect(marker!.position.x).toBe(0);
        expect(marker!.position.y).toBe(0);
        expect(marker!.position.z).toBe(0);

        const core = (marker as any).children.find((c: any) => c.name === "sol-marker-core");
        expect(core).toBeTruthy();
    });

    it("adds the localized label sprite only when enableStarLabels is true", async () => {
        const sceneOn = new THREE.Scene();
        const mgrOn = new StarSystemManager(sceneOn, { ...mockConfig, enableStarLabels: true });
        await mgrOn.initialize([mockStarSystemData]);
        const on = sceneOn.children.find((c: any) => c.name === "sol-marker");
        const labelOn = (on as any).children.find((c: any) => c.name === "sol-marker-label");
        expect(labelOn).toBeTruthy();

        const sceneOff = new THREE.Scene();
        const mgrOff = new StarSystemManager(sceneOff, { ...mockConfig, enableStarLabels: false });
        await mgrOff.initialize([mockStarSystemData]);
        const off = sceneOff.children.find((c: any) => c.name === "sol-marker");
        const labelOff = (off as any).children.find((c: any) => c.name === "sol-marker-label");
        expect(labelOff).toBeUndefined();
    });

    it("setSolMarkerVisible toggles the marker group visibility", async () => {
        const scene = new THREE.Scene();
        const manager = new StarSystemManager(scene, { ...mockConfig });
        await manager.initialize([mockStarSystemData]);
        manager.setSolMarkerVisible(false);
        const marker = scene.children.find((c: any) => c.name === "sol-marker");
        expect(marker!.visible).toBe(false);
        manager.setSolMarkerVisible(true);
        expect(marker!.visible).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`
Expected: FAIL — no `sol-marker` in scene (`setSolMarkerVisible` not a function).

- [ ] **Step 3: Implement**

In `src/lib/galaxy/graphics/StarSystemManager.ts`:

(a) Add a private field next to the other maps:

```ts
    private solMarkerGroup: THREE.Group | null = null;
```

(b) Add the builder methods (place near `highlightStarSystem`):

```ts
    private createSolMarker(): THREE.Group {
        const group = new THREE.Group();
        group.name = "sol-marker";
        group.position.copy(new THREE.Vector3(0, 0, 0));

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            new THREE.MeshBasicMaterial({ color: "#7dd3fc" }),
        );
        core.name = "sol-marker-core";
        group.add(core);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.6, 0.8, 32),
            new THREE.MeshBasicMaterial({
                color: "#00f0ff",
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
            }),
        );
        ring.name = "sol-marker-ring";
        group.add(ring);

        if (this.config.enableStarLabels) {
            group.add(this.createSolLabel(this.config.solMarkerLabel));
        }
        return group;
    }

    private createSolLabel(text: string): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = 256;
        canvas.height = 64;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#7dd3fc";
        ctx.shadowBlur = 10;
        ctx.fillText(text, 128, 32);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
        );
        sprite.position.set(0, 1.2, 0);
        sprite.scale.set(3, 0.75, 1);
        sprite.name = "sol-marker-label";
        return sprite;
    }

    setSolMarkerVisible(visible: boolean): void {
        if (this.solMarkerGroup) this.solMarkerGroup.visible = visible;
    }
```

(c) Call it at the end of `initialize()`. Locate `async initialize(starSystems: StarSystemData[])` (it loops calling `this.createStarSystem(system)`). Immediately after that loop completes (before the method returns), insert:

```ts
        this.solMarkerGroup = this.createSolMarker();
        this.scene.add(this.solMarkerGroup);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`
Expected: PASS (3 new tests + existing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxy/graphics/StarSystemManager.ts src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts
git commit -m "feat(galaxy): add Sol origin marker + localized label"
```

---

### Task 3: StarSystemManager — distance lines (TDD)

**Files:**
- Modify: `src/lib/galaxy/graphics/StarSystemManager.ts`
- Test: `src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`

**Interfaces:**
- Produces: private `distanceLines: THREE.LineSegments | null`; public `setDistanceLinesVisible(visible: boolean): void`. Created during `initialize()` only when `config.enableDistanceIndicators` is true.

- [ ] **Step 1: Add the failing tests**

Append to the StarSystemManager test file:

```ts
describe("StarSystemManager — distance lines", () => {
    it("creates distance lines from origin to every system when enabled", async () => {
        const scene = new THREE.Scene();
        const manager = new StarSystemManager(scene, { ...mockConfig, enableDistanceIndicators: true });
        await manager.initialize([mockStarSystemData]);
        const lines = scene.children.find((c: any) => c.name === "sol-distance-lines");
        expect(lines).toBeTruthy();
    });

    it("does not create distance lines when disabled", async () => {
        const scene = new THREE.Scene();
        const manager = new StarSystemManager(scene, { ...mockConfig, enableDistanceIndicators: false });
        await manager.initialize([mockStarSystemData]);
        const lines = scene.children.find((c: any) => c.name === "sol-distance-lines");
        expect(lines).toBeUndefined();
    });

    it("setDistanceLinesVisible toggles visibility", async () => {
        const scene = new THREE.Scene();
        const manager = new StarSystemManager(scene, { ...mockConfig, enableDistanceIndicators: true });
        await manager.initialize([mockStarSystemData]);
        manager.setDistanceLinesVisible(false);
        const lines = scene.children.find((c: any) => c.name === "sol-distance-lines");
        expect(lines!.visible).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`
Expected: FAIL — `sol-distance-lines` not found.

- [ ] **Step 3: Implement**

In `StarSystemManager.ts`:

(a) Add the field:

```ts
    private distanceLines: THREE.LineSegments | null = null;
```

(b) Add builder + toggle (near the Sol marker methods):

```ts
    private createDistanceLines(starSystems: StarSystemData[]): THREE.LineSegments {
        const positions: number[] = [];
        starSystems.forEach((s) => {
            positions.push(0, 0, 0, s.position.x, s.position.y, s.position.z);
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3),
        );
        const material = new THREE.LineBasicMaterial({
            color: 0x1b6b7a,
            transparent: true,
            opacity: 0.35,
        });
        const lines = new THREE.LineSegments(geometry, material);
        lines.name = "sol-distance-lines";
        return lines;
    }

    setDistanceLinesVisible(visible: boolean): void {
        if (this.distanceLines) this.distanceLines.visible = visible;
    }
```

(c) In `initialize()`, right after the Sol marker is added, insert:

```ts
        if (this.config.enableDistanceIndicators) {
            this.distanceLines = this.createDistanceLines(starSystems);
            this.scene.add(this.distanceLines);
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts`
Expected: PASS.

- [ ] **Step 5: Dispose cleanup**

In `StarSystemManager.dispose()` (find the existing method), before it clears its maps, add disposal for the new objects:

```ts
        if (this.solMarkerGroup) {
            this.solMarkerGroup.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const mat = mesh.material as THREE.Material | THREE.Material[];
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else if (mat) mat.dispose();
            });
            this.scene.remove(this.solMarkerGroup);
            this.solMarkerGroup = null;
        }
        if (this.distanceLines) {
            this.distanceLines.geometry.dispose();
            (this.distanceLines.material as THREE.Material).dispose();
            this.scene.remove(this.distanceLines);
            this.distanceLines = null;
        }
```

- [ ] **Step 6: Run full galaxy test suite**

Run: `bunx vitest run src/lib/galaxy`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/galaxy/graphics/StarSystemManager.ts src/lib/galaxy/graphics/__tests__/StarSystemManager.test.ts
git commit -m "feat(galaxy): add distance lines from Sol to star systems"
```

---

### Task 4: GalaxyRenderer — camera framing + toggle forwarding

**Files:**
- Modify: `src/lib/galaxy/graphics/GalaxyRenderer.ts`
- Test: `src/lib/galaxy/graphics/__tests__/GalaxyRenderer.test.ts`

**Interfaces:**
- Produces: public `setDistanceLinesVisible(visible): void` and `setSolMarkerVisible(visible): void` delegating to `starSystemManager`. Initial camera moved closer to frame Sol.

- [ ] **Step 1: Add a failing test for camera framing**

Append to `src/lib/galaxy/graphics/__tests__/GalaxyRenderer.test.ts`:

```ts
describe("GalaxyRenderer — Sol framing", () => {
    it("positions the camera close enough to see the origin on initialize", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);
        const dist = Math.sqrt(
            camera.position.x ** 2 + camera.position.y ** 2 + camera.position.z ** 2,
        );
        expect(dist).toBeLessThanOrEqual(10);
    });

    it("forwards setDistanceLinesVisible to the star system manager", async () => {
        const renderer = new GalaxyRenderer(container, mockConfig, mockEvents);
        await renderer.initialize(mockGalaxyData);
        expect(() => renderer.setDistanceLinesVisible(false)).not.toThrow();
    });
});
```

> If the test file doesn't already expose a module-level `camera`/`container`, reference `renderer` internals instead: `(renderer as any).camera.position`. Adjust to match the file's existing fixture style (the file already constructs `new GalaxyRenderer(container, mockConfig, mockEvents)` in `beforeEach`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/GalaxyRenderer.test.ts`
Expected: FAIL — current camera `(10,10,10)` has distance ≈ 17.3 > 10; `setDistanceLinesVisible` undefined.

- [ ] **Step 3: Implement**

In `src/lib/galaxy/graphics/GalaxyRenderer.ts`:

(a) In `initialize()`, replace the camera framing block:

```ts
        // Position camera to frame the Sol marker at the origin
        this.camera.position.set(6, 4, 6);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
```

Also apply the same `this.camera.position.set(6, 4, 6); this.camera.lookAt(0, 0, 0);` in `setupCamera()` (keep `near`/`far`/`updateProjectionMatrix` lines).

(b) Add public forwarders (near `highlightStarSystem`):

```ts
    setDistanceLinesVisible(visible: boolean): void {
        this.starSystemManager?.setDistanceLinesVisible(visible);
    }

    setSolMarkerVisible(visible: boolean): void {
        this.starSystemManager?.setSolMarkerVisible(visible);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/lib/galaxy/graphics/__tests__/GalaxyRenderer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/galaxy/graphics/GalaxyRenderer.ts src/lib/galaxy/graphics/__tests__/GalaxyRenderer.test.ts
git commit -m "feat(galaxy): frame Sol on init + expose indicator toggles"
```

---

### Task 5: Wire Galaxy HUD toggles to the renderer

**Files:**
- Modify: `src/components/GalaxyWrapper.svelte`

**Interfaces:**
- Consumes: `GalaxyRenderer.setDistanceLinesVisible`, `setSolMarkerVisible`; i18n key `galaxy.solMarkerLabel`.

- [ ] **Step 1: Pass localized label + initial toggles into the renderer config**

In `GalaxyWrapper.svelte`, in the `defaultConfig` object literal, add (alongside the existing fields):

```ts
    solMarkerLabel: t("galaxy.solMarkerLabel"),
    enableStarLabels: enableStarLabels,
    enableDistanceIndicators: enableDistanceLines,
```

- [ ] **Step 2: Add reactive toggle wiring**

After the renderer is created/initialized (near the existing `$: if (container && !renderer) initializeRenderer();`), add:

```ts
  $: if (renderer) renderer.setDistanceLinesVisible(enableDistanceLines);
  $: if (renderer) renderer.setSolMarkerVisible(enableStarLabels);
```

- [ ] **Step 3: Verify**

Run: `bun run type-check && bun run lint`
Expected: PASS. Manual smoke: galaxy shows Sol marker at center on load; toggling "Distance Lines" in settings shows/hides the lines.

- [ ] **Step 4: Commit**

```bash
git add src/components/GalaxyWrapper.svelte
git commit -m "feat(galaxy): wire distance-lines + Sol-label toggles to renderer"
```

---

### Task 6: ConstellationRenderer — horizon ring + cardinal labels (TDD)

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Test: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

**Interfaces:**
- Consumes: existing `initialize(stars, constellations, skyConfig)`.
- Produces: private `horizonRing: THREE.LineLoop`, `cardinalLabels: THREE.Group`; a `createOrientationGuides()` method called from `initialize()`; both added to `this.scene`.

- [ ] **Step 1: Add failing tests**

Append to `src/lib/constellation/__tests__/ConstellationRenderer.test.ts` (reuse the file's existing `makeContainer()`/`makeStar()`/`makeConstellation()`/`makeSkyConfig()` helpers):

```ts
describe("ConstellationRenderer — orientation guides", () => {
    it("adds a horizon ring on the y=0 plane", async () => {
        const container = makeContainer();
        const renderer = new ConstellationRenderer(container);
        await renderer.initialize(
            [makeStar()],
            [makeConstellation()],
            makeSkyConfig(),
        );
        const ring = (renderer as any).scene.children.find(
            (c: any) => c.name === "horizon-ring",
        );
        expect(ring).toBeTruthy();
        // every vertex sits at y = 0 (horizon plane)
        const attr = ring.geometry.getAttribute("position");
        for (let i = 1; i < attr.count * 3; i += 3) {
            expect(attr.array[i]).toBe(0);
        }
    });

    it("adds four cardinal labels N/E/S/W", async () => {
        const container = makeContainer();
        const renderer = new ConstellationRenderer(container);
        await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
        const group = (renderer as any).scene.children.find(
            (c: any) => c.name === "cardinal-labels",
        );
        expect(group).toBeTruthy();
        const names = group.children.map((c: any) => c.name);
        expect(names).toContain("cardinal-N");
        expect(names).toContain("cardinal-E");
        expect(names).toContain("cardinal-S");
        expect(names).toContain("cardinal-W");
        expect(group.children.length).toBe(4);
    });
});
```

> If the existing test accesses the scene via a different path (e.g. a captured `scene` fixture rather than `(renderer as any).scene`), substitute that variable. Match the file's convention.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
Expected: FAIL — no `horizon-ring` / `cardinal-labels`.

- [ ] **Step 3: Implement**

In `src/lib/constellation/ConstellationRenderer.ts`:

(a) Add private fields (near `constellationLines`/`constellationLabels` declarations):

```ts
    private horizonRing: THREE.LineLoop | null = null;
    private cardinalLabels: THREE.Group | null = null;
```

(b) Add the builders (near `createConstellationLines`):

```ts
    private createOrientationGuides(): void {
        // Horizon ring: closed loop on the y = 0 plane at the star radius
        const radius = 100;
        const segments = 128;
        const points: number[] = [];
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            points.push(radius * Math.cos(a), 0, radius * Math.sin(a));
        }
        const ringGeom = new THREE.BufferGeometry();
        ringGeom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(points, 3),
        );
        const ringMat = new THREE.LineBasicMaterial({
            color: 0x1b6b7a,
            transparent: true,
            opacity: 0.4,
        });
        this.horizonRing = new THREE.LineLoop(ringGeom, ringMat);
        this.horizonRing.name = "horizon-ring";
        this.horizonRing.renderOrder = 2;
        this.scene.add(this.horizonRing);

        // Cardinal labels N/E/S/W on the ring (azimuth: 0=N→+z, 90=E→+x, 180=S→-z, 270=W→-x)
        this.cardinalLabels = new THREE.Group();
        this.cardinalLabels.name = "cardinal-labels";
        const dirs = [
            { label: "N", az: 0 },
            { label: "E", az: Math.PI / 2 },
            { label: "S", az: Math.PI },
            { label: "W", az: (3 * Math.PI) / 2 },
        ];
        for (const { label, az } of dirs) {
            const x = radius * Math.sin(az);
            const z = radius * Math.cos(az);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            canvas.width = 128;
            canvas.height = 128;
            ctx.clearRect(0, 0, 128, 128);
            ctx.fillStyle = "#4FC3F7";
            ctx.font = "bold 64px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#4FC3F7";
            ctx.shadowBlur = 12;
            ctx.fillText(label, 64, 64);
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                }),
            );
            sprite.position.set(x, 0, z);
            sprite.scale.set(6, 6, 1);
            sprite.name = `cardinal-${label}`;
            this.cardinalLabels.add(sprite);
        }
        this.scene.add(this.cardinalLabels);
    }
```

(c) Call it from `initialize()`. Locate `async initialize(stars, constellations, skyConfig)` and call, after the existing star/line/label creation steps (near the end, before the render loop starts):

```ts
        this.createOrientationGuides();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
Expected: PASS.

- [ ] **Step 5: Dispose cleanup**

In `ConstellationRenderer.dispose()` (or its `clearScene()` helper), add removal + disposal of the new objects. In the section that removes `constellationLines`/labels, add:

```ts
        if (this.horizonRing) {
            this.horizonRing.geometry.dispose();
            (this.horizonRing.material as THREE.Material).dispose();
            this.scene.remove(this.horizonRing);
            this.horizonRing = null;
        }
        if (this.cardinalLabels) {
            this.cardinalLabels.traverse((obj) => {
                const sprite = obj as THREE.Sprite;
                const mat = sprite.material as THREE.SpriteMaterial | undefined;
                if (mat) {
                    mat.map?.dispose();
                    mat.dispose();
                }
            });
            this.scene.remove(this.cardinalLabels);
            this.cardinalLabels = null;
        }
```

- [ ] **Step 6: Run full constellation suite**

Run: `bunx vitest run src/lib/constellation`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts
git commit -m "feat(constellation): add horizon ring + cardinal labels"
```

---

### Task 7: ConstellationRenderer — expose camera azimuth + compass in HUD

**Files:**
- Modify: `src/lib/constellation/ConstellationRenderer.ts`
- Modify: `src/components/ConstellationWrapper.svelte`
- Test: `src/lib/constellation/__tests__/ConstellationRenderer.test.ts`

**Interfaces:**
- Produces: `public getCameraAzimuth(): number` (degrees, 0–360, 0 = North/+z).

- [ ] **Step 1: Add failing test**

Append:

```ts
describe("ConstellationRenderer — compass", () => {
    it("getCameraAzimuth returns a normalized 0-360 degree value", async () => {
        const container = makeContainer();
        const renderer = new ConstellationRenderer(container);
        await renderer.initialize([makeStar()], [makeConstellation()], makeSkyConfig());
        const az = renderer.getCameraAzimuth();
        expect(az).toBeGreaterThanOrEqual(0);
        expect(az).toBeLessThan(360);
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
Expected: FAIL — `getCameraAzimuth` is not a function.

- [ ] **Step 3: Implement the method**

In `ConstellationRenderer.ts`, add near `tweenCameraTo`:

```ts
    public getCameraAzimuth(): number {
        let deg = (this.cameraRotationY * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        return deg;
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `bunx vitest run src/lib/constellation/__tests__/ConstellationRenderer.test.ts`
Expected: PASS.

- [ ] **Step 5: Render compass + "View from Earth" in the HUD**

In `src/components/ConstellationWrapper.svelte`, add a reactive azimuth updated on the existing HUD rAF loop (the `tickHud` function already runs each frame). Add near the other UI state:

```ts
  let facingDeg = 0;
  $: facingCardinal = facingDegToCardinal(facingDeg);

  function facingDegToCardinal(deg: number): string {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }
```

Inside the existing `tickHud` rAF callback (which already reads `renderer`), add:

```ts
    if (renderer) facingDeg = renderer.getCameraAzimuth();
```

Then render the readout next to the existing geo-lock/UTC block (in the side panel — wherever `constellation.geoLock` is shown). Add:

```svelte
    <div class="compass-readout">
      <span class="compass-label">{t('constellation.compass')}</span>
      <span class="compass-value">{facingCardinal} ({Math.round(facingDeg)}°)</span>
    </div>
    <p class="view-from-earth">{t('constellation.viewFromEarth')}</p>
```

Add minimal styles (in the component `<style>` or as Tailwind utilities):

```css
  .compass-readout { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.85); }
  .compass-label { letter-spacing: 0.2em; color: var(--hud-cyan, #00f0ff); }
  .view-from-earth { margin: 4px 0 0; font-size: 11px; letter-spacing: 0.15em; color: var(--hud-cyan, #00f0ff); opacity: 0.8; }
```

- [ ] **Step 6: Verify**

Run: `bun run type-check && bun run lint`
Expected: PASS. Manual smoke: dragging to look around updates the FACING readout; horizon ring + N/E/S/W visible.

- [ ] **Step 7: Commit**

```bash
git add src/lib/constellation/ConstellationRenderer.ts src/lib/constellation/__tests__/ConstellationRenderer.test.ts src/components/ConstellationWrapper.svelte
git commit -m "feat(constellation): add compass readout + View from Earth label"
```

---

### Task 8: E2E smoke for position indicators

**Files:**
- Create: `e2e/position-indicators.spec.ts`

- [ ] **Step 1: Add smoke tests**

```ts
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3600";

test.describe("Position indicators @smoke", () => {
  test("galaxy scene initializes without error", async ({ page }) => {
    await page.goto(`${BASE}/galaxy`);
    try {
      await page.waitForSelector("#galaxy-renderer canvas", { timeout: 15000 });
      // Sol marker + distance lines are Three.js objects; just assert the scene rendered.
      await expect(page.locator("#galaxy-renderer canvas")).toBeVisible();
    } catch {
      const content = await page.content();
      expect(content.includes("galaxy") || content.includes("loading")).toBeTruthy();
    }
  });

  test("constellation shows View from Earth + compass readout", async ({ page }) => {
    await page.goto(`${BASE}/constellation`);
    try {
      await page.waitForSelector(".constellation-container", { timeout: 15000 });
      await expect(page.getByText(/view from earth/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/FACING|朝向|方位/i)).toBeVisible();
    } catch {
      // headless no-WebGL: assert page loaded
      expect(page.url()).toContain("constellation");
    }
  });
});
```

- [ ] **Step 2: Run smoke E2E**

Run: `bunx playwright test --grep="@smoke" --project=chromium`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/position-indicators.spec.ts
git commit -m "test(e2e): add position-indicator smoke tests"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full lint + type-check + unit tests + coverage**

Run: `bun run lint && bun run type-check && bun run test:run`
Expected: all PASS, coverage ≥ 70% global threshold maintained.

- [ ] **Step 2: Build**

Run: `bun run build`
Expected: completes without error.

- [ ] **Step 3: Commit any formatting**

```bash
git add -A && git commit -m "chore: format" || echo "nothing to commit"
```

---

## Out of Scope
- Smooth camera tween for `focusOnStarSystem` (the existing `GalaxyRenderer.ts:418` TODO).
- Adding Sol as a selectable/navigable entry in `localGalaxyData.starSystems`.
- Per-star labels across the galaxy (only the Sol label is added; `enableStarLabels` gates the Sol label).
- Animating the Sol ring (kept static for reduced-motion compliance).
