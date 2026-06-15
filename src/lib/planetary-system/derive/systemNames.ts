export const SYSTEM_NAMES: readonly string[] = [
    "Alpha Centauri / Proxima Centauri",
    "Barnard's Star",
    "Lalande 21185",
    "Luyten's Star / GJ 273",
    "Wolf 1061",
    "Gliese 887 / Lacaille 9352",
    "Ross 128",
    "Gliese 725",
    "GJ 1061",
    "Gliese 832",
    "GJ 1002",
    "Gliese 687",
    "TZ Arietis",
    "GJ 3323",
    "Teegarden's Star",
    "Gliese 625",
    "Gliese 338",
    "82 G. Eridani / HD 20794",
    "Epsilon Eridani",
    "Epsilon Indi",
    "Groombridge 34 / Gliese 15",
    "Gliese 251",
    "HN Librae",
    "Gliese 752",
    "Gliese 581",
    "Gliese 876",
    "EQ Pegasi",
    "Gliese 674",
    "HD 219134",
    "YZ Ceti",
] as const;

import systemCoordinatesCsv from "@/data/system_coordinates.csv?raw";
import { parseCsvRows } from "./parseCsv";

export interface SystemCoordinate {
    ra: number;
    dec: number;
}

export function loadCoordinates(): Record<string, SystemCoordinate> {
    const rows = parseCsvRows(systemCoordinatesCsv);
    const result: Record<string, SystemCoordinate> = {};
    for (let i = 1; i < rows.length; i++) {
        const parts = rows[i];
        // RA and DEC are always the last two columns and are always numeric,
        // so parse from the end. This stays correct even if a system name
        // contains a comma, unlike a naive [0]/[1]/[2] index split.
        if (parts.length >= 3) {
            const dec = parseFloat(parts[parts.length - 1]);
            const ra = parseFloat(parts[parts.length - 2]);
            if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
            const name = parts.slice(0, -2).join(",");
            result[name] = { ra, dec };
        }
    }
    return result;
}
