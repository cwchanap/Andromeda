export interface Star {
    id: string;
    name: string;
    // Celestial coordinates
    rightAscension: number; // RA in hours (0-24)
    declination: number; // Dec in degrees (-90 to +90)
    magnitude: number; // Apparent magnitude (lower is brighter)
    distance: number; // Distance in light years
    spectralClass: string; // O, B, A, F, G, K, M
    color: string; // CSS color for rendering
}

export interface Constellation {
    id: string;
    name: string;
    abbreviation: string; // IAU 3-letter code
    description: string;
    mythology?: string;
    stars: Star[];
    lines: number[][]; // Array of star index pairs to draw constellation lines
    visibility: {
        hemisphere: "northern" | "southern" | "both";
        bestMonths: number[]; // 1-12 for January-December
        minLatitude: number; // Minimum latitude to see constellation
        maxLatitude: number; // Maximum latitude to see constellation
    };
}

export interface LocationData {
    latitude: number;
    longitude: number;
    timezone: string;
    accuracy?: number;
}

export interface SkyConfiguration {
    location: LocationData;
    dateTime: Date;
    fieldOfView: number; // In degrees
    showConstellationLines: boolean;
    showStarNames: boolean;
    minimumMagnitude: number; // Only show stars brighter than this
}

export interface ConstellationViewState {
    loading: boolean;
    error: string | null;
    skyConfig: SkyConfiguration | null;
    visibleConstellations: string[];
    selectedConstellation: string | null;
    locationPermissionGranted: boolean;
}
