export { radialToCartesian } from "@/lib/astronomy/observerTransform";

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}

export function galaxyVisual(distanceLy: number): { brightness: number } {
    return { brightness: clamp(2.0 / (1 + distanceLy / 5), 0.15, 2.0) };
}

export const BV_INDEX: Record<string, number> = {
    O: -0.33,
    B: -0.2,
    A: 0.0,
    F: 0.3,
    G: 0.63,
    K: 0.9,
    M: 1.5,
};
