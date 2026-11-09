<script lang="ts">
  /**
   * Decorative night sky behind the home menu: nebula glows, a Milky Way
   * band, a seeded starfield, a few twinkling bright stars and a brass
   * astrolabe chart of the Andromeda constellation. Pure SVG/CSS, no images.
   *
   * The detailed layers render only after mount and fade in. Painting them
   * is heavy on machines without a GPU, and doing it before hydration held
   * back the menu's `client:idle` hydration by about a second. The starfield
   * is seeded, so every visit draws the same sky.
   */
  import { onMount } from "svelte";

  let ready = false;
  onMount(() => {
    const show = () => (ready = true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(show, { timeout: 600 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(show, 100);
    return () => clearTimeout(id);
  });

  type Tone = "white" | "cool" | "warm";

  // Sky canvas, scaled to cover the viewport (preserveAspectRatio "slice").
  const W = 1440;
  const H = 900;

  function mulberry32(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20261109);
  const round = (n: number) => Math.round(n * 10) / 10;
  const pickTone = (): Tone => {
    const v = rand();
    return v < 0.7 ? "white" : v < 0.88 ? "cool" : "warm";
  };

  // Milky Way runs from the bottom middle to the top right, clear of the
  // text column on the left.
  const BAND_FROM = { x: 380, y: H };
  const BAND_TO = { x: W, y: 80 };
  const bandDx = BAND_TO.x - BAND_FROM.x;
  const bandDy = BAND_TO.y - BAND_FROM.y;
  const bandLength = Math.hypot(bandDx, bandDy);
  const bandAngle = round((Math.atan2(bandDy, bandDx) * 180) / Math.PI);
  const bandCenter = {
    x: (BAND_FROM.x + BAND_TO.x) / 2,
    y: (BAND_FROM.y + BAND_TO.y) / 2,
  };

  // Stars are drawn as one path per tone and brightness, not one node each.
  const OPACITIES = [0.3, 0.5, 0.75, 0.95];
  const layers = new Map<string, string[]>();

  function addStar(x: number, y: number, r: number) {
    if (x < 0 || x > W || y < 0 || y > H) return;
    const tone = pickTone();
    const opacity = OPACITIES[Math.min(3, Math.floor(rand() ** 1.6 * 4))];
    const key = `${tone}|${opacity}`;
    const d = round(r * 2);
    const arc = `a${r} ${r} 0 1 0`;
    const dot = `M${round(x - r)} ${round(y)}${arc} ${d} 0${arc} ${-d} 0`;
    layers.set(key, [...(layers.get(key) ?? []), dot]);
  }

  for (let i = 0; i < 240; i++) {
    addStar(rand() * W, rand() * H, round(0.4 + rand() ** 3 * 1.1));
  }

  // Band stars cluster around the band's centre line (roughly normal spread).
  const ux = bandDx / bandLength;
  const uy = bandDy / bandLength;
  for (let i = 0; i < 380; i++) {
    const along = (rand() * 1.3 - 0.15) * bandLength;
    const across = (rand() + rand() + rand() - 1.5) * 110;
    addStar(
      BAND_FROM.x + ux * along - uy * across,
      BAND_FROM.y + uy * along + ux * across,
      round(0.35 + rand() ** 3 * 0.8),
    );
  }

  // Mottled clouds and dust along the band, so it reads as a Milky Way and
  // not a smooth streak. Coordinates are in the band's rotated frame.
  const GLOWS = ["sky-glow-cool", "sky-glow-core", "sky-glow-warm"];
  const bandClouds = Array.from({ length: 18 }, (_, i) => ({
    cx: round(bandCenter.x + (i / 17 - 0.5 + (rand() - 0.5) * 0.05) * bandLength * 0.95),
    cy: round(bandCenter.y + (rand() - 0.5) * 90),
    rx: round(80 + rand() * 160),
    ry: round(26 + rand() * 54),
    fill: `url(#${GLOWS[Math.floor(rand() * GLOWS.length)]})`,
  }));
  const dustClouds = Array.from({ length: 9 }, (_, i) => ({
    cx: round(bandCenter.x + (i / 8 - 0.5) * bandLength * 0.7 + (rand() - 0.5) * 60),
    cy: round(bandCenter.y + 6 + (rand() - 0.5) * 30),
    rx: round(60 + rand() * 120),
    ry: round(7 + rand() * 14),
  }));

  const starLayers = [...layers].map(([key, dots]) => {
    const [tone, opacity] = key.split("|");
    return { tone, opacity, d: dots.join("") };
  });

  // Bright stars with flares, kept away from the text column and the
  // constellation figure.
  const brightStars = [
    { x: 1180, y: 112, s: 15, tone: "white", dur: 5.2, delay: -1.1 },
    { x: 958, y: 84, s: 10, tone: "cool", dur: 4.6, delay: -0.4 },
    { x: 1296, y: 640, s: 13, tone: "white", dur: 5.8, delay: -2.7, wideOnly: true },
    { x: 822, y: 758, s: 9, tone: "cool", dur: 7.1, delay: -4.9 },
    { x: 1052, y: 836, s: 12, tone: "warm", dur: 6.0, delay: -1.8 },
    { x: 566, y: 70, s: 8, tone: "white", dur: 4.9, delay: -3.9 },
    { x: 1404, y: 176, s: 9, tone: "warm", dur: 6.6, delay: -5.2 },
    { x: 748, y: 352, s: 7, tone: "white", dur: 5.5, delay: -2.2, wideOnly: true },
  ].map((star) => ({
    ...star,
    flare: `M0 ${-star.s}L${star.s * 0.1} ${-star.s * 0.1}L${star.s} 0L${star.s * 0.1} ${star.s * 0.1}L0 ${star.s}L${-star.s * 0.1} ${star.s * 0.1}L${-star.s} 0L${-star.s * 0.1} ${-star.s * 0.1}Z`,
  }));

  // Astrolabe rim: a tick every 5 degrees, a long one every 30.
  const C = 380;
  const polar = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: round(C + r * Math.cos(a)), y: round(C + r * Math.sin(a)) };
  };
  const tickPath = (major: boolean) =>
    Array.from({ length: 72 }, (_, i) => i * 5)
      .filter((deg) => (deg % 30 === 0) === major)
      .map((deg) => {
        const from = polar(major ? 328 : 346, deg);
        const to = polar(360, deg);
        return `M${from.x} ${from.y}L${to.x} ${to.y}`;
      })
      .join("");
  const minorTicks = tickPath(false);
  const majorTicks = tickPath(true);
  const rimLabels = Array.from({ length: 12 }, (_, i) => ({
    ...polar(314, i * 30 - 90),
    text: `${i * 30}°`,
  }));

  // Andromeda, projected from real RA/Dec (east to the left, as seen on the sky).
  const andromeda = [
    { x: 600, y: 468, r: 4.4, label: "Alpheratz", lx: -12, ly: 26, anchor: "end" },
    { x: 493, y: 438, r: 3 },
    { x: 389, y: 358, r: 4.4, label: "Mirach", lx: 14, ly: 22, anchor: "start" },
    { x: 204, y: 244, r: 4.1, label: "Almach", lx: -12, ly: -10, anchor: "end" },
    { x: 435, y: 309, r: 2.4 },
    { x: 459, y: 264, r: 1.9 },
  ];
  const andromedaLines = "M600 468L493 438L389 358L204 244M389 358L435 309L459 264";
</script>

<div class="sky" aria-hidden="true">
  {#if ready}
  <div class="sky-detail">
  <!-- Milky Way glow -->
  <svg class="sky-layer" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="sky-glow-cool">
        <stop offset="0" class="stop-cool" stop-opacity="0.2"></stop>
        <stop offset="1" class="stop-cool" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="sky-glow-core">
        <stop offset="0" class="stop-white" stop-opacity="0.13"></stop>
        <stop offset="1" class="stop-white" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="sky-glow-warm">
        <stop offset="0" class="stop-warm" stop-opacity="0.16"></stop>
        <stop offset="1" class="stop-warm" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="sky-star-halo">
        <stop offset="0" class="stop-white" stop-opacity="0.45"></stop>
        <stop offset="1" class="stop-white" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="sky-dust">
        <stop offset="0" class="stop-dust" stop-opacity="0.6"></stop>
        <stop offset="1" class="stop-dust" stop-opacity="0"></stop>
      </radialGradient>
    </defs>
    <g class="sky-band" transform="rotate({bandAngle} {bandCenter.x} {bandCenter.y})">
      <ellipse cx={bandCenter.x} cy={bandCenter.y} rx="880" ry="230" fill="url(#sky-glow-cool)"></ellipse>
      <ellipse cx={bandCenter.x} cy={bandCenter.y} rx="620" ry="110" fill="url(#sky-glow-core)" opacity="0.6"></ellipse>
      {#each bandClouds as cloud}
        <ellipse cx={cloud.cx} cy={cloud.cy} rx={cloud.rx} ry={cloud.ry} fill={cloud.fill}></ellipse>
      {/each}
      {#each dustClouds as dust}
        <ellipse cx={dust.cx} cy={dust.cy} rx={dust.rx} ry={dust.ry} fill="url(#sky-dust)"></ellipse>
      {/each}
    </g>
  </svg>

  <!-- Starfield -->
  <svg class="sky-layer" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
    {#each starLayers as layer}
      <path class="s-{layer.tone}" fill-opacity={layer.opacity} d={layer.d}></path>
    {/each}
  </svg>

  <!-- Brass astrolabe with the Andromeda constellation -->
  <svg class="sky-chart" viewBox="0 0 760 760">
    <defs>
      <radialGradient id="sky-m31">
        <stop offset="0" class="stop-white" stop-opacity="0.55"></stop>
        <stop offset="0.45" class="stop-warm" stop-opacity="0.22"></stop>
        <stop offset="1" class="stop-warm" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="sky-chart-halo">
        <stop offset="0" class="stop-warm" stop-opacity="0.5"></stop>
        <stop offset="1" class="stop-warm" stop-opacity="0"></stop>
      </radialGradient>
    </defs>
    <g class="chart-rings">
      <circle cx={C} cy={C} r="360" class="chart-rim"></circle>
      <circle cx={C} cy={C} r="352"></circle>
      <circle cx={C} cy={C} r="270"></circle>
      <circle cx={C} cy={C} r="180" class="chart-dashed"></circle>
      <circle cx={C} cy={C} r="90"></circle>
      <circle cx={C} cy="334" r="238" class="chart-ecliptic"></circle>
      <path d="M{C - 300} {C}H{C + 300}M{C} {C - 300}V{C + 300}" class="chart-dashed"></path>
      <path d={minorTicks}></path>
      <path d={majorTicks} class="chart-rim"></path>
    </g>
    {#each rimLabels as label}
      <text x={label.x} y={label.y} class="chart-scale" text-anchor="middle" dominant-baseline="middle">{label.text}</text>
    {/each}

    <ellipse cx="486" cy="244" rx="34" ry="9" transform="rotate(-38 486 244)" fill="url(#sky-m31)"></ellipse>
    <ellipse cx="486" cy="244" rx="4.5" ry="1.8" transform="rotate(-38 486 244)" class="chart-m31-core"></ellipse>
    <text x="520" y="232" class="chart-name">M31</text>

    <path d={andromedaLines} class="chart-figure"></path>
    {#each andromeda as star}
      <circle cx={star.x} cy={star.y} r={star.r * 4} fill="url(#sky-chart-halo)"></circle>
      <circle cx={star.x} cy={star.y} r={star.r} class="chart-star"></circle>
      {#if star.label}
        <text x={star.x + star.lx} y={star.y + star.ly} text-anchor={star.anchor} class="chart-name">{star.label}</text>
      {/if}
    {/each}
  </svg>

  <!-- Twinkling bright stars: each is its own small box, so the twinkle
       runs on the compositor and never repaints the full-screen sky. -->
  {#each brightStars as star}
    <svg
      class="bright-star twinkle s-{star.tone}"
      class:wide-only={star.wideOnly}
      viewBox="{-star.s} {-star.s} {star.s * 2} {star.s * 2}"
      style="left: {round((star.x / W) * 100)}%; top: {round((star.y / H) * 100)}%; width: {star.s * 2}px; height: {star.s * 2}px; margin: {-star.s}px 0 0 {-star.s}px; animation-duration: {star.dur}s; animation-delay: {star.delay}s"
    >
      <circle r={star.s * 0.7} fill="url(#sky-star-halo)"></circle>
      <path d={star.flare} fill-opacity="0.85"></path>
      <circle r={star.s * 0.12 + 0.6}></circle>
    </svg>
  {/each}

  <span class="sky-meteor"></span>
  </div>
  {/if}
  <div class="sky-scrim"></div>
  <p class="sky-coords">M31 · RA 00h 42m 44s · Dec +41° 16′ 09″</p>
</div>

<style>
  .sky {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    background:
      linear-gradient(160deg, var(--color-bg) 0%, var(--color-bg-deep) 55%, var(--color-bg) 100%);
  }

  /* Nebula glows live here too: layered radial gradients are expensive to
     paint without a GPU. */
  .sky-detail {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 42% 38% at 80% 26%, color-mix(in srgb, var(--color-accent) 20%, transparent), transparent 70%),
      radial-gradient(ellipse 36% 30% at 56% 4%, color-mix(in srgb, var(--color-danger) 16%, transparent), transparent 70%),
      radial-gradient(ellipse 48% 46% at 94% 88%, color-mix(in srgb, var(--color-info) 22%, transparent), transparent 72%),
      radial-gradient(ellipse 40% 36% at 30% 96%, color-mix(in srgb, color-mix(in srgb, var(--color-info), var(--color-danger)) 18%, transparent), transparent 70%),
      radial-gradient(ellipse 34% 40% at 6% 18%, color-mix(in srgb, var(--color-info) 9%, transparent), transparent 70%),
      radial-gradient(ellipse 30% 26% at 22% 30%, color-mix(in srgb, var(--color-accent) 7%, transparent), transparent 70%);
    animation: sky-in 900ms var(--ease-glide) both;
  }
  @keyframes sky-in {
    from {
      opacity: 0;
    }
  }

  .sky-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .stop-cool {
    stop-color: var(--color-info);
  }
  .stop-white {
    stop-color: var(--color-text);
  }
  .stop-warm {
    stop-color: var(--color-accent-strong);
  }
  .stop-dust {
    stop-color: var(--color-bg-deep);
  }

  .s-white {
    fill: var(--color-text);
  }
  .s-cool {
    fill: var(--color-info);
  }
  .s-warm {
    fill: var(--color-accent-strong);
  }

  .bright-star {
    position: absolute;
    overflow: visible;
  }
  .twinkle {
    animation-name: twinkle;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }
  @keyframes twinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.45;
      transform: scale(0.78);
    }
  }

  .sky-chart {
    position: absolute;
    top: 4vh;
    right: -10vw;
    width: min(760px, 90vw);
    height: auto;
  }
  .chart-rings {
    fill: none;
    stroke: var(--color-line);
    stroke-width: 1;
  }
  .chart-rim {
    stroke: var(--color-line-strong);
  }
  .chart-dashed {
    stroke-dasharray: 2 6;
  }
  .chart-ecliptic {
    stroke: color-mix(in srgb, var(--color-accent) 30%, transparent);
    stroke-dasharray: 10 6;
  }
  .chart-scale {
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 0.08em;
    fill: var(--color-text-muted);
    opacity: 0.7;
  }
  .chart-figure {
    fill: none;
    stroke: color-mix(in srgb, var(--color-accent) 75%, transparent);
    stroke-width: 1.25;
  }
  .chart-star {
    fill: var(--color-accent-strong);
  }
  .chart-m31-core {
    fill: var(--color-text);
  }
  .chart-name {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 15px;
    fill: var(--color-text-soft);
    opacity: 0.8;
  }

  .sky-meteor {
    position: absolute;
    top: 12%;
    left: 74%;
    width: 160px;
    height: 1px;
    border-radius: 1px;
    background: linear-gradient(90deg, transparent, var(--color-text));
    opacity: 0;
    transform-origin: right center;
    animation: meteor 13s linear 3s infinite;
  }
  @keyframes meteor {
    0% {
      opacity: 0;
      transform: rotate(152deg) translateX(0);
    }
    1.5% {
      opacity: 0.9;
    }
    6% {
      opacity: 0;
      transform: rotate(152deg) translateX(380px);
    }
    100% {
      opacity: 0;
      transform: rotate(152deg) translateX(380px);
    }
  }

  /* Keeps the text column readable over the sky. */
  .sky-scrim {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--color-bg-deep) 62%, transparent) 0%, color-mix(in srgb, var(--color-bg-deep) 30%, transparent) 36%, transparent 58%),
      radial-gradient(ellipse 120% 95% at 62% 42%, transparent 58%, color-mix(in srgb, var(--color-bg-deep) 70%, transparent) 100%);
  }

  .sky-coords {
    position: absolute;
    right: clamp(16px, 4vw, 56px);
    bottom: 24px;
    margin: 0;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 0.16em;
    color: var(--color-text-muted);
    opacity: 0.75;
  }

  @media (max-width: 640px) {
    .sky-chart {
      opacity: 0.5;
    }
    .sky-scrim {
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-bg-deep) 15%, transparent) 0%, color-mix(in srgb, var(--color-bg-deep) 50%, transparent) 45%, color-mix(in srgb, var(--color-bg-deep) 70%, transparent) 100%);
    }
    .sky-coords,
    .wide-only {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .twinkle {
      animation: none;
    }
    .sky-meteor {
      display: none;
    }
  }
  :global(:root[data-reduced-motion="true"]) .twinkle {
    animation: none;
  }
  :global(:root[data-reduced-motion="true"]) .sky-meteor {
    display: none;
  }

  /* High contrast: plain black sky, stars and a quieter chart only. */
  :global(:root[data-high-contrast="true"]) .sky {
    background: var(--color-bg-deep);
  }
  :global(:root[data-high-contrast="true"]) .sky-detail {
    background: none;
  }
  :global(:root[data-high-contrast="true"]) .sky-band,
  :global(:root[data-high-contrast="true"]) .sky-meteor,
  :global(:root[data-high-contrast="true"]) .sky-scrim {
    display: none;
  }
  :global(:root[data-high-contrast="true"]) .sky-chart {
    opacity: 0.4;
  }
</style>
