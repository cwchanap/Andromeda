export type CsvObjectType =
    | "star"
    | "planet"
    | "planet_candidate"
    | "brown_dwarf"
    | "satellite";
export type BodyStatus = "confirmed" | "candidate" | "controversial";

export function mapBodyType(
    csvObjectType: CsvObjectType,
): "star" | "planet" | "brown-dwarf" | "moon" {
    switch (csvObjectType) {
        case "star":
            return "star";
        case "planet":
        case "planet_candidate":
            return "planet";
        case "brown_dwarf":
            return "brown-dwarf";
        case "satellite":
            return "moon";
    }
}

/**
 * Derive the canonical body status from CSV columns.
 *
 * `object_type` is authoritative: a `planet_candidate` row is always a
 * candidate regardless of the free-text status cell (e.g. Proxima Centauri c
 * has status "candidate/disputed - not counted" but is classified via its
 * object_type).
 *
 * For `planet` rows the status cell is parsed. Note that "disputed" and
 * "controversial" are treated as synonyms — both indicate that the object's
 * existence is debated (distinct from "candidate", which means insufficient
 * evidence to even claim existence). The CSV's combined phrasing
 * "candidate/disputed" is descriptive prose, not canonical status.
 */
export function parseStatus(
    statusCell: string,
    csvObjectType: CsvObjectType,
): BodyStatus {
    if (csvObjectType === "planet_candidate") return "candidate";
    const s = (statusCell ?? "").toLowerCase();
    if (s.includes("disputed") || s.includes("controversial"))
        return "controversial";
    if (s.includes("candidate")) return "candidate";
    return "confirmed";
}
