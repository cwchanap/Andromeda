import type { LocationData } from "../types/constellation";

/**
 * Converts Right Ascension and Declination to 3D sphere coordinates for 360-degree sky viewing
 * @param ra Right Ascension in hours (0-24)
 * @param dec Declination in degrees (-90 to +90)
 * @param location Observer's location
 * @param dateTime Current date and time
 * @param radius Sphere radius for 3D positioning
 * @returns {x, y, z, visible} 3D coordinates and visibility
 */
export function celestialToSphere(
    ra: number,
    dec: number,
    location: LocationData,
    dateTime: Date,
    radius: number = 100,
): { x: number; y: number; z: number; visible: boolean } {
    // Convert to radians
    const raRad = (ra / 24) * 2 * Math.PI;
    const decRad = (dec * Math.PI) / 180;
    const latRad = (location.latitude * Math.PI) / 180;

    // Calculate Local Sidereal Time for accurate star positioning
    const jd = julianDate(dateTime);
    const gst = greenwichSiderealTime(jd);
    const lst = gst + location.longitude / 15;
    const lstRad = ((lst % 24) / 24) * 2 * Math.PI;

    // Calculate Hour Angle (how far the star is from the observer's meridian)
    const ha = lstRad - raRad;

    // Convert to horizontal coordinates (altitude and azimuth)
    const alt = Math.asin(
        Math.sin(decRad) * Math.sin(latRad) +
            Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha),
    );

    const azimuth = Math.atan2(
        -Math.sin(ha) * Math.cos(decRad),
        Math.tan(decRad) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(ha),
    );

    // All stars are considered "visible" for 360-degree viewing
    // The observer can look in any direction to see the entire celestial sphere
    const visible = true;

    // Convert horizontal coordinates to 3D Cartesian coordinates
    // Using standard astronomy coordinate system where:
    // - Y is up (zenith)
    // - X and Z form the horizontal plane
    // - Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
    const x = radius * Math.cos(alt) * Math.sin(azimuth);
    const y = radius * Math.sin(alt); // Altitude: 0 = horizon, π/2 = zenith, -π/2 = nadir
    const z = radius * Math.cos(alt) * Math.cos(azimuth);

    return { x, y, z, visible };
}

/**
 * Converts Right Ascension and Declination to screen coordinates (legacy)
 * @param ra Right Ascension in hours (0-24)
 * @param dec Declination in degrees (-90 to +90)
 * @param location Observer's location
 * @param dateTime Current date and time
 * @param screenWidth Screen width in pixels
 * @param screenHeight Screen height in pixels
 * @returns {x, y, visible} coordinates and visibility
 */
export function celestialToScreen(
    ra: number,
    dec: number,
    location: LocationData,
    dateTime: Date,
    screenWidth: number,
    screenHeight: number,
): { x: number; y: number; visible: boolean } {
    // Get 3D coordinates first
    const sphere = celestialToSphere(ra, dec, location, dateTime, 50);

    // Project to screen (simplified stereographic projection)
    const x = screenWidth / 2 + (sphere.x / sphere.z) * screenWidth * 0.3;
    const y = screenHeight / 2 - (sphere.y / sphere.z) * screenHeight * 0.3;

    return { x, y, visible: sphere.visible };
}

/**
 * Calculate Julian Date for astronomical calculations
 */
function julianDate(date: Date): number {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const min = date.getMinutes();
    const s = date.getSeconds();

    const a = Math.floor((14 - m) / 12);
    const yr = y + 4800 - a;
    const mn = m + 12 * a - 3;

    const jdn =
        d +
        Math.floor((153 * mn + 2) / 5) +
        365 * yr +
        Math.floor(yr / 4) -
        Math.floor(yr / 100) +
        Math.floor(yr / 400) -
        32045;

    const jd = jdn + (h - 12) / 24 + min / 1440 + s / 86400;

    return jd;
}

/**
 * Calculate Greenwich Sidereal Time
 */
function greenwichSiderealTime(jd: number): number {
    const t = (jd - 2451545.0) / 36525;

    let gst =
        280.46061837 +
        360.98564736629 * (jd - 2451545.0) +
        0.000387933 * t * t -
        (t * t * t) / 38710000;

    // Normalize to 0-360 degrees
    gst = gst % 360;
    if (gst < 0) gst += 360;

    // Convert to hours
    return gst / 15;
}

/**
 * Get current geolocation using browser API
 */
export function getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser"));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000, // Reduced timeout to 5 seconds
            maximumAge: 300000, // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                reject(new Error(`Geolocation error: ${error.message}`));
            },
            options,
        );
    });
}

/**
 * Calculate star brightness based on magnitude
 * @param magnitude Apparent magnitude (lower is brighter)
 * @returns Opacity value between 0 and 1
 */
export function magnitudeToOpacity(magnitude: number): number {
    // Visible magnitude range is roughly -1.5 to +6
    // Clamp and invert (lower magnitude = higher brightness)
    const clampedMag = Math.max(-1.5, Math.min(6, magnitude));
    const normalized = (6 - clampedMag) / 7.5; // 0 to 1
    return Math.pow(normalized, 0.6); // Apply slight curve for better visual distribution
}

/**
 * Calculate star size based on magnitude
 * @param magnitude Apparent magnitude
 * @returns Size in pixels
 */
export function magnitudeToSize(magnitude: number): number {
    const opacity = magnitudeToOpacity(magnitude);
    return Math.max(1, opacity * 8 + 2); // 1 to 10 pixels
}

/**
 * Check if a constellation is currently visible
 * @param constellation The constellation to check
 * @param location Observer's location
 * @param dateTime Current date and time
 * @returns True if any stars of the constellation are visible
 */
export function isConstellationVisible(
    constellation: { stars: { rightAscension: number; declination: number }[] },
    location: LocationData,
    dateTime: Date,
): boolean {
    return constellation.stars.some((star) => {
        const coords = celestialToScreen(
            star.rightAscension,
            star.declination,
            location,
            dateTime,
            1000, // dummy screen size
            1000,
        );
        return coords.visible;
    });
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(ra: number, dec: number): string {
    const raHours = Math.floor(ra);
    const raMinutes = Math.floor((ra - raHours) * 60);
    const raSeconds = Math.floor(((ra - raHours) * 60 - raMinutes) * 60);

    const decDegrees = Math.floor(Math.abs(dec));
    const decMinutes = Math.floor((Math.abs(dec) - decDegrees) * 60);
    const decSeconds = Math.floor(
        ((Math.abs(dec) - decDegrees) * 60 - decMinutes) * 60,
    );
    const decSign = dec >= 0 ? "+" : "-";

    return `RA ${raHours}h ${raMinutes}m ${raSeconds}s, Dec ${decSign}${decDegrees}° ${decMinutes}' ${decSeconds}"`;
}
