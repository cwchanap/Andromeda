import { radialToCartesian } from "@/lib/astronomy/observerTransform";
import type { RendererStar } from "@/lib/constellation/rendererCatalog";
import type { SkyConfiguration } from "@/types/constellation";
import { celestialToSphere } from "@/utils/astronomy";

/**
 * Typed placement of catalog coordinates into renderer space.
 *
 * `placeCatalogCoordinate` resolves a star's catalog coordinates
 * (right ascension in hours, declination in degrees) into a 3D position for
 * the renderer. Earth-horizontal placement delegates to the legacy
 * `celestialToSphere()` implementation (observer location + date are read
 * only from `skyConfig`); fixed-equatorial placement uses the shared
 * radial-to-Cartesian transform on the HPA-431 axes with no Earth
 * observation state at all.
 */

export type CatalogPlacementContext =
    | {
          readonly kind: "earth-horizontal";
          readonly skyConfig: Readonly<SkyConfiguration>;
      }
    | {
          readonly kind: "fixed-equatorial";
      };

export type CatalogPlacementError =
    | {
          readonly code: "non-finite-render-coordinate";
          readonly component: "rightAscension" | "declination";
      }
    | {
          readonly code: "declination-out-of-range";
          readonly declination: number;
      };

export type CatalogPlacementResult =
    | {
          readonly ok: true;
          readonly position: {
              readonly x: number;
              readonly y: number;
              readonly z: number;
          };
      }
    | {
          readonly ok: false;
          readonly error: CatalogPlacementError;
      };

export function placeCatalogCoordinate(
    star: Pick<RendererStar, "rightAscension" | "declination">,
    context: CatalogPlacementContext,
    radius: number,
): CatalogPlacementResult {
    const { rightAscension, declination } = star;

    if (!Number.isFinite(rightAscension)) {
        return {
            ok: false,
            error: {
                code: "non-finite-render-coordinate",
                component: "rightAscension",
            },
        };
    }
    if (!Number.isFinite(declination)) {
        return {
            ok: false,
            error: {
                code: "non-finite-render-coordinate",
                component: "declination",
            },
        };
    }

    if (context.kind === "earth-horizontal") {
        const { x, y, z } = celestialToSphere(
            rightAscension,
            declination,
            context.skyConfig.location,
            context.skyConfig.dateTime,
            radius,
        );
        return { ok: true, position: { x, y, z } };
    }

    if (declination < -90 || declination > 90) {
        return {
            ok: false,
            error: { code: "declination-out-of-range", declination },
        };
    }

    const position = radialToCartesian(
        radius,
        rightAscension * 15,
        declination,
    );
    return { ok: true, position };
}
