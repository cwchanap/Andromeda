import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/svelte";
import ConstellationWrapper from "@/components/ConstellationWrapper.svelte";
import type { Constellation } from "@/types/constellation";
import type { PreparedConstellationCatalog } from "@/lib/constellation/observerCatalog";

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
