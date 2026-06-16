export interface SystemCsvRow {
    system_rank: number;
    system_name: string;
    distance_from_earth_ly: number;
    number_of_stars: number;
    number_of_known_exoplanets: number;
    constellation: string;
    object_name: string;
    object_type: string;
    host_object: string;
    status: string;
    spectral_classification: string;
    diameter_km: number | undefined;
    diameter_basis: string;
    surface_temperature_K: number | undefined;
    surface_temperature_C: number | undefined;
    surface_temperature_basis: string;
    orbital_period_days: number | undefined;
    orbital_period_basis: string;
    composition: string;
    distance_from_system_center_AU: number | undefined;
    distance_basis: string;
    planet_mass_earth_masses: number | undefined;
    planet_radius_earth_radii: number | undefined;
    coordinate_frame: string;
    notes: string;
    source_url: string;
}

export function parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    const n = text.length;
    let i = 0;

    while (i < n) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < n && text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i += 1;
                }
            } else {
                field += ch;
                i += 1;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            i += 1;
        } else if (ch === ",") {
            row.push(field);
            field = "";
            i += 1;
        } else if (ch === "\r") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            i += text[i + 1] === "\n" ? 2 : 1;
        } else if (ch === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            i += 1;
        } else {
            field += ch;
            i += 1;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

function isEmptyRow(row: string[]): boolean {
    return row.length === 0 || row.every((cell) => cell === "");
}

function toSystemCsvRow(row: string[]): SystemCsvRow {
    const cell = (index: number): string => row[index] ?? "";
    const numberOrUndefined = (index: number): number | undefined => {
        const value = cell(index);
        if (value === "" || value === "N/A") return undefined;
        const num = Number(value);
        return Number.isNaN(num) ? undefined : num;
    };

    // Required numeric columns: a blank or garbage cell must fail loudly at
    // the parse boundary rather than silently becoming 0/NaN (Number("")===0
    // is finite, so we must reject empties explicitly). A silent 0/NaN would
    // collapse bad-rank rows into one Map group, default deriveSystemType to
    // "multiple", or surface "NaN light-years" downstream. Mirrors the
    // existing throw for invalid object_type in buildBody.
    const requiredNumber = (index: number, fieldName: string): number => {
        const value = cell(index);
        const trimmed = value.trim();
        const num = Number(trimmed);
        if (trimmed === "" || !Number.isFinite(num)) {
            const system = cell(1) || "(unknown system)";
            const object = cell(6) || "(unknown object)";
            throw new Error(
                `CSV parse error: required numeric field "${fieldName}" is "${value}" (row for object "${object}" in system "${system}")`,
            );
        }
        return num;
    };

    return {
        system_rank: requiredNumber(0, "system_rank"),
        system_name: cell(1),
        distance_from_earth_ly: requiredNumber(2, "distance_from_earth_ly"),
        number_of_stars: requiredNumber(3, "number_of_stars"),
        number_of_known_exoplanets: requiredNumber(
            4,
            "number_of_known_exoplanets",
        ),
        constellation: cell(5),
        object_name: cell(6),
        object_type: cell(7),
        host_object: cell(8),
        status: cell(9),
        spectral_classification: cell(10),
        diameter_km: numberOrUndefined(11),
        diameter_basis: cell(12),
        surface_temperature_K: numberOrUndefined(13),
        surface_temperature_C: numberOrUndefined(14),
        surface_temperature_basis: cell(15),
        orbital_period_days: numberOrUndefined(16),
        orbital_period_basis: cell(17),
        composition: cell(18),
        distance_from_system_center_AU: numberOrUndefined(19),
        distance_basis: cell(20),
        planet_mass_earth_masses: numberOrUndefined(21),
        planet_radius_earth_radii: numberOrUndefined(22),
        coordinate_frame: cell(23),
        notes: cell(24),
        source_url: cell(25),
    };
}

export function parseSystemsCsv(text: string): SystemCsvRow[] {
    const rows = parseCsvRows(text);
    if (rows.length <= 1) {
        return [];
    }

    return rows
        .slice(1)
        .filter((row) => !isEmptyRow(row))
        .map(toSystemCsvRow);
}
