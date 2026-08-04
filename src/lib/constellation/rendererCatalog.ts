import type {
    PreparedConstellationCatalog,
    SyntheticSolMarker,
} from "@/lib/constellation/observerCatalog";
import type { Constellation, Star } from "@/types/constellation";

/**
 * Renderer-facing catalog boundary.
 *
 * The renderer consumes read-only, tuple-typed catalogs produced by the
 * observer catalog preparation layer. `adaptPreparedCatalog` is a typed
 * identity seam: prepared catalogs already satisfy `RendererCatalog`
 * structurally, so the adapter is a pass-through that preserves star object
 * identity, marker objects, tuple line references, and the authoritative
 * top-level star order. `adaptLegacyCatalog` is the validating adapter for
 * legacy `number[][]`-lines constellations.
 */

export type RendererLine = readonly [number, number];

export interface RendererStar {
    readonly id: string;
    readonly name: string;
    readonly rightAscension: number;
    readonly declination: number;
    readonly magnitude: number;
    readonly distance: number;
    readonly spectralClass: string;
    readonly color: string;
    readonly marker?: SyntheticSolMarker;
}

export interface RendererConstellation {
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly description: string;
    readonly mythology?: string;
    readonly stars: readonly RendererStar[];
    readonly lines: readonly RendererLine[];
}

export interface RendererCatalog {
    readonly stars: readonly RendererStar[];
    readonly constellations: readonly RendererConstellation[];
}

export interface PreparedCatalogRenderSettings {
    readonly minimumMagnitude: number;
    readonly showConstellationLines: boolean;
    readonly showStarNames: boolean;
}

export type RendererCatalogSettings = PreparedCatalogRenderSettings;

export function adaptPreparedCatalog(
    catalog: PreparedConstellationCatalog,
): RendererCatalog {
    return catalog;
}

function isValidLegacyLine(
    line: unknown,
    starCount: number,
): line is RendererLine {
    // Array.isArray first so a deserialized runtime null/undefined is skipped
    // with a structured warning instead of throwing on .length — matches the
    // guard in ConstellationCatalogLayer's line-build path.
    if (!Array.isArray(line) || line.length !== 2) return false;
    const [start, end] = line;
    return (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end >= 0 &&
        start < starCount &&
        end < starCount
    );
}

export function adaptLegacyCatalog(
    stars: readonly Star[],
    constellations: readonly Constellation[],
): RendererCatalog {
    return {
        stars,
        constellations: constellations.map((constellation) => {
            const lines: RendererLine[] = [];
            for (const line of constellation.lines) {
                if (isValidLegacyLine(line, constellation.stars.length)) {
                    lines.push(line);
                }
            }
            return {
                id: constellation.id,
                name: constellation.name,
                abbreviation: constellation.abbreviation,
                description: constellation.description,
                mythology: constellation.mythology,
                stars: constellation.stars,
                lines,
            };
        }),
    };
}
