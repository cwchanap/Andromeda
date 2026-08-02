import type { Constellation, Star } from "@/types/constellation";
import type { CoordinateTransformError } from "@/lib/astronomy/observerTransform";

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
