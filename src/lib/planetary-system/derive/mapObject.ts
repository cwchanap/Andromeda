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
