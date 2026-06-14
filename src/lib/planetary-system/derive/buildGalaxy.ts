function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}

export function radialToCartesian(
    d: number,
    raDeg: number,
    decDeg: number,
): { x: number; y: number; z: number } {
    const ra = (raDeg * Math.PI) / 180;
    const dec = (decDeg * Math.PI) / 180;
    return {
        x: d * Math.cos(dec) * Math.cos(ra),
        y: d * Math.sin(dec),
        z: d * Math.cos(dec) * Math.sin(ra),
    };
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
