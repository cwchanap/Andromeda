import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/svelte";
import ConstellationWrapper from "@/components/ConstellationWrapper.svelte";
import type { Constellation } from "@/types/constellation";
import type {
    OmittedStarDiagnostic,
    PreparedConstellationCatalog,
    SyntheticSolStar,
} from "@/lib/constellation/observerCatalog";
import type { ResolvedObserverState } from "@/lib/constellation/observerRouteState";
import { routes } from "@/i18n/routes";

// Observer HUD strings the wrapper must render. The i18n dictionaries wire
// these keys in a later task; until then the tests inject the exact strings
// via the component's translations prop, and production code references the
// keys through t(). The visible fallback/omissions copy is fixed by the
// brief: "Observer unavailable; showing the sky from Earth/Sol." and
// "Some catalog stars could not be displayed." (no count).
const OBSERVER_TRANSLATIONS: Record<string, string> = {
    "constellation.observer.fallback":
        "Observer unavailable; showing the sky from Earth/Sol.",
    "constellation.observer.omissions":
        "Some catalog stars could not be displayed.",
    "constellation.observer.webglUnavailable":
        "WebGL is required to view the sky from this observer.",
    "constellation.observer.returnToSol": "Return to Earth/Sol",
    // Observer ACTION copy (Task 4). The announcement template carries the
    // {ra}/{dec}/{distance} placeholders the wrapper's t() interpolates.
    "constellation.observer.referenceToggle": "Show reference stars",
    "constellation.observer.findSol": "Find Sol",
    "constellation.observer.findSolAnnouncement":
        "Sol: right ascension {ra} h, declination {dec}°, distance {distance} ly.",
    "constellation.observer.findSolUnavailable":
        "Sol is not visible from this observer.",
    // HUD shell copy the action tests rely on to open the settings panel.
    "nav.settings": "Settings",
};

const FALLBACK_NOTICE = "Observer unavailable; showing the sky from Earth/Sol.";
const OMISSION_NOTICE = "Some catalog stars could not be displayed.";
const FIND_SOL_ANNOUNCEMENT =
    "Sol: right ascension 14.60 h, declination +19.50°, distance 4.25 ly.";
const FIND_SOL_UNAVAILABLE = "Sol is not visible from this observer.";

// Stable full-catalog fixture. The wrapper must hand this EXACT array to
// preparation by identity — never a rebuild from constellation membership.
// Prepared output fixtures: the wrapper must pass these objects through to
// initializePreparedCatalogs() BY IDENTITY (no cloning/rebuilding).
// All fixtures live inside vi.hoisted because the vi.mock factories below
// reference them and those factories run before top-level consts initialize.
const {
    getCurrentLocationMock,
    getVisibleConstellationsMock,
    prepareAlternateObserverCatalogMock,
    initializeMock,
    initializePreparedCatalogsMock,
    resolveObserverStateMock,
    celestialToSphereMock,
    setReferenceVisibleMock,
    getStarWorldPositionMock,
    focusStarByIdMock,
    tweenCameraToMock,
    setSelectedMock,
    getCameraAzimuthMock,
    getCameraElevationMock,
    rendererCallbacks,
    fullConstellations,
    preparedPrimaryCatalog,
    preparedReferenceCatalog,
    solCatalog,
    focusCatalog,
} = vi.hoisted(() => {
    const fullConstellations: Constellation[] = [
        {
            id: "orion",
            name: "Orion",
            abbreviation: "Ori",
            description: "Orion description",
            stars: [],
            lines: [],
            visibility: {
                hemisphere: "both",
                bestMonths: [1, 2, 3],
                minLatitude: -90,
                maxLatitude: 90,
            },
        },
        {
            id: "centaurus",
            name: "Centaurus",
            abbreviation: "Cen",
            description: "Centaurus description",
            stars: [],
            lines: [],
            visibility: {
                hemisphere: "southern",
                bestMonths: [4, 5, 6],
                minLatitude: -90,
                maxLatitude: 30,
            },
        },
    ];
    const preparedPrimaryCatalog: PreparedConstellationCatalog = {
        stars: [],
        constellations: [],
    };
    const preparedReferenceCatalog: PreparedConstellationCatalog = {
        stars: [],
        constellations: [],
    };
    // Synthetic Sol star the prepared primary catalog carries. RA/dec/distance
    // are chosen so the localized announcement renders deterministically:
    // "14.60", "+19.50" (explicit sign), and "4.25" via toLocaleString("en").
    const syntheticSolStar: SyntheticSolStar = {
        id: "sol",
        name: "Sol",
        rightAscension: 14.6,
        declination: 19.5,
        magnitude: 0,
        distance: 4.25,
        spectralClass: "G2V",
        color: "#FFF4E8",
        marker: { kind: "synthetic-sol" },
    };
    const betelgeuse = {
        id: "betelgeuse",
        name: "Betelgeuse",
        rightAscension: 5.92,
        declination: 7.41,
        magnitude: 0.5,
        distance: 640,
        spectralClass: "M1",
        color: "#ff6b6b",
    };
    const rigel = {
        id: "rigel",
        name: "Rigel",
        rightAscension: 5.24,
        declination: -8.2,
        magnitude: 0.13,
        distance: 860,
        spectralClass: "B8",
        color: "#b0c4ff",
    };
    // Catalog used by the Find Sol action tests: primary stars carry the
    // synthetic Sol record; no constellations are needed.
    const solCatalog: PreparedConstellationCatalog = {
        stars: [syntheticSolStar],
        constellations: [],
    };
    // Catalog used by the alternate constellation-focus tests: one prepared
    // constellation with two stars whose world positions the renderer mock
    // resolves through getStarWorldPosition.
    const focusCatalog: PreparedConstellationCatalog = {
        stars: [betelgeuse, rigel],
        constellations: [
            {
                id: "orion",
                name: "Orion",
                abbreviation: "Ori",
                description: "Orion description",
                stars: [betelgeuse, rigel],
                lines: [],
                visibility: {
                    hemisphere: "both",
                    bestMonths: [1, 2, 3],
                    minLatitude: -90,
                    maxLatitude: 90,
                },
            },
        ],
    };
    return {
        getCurrentLocationMock: vi.fn(),
        getVisibleConstellationsMock: vi.fn(),
        prepareAlternateObserverCatalogMock: vi.fn(),
        initializeMock: vi.fn().mockResolvedValue(undefined),
        initializePreparedCatalogsMock: vi.fn().mockResolvedValue(undefined),
        resolveObserverStateMock: vi.fn(),
        celestialToSphereMock: vi.fn(() => ({
            x: 0,
            y: 0,
            z: 100,
            visible: true,
        })),
        setReferenceVisibleMock: vi.fn(),
        getStarWorldPositionMock: vi.fn(),
        focusStarByIdMock: vi.fn(),
        tweenCameraToMock: vi.fn(),
        setSelectedMock: vi.fn(),
        // HUD tick camera readouts. The default implementations persist
        // through vi.clearAllMocks (clearing never removes implementations),
        // so every existing HUD test keeps the deterministic 0°/0° baseline
        // while the direction-readout test overrides then restores them.
        getCameraAzimuthMock: vi.fn(() => 0),
        getCameraElevationMock: vi.fn(() => 0),
        // Captures the interaction callbacks the wrapper hands to the mocked
        // renderer constructor so tests can drive onConstellationClick.
        rendererCallbacks: {
            onConstellationClick: null as ((id: string) => void) | null,
        },
        fullConstellations,
        preparedPrimaryCatalog,
        preparedReferenceCatalog,
        solCatalog,
        focusCatalog,
    };
});

// Mock legacy/prepared renderer initialization
vi.mock("@/lib/constellation/ConstellationRenderer", () => {
    const mockRenderer = {
        initialize: initializeMock,
        initializePreparedCatalogs: initializePreparedCatalogsMock,
        dispose: vi.fn(),
        resize: vi.fn(),
        setSelected: setSelectedMock,
        setHovered: vi.fn(),
        tweenCameraTo: tweenCameraToMock,
        worldToScreen: vi.fn(() => ({ x: 0, y: 0, visible: false })),
        getCameraAzimuth: getCameraAzimuthMock,
        getCameraElevation: getCameraElevationMock,
        setLabelsVisible: vi.fn(),
        setAutoRotate: vi.fn(),
        setAutoRotateSpeed: vi.fn(),
        setReducedMotion: vi.fn(),
        setReferenceVisible: setReferenceVisibleMock,
        getStarWorldPosition: getStarWorldPositionMock,
        focusStarById: focusStarByIdMock,
    };
    return {
        ConstellationRenderer: vi.fn().mockImplementation(
            (
                _container: unknown,
                callbacks?: {
                    onConstellationClick?: (id: string) => void;
                },
            ) => {
                rendererCallbacks.onConstellationClick =
                    callbacks?.onConstellationClick ?? null;
                return mockRenderer;
            },
        ),
    };
});

// Mock HPA-433 preparation
vi.mock("@/lib/constellation/observerCatalog", () => ({
    prepareAlternateObserverCatalog: prepareAlternateObserverCatalogMock,
    SYNTHETIC_SOL_STAR_ID: "sol",
}));

// Keep the real parseObserverQuery; stub resolveObserverState so the
// type-boundary test can resolve a kind:"system" whose defensive second
// lookup misses. The default implementation is the real resolver.
vi.mock("@/lib/constellation/observerRouteState", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/lib/constellation/observerRouteState")
        >();
    resolveObserverStateMock.mockImplementation(actual.resolveObserverState);
    return {
        ...actual,
        resolveObserverState: resolveObserverStateMock,
    };
});

// Mock location lookup
vi.mock("@/utils/astronomy", () => ({
    getCurrentLocation: getCurrentLocationMock,
    isConstellationVisible: vi.fn(() => true),
    formatCoordinates: vi.fn(() => "40.71°N, 74.01°W"),
    celestialToSphere: celestialToSphereMock,
    azimuthToCardinalKey: vi.fn(() => "compass.n"),
}));

// Mock visibility filtering + the full catalog array
vi.mock("@/data/constellations", () => ({
    constellations: fullConstellations,
    getVisibleConstellations: getVisibleConstellationsMock,
}));

// One eligible Alpha Centauri system at { x: 1, y: 2, z: 3 }. The resolver,
// the defensive second lookup, and preparation all read this same mock.
vi.mock("@/lib/galaxy/LocalGalaxy", () => ({
    localGalaxyData: {
        id: "local-galaxy",
        name: "Local Galaxy",
        description: "",
        center: { x: 0, y: 0, z: 0 },
        scale: 1,
        boundingRadius: 100,
        starSystems: [
            {
                id: "alpha-centauri",
                name: "Alpha Centauri System",
                description: "Alpha Centauri system",
                systemType: "trinary",
                position: { x: 1, y: 2, z: 3 },
                distanceFromEarth: 4.2465,
                stars: [],
                metadata: { spectralClass: "G2V", hasExoplanets: true },
                visual: { brightness: 1, colorIndex: 0.6, scale: 1 },
            },
        ],
    },
}));

describe("ConstellationWrapper observer mode", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, "", "/");
        getCurrentLocationMock.mockRejectedValue(
            new Error("Location unavailable"),
        );
        getVisibleConstellationsMock.mockReturnValue([fullConstellations[0]]);
        // Interaction defaults: focus succeeds, no star positions resolved
        // unless a test provides them, and the Earth-relative projection is
        // never used by the alternate focus path.
        focusStarByIdMock.mockReturnValue(true);
        getStarWorldPositionMock.mockReturnValue(null);
    });

    it("query-free mount runs the legacy Earth/Sol path", async () => {
        render(ConstellationWrapper);

        await waitFor(() => {
            expect(getCurrentLocationMock).toHaveBeenCalled();
        });
        expect(getVisibleConstellationsMock).toHaveBeenCalled();
        await waitFor(() => {
            expect(initializeMock).toHaveBeenCalled();
        });

        expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
        expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
    });

    it("?observer=alpha-centauri prepares and initializes the alternate catalog", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog: preparedPrimaryCatalog,
                referenceCatalog: preparedReferenceCatalog,
                omittedStars: [],
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        render(ConstellationWrapper);

        await waitFor(() => {
            expect(prepareAlternateObserverCatalogMock).toHaveBeenCalledWith(
                fullConstellations,
                { x: 1, y: 2, z: 3 },
                {
                    includeReferenceCatalog: true,
                    observerSourceStarIds: ["alpha_cen"],
                },
            );
        });
        // The exact full exported array reaches preparation by identity.
        expect(prepareAlternateObserverCatalogMock.mock.calls[0][0]).toBe(
            fullConstellations,
        );

        // Alternate mode must never request geolocation or visibility filtering.
        expect(getCurrentLocationMock).not.toHaveBeenCalled();
        expect(getVisibleConstellationsMock).not.toHaveBeenCalled();

        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });
        expect(initializeMock).not.toHaveBeenCalled();

        // The exact prepared objects reach the renderer by identity.
        const [request, settings] =
            initializePreparedCatalogsMock.mock.calls[0];
        expect(request.primaryCatalog).toBe(preparedPrimaryCatalog);
        expect(request.referenceCatalog).toBe(preparedReferenceCatalog);
        expect(request.referenceVisible).toBe(false);
        expect(settings).toEqual({
            minimumMagnitude: 4.0,
            showConstellationLines: true,
            showStarNames: true,
        });
    });

    it("falls back to Sol when the defensive system lookup misses", async () => {
        resolveObserverStateMock.mockImplementationOnce(() => ({
            kind: "system",
            observerId: "ghost-system",
        }));
        window.history.replaceState({}, "", "/?observer=ghost-system");
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        try {
            render(ConstellationWrapper);

            await waitFor(() => {
                expect(getCurrentLocationMock).toHaveBeenCalled();
            });
            expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
            expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
            await waitFor(() => {
                expect(initializeMock).toHaveBeenCalled();
            });
            // The invariant mismatch is logged in development.
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("invariant mismatch"),
                "ghost-system",
            );
        } finally {
            warnSpy.mockRestore();
        }
    });

    it("initializes the primary catalog when the prepared result has no reference catalog", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog: preparedPrimaryCatalog,
                referenceCatalog: undefined,
                omittedStars: [],
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { container } = render(ConstellationWrapper);

        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });
        const [request] = initializePreparedCatalogsMock.mock.calls[0];
        expect(request.primaryCatalog).toBe(preparedPrimaryCatalog);
        expect(request.referenceCatalog).toBeUndefined();
        expect(request.referenceVisible).toBe(false);
        expect(getCurrentLocationMock).not.toHaveBeenCalled();

        // No reference toggle is exposed: opening the settings panel shows
        // only the three pre-existing checkboxes (scanlines, labels,
        // auto-rotate) and nothing else.
        fireEvent.click(
            container.querySelector('button[aria-label="Settings"]')!,
        );
        await waitFor(() => {
            expect(
                container.querySelectorAll('input[type="checkbox"]'),
            ).toHaveLength(3);
        });
    });
});

describe("ConstellationWrapper observer route fallbacks", () => {
    // Every route-level fallback reason resolves to the SAME generic notice
    // and the SAME Sol legacy path — the typed reason is preserved in
    // resolvedObserverState (observable as: no prepared init, Sol runs).
    const fallbackCases: Array<{
        label: string;
        state: Extract<ResolvedObserverState, { kind: "fallback" }>;
    }> = [
        {
            label: "empty",
            state: {
                kind: "fallback",
                observerId: "sol",
                requestedObserver: "",
                reason: "empty",
            },
        },
        {
            label: "duplicate",
            state: {
                kind: "fallback",
                observerId: "sol",
                requestedObserver: null,
                reason: "duplicate",
            },
        },
        {
            label: "unknown-system",
            state: {
                kind: "fallback",
                observerId: "sol",
                requestedObserver: "ghost-system",
                reason: "unknown-system",
            },
        },
        {
            label: "invalid-coordinates",
            state: {
                kind: "fallback",
                observerId: "sol",
                requestedObserver: "alpha-centauri",
                reason: "invalid-coordinates",
            },
        },
        {
            label: "origin-collision",
            state: {
                kind: "fallback",
                observerId: "sol",
                requestedObserver: "alpha-centauri",
                reason: "origin-collision",
            },
        },
    ];

    it.each(fallbackCases)(
        "$label fallback initializes Sol and shows the generic fallback notice",
        async ({ state }) => {
            resolveObserverStateMock.mockImplementationOnce(() => state);
            window.history.replaceState({}, "", "/?observer=alpha-centauri");

            const { queryByText } = render(ConstellationWrapper, {
                translations: OBSERVER_TRANSLATIONS,
            });

            // The generic fallback notice renders visibly.
            await waitFor(() => {
                expect(queryByText(FALLBACK_NOTICE)).not.toBeNull();
            });
            // The legacy Earth/Sol path runs...
            expect(getCurrentLocationMock).toHaveBeenCalled();
            await waitFor(() => {
                expect(initializeMock).toHaveBeenCalled();
            });
            // ...and prepared initialization is skipped entirely: neither
            // the alternate preparation nor the prepared renderer init.
            expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
            expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
        },
    );

    it("fatal synthetic-sol-unavailable preparation failure falls back to Sol with the same generic notice", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: { code: "invalid-distance", distanceLightYears: NaN },
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { queryByText } = render(ConstellationWrapper, {
            translations: OBSERVER_TRANSLATIONS,
        });

        await waitFor(() => {
            expect(queryByText(FALLBACK_NOTICE)).not.toBeNull();
        });
        // Preparation was attempted but its fatal failure hands nothing to
        // the renderer — no partial prepared handoff.
        expect(prepareAlternateObserverCatalogMock).toHaveBeenCalled();
        expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
        // Sol legacy path takes over.
        expect(getCurrentLocationMock).toHaveBeenCalled();
        await waitFor(() => {
            expect(initializeMock).toHaveBeenCalled();
        });
    });
});

describe("ConstellationWrapper observer omissions", () => {
    const omissionDiagnostic = (
        reason: OmittedStarDiagnostic["reason"],
    ): OmittedStarDiagnostic => ({
        starId: "betelgeuse",
        starName: "Betelgeuse",
        memberships: [{ constellationId: "orion", originalStarIndex: 0 }],
        reason,
        referenceDisposition: "retained",
    });

    const preparedWithOmissions = (omittedStars: OmittedStarDiagnostic[]) => ({
        ok: true as const,
        value: {
            primaryCatalog: preparedPrimaryCatalog,
            referenceCatalog: preparedReferenceCatalog,
            omittedStars,
        },
    });

    it("shows NO omission notice when only observer-source-star exclusions were omitted", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue(
            preparedWithOmissions([
                omissionDiagnostic({ code: "observer-source-star-excluded" }),
                omissionDiagnostic({ code: "observer-source-star-excluded" }),
            ]),
        );
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { container, queryByText } = render(ConstellationWrapper, {
            translations: OBSERVER_TRANSLATIONS,
        });

        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });
        // The HUD panel renders only after loading settles; the omission
        // flag is computed synchronously before prepared init, so a visible
        // panel means the decision is final.
        await waitFor(() => {
            expect(container.querySelector(".hud-panel")).not.toBeNull();
        });
        expect(queryByText(OMISSION_NOTICE)).toBeNull();
    });

    it.each([
        {
            label: "coordinate-transform-failed",
            reason: {
                code: "coordinate-transform-failed",
                error: { code: "invalid-distance", distanceLightYears: NaN },
            },
        },
        {
            label: "non-finite-metadata",
            reason: { code: "non-finite-metadata", field: "magnitude" },
        },
    ] as Array<{ label: string; reason: OmittedStarDiagnostic["reason"] }>)(
        "shows the ONE static omission notice for $label",
        async ({ reason }) => {
            prepareAlternateObserverCatalogMock.mockReturnValue(
                preparedWithOmissions([omissionDiagnostic(reason)]),
            );
            window.history.replaceState({}, "", "/?observer=alpha-centauri");

            const { container, queryByText } = render(ConstellationWrapper, {
                translations: OBSERVER_TRANSLATIONS,
            });

            await waitFor(() => {
                expect(initializePreparedCatalogsMock).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(container.querySelector(".hud-panel")).not.toBeNull();
            });
            // The static notice surfaces non-blockingly; the injected string
            // carries no count, so an exact text match is the assertion.
            expect(queryByText(OMISSION_NOTICE)).not.toBeNull();
        },
    );
});

describe("ConstellationWrapper observer WebGL gating", () => {
    it("WebGL-unsupported device with a valid observer shows the observer WebGL UI and skips Sol mode entirely", async () => {
        // Stub the canvas WebGL probe so the REAL checkWebGLSupport() returns
        // false, as it would on an unsupported device. The probe happens
        // BEFORE the observer-mode branch, so this exercises the preflight
        // gate itself (the sibling test below covers the post-preparation
        // renderer-init failure). 2d contexts are delegated to the test
        // setup's canvas mock so unrelated paths stay intact.
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        const getContextSpy = vi.spyOn(
            HTMLCanvasElement.prototype,
            "getContext",
        );
        getContextSpy.mockImplementation(
            (contextId: string, ...args: unknown[]) => {
                if (
                    contextId === "webgl" ||
                    contextId === "experimental-webgl"
                ) {
                    return null;
                }
                return originalGetContext(contextId, ...args);
            },
        );
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        try {
            const { container, queryByText } = render(ConstellationWrapper, {
                translations: OBSERVER_TRANSLATIONS,
            });

            // The observer-specific WebGL-required UI shows (localized copy
            // + Return to Earth/Sol) — NOT the generic Earth WebGL overlay.
            await waitFor(() => {
                expect(
                    queryByText(
                        "WebGL is required to view the sky from this observer.",
                    ),
                ).not.toBeNull();
            });
            expect(queryByText("Return to Earth/Sol")).not.toBeNull();
            // The generic Earth WebGL copy (raw key: the injected dictionary
            // has no constellation.webglNotAvailable) never renders.
            expect(queryByText("constellation.webglNotAvailable")).toBeNull();

            // No Earth 2D canvas fallback is created...
            expect(container.querySelectorAll("canvas")).toHaveLength(0);
            // ...and the observer-specific failure path does NOT run Sol
            // mode: no geolocation, no visibility filtering, no legacy
            // renderer init, and no catalog preparation.
            expect(getCurrentLocationMock).not.toHaveBeenCalled();
            expect(getVisibleConstellationsMock).not.toHaveBeenCalled();
            expect(initializeMock).not.toHaveBeenCalled();
            expect(prepareAlternateObserverCatalogMock).not.toHaveBeenCalled();
            expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
            // Not a fallback-to-Sol, so no generic fallback notice.
            expect(queryByText(FALLBACK_NOTICE)).toBeNull();
        } finally {
            getContextSpy.mockRestore();
        }
    });

    it("alternate mode whose WebGL path fails shows WebGL-required copy and NO Earth 2D fallback", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog: preparedPrimaryCatalog,
                referenceCatalog: preparedReferenceCatalog,
                omittedStars: [],
            },
        });
        initializePreparedCatalogsMock.mockRejectedValueOnce(
            new Error("WebGL context creation failed"),
        );
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { container, queryByText } = render(ConstellationWrapper, {
            translations: OBSERVER_TRANSLATIONS,
        });

        await waitFor(() => {
            expect(
                queryByText(
                    "WebGL is required to view the sky from this observer.",
                ),
            ).not.toBeNull();
        });
        expect(queryByText("Return to Earth/Sol")).not.toBeNull();
        // No Earth-oriented 2D canvas fallback is created in a genuine
        // alternate mode.
        expect(container.querySelectorAll("canvas")).toHaveLength(0);
        // The alternate mode does NOT degrade to the Sol legacy path...
        expect(getCurrentLocationMock).not.toHaveBeenCalled();
        expect(initializeMock).not.toHaveBeenCalled();
        // ...and this is not a fallback-to-Sol, so no generic fallback notice.
        expect(queryByText(FALLBACK_NOTICE)).toBeNull();
    });

    it("creates the Earth 2D canvas when alternate mode falls back to Sol and Sol WebGL fails", async () => {
        // Preparation fails (fatal) → fallback to Sol; Sol's renderer init
        // then fails → the existing Earth 2D canvas fallback IS allowed.
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: false,
            error: {
                code: "synthetic-sol-unavailable",
                cause: { code: "invalid-distance", distanceLightYears: NaN },
            },
        });
        initializeMock.mockRejectedValueOnce(
            new Error("WebGL renderer failed"),
        );
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { container, queryByText } = render(ConstellationWrapper, {
            translations: OBSERVER_TRANSLATIONS,
        });

        await waitFor(() => {
            expect(queryByText(FALLBACK_NOTICE)).not.toBeNull();
        });
        await waitFor(() => {
            expect(container.querySelectorAll("canvas")).toHaveLength(1);
        });
        expect(initializePreparedCatalogsMock).not.toHaveBeenCalled();
    });
});

describe("ConstellationWrapper observer actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, "", "/");
        getCurrentLocationMock.mockRejectedValue(
            new Error("Location unavailable"),
        );
        getVisibleConstellationsMock.mockReturnValue([fullConstellations[0]]);
        // Interaction defaults: focus succeeds, no star positions resolved
        // unless a test provides them, and the Earth-relative projection is
        // never used by the alternate focus path.
        focusStarByIdMock.mockReturnValue(true);
        getStarWorldPositionMock.mockReturnValue(null);
    });

    // Mounts a genuine alternate observer whose preparation succeeds with the
    // given catalogs. The settings panel is where the observer action
    // controls live; tests open it via the HUD Settings button.
    const mountAlternate = (
        primaryCatalog: PreparedConstellationCatalog,
        referenceCatalog: PreparedConstellationCatalog | undefined,
    ) => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog,
                referenceCatalog,
                omittedStars: [],
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");
        return render(ConstellationWrapper, {
            translations: OBSERVER_TRANSLATIONS,
        });
    };

    const openSettings = (container: HTMLElement) => {
        fireEvent.click(
            container.querySelector('button[aria-label="Settings"]')!,
        );
    };

    const findSolButton = (container: HTMLElement) => {
        return Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("Find Sol"),
        );
    };

    it("shows the reference toggle only when a reference catalog exists", async () => {
        const { container } = mountAlternate(
            preparedPrimaryCatalog,
            preparedReferenceCatalog,
        );
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        openSettings(container);
        await waitFor(() => {
            const checkboxes = container.querySelectorAll(
                'input[type="checkbox"]',
            );
            expect(checkboxes).toHaveLength(4);
        });

        const referenceCheckbox = Array.from(
            container.querySelectorAll('input[type="checkbox"]'),
        ).find((checkbox) =>
            checkbox
                .closest("label")
                ?.textContent?.includes("Show reference stars"),
        );
        expect(referenceCheckbox).not.toBeUndefined();
        expect((referenceCheckbox as HTMLInputElement).checked).toBe(false);
    });

    it("toggling the reference checkbox forwards to setReferenceVisible without re-preparing or re-initializing", async () => {
        const { container } = mountAlternate(
            preparedPrimaryCatalog,
            preparedReferenceCatalog,
        );
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        openSettings(container);
        await waitFor(() => {
            expect(
                container.querySelectorAll('input[type="checkbox"]'),
            ).toHaveLength(4);
        });
        const referenceCheckbox = Array.from(
            container.querySelectorAll('input[type="checkbox"]'),
        ).find((checkbox) =>
            checkbox
                .closest("label")
                ?.textContent?.includes("Show reference stars"),
        ) as HTMLInputElement;

        const preparationCalls =
            prepareAlternateObserverCatalogMock.mock.calls.length;
        const initCalls = initializePreparedCatalogsMock.mock.calls.length;

        // Checked: forward true and update the local visibility state.
        fireEvent.click(referenceCheckbox);
        expect(setReferenceVisibleMock).toHaveBeenLastCalledWith(true);
        expect(referenceCheckbox.checked).toBe(true);
        // Unchecked: forward false.
        fireEvent.click(referenceCheckbox);
        expect(setReferenceVisibleMock).toHaveBeenLastCalledWith(false);
        expect(referenceCheckbox.checked).toBe(false);

        // The toggle is a pure renderer forward — no re-preparation and no
        // re-initialization happened.
        expect(prepareAlternateObserverCatalogMock.mock.calls.length).toBe(
            preparationCalls,
        );
        expect(initializePreparedCatalogsMock.mock.calls.length).toBe(
            initCalls,
        );
    });

    it("Find Sol focuses the synthetic Sol and announces its coordinates", async () => {
        const { container, queryAllByText } = mountAlternate(
            solCatalog,
            preparedReferenceCatalog,
        );
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        openSettings(container);
        await waitFor(() => {
            expect(findSolButton(container)).not.toBeUndefined();
        });
        fireEvent.click(findSolButton(container)!);

        expect(focusStarByIdMock).toHaveBeenCalledWith("sol");
        await waitFor(() => {
            expect(
                container.querySelector(".observer-announcement")?.textContent,
            ).toBe(FIND_SOL_ANNOUNCEMENT);
        });

        // ONE polite atomic aria-live region carries the transient
        // announcement — never duplicated.
        const region = container.querySelector(".observer-announcement");
        expect(region?.getAttribute("role")).toBe("status");
        expect(region?.getAttribute("aria-live")).toBe("polite");
        expect(region?.getAttribute("aria-atomic")).toBe("true");
        expect(queryAllByText(FIND_SOL_ANNOUNCEMENT)).toHaveLength(1);
    });

    it("Find Sol announces the unavailable copy when focus fails", async () => {
        focusStarByIdMock.mockReturnValue(false);
        const { container, queryByText } = mountAlternate(
            solCatalog,
            preparedReferenceCatalog,
        );
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        openSettings(container);
        await waitFor(() => {
            expect(findSolButton(container)).not.toBeUndefined();
        });
        fireEvent.click(findSolButton(container)!);

        expect(focusStarByIdMock).toHaveBeenCalledWith("sol");
        await waitFor(() => {
            expect(queryByText(FIND_SOL_UNAVAILABLE)).not.toBeNull();
        });
    });

    it("alternate constellation selection averages primary world positions and never uses celestialToSphere", async () => {
        getStarWorldPositionMock.mockImplementation((id: string) =>
            id === "betelgeuse"
                ? { x: 4, y: 0, z: 0 }
                : id === "rigel"
                  ? { x: 0, y: 0, z: 6 }
                  : null,
        );
        const { container } = mountAlternate(focusCatalog, undefined);
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        rendererCallbacks.onConstellationClick?.("orion");

        expect(setSelectedMock).toHaveBeenCalledWith("orion");
        // Average of {4,0,0} and {0,0,6} → {2,0,3}; r = hypot; pitch = asin(y/r)
        // = 0, yaw = atan2(2,3).
        expect(tweenCameraToMock).toHaveBeenCalledWith(
            0,
            Math.atan2(2, 3),
            900,
        );
        // The Earth-relative projection is banned in alternate mode.
        expect(celestialToSphereMock).not.toHaveBeenCalled();
        await waitFor(() => {
            expect(container.querySelector(".hud-panel")).not.toBeNull();
        });
    });

    it("alternate constellation selection averages only the available positions", async () => {
        getStarWorldPositionMock.mockImplementation((id: string) =>
            id === "rigel" ? { x: 0, y: 0, z: 6 } : null,
        );
        mountAlternate(focusCatalog, undefined);
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        rendererCallbacks.onConstellationClick?.("orion");

        expect(setSelectedMock).toHaveBeenCalledWith("orion");
        // Only rigel resolves: center {0,0,6} → pitch 0, yaw atan2(0,6) = 0.
        expect(tweenCameraToMock).toHaveBeenCalledWith(0, 0, 900);
        expect(celestialToSphereMock).not.toHaveBeenCalled();
    });

    it("alternate constellation selection with no available positions retains the selection without moving the camera", async () => {
        // beforeEach default: getStarWorldPositionMock returns null.
        mountAlternate(focusCatalog, undefined);
        await waitFor(() => {
            expect(initializePreparedCatalogsMock).toHaveBeenCalled();
        });

        rendererCallbacks.onConstellationClick?.("orion");

        // Selection details are retained...
        expect(setSelectedMock).toHaveBeenCalledWith("orion");
        // ...but there is nothing to point the camera at.
        expect(tweenCameraToMock).not.toHaveBeenCalled();
        expect(celestialToSphereMock).not.toHaveBeenCalled();
    });

    it("Return navigates to the localized constellation route without the observer param", async () => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog: preparedPrimaryCatalog,
                referenceCatalog: preparedReferenceCatalog,
                omittedStars: [],
            },
        });
        initializePreparedCatalogsMock.mockRejectedValueOnce(
            new Error("WebGL context creation failed"),
        );
        // jsdom ignores location.href assignments, so shadow window.location
        // with a plain object to capture the navigation target.
        const stubLocation = {
            href: "http://localhost/?observer=alpha-centauri",
            pathname: "/",
            search: "?observer=alpha-centauri",
        };
        Object.defineProperty(window, "location", {
            configurable: true,
            value: stubLocation,
        });

        try {
            const { queryByText } = render(ConstellationWrapper, {
                translations: OBSERVER_TRANSLATIONS,
            });
            await waitFor(() => {
                expect(queryByText("Return to Earth/Sol")).not.toBeNull();
            });

            fireEvent.click(queryByText("Return to Earth/Sol")!);

            expect(stubLocation.href).toBe(routes.constellation("en"));
            expect(stubLocation.href).not.toContain("observer=sol");
        } finally {
            delete (window as unknown as Record<string, unknown>).location;
        }
    });
});

describe("ConstellationWrapper observer HUD", () => {
    // Task 5: the alternate observer HUD renders from the REAL en dictionary
    // (no translations prop), so these tests pin the actual i18n wiring: the
    // 13 constellation.observer.* keys, the systems.${id}.name fallback, and
    // the locale-aware distance readout. URL "/" resolves lang "en".
    const OBSERVER_LABEL = "Observer";
    const OBSERVER_NAME = "Alpha Centauri System"; // systems.alpha-centauri.name
    const DISTANCE_LABEL = "Distance from Sol";
    const DISTANCE_VALUE = "4.247 ly"; // 4.2465.toLocaleString("en") + " ly"
    const FRAME_LABEL = "Frame: System barycenter";
    const DIRECTION_LABEL = "View direction";
    const REFERENCE_LABEL = "Show Earth/Sol reference";
    const FIND_SOL_LABEL = "Find Sol";
    const RETURN_LABEL = "Return to Earth/Sol";
    const EDUCATION_COPY =
        "Constellation lines preserve Earth cultural reference shapes; star brightness is approximate for this observer.";

    // Captured before the Return-navigation test shadows window.location (and
    // deletes it on teardown); restored per-test so renders can read it.
    const jsdomLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        if (!window.location) {
            Object.defineProperty(window, "location", {
                configurable: true,
                writable: true,
                value: jsdomLocation,
            });
        }
    });

    const mountAlternateHud = (
        primaryCatalog: PreparedConstellationCatalog,
        referenceCatalog: PreparedConstellationCatalog | undefined,
    ) => {
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog,
                referenceCatalog,
                omittedStars: [],
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");
        return render(ConstellationWrapper);
    };

    const openSettings = (container: HTMLElement) => {
        fireEvent.click(
            container.querySelector('button[aria-label="Settings"]')!,
        );
    };

    it("alternate mode shows the localized observer HUD and hides the Earth HUD", async () => {
        const { container, queryByText } = mountAlternateHud(
            focusCatalog,
            preparedReferenceCatalog,
        );
        await waitFor(() => {
            expect(container.querySelector(".hud-panel")).not.toBeNull();
        });

        // Observer readout: localized system name, locale-aware distance,
        // the combined frame string, and the neutral direction label.
        expect(queryByText(OBSERVER_LABEL)).not.toBeNull();
        expect(queryByText(OBSERVER_NAME)).not.toBeNull();
        expect(queryByText(DISTANCE_LABEL)).not.toBeNull();
        expect(container.textContent).toContain(DISTANCE_VALUE);
        expect(queryByText(FRAME_LABEL)).not.toBeNull();
        expect(queryByText(DIRECTION_LABEL)).not.toBeNull();
        // Education copy renders visibly.
        expect(queryByText(EDUCATION_COPY)).not.toBeNull();
        // The Return to Earth/Sol action lives in the alternate HUD panel.
        expect(queryByText(RETURN_LABEL)).not.toBeNull();

        // The reference checkbox and Find Sol (Task 4 controls) remain in the
        // settings panel — one copy each, integrated with the observer HUD.
        openSettings(container);
        await waitFor(() => {
            expect(queryByText(REFERENCE_LABEL)).not.toBeNull();
        });
        const findSolButton = Array.from(
            container.querySelectorAll("button"),
        ).find((button) => button.textContent?.includes(FIND_SOL_LABEL));
        expect(findSolButton).not.toBeUndefined();

        // Earth HUD elements are hidden: geolocation, UTC, compass/cardinal
        // wording, "View from Earth", and the month strip.
        expect(queryByText("GEO-LOCK")).toBeNull();
        expect(queryByText("UTC")).toBeNull();
        expect(queryByText("FACING")).toBeNull();
        expect(container.querySelector(".compass-readout")).toBeNull();
        expect(queryByText("View from Earth")).toBeNull();

        // The alternate constellation list iterates the prepared catalog
        // directly (the Earth visible list is empty in alternate mode).
        const orionRow = container.querySelector(
            'button[data-constellation-id="orion"]',
        );
        expect(orionRow).not.toBeNull();
        expect(orionRow?.textContent).toContain("Orion");

        // Selecting a prepared constellation shows its details WITHOUT the
        // Earth best-viewing-months strip.
        fireEvent.click(orionRow!);
        await waitFor(() => {
            expect(queryByText("Orion description")).not.toBeNull();
        });
        expect(container.querySelector(".hud-month-strip")).toBeNull();
    });

    it("alternate mode renders the numeric azimuth/elevation view direction without cardinal wording", async () => {
        // The HUD tick reads the camera once (synchronously on init; the
        // test rAF stub never fires the loop), so the readout reflects the
        // mocked renderer's azimuth/elevation deterministically.
        getCameraAzimuthMock.mockReturnValue(122.5);
        getCameraElevationMock.mockReturnValue(35);

        try {
            const { container } = mountAlternateHud(
                focusCatalog,
                preparedReferenceCatalog,
            );
            await waitFor(() => {
                expect(container.querySelector(".hud-panel")).not.toBeNull();
            });

            // The neutral direction readout renders the numeric
            // azimuth/elevation from the live HUD tick — no "—" placeholder.
            const directionRow = Array.from(
                container.querySelectorAll(".readout-row"),
            ).find((row) => row.textContent?.includes(DIRECTION_LABEL));
            expect(directionRow).not.toBeNull();
            const valueSpan = directionRow?.querySelector(".readout-value");
            // Math.round(122.5) % 360 → 123; elevation always signed → +35°.
            expect(valueSpan?.textContent).toBe("123° +35°");

            // Cardinal wording stays hidden in alternate mode: the compass
            // readout (the only cardinal-bearing element) is absent, and the
            // cardinalized compass string never appears anywhere.
            expect(container.querySelector(".compass-readout")).toBeNull();
            expect(container.textContent).not.toContain("N (123°)");
        } finally {
            getCameraAzimuthMock.mockReturnValue(0);
            getCameraElevationMock.mockReturnValue(0);
        }
    });

    it("alternate mode falls back to systems.unknown when the system name key is missing", async () => {
        // Inject a dictionary that lacks systems.alpha-centauri.name but has
        // the generic unknown-system copy, proving the name-fallback pattern
        // (raw key returned by t() → t("systems.unknown")).
        prepareAlternateObserverCatalogMock.mockReturnValue({
            ok: true,
            value: {
                primaryCatalog: preparedPrimaryCatalog,
                referenceCatalog: preparedReferenceCatalog,
                omittedStars: [],
            },
        });
        window.history.replaceState({}, "", "/?observer=alpha-centauri");

        const { container, queryByText } = render(ConstellationWrapper, {
            translations: { "systems.unknown": "Unknown System" },
        });

        await waitFor(() => {
            expect(container.querySelector(".hud-panel")).not.toBeNull();
        });
        expect(queryByText("Unknown System")).not.toBeNull();
        expect(queryByText(OBSERVER_NAME)).toBeNull();
    });

    it("Sol mode keeps the Earth HUD unchanged", async () => {
        window.history.replaceState({}, "", "/");
        const { container, queryByText } = render(ConstellationWrapper);

        await waitFor(() => {
            expect(container.querySelector(".hud-panel")).not.toBeNull();
        });

        // Earth HUD elements remain: geolocation, UTC, compass, and the
        // "View from Earth" note.
        expect(queryByText("GEO-LOCK")).not.toBeNull();
        expect(queryByText("UTC")).not.toBeNull();
        expect(queryByText("FACING")).not.toBeNull();
        expect(queryByText("View from Earth")).not.toBeNull();
        expect(container.querySelector(".compass-readout")).not.toBeNull();

        // Observer HUD elements are absent in Sol mode.
        expect(queryByText(OBSERVER_LABEL)).toBeNull();
        expect(queryByText(DISTANCE_LABEL)).toBeNull();
        expect(queryByText(FRAME_LABEL)).toBeNull();
        expect(queryByText(DIRECTION_LABEL)).toBeNull();
        expect(queryByText(EDUCATION_COPY)).toBeNull();
        expect(queryByText(RETURN_LABEL)).toBeNull();

        // The Earth month strip still appears when a constellation is
        // selected.
        const orionRow = container.querySelector(
            'button[data-constellation-id="orion"]',
        );
        expect(orionRow).not.toBeNull();
        fireEvent.click(orionRow!);
        await waitFor(() => {
            expect(container.querySelector(".hud-month-strip")).not.toBeNull();
        });
    });
});
