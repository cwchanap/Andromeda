/**
 * Three.js / canvas mirror of the Observatory tokens in src/styles/tokens.css.
 * WebGL materials and 2D canvas sprites can't read CSS variables, so 3D
 * accents use these constants. Keep the values in sync with tokens.css.
 */
export const palette = {
    bgDeep: 0x070d1a,
    accent: 0xd4a857,
    accentStrong: 0xe8c47c,
    /** Dim brass for idle lines (accent at low intensity). */
    accentDim: 0x5e4c2c,
    text: 0xefe6d2,
    textMuted: 0xa89f8a,
    info: 0x8fb8de,
} as const;

export type PaletteKey = keyof typeof palette;

/** CSS hex string for a palette entry, for 2D canvas drawing. */
export const cssColor = (key: PaletteKey): string =>
    `#${palette[key].toString(16).padStart(6, "0")}`;

/** Font stacks for canvas-drawn labels (mirrors --font-display / --font-ui). */
export const canvasFont = {
    display: '"Cormorant Garamond", Georgia, serif',
    ui: 'Inter, -apple-system, "Segoe UI", sans-serif',
} as const;
