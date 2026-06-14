function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}

const SPECTRAL_CLASS_COLORS: Record<string, string> = {
    O: "#9BB0FF",
    B: "#AABFFF",
    A: "#CAD7FF",
    F: "#F8F7FF",
    G: "#FFF4EA",
    K: "#FFD2A1",
    M: "#FFA050",
    L: "#FFCC99",
    T: "#FF8866",
};

const BLACKBODY_ANCHORS: Array<[number, [number, number, number]]> = [
    [3000, [255, 160, 80]],
    [6000, [255, 244, 234]],
    [10000, [202, 215, 255]],
    [25000, [155, 176, 255]],
];

function toHex(n: number): string {
    return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function blackbodyColor(tempK: number): string {
    if (tempK <= BLACKBODY_ANCHORS[0][0]) {
        const [pr, pg, pb] = BLACKBODY_ANCHORS[0][1];
        return rgbToHex(pr, pg, pb);
    }
    if (tempK >= BLACKBODY_ANCHORS[BLACKBODY_ANCHORS.length - 1][0]) {
        const [pr, pg, pb] = BLACKBODY_ANCHORS[BLACKBODY_ANCHORS.length - 1][1];
        return rgbToHex(pr, pg, pb);
    }
    for (let i = 0; i < BLACKBODY_ANCHORS.length - 1; i++) {
        const [t0, c0] = BLACKBODY_ANCHORS[i];
        const [t1, c1] = BLACKBODY_ANCHORS[i + 1];
        if (tempK >= t0 && tempK <= t1) {
            const t = (tempK - t0) / (t1 - t0);
            return rgbToHex(
                lerp(c0[0], c1[0], t),
                lerp(c0[1], c1[1], t),
                lerp(c0[2], c1[2], t),
            );
        }
    }
    const [pr, pg, pb] = BLACKBODY_ANCHORS[BLACKBODY_ANCHORS.length - 1][1];
    return rgbToHex(pr, pg, pb);
}

export function spectralColor(cls: string, tempK?: number): string {
    if (!cls) {
        return tempK !== undefined ? blackbodyColor(tempK) : "#FFA050";
    }

    const normalized = cls.trim();
    const isWhiteDwarf =
        normalized.startsWith("D") || /white\s*dwarf/i.test(normalized);
    if (isWhiteDwarf) {
        return "#FFFFFF";
    }

    const firstLetter = normalized[0].toUpperCase();
    if (firstLetter in SPECTRAL_CLASS_COLORS) {
        return SPECTRAL_CLASS_COLORS[firstLetter];
    }

    if (tempK !== undefined) {
        return blackbodyColor(tempK);
    }

    return "#FFA050";
}

export function planetScale(diameterKm: number): number {
    return clamp(1 + Math.log10(diameterKm / 12742), 0.4, 3.5);
}

export function starScale(diameterKm: number): number {
    return clamp(1.2 + 0.5 * Math.log10(diameterKm / 1392700), 1.0, 4.5);
}

export function emissiveFromTemp(tempK: number): number {
    return clamp(0.3 + (tempK - 3000) / 12000, 0.3, 1.0);
}

export function orbitVisualRadius(au: number): number {
    const a = Math.max(au, 0);
    const v = 2 + (Math.log10(a * 1000 + 1) / Math.log10(50 * 1000 + 1)) * 38;
    return clamp(v, 2, 60);
}

export function visualPeriodSeconds(days: number): number {
    if (!days || days <= 0) return 0;
    return clamp(8 + (Math.log10(days + 1) / 5) * 82, 6, 120);
}

export function seededFromId(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) / 4294967296;
}
