import * as THREE from "three";
import { magnitudeToSize } from "@/utils/astronomy";
import type {
    RendererCatalog,
    RendererCatalogSettings,
    RendererStar,
} from "@/lib/constellation/rendererCatalog";
import type {
    CatalogPlacementContext,
    CatalogPlacementError,
} from "@/lib/constellation/rendererPlacement";
import { placeCatalogCoordinate } from "@/lib/constellation/rendererPlacement";

/**
 * Role-owned ordinary-star and constellation-line layer.
 *
 * A `ConstellationCatalogLayer` renders one role ("primary" or "reference")
 * of a prepared catalog into an independent `THREE.Group`. Point buffers are
 * built from the authoritative top-level `catalog.stars` (marker records are
 * skipped for Task 4), and constellation lines are built from each
 * constellation's local star array with role-independent defensive guards.
 * All attribute data is deterministic: star seeds come from a stable FNV-1a
 * hash over `${role}:${star.id}`, never `Math.random()`.
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
    readonly ordinaryStarPoints: THREE.Points | null;
    readonly renderedOrdinaryStars: readonly RendererStar[];
    readonly lineHitObjects: readonly THREE.Object3D[];
    readonly markerHitObjects: readonly THREE.Object3D[];

    private readonly role: CatalogLayerRole;
    private readonly pointMaterials: readonly THREE.ShaderMaterial[];
    private readonly lineMaterials: readonly THREE.ShaderMaterial[];
    private readonly primaryLineMaterialsByConstellation: ReadonlyMap<
        string,
        THREE.ShaderMaterial
    >;
    private readonly positionsByStarId: ReadonlyMap<string, THREE.Vector3>;
    private labelsVisible: boolean;

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
        const positionsByStarId = new Map<string, THREE.Vector3>();

        for (const star of catalog.stars) {
            // Marker records are partitioned out here so Task 4 can own them
            // as separate hit objects; ordinary buffers never contain them.
            if (star.marker !== undefined) {
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
            positionsByStarId.set(star.id, new THREE.Vector3(x, y, z));
        }

        this.renderedOrdinaryStars = renderedStars;
        this.positionsByStarId = positionsByStarId;

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
        this.ordinaryStarPoints = ordinaryStarPoints;
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

        this.lineHitObjects = lineHitObjects;
        this.lineMaterials = lineMaterials;
        this.primaryLineMaterialsByConstellation =
            primaryLineMaterialsByConstellation;

        // Task 4 owns markers and labels; nothing to hit-test yet.
        this.markerHitObjects = [];
    }

    setVisible(visible: boolean): void {
        this.root.visible = visible;
    }

    setLabelsVisible(visible: boolean): void {
        // Labels are owned by Task 4; keep the requested visibility state so
        // label creation can honor it.
        this.labelsVisible = visible;
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
        // Geometry/material disposal, markers, and labels are owned by Task 4.
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
}
