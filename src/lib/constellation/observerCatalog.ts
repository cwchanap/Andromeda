import type { Constellation, Star } from "@/types/constellation";
import {
    cartesianToEquatorial,
    subtractObserverPosition,
    transformToObserver,
    type CartesianLightYears,
    type CoordinateTransformError,
    type EquatorialPosition,
    type TransformResult,
} from "@/lib/astronomy/observerTransform";

export const SYNTHETIC_SOL_STAR_ID = "sol" as const;
export const SYNTHETIC_SOL_RENDER_MAGNITUDE = 0;
export const SYNTHETIC_SOL_COLOR = "#FFF4E8";

export interface ObserverCatalogOptions {
    readonly includeReferenceCatalog?: boolean;
    readonly observerSourceStarIds?: readonly string[];
}

export interface SyntheticSolMarker {
    readonly kind: "synthetic-sol";
}

export type PreparedSourceStar = Readonly<Star> & {
    readonly marker?: undefined;
};

export type SyntheticSolStar = Readonly<Star> & {
    readonly id: typeof SYNTHETIC_SOL_STAR_ID;
    readonly marker: SyntheticSolMarker;
};

export type PreparedCatalogStar = PreparedSourceStar | SyntheticSolStar;

export type PreparedConstellation = Readonly<
    Omit<Constellation, "stars" | "lines" | "visibility">
> & {
    readonly stars: readonly PreparedSourceStar[];
    readonly lines: readonly (readonly [number, number])[];
    readonly visibility: Readonly<
        Omit<Constellation["visibility"], "bestMonths">
    > & {
        readonly bestMonths: readonly number[];
    };
};

export interface PreparedConstellationCatalog {
    readonly stars: readonly PreparedCatalogStar[];
    readonly constellations: readonly PreparedConstellation[];
}

export type CatalogStarOmissionReason =
    | { readonly code: "observer-source-star-excluded" }
    | {
          readonly code: "coordinate-transform-failed";
          readonly error: CoordinateTransformError;
      }
    | {
          readonly code: "non-finite-metadata";
          readonly field: "magnitude";
      };

export interface OmittedStarMembership {
    readonly constellationId: string;
    readonly originalStarIndex: number;
}

export interface OmittedStarDiagnostic {
    readonly starId: string;
    readonly starName: string;
    readonly memberships: readonly OmittedStarMembership[];
    readonly reason: CatalogStarOmissionReason;
    readonly referenceDisposition: "retained" | "omitted";
}

export interface CatalogTransformOutput {
    readonly transformedCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly omittedStars: readonly OmittedStarDiagnostic[];
}

export interface AlternateObserverCatalogOutput {
    readonly primaryCatalog: PreparedConstellationCatalog;
    readonly referenceCatalog?: PreparedConstellationCatalog;
    readonly omittedStars: readonly OmittedStarDiagnostic[];
}

export type AlternateObserverCatalogPreparationResult =
    | { readonly ok: true; readonly value: AlternateObserverCatalogOutput }
    | {
          readonly ok: false;
          readonly error: {
              readonly code: "synthetic-sol-unavailable";
              readonly cause: CoordinateTransformError;
          };
      };

export function isSyntheticSolStar(
    star: PreparedCatalogStar,
): star is SyntheticSolStar {
    return star.marker?.kind === "synthetic-sol";
}

interface CanonicalStarEntry {
    readonly source: Star;
    readonly memberships: OmittedStarMembership[];
}

interface CanonicalIndex {
    readonly order: readonly string[];
    readonly byId: ReadonlyMap<string, CanonicalStarEntry>;
}

function collectCanonicalStars(
    sourceConstellations: readonly Constellation[],
): CanonicalIndex {
    const order: string[] = [];
    const byId = new Map<string, CanonicalStarEntry>();

    for (const constellation of sourceConstellations) {
        constellation.stars.forEach((source, originalStarIndex) => {
            const membership = {
                constellationId: constellation.id,
                originalStarIndex,
            };
            const existing = byId.get(source.id);
            if (existing) {
                existing.memberships.push(membership);
                return;
            }
            order.push(source.id);
            byId.set(source.id, { source, memberships: [membership] });
        });
    }

    return { order, byId };
}

function toEquatorialPosition(source: Star): EquatorialPosition {
    return {
        rightAscensionHours: source.rightAscension,
        declinationDegrees: source.declination,
        distanceLightYears: source.distance,
    };
}

const SOL_ORIGIN: CartesianLightYears = { x: 0, y: 0, z: 0 };

// `Star` does not declare `marker`, but runtime/deserialized inputs may carry
// the reserved synthetic-Sol marker. Stripping it here restores the
// `PreparedSourceStar` invariant (`marker?: undefined`) so an ordinary catalog
// star cannot be misclassified by `isSyntheticSolStar`.
function cloneSourceStar(source: Star): PreparedSourceStar {
    const { marker: _omittedMarker, ...rest } = source as Star & {
        marker?: unknown;
    };
    void _omittedMarker;
    return rest;
}

function cloneTransformedStar(
    source: Star,
    equatorial: EquatorialPosition,
): PreparedSourceStar {
    const { marker: _omittedMarker, ...rest } = source as Star & {
        marker?: unknown;
    };
    void _omittedMarker;
    return {
        ...rest,
        rightAscension: equatorial.rightAscensionHours,
        declination: equatorial.declinationDegrees,
        distance: equatorial.distanceLightYears,
    };
}

function cloneVisibility(
    visibility: Constellation["visibility"],
): PreparedConstellation["visibility"] {
    return {
        ...visibility,
        bestMonths: [...visibility.bestMonths],
    };
}

function isFiniteVisibility(visibility: Constellation["visibility"]): boolean {
    return (
        Number.isFinite(visibility.minLatitude) &&
        Number.isFinite(visibility.maxLatitude) &&
        visibility.bestMonths.every((month) => Number.isFinite(month))
    );
}

function isUsableSourceLine(
    line: readonly number[],
    sourceStarCount: number,
): line is readonly [number, number] {
    if (line.length !== 2) return false;
    const [start, end] = line;
    return (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end >= 0 &&
        start < sourceStarCount &&
        end < sourceStarCount
    );
}

function buildPreparedCatalog(
    sourceConstellations: readonly Constellation[],
    canonicalOrder: readonly string[],
    preparedById: ReadonlyMap<string, PreparedSourceStar>,
): PreparedConstellationCatalog {
    return {
        stars: canonicalOrder.flatMap((id) => {
            const star = preparedById.get(id);
            return star ? [star] : [];
        }),
        constellations: sourceConstellations.flatMap((source) => {
            // Constellation-level metadata failure: drop the constellation so
            // its non-finite visibility cannot reach the JSON-safe output
            // (Section 13). Its stars remain valid and may appear in the
            // top-level stars array and in other constellations.
            if (!isFiniteVisibility(source.visibility)) return [];

            const stars: PreparedSourceStar[] = [];
            const oldToNew = new Map<number, number>();

            source.stars.forEach((sourceStar, oldIndex) => {
                const prepared = preparedById.get(sourceStar.id);
                if (!prepared) return;
                oldToNew.set(oldIndex, stars.length);
                stars.push(prepared);
            });

            const lines: (readonly [number, number])[] = [];
            for (const sourceLine of source.lines) {
                if (!isUsableSourceLine(sourceLine, source.stars.length)) {
                    continue;
                }
                const [oldStart, oldEnd] = sourceLine;
                const newStart = oldToNew.get(oldStart);
                const newEnd = oldToNew.get(oldEnd);
                if (newStart === undefined || newEnd === undefined) continue;
                lines.push([newStart, newEnd]);
            }

            return [
                {
                    ...source,
                    stars,
                    lines,
                    visibility: cloneVisibility(source.visibility),
                },
            ];
        }),
    };
}

export function transformCatalogToObserver(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options: ObserverCatalogOptions = {},
): CatalogTransformOutput {
    const canonical = collectCanonicalStars(sourceConstellations);
    const transformedById = new Map<string, PreparedSourceStar>();
    const referenceById = new Map<string, PreparedSourceStar>();
    const omittedStars: OmittedStarDiagnostic[] = [];

    const excludedIds = new Set(options.observerSourceStarIds ?? []);

    for (const id of canonical.order) {
        const entry = canonical.byId.get(id)!;

        if (!Number.isFinite(entry.source.magnitude)) {
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: { code: "non-finite-metadata", field: "magnitude" },
                referenceDisposition: "omitted",
            });
            continue;
        }

        if (excludedIds.has(id)) {
            // Validate source coordinates via an identity transform from the
            // Sol origin. The resulting equatorial position (identity.value)
            // is intentionally discarded: the original source star is retained
            // verbatim in the reference catalog below, so only the ok/error
            // outcome matters here.
            const identity = transformToObserver(
                toEquatorialPosition(entry.source),
                SOL_ORIGIN,
            );
            if (!identity.ok) {
                omittedStars.push({
                    starId: id,
                    starName: entry.source.name,
                    memberships: [...entry.memberships],
                    reason: {
                        code: "coordinate-transform-failed",
                        error: identity.error,
                    },
                    referenceDisposition: "omitted",
                });
                continue;
            }

            if (options.includeReferenceCatalog) {
                referenceById.set(id, cloneSourceStar(entry.source));
            }
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: { code: "observer-source-star-excluded" },
                referenceDisposition: "retained",
            });
            continue;
        }

        const transformed = transformToObserver(
            toEquatorialPosition(entry.source),
            observerPosition,
        );
        if (!transformed.ok) {
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: {
                    code: "coordinate-transform-failed",
                    error: transformed.error,
                },
                referenceDisposition: "omitted",
            });
            continue;
        }

        transformedById.set(
            id,
            cloneTransformedStar(entry.source, transformed.value.equatorial),
        );
        if (options.includeReferenceCatalog) {
            referenceById.set(id, cloneSourceStar(entry.source));
        }
    }

    return {
        transformedCatalog: buildPreparedCatalog(
            sourceConstellations,
            canonical.order,
            transformedById,
        ),
        referenceCatalog: options.includeReferenceCatalog
            ? buildPreparedCatalog(
                  sourceConstellations,
                  canonical.order,
                  referenceById,
              )
            : undefined,
        omittedStars,
    };
}

export function createSyntheticSol(
    observerPosition: CartesianLightYears,
): TransformResult<SyntheticSolStar> {
    const relative = subtractObserverPosition(SOL_ORIGIN, observerPosition);
    if (!relative.ok) return relative;

    const equatorial = cartesianToEquatorial(relative.value);
    if (!equatorial.ok) return equatorial;

    return {
        ok: true,
        value: {
            id: SYNTHETIC_SOL_STAR_ID,
            name: "Sol",
            rightAscension: equatorial.value.rightAscensionHours,
            declination: equatorial.value.declinationDegrees,
            magnitude: SYNTHETIC_SOL_RENDER_MAGNITUDE,
            distance: equatorial.value.distanceLightYears,
            spectralClass: "G2V",
            color: SYNTHETIC_SOL_COLOR,
            marker: { kind: "synthetic-sol" },
        },
    };
}

/**
 * Builds an alternate-observer catalog by transforming `sourceConstellations`
 * for `observerPosition` and appending a synthetic Sol star.
 *
 * Caller obligation: source constellations must not contain a star whose id
 * equals {@link SYNTHETIC_SOL_STAR_ID} ("sol"). The synthetic Sol is appended
 * unconditionally, so a colliding source id would produce duplicate ids in
 * the primary catalog. This invariant is enforced at the data layer (see the
 * "reserves the synthetic Sol ID in production constellation members" test)
 * rather than by runtime validation here.
 */
export function prepareAlternateObserverCatalog(
    sourceConstellations: readonly Constellation[],
    observerPosition: CartesianLightYears,
    options: ObserverCatalogOptions = {},
): AlternateObserverCatalogPreparationResult {
    const syntheticSol = createSyntheticSol(observerPosition);
    if (!syntheticSol.ok) {
        return {
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: syntheticSol.error,
            },
        };
    }

    const transformed = transformCatalogToObserver(
        sourceConstellations,
        observerPosition,
        options,
    );

    return {
        ok: true,
        value: {
            primaryCatalog: {
                stars: [
                    ...transformed.transformedCatalog.stars,
                    syntheticSol.value,
                ],
                constellations: transformed.transformedCatalog.constellations,
            },
            referenceCatalog: transformed.referenceCatalog,
            omittedStars: transformed.omittedStars,
        },
    };
}
