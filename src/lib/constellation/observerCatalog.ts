import type { Constellation, Star } from "@/types/constellation";
import {
    transformToObserver,
    type CartesianLightYears,
    type CoordinateTransformError,
    type EquatorialPosition,
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

function cloneSourceStar(source: Star): PreparedSourceStar {
    return { ...source };
}

function cloneTransformedStar(
    source: Star,
    equatorial: EquatorialPosition,
): PreparedSourceStar {
    return {
        ...source,
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
        constellations: sourceConstellations.map((source) => {
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

            return {
                ...source,
                stars,
                lines,
                visibility: cloneVisibility(source.visibility),
            };
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

    for (const id of canonical.order) {
        const entry = canonical.byId.get(id)!;
        const result = transformToObserver(
            toEquatorialPosition(entry.source),
            observerPosition,
        );
        if (!result.ok) {
            omittedStars.push({
                starId: id,
                starName: entry.source.name,
                memberships: [...entry.memberships],
                reason: {
                    code: "coordinate-transform-failed",
                    error: result.error,
                },
                referenceDisposition: "omitted",
            });
            continue;
        }

        transformedById.set(
            id,
            cloneTransformedStar(entry.source, result.value.equatorial),
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
