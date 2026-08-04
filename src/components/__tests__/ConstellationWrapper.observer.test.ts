import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/svelte";
import ConstellationWrapper from "@/components/ConstellationWrapper.svelte";
import type { Constellation } from "@/types/constellation";
import type {
    OmittedStarDiagnostic,
    PreparedConstellationCatalog,
} from "@/lib/constellation/observerCatalog";
import type { ResolvedObserverState } from "@/lib/constellation/observerRouteState";

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
};

const FALLBACK_NOTICE = "Observer unavailable; showing the sky from Earth/Sol.";
const OMISSION_NOTICE = "Some catalog stars could not be displayed.";

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
    fullConstellations,
    preparedPrimaryCatalog,
    preparedReferenceCatalog,
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
    return {
        getCurrentLocationMock: vi.fn(),
        getVisibleConstellationsMock: vi.fn(),
        prepareAlternateObserverCatalogMock: vi.fn(),
        initializeMock: vi.fn().mockResolvedValue(undefined),
        initializePreparedCatalogsMock: vi.fn().mockResolvedValue(undefined),
        resolveObserverStateMock: vi.fn(),
        fullConstellations,
        preparedPrimaryCatalog,
        preparedReferenceCatalog,
    };
});

// Mock legacy/prepared renderer initialization
vi.mock("@/lib/constellation/ConstellationRenderer", () => {
    const mockRenderer = {
        initialize: initializeMock,
        initializePreparedCatalogs: initializePreparedCatalogsMock,
        dispose: vi.fn(),
        resize: vi.fn(),
        setSelected: vi.fn(),
        setHovered: vi.fn(),
        tweenCameraTo: vi.fn(),
        worldToScreen: vi.fn(() => ({ x: 0, y: 0, visible: false })),
        getCameraAzimuth: vi.fn(() => 0),
        getCameraElevation: vi.fn(() => 0),
        setLabelsVisible: vi.fn(),
        setAutoRotate: vi.fn(),
        setAutoRotateSpeed: vi.fn(),
        setReducedMotion: vi.fn(),
    };
    return {
        ConstellationRenderer: vi.fn().mockImplementation(() => mockRenderer),
    };
});

// Mock HPA-433 preparation
vi.mock("@/lib/constellation/observerCatalog", () => ({
    prepareAlternateObserverCatalog: prepareAlternateObserverCatalogMock,
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
    celestialToSphere: vi.fn(() => ({ x: 0, y: 0, z: 100, visible: true })),
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
