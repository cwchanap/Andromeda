import * as THREE from "three";
import { magnitudeToSize } from "@/utils/astronomy";
import type {
    RendererCatalog,
    RendererCatalogSettings,
    RendererConstellation,
    RendererStar,
} from "@/lib/constellation/rendererCatalog";
import type {
    CatalogPlacementContext,
    CatalogPlacementError,
} from "@/lib/constellation/rendererPlacement";
import { placeCatalogCoordinate } from "@/lib/constellation/rendererPlacement";

/**
 * Role-owned ordinary-star, constellation-line, marker, and label layer.
 *
 * A `ConstellationCatalogLayer` renders one role ("primary" or "reference")
 * of a prepared catalog into an independent `THREE.Group`. Point buffers are
 * built from the authoritative top-level `catalog.stars`; marker records are
 * partitioned out *before* ordinary magnitude culling so a synthetic Sol
 * marker renders even when its magnitude would be rejected (identified only
 * via `marker?.kind === "synthetic-sol"`, never the id). Constellation lines
 * are built from each constellation's local star array with role-independent
 * defensive guards. All attribute data is deterministic: star seeds come from
 * a stable FNV-1a hash over `${role}:${star.id}`, never `Math.random()`.
 *
 * The primary role owns the synthetic-Sol marker shape (always visible) and
 * lazily creates star/constellation/Sol text labels on the first
 * `setLabelsVisible(true)`; the reference role is comparison-only and creates
 * no marker or label resources. `dispose()` releases every created resource
 * exactly once and is idempotent.
 */

export type CatalogLayerRole = "primary" | "reference";

export interface RendererSkipWarningContext {
    readonly role: CatalogLayerRole;
    readonly objectKind:
        | "top-level-star"
        | "constellation-star"
        | "constellation-line"
        | "marker";
    readonly starId?: string;
    readonly constellationId?: string;
    readonly lineIndex?: number;
    readonly error?: CatalogPlacementError;
}

export interface CatalogLayerBuildOptions {
    readonly role: CatalogLayerRole;
    readonly catalog: RendererCatalog;
    readonly placementContext: CatalogPlacementContext;
    readonly settings: Readonly<RendererCatalogSettings>;
    readonly warn?: (context: RendererSkipWarningContext) => void;
}

/** Immutable input cached at build time for one lazily-created star label. */
interface LabeledStarInput {
    readonly star: RendererStar;
    readonly position: THREE.Vector3;
}

/** Immutable input cached at build time for one lazily-created constellation label. */
interface LabeledConstellationInput {
    readonly constellation: RendererConstellation;
    readonly position: THREE.Vector3;
}

const REFERENCE_STAR_OPACITY = 0.35;
const REFERENCE_STAR_RING_INNER_RADIUS = 0.28;
const REFERENCE_STAR_RING_OUTER_RADIUS = 0.48;
const REFERENCE_LINE_OPACITY = 0.28;
const REFERENCE_LINE_DASH_PERIOD_WORLD = 6;
const REFERENCE_LINE_DASH_DUTY_CYCLE = 0.45;

const REFERENCE_LINE_RADIUS = 97;
const REFERENCE_STAR_RADIUS = 99;
const PRIMARY_LINE_RADIUS = 98;
const PRIMARY_STAR_RADIUS = 100;

const SYNTHETIC_SOL_MARKER_SCALE = 6;
const SYNTHETIC_SOL_MARKER_RADIUS = 101;
const SYNTHETIC_SOL_MARKER_RENDER_ORDER = 5;
const PRIMARY_STAR_LABEL_RADIUS = 105;
const PRIMARY_STAR_LABEL_RENDER_ORDER = 6;
const PRIMARY_CONSTELLATION_LABEL_RADIUS = 110;
const PRIMARY_CONSTELLATION_LABEL_RENDER_ORDER = 7;

const REFERENCE_LINE_RENDER_ORDER = 1;
const REFERENCE_STAR_RENDER_ORDER = 2;
const PRIMARY_STAR_RENDER_ORDER = 3;
const PRIMARY_LINE_RENDER_ORDER = 4;

const STAR_POINT_VERTEX_SHADER = `
    attribute float size;
    attribute float aSeed;
    varying vec3 vColor;
    varying float vSeed;
    uniform float uPixelRatio;
    void main() {
        vColor = color;
        vSeed = aSeed;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = size * 4.0 * uPixelRatio;
    }
`;

// Preserves the existing primary star shader (twinkling smoothstep disc).
const PRIMARY_STAR_POINT_FRAGMENT_SHADER = `
    uniform float uTime;
    varying vec3 vColor;
    varying float vSeed;
    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.1, d);
        float twinkle = 1.0 + 0.35 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 6.28318);
        vec3 col = vColor * twinkle;
        gl_FragColor = vec4(col, alpha);
    }
`;

// Reference stars render as hollow rings: keep the gl_PointCoord band
// between the inner and outer ring radii, discard everything outside it.
const REFERENCE_STAR_POINT_FRAGMENT_SHADER = `
    uniform float uTime;
    varying vec3 vColor;
    varying float vSeed;
    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        float ring = smoothstep(
            ${REFERENCE_STAR_RING_OUTER_RADIUS} + 0.03,
            ${REFERENCE_STAR_RING_OUTER_RADIUS},
            d,
        ) * smoothstep(
            ${REFERENCE_STAR_RING_INNER_RADIUS} - 0.03,
            ${REFERENCE_STAR_RING_INNER_RADIUS},
            d,
        );
        if (ring <= 0.001) discard;
        float twinkle = 1.0 + 0.35 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 6.28318);
        vec3 col = vColor * twinkle;
        gl_FragColor = vec4(col, ring * ${REFERENCE_STAR_OPACITY});
    }
`;

const PRIMARY_LINE_VERTEX_SHADER = `
    attribute float aLineProgress;
    varying float vProgress;
    void main() {
        vProgress = aLineProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Preserves the existing primary line shader (selection/dimming uniforms).
const PRIMARY_LINE_FRAGMENT_SHADER = `
    uniform float uTime;
    uniform float uIsSelected;
    uniform float uIsDimmed;
    uniform vec3 uColorIdle;
    uniform vec3 uColorHot;
    varying float vProgress;
    void main() {
        // Energy pulse: a hot stripe rides along the segment.
        float pulse = fract(vProgress * 3.0 - uTime * 0.4);
        float pulseIntensity = smoothstep(0.85, 1.0, pulse) * (uIsSelected > 0.5 ? 1.0 : 0.35);
        vec3 base = mix(uColorIdle, uColorHot, uIsSelected);
        vec3 col = base + uColorHot * pulseIntensity;
        float alpha = uIsDimmed > 0.5 ? 0.18 : (uIsSelected > 0.5 ? 1.0 : 0.5);
        gl_FragColor = vec4(col, alpha);
    }
`;

const REFERENCE_LINE_VERTEX_SHADER = `
    attribute float aSegmentDistance;
    varying float vSegmentDistance;
    void main() {
        vSegmentDistance = aSegmentDistance;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Reference lines are dashed in world space: the dash phase is derived from
// the rendered segment distance, so short and long segments share one period.
const REFERENCE_LINE_FRAGMENT_SHADER = `
    uniform float uDashPeriodWorld;
    uniform float uDashDutyCycle;
    uniform vec3 uColorIdle;
    varying float vSegmentDistance;
    void main() {
        float phase = fract(vSegmentDistance / uDashPeriodWorld);
        if (phase > uDashDutyCycle) discard;
        gl_FragColor = vec4(uColorIdle, ${REFERENCE_LINE_OPACITY});
    }
`;

/**
 * Stable 32-bit FNV-1a hash normalized to [0, 1). Derives per-star shader
 * seeds so repeated catalog builds produce identical attributes without any
 * `Math.random()` calls.
 */
function fnv1a(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) / 0x100000000;
}

export class ConstellationCatalogLayer {
    readonly root: THREE.Group;

    private pointsInternal: THREE.Points | null = null;
    private renderedStarsInternal: RendererStar[] = [];
    private lineHitObjectsInternal: THREE.Object3D[] = [];
    private markerHitObjectsInternal: THREE.Object3D[] = [];
    private labelStarInputs: LabeledStarInput[] = [];
    private constellationLabelInputs: LabeledConstellationInput[] = [];
    private solLabelInput: LabeledStarInput | null = null;

    get ordinaryStarPoints(): THREE.Points | null {
        return this.pointsInternal;
    }

    get renderedOrdinaryStars(): readonly RendererStar[] {
        return this.renderedStarsInternal;
    }

    get lineHitObjects(): readonly THREE.Object3D[] {
        return this.lineHitObjectsInternal;
    }

    get markerHitObjects(): readonly THREE.Object3D[] {
        return this.markerHitObjectsInternal;
    }

    private readonly role: CatalogLayerRole;
    private readonly pointMaterials: readonly THREE.ShaderMaterial[];
    private readonly lineMaterials: readonly THREE.ShaderMaterial[];
    private readonly primaryLineMaterialsByConstellation: ReadonlyMap<
        string,
        THREE.ShaderMaterial
    >;
    private readonly positionsByStarId: Map<string, THREE.Vector3>;
    private labelsVisible: boolean;
    private starLabelGroup: THREE.Group | null = null;
    private constellationLabelGroup: THREE.Group | null = null;
    private solLabelGroup: THREE.Group | null = null;
    private disposed = false;

    constructor(options: CatalogLayerBuildOptions) {
        const { role, catalog, placementContext, settings, warn } = options;

        this.role = role;
        this.root = new THREE.Group();
        this.root.name = `constellation-catalog-${role}`;
        this.labelsVisible = true;

        const starRadius =
            role === "primary" ? PRIMARY_STAR_RADIUS : REFERENCE_STAR_RADIUS;

        const starPositions: number[] = [];
        const starColors: number[] = [];
        const starSizes: number[] = [];
        const starSeeds: number[] = [];
        const renderedStars: RendererStar[] = [];
        const labelStarInputs: LabeledStarInput[] = [];
        const positionsByStarId = new Map<string, THREE.Vector3>();
        const markerHitObjects: THREE.Object3D[] = [];
        let solLabelInput: LabeledStarInput | null = null;

        for (const star of catalog.stars) {
            // Marker records are partitioned out before magnitude filtering:
            // the primary role builds one synthetic-Sol marker group per
            // `marker?.kind === "synthetic-sol"` record (never inferred from
            // the id), while every other marker record is skipped with a
            // warning. Ordinary buffers never contain marker records.
            if (star.marker !== undefined) {
                if (
                    role === "primary" &&
                    star.marker.kind === "synthetic-sol"
                ) {
                    const markerPlacement = placeCatalogCoordinate(
                        star,
                        placementContext,
                        SYNTHETIC_SOL_MARKER_RADIUS,
                    );
                    if (!markerPlacement.ok) {
                        warn?.({
                            role,
                            objectKind: "marker",
                            starId: star.id,
                            error: markerPlacement.error,
                        });
                        continue;
                    }
                    const { x, y, z } = markerPlacement.position;
                    const markerPosition = new THREE.Vector3(x, y, z);
                    positionsByStarId.set(star.id, markerPosition);
                    markerHitObjects.push(
                        this.buildSyntheticSolMarker(star, markerPosition),
                    );
                    solLabelInput = { star, position: markerPosition };
                } else {
                    warn?.({ role, objectKind: "marker", starId: star.id });
                }
                continue;
            }
            if (star.magnitude > settings.minimumMagnitude) {
                continue;
            }
            const placement = placeCatalogCoordinate(
                star,
                placementContext,
                starRadius,
            );
            if (!placement.ok) {
                warn?.({
                    role,
                    objectKind: "top-level-star",
                    starId: star.id,
                    error: placement.error,
                });
                continue;
            }
            const { x, y, z } = placement.position;
            starPositions.push(x, y, z);

            const color = new THREE.Color(star.color);
            starColors.push(color.r, color.g, color.b);

            starSizes.push(magnitudeToSize(star.magnitude) * 3);

            starSeeds.push(fnv1a(`${role}:${star.id}`));

            renderedStars.push(star);
            const position = new THREE.Vector3(x, y, z);
            positionsByStarId.set(star.id, position);
            if (role === "primary") {
                // Star labels sit outside the star sphere at their own
                // radius; cache the accepted label position so label
                // creation never re-derives it.
                const labelPlacement = placeCatalogCoordinate(
                    star,
                    placementContext,
                    PRIMARY_STAR_LABEL_RADIUS,
                );
                if (labelPlacement.ok) {
                    const { x: lx, y: ly, z: lz } = labelPlacement.position;
                    labelStarInputs.push({
                        star,
                        position: new THREE.Vector3(lx, ly, lz),
                    });
                }
            }
        }

        this.renderedStarsInternal = renderedStars;
        this.labelStarInputs = labelStarInputs;
        this.positionsByStarId = positionsByStarId;
        this.markerHitObjectsInternal = markerHitObjects;
        this.solLabelInput = solLabelInput;

        let ordinaryStarPoints: THREE.Points | null = null;
        let pointMaterial: THREE.ShaderMaterial | null = null;
        if (starPositions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(starPositions, 3),
            );
            geometry.setAttribute(
                "color",
                new THREE.Float32BufferAttribute(starColors, 3),
            );
            geometry.setAttribute(
                "size",
                new THREE.Float32BufferAttribute(starSizes, 1),
            );
            geometry.setAttribute(
                "aSeed",
                new THREE.Float32BufferAttribute(starSeeds, 1),
            );

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uPixelRatio: {
                        value: Math.min(window.devicePixelRatio || 1, 2),
                    },
                },
                vertexShader: STAR_POINT_VERTEX_SHADER,
                fragmentShader:
                    role === "primary"
                        ? PRIMARY_STAR_POINT_FRAGMENT_SHADER
                        : REFERENCE_STAR_POINT_FRAGMENT_SHADER,
                vertexColors: true,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            pointMaterial = material;

            ordinaryStarPoints = new THREE.Points(geometry, material);
            ordinaryStarPoints.name =
                role === "primary" ? "stars" : "reference-stars";
            ordinaryStarPoints.renderOrder =
                role === "primary"
                    ? PRIMARY_STAR_RENDER_ORDER
                    : REFERENCE_STAR_RENDER_ORDER;
            this.root.add(ordinaryStarPoints);
        }
        this.pointsInternal = ordinaryStarPoints;
        this.pointMaterials = pointMaterial ? [pointMaterial] : [];

        const lineHitObjects: THREE.Object3D[] = [];
        const lineMaterials: THREE.ShaderMaterial[] = [];
        const primaryLineMaterialsByConstellation = new Map<
            string,
            THREE.ShaderMaterial
        >();

        if (settings.showConstellationLines) {
            const lineRadius =
                role === "primary"
                    ? PRIMARY_LINE_RADIUS
                    : REFERENCE_LINE_RADIUS;
            const lineDistanceAttributeName =
                role === "primary" ? "aLineProgress" : "aSegmentDistance";

            for (const constellation of catalog.constellations) {
                const linePositions: number[] = [];
                const lineDistances: number[] = [];

                for (
                    let lineIndex = 0;
                    lineIndex < constellation.lines.length;
                    lineIndex++
                ) {
                    const line = constellation.lines[lineIndex];
                    const warnInvalidLine = (): void => {
                        warn?.({
                            role,
                            objectKind: "constellation-line",
                            constellationId: constellation.id,
                            lineIndex,
                        });
                    };

                    // Role-independent defensive guards: malformed lines must
                    // be skipped before any endpoint dereference.
                    if (line.length !== 2) {
                        warnInvalidLine();
                        continue;
                    }

                    const [startIndex, endIndex] = line;
                    const startStar = Number.isInteger(startIndex)
                        ? constellation.stars[startIndex]
                        : undefined;
                    const endStar = Number.isInteger(endIndex)
                        ? constellation.stars[endIndex]
                        : undefined;

                    if (!startStar || !endStar) {
                        warnInvalidLine();
                        continue;
                    }

                    const startPlacement = placeCatalogCoordinate(
                        startStar,
                        placementContext,
                        lineRadius,
                    );
                    if (!startPlacement.ok) {
                        warn?.({
                            role,
                            objectKind: "constellation-line",
                            constellationId: constellation.id,
                            lineIndex,
                            starId: startStar.id,
                            error: startPlacement.error,
                        });
                        continue;
                    }
                    const endPlacement = placeCatalogCoordinate(
                        endStar,
                        placementContext,
                        lineRadius,
                    );
                    if (!endPlacement.ok) {
                        warn?.({
                            role,
                            objectKind: "constellation-line",
                            constellationId: constellation.id,
                            lineIndex,
                            starId: endStar.id,
                            error: endPlacement.error,
                        });
                        continue;
                    }

                    const start = startPlacement.position;
                    const end = endPlacement.position;
                    linePositions.push(
                        start.x,
                        start.y,
                        start.z,
                        end.x,
                        end.y,
                        end.z,
                    );

                    if (role === "primary") {
                        lineDistances.push(0, 1); // 0 at start, 1 at end
                    } else {
                        // Dash phase is computed from the rendered segment
                        // distance, so short and long segments share one
                        // world-space dash period.
                        const chordLength = Math.hypot(
                            end.x - start.x,
                            end.y - start.y,
                            end.z - start.z,
                        );
                        lineDistances.push(0, chordLength);
                    }
                }

                if (linePositions.length === 0) continue;

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(linePositions, 3),
                );
                geometry.setAttribute(
                    lineDistanceAttributeName,
                    new THREE.Float32BufferAttribute(lineDistances, 1),
                );

                const material = this.buildLineMaterial(role);
                lineMaterials.push(material);
                if (role === "primary") {
                    primaryLineMaterialsByConstellation.set(
                        constellation.id,
                        material,
                    );
                }

                const lines = new THREE.LineSegments(geometry, material);
                lines.name = `constellation-${constellation.id}`;
                lines.userData.constellationId = constellation.id;
                lines.renderOrder =
                    role === "primary"
                        ? PRIMARY_LINE_RENDER_ORDER
                        : REFERENCE_LINE_RENDER_ORDER;
                this.root.add(lines);
                lineHitObjects.push(lines);
            }
        }

        this.lineHitObjectsInternal = lineHitObjects;
        this.lineMaterials = lineMaterials;
        this.primaryLineMaterialsByConstellation =
            primaryLineMaterialsByConstellation;

        // Cache the immutable inputs for lazy primary labels. Constellation
        // label positions come from the circular mean of the local stars'
        // coordinates placed at the constellation label radius; constellations
        // with invalid local positions are skipped here and never create
        // labels. The reference role caches nothing.
        const constellationLabelInputs: LabeledConstellationInput[] = [];
        if (role === "primary") {
            for (const constellation of catalog.constellations) {
                const position = this.computeConstellationLabelPosition(
                    constellation,
                    placementContext,
                );
                if (!position) continue;
                constellationLabelInputs.push({ constellation, position });
            }
        }
        this.constellationLabelInputs = constellationLabelInputs;
    }

    setVisible(visible: boolean): void {
        this.root.visible = visible;
    }

    setLabelsVisible(visible: boolean): void {
        this.labelsVisible = visible;
        this.applyLabelsVisibility();
    }

    /**
     * Applies the stored label visibility to the primary text groups,
     * lazily creating each group on the first enable. The reference role is
     * comparison-only and never allocates text resources, and the marker
     * shape is untouched here (it stays visible regardless of label state).
     */
    private applyLabelsVisibility(): void {
        if (this.role !== "primary") return;

        if (!this.labelsVisible) {
            // Hide only the text groups; the marker shape stays visible.
            if (this.starLabelGroup) this.starLabelGroup.visible = false;
            if (this.constellationLabelGroup)
                this.constellationLabelGroup.visible = false;
            if (this.solLabelGroup) this.solLabelGroup.visible = false;
            return;
        }

        // Lazily create each group on the first enable; later toggles reuse
        // the same groups and only flip visibility.
        this.starLabelGroup ??= this.buildStarLabelGroup();
        this.constellationLabelGroup ??= this.buildConstellationLabelGroup();
        this.solLabelGroup ??= this.buildSolLabelGroup();
        if (this.starLabelGroup) this.starLabelGroup.visible = true;
        if (this.constellationLabelGroup)
            this.constellationLabelGroup.visible = true;
        if (this.solLabelGroup) this.solLabelGroup.visible = true;
    }

    setSelectedConstellation(id: string | null): void {
        // Selection/dimming is a primary-role concept; reference lines have
        // no selection uniforms, so this is a no-op for the reference role.
        if (this.role !== "primary") return;
        for (const [constellationId, material] of this
            .primaryLineMaterialsByConstellation) {
            const isThisOne = constellationId === id;
            material.uniforms.uIsSelected.value = isThisOne ? 1 : 0;
            material.uniforms.uIsDimmed.value = id && !isThisOne ? 1 : 0;
        }
    }

    getWorldPosition(id: string): THREE.Vector3 | null {
        const position = this.positionsByStarId.get(id);
        return position ? position.clone() : null;
    }

    tick(deltaSeconds: number): void {
        for (const material of this.pointMaterials) {
            material.uniforms.uTime.value += deltaSeconds;
        }
        for (const material of this.lineMaterials) {
            if (material.uniforms.uTime) {
                material.uniforms.uTime.value += deltaSeconds;
            }
        }
    }

    dispose(): void {
        // Idempotent: a second dispose() releases nothing and resets nothing.
        if (this.disposed) return;
        this.disposed = true;

        if (this.pointsInternal) {
            this.pointsInternal.geometry.dispose();
            (this.pointsInternal.material as { dispose: () => void }).dispose();
        }

        for (const line of this.lineHitObjectsInternal) {
            const lineSegments = line as THREE.LineSegments;
            this.disposeGeometry(lineSegments.geometry);
            (lineSegments.material as { dispose: () => void }).dispose();
        }

        // Marker groups own their reticle mesh and ray line segments.
        for (const marker of this.markerHitObjectsInternal) {
            this.disposeObjectTree(marker);
        }

        this.disposeLabelGroup(this.starLabelGroup);
        this.disposeLabelGroup(this.constellationLabelGroup);
        this.disposeLabelGroup(this.solLabelGroup);
        this.starLabelGroup = null;
        this.constellationLabelGroup = null;
        this.solLabelGroup = null;

        // Drop cached lazy-label inputs, hit arrays, point lookup, and
        // position maps so the disposed layer is inert.
        this.labelStarInputs.length = 0;
        this.constellationLabelInputs.length = 0;
        this.solLabelInput = null;
        this.lineHitObjectsInternal.length = 0;
        this.markerHitObjectsInternal.length = 0;
        this.renderedStarsInternal.length = 0;
        this.positionsByStarId.clear();

        this.root.removeFromParent();
    }

    private buildLineMaterial(role: CatalogLayerRole): THREE.ShaderMaterial {
        if (role === "primary") {
            return new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uIsSelected: { value: 0 },
                    uIsDimmed: { value: 0 },
                    uColorIdle: { value: new THREE.Color(0x1b6b7a) },
                    uColorHot: { value: new THREE.Color(0x00f0ff) },
                },
                vertexShader: PRIMARY_LINE_VERTEX_SHADER,
                fragmentShader: PRIMARY_LINE_FRAGMENT_SHADER,
                transparent: true,
                depthWrite: false,
            });
        }
        return new THREE.ShaderMaterial({
            uniforms: {
                uDashPeriodWorld: { value: REFERENCE_LINE_DASH_PERIOD_WORLD },
                uDashDutyCycle: { value: REFERENCE_LINE_DASH_DUTY_CYCLE },
                uColorIdle: { value: new THREE.Color(0x1b6b7a) },
            },
            vertexShader: REFERENCE_LINE_VERTEX_SHADER,
            fragmentShader: REFERENCE_LINE_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
        });
    }

    /**
     * Builds the synthetic-Sol marker: a group holding a ring/reticle mesh
     * and radial crosshair rays, placed at {@link SYNTHETIC_SOL_MARKER_RADIUS}
     * and scaled by {@link SYNTHETIC_SOL_MARKER_SCALE}. The group is the
     * marker hit object and carries the `{ role, starId, star }` userData;
     * its shape stays visible regardless of label visibility.
     */
    private buildSyntheticSolMarker(
        star: RendererStar,
        position: THREE.Vector3,
    ): THREE.Group {
        const group = new THREE.Group();
        group.name = `marker-${star.id}`;
        group.position.set(position.x, position.y, position.z);
        group.scale.setScalar(SYNTHETIC_SOL_MARKER_SCALE);
        group.renderOrder = SYNTHETIC_SOL_MARKER_RENDER_ORDER;
        group.userData = { role: "primary", starId: star.id, star };

        const reticleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(star.color),
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.85, 1.15, 64),
            reticleMaterial,
        );
        reticle.name = "reticle";
        group.add(reticle);

        // Radial rays: two crossing arms in the reticle plane.
        const rayRadius = 2;
        const rayMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(star.color),
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
        });
        const rayGeometry = new THREE.BufferGeometry();
        rayGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                [
                    -rayRadius,
                    0,
                    0,
                    rayRadius,
                    0,
                    0,
                    0,
                    -rayRadius,
                    0,
                    0,
                    rayRadius,
                    0,
                ],
                3,
            ),
        );
        const rays = new THREE.LineSegments(rayGeometry, rayMaterial);
        rays.name = "rays";
        group.add(rays);

        this.root.add(group);
        return group;
    }

    /**
     * Computes a constellation's label position as the circular-mean
     * (right ascension) and arithmetic-mean (declination) of its local stars,
     * placed at {@link PRIMARY_CONSTELLATION_LABEL_RADIUS}. Returns null for
     * constellations whose local positions are invalid (no stars, or
     * non-finite/out-of-range coordinates) so they never create labels.
     */
    private computeConstellationLabelPosition(
        constellation: RendererConstellation,
        placementContext: CatalogPlacementContext,
    ): THREE.Vector3 | null {
        if (constellation.stars.length === 0) return null;

        let sinSum = 0;
        let cosSum = 0;
        let avgDec = 0;
        for (const star of constellation.stars) {
            const rad = (star.rightAscension / 24) * 2 * Math.PI;
            sinSum += Math.sin(rad);
            cosSum += Math.cos(rad);
            avgDec += star.declination;
        }
        const avgRA =
            ((Math.atan2(sinSum, cosSum) / (2 * Math.PI) + 1) % 1) * 24;
        avgDec /= constellation.stars.length;

        const placement = placeCatalogCoordinate(
            { rightAscension: avgRA, declination: avgDec },
            placementContext,
            PRIMARY_CONSTELLATION_LABEL_RADIUS,
        );
        if (!placement.ok) return null;
        const { x, y, z } = placement.position;
        return new THREE.Vector3(x, y, z);
    }

    private buildStarLabelGroup(): THREE.Group | null {
        if (this.labelStarInputs.length === 0) return null;
        const group = new THREE.Group();
        group.name = "star-labels";
        for (const { star, position } of this.labelStarInputs) {
            group.add(
                this.makeStarLabelSprite(star, position, `label-${star.id}`),
            );
        }
        this.root.add(group);
        return group;
    }

    private buildConstellationLabelGroup(): THREE.Group | null {
        if (this.constellationLabelInputs.length === 0) return null;
        const group = new THREE.Group();
        group.name = "constellation-labels";
        for (const { constellation, position } of this
            .constellationLabelInputs) {
            group.add(
                this.makeConstellationLabelSprite(constellation, position),
            );
        }
        this.root.add(group);
        return group;
    }

    private buildSolLabelGroup(): THREE.Group | null {
        if (!this.solLabelInput) return null;
        const group = new THREE.Group();
        group.name = "marker-labels";
        const { star, position } = this.solLabelInput;
        group.add(
            this.makeStarLabelSprite(star, position, `marker-label-${star.id}`),
        );
        this.root.add(group);
        return group;
    }

    /**
     * Mirrors the renderer's star-label idiom (canvas -> CanvasTexture ->
     * SpriteMaterial -> Sprite). The sprite name does not drive any behavior:
     * the marker text is identified by its group, not by the id.
     */
    private makeStarLabelSprite(
        star: RendererStar,
        position: THREE.Vector3,
        name: string,
    ): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.width = 256;
        canvas.height = 64;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "bold 20px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = "#4488cc";
        context.shadowBlur = 4;
        context.fillText(star.name, 128, 32);

        return this.finishLabelSprite(canvas, position, {
            scaleX: 8,
            scaleY: 2,
            renderOrder: PRIMARY_STAR_LABEL_RENDER_ORDER,
            name,
        });
    }

    /**
     * Mirrors the renderer's constellation-label idiom: bold cyan name with a
     * green abbreviation line beneath it.
     */
    private makeConstellationLabelSprite(
        constellation: RendererConstellation,
        position: THREE.Vector3,
    ): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.width = 512;
        canvas.height = 128;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#4FC3F7";
        context.font = "bold 48px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = "#4FC3F7";
        context.shadowBlur = 12;
        context.fillText(constellation.name, 256, 48);

        context.font = "32px Arial, sans-serif";
        context.fillStyle = "#81C784";
        context.shadowBlur = 8;
        context.fillText(`(${constellation.abbreviation})`, 256, 90);

        return this.finishLabelSprite(canvas, position, {
            scaleX: 20,
            scaleY: 5,
            renderOrder: PRIMARY_CONSTELLATION_LABEL_RENDER_ORDER,
            name: `label-${constellation.id}`,
        });
    }

    private finishLabelSprite(
        canvas: HTMLCanvasElement,
        position: THREE.Vector3,
        options: {
            readonly scaleX: number;
            readonly scaleY: number;
            readonly renderOrder: number;
            readonly name: string;
        },
    ): THREE.Sprite {
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(position.x, position.y, position.z);
        sprite.scale.set(options.scaleX, options.scaleY, 1);
        sprite.renderOrder = options.renderOrder;
        sprite.name = options.name;
        return sprite;
    }

    /**
     * Disposes a geometry and its attributes (including the line distance
     * attributes). Attribute dispose is guarded because the test mock's
     * attributes do not implement it.
     */
    private disposeGeometry(geometry: THREE.BufferGeometry): void {
        // Real BufferGeometry always owns an attributes object; the test mock
        // for RingGeometry does not, so guard before walking it. The
        // installed three types do not model attribute.dispose(), so the
        // optional method is accessed through a local shape.
        if (geometry.attributes) {
            for (const attribute of Object.values(geometry.attributes)) {
                const withDispose = attribute as { dispose?: () => void };
                if (typeof withDispose.dispose === "function") {
                    withDispose.dispose();
                }
            }
        }
        geometry.dispose();
    }

    private disposeObjectTree(object: THREE.Object3D): void {
        const withResources = object as Partial<THREE.Mesh> &
            Partial<THREE.LineSegments>;
        if (withResources.geometry) {
            this.disposeGeometry(
                withResources.geometry as THREE.BufferGeometry,
            );
        }
        if (withResources.material) {
            (withResources.material as { dispose: () => void }).dispose();
        }
        // Real Object3D always owns a children array; the test mock for
        // LineSegments does not, so default defensively.
        for (const child of object.children ?? []) {
            this.disposeObjectTree(child);
        }
    }

    private disposeLabelGroup(group: THREE.Group | null): void {
        if (!group) return;
        for (const child of group.children) {
            const sprite = child as THREE.Sprite;
            const material = sprite.material as THREE.SpriteMaterial;
            material.map?.dispose();
            material.dispose();
        }
    }
}
