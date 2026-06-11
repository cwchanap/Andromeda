/** Pure helpers for HUD search filtering and client-side pagination. */

/** True if the trimmed query is empty or appears (case-insensitively) in any field. */
export function matchesQuery(
    query: string,
    fields: Array<string | null | undefined>,
): boolean {
    const q = query.trim().toLowerCase();
    if (q === "") return true;
    return fields.some(
        (f) => typeof f === "string" && f.toLowerCase().includes(q),
    );
}

export interface PageResult<T> {
    items: T[];
    page: number;
    totalPages: number;
}

/** Slice `items` for a 1-based `page`, clamping out-of-range pages into [1, totalPages]. */
export function paginate<T>(
    items: T[],
    page: number,
    perPage: number,
): PageResult<T> {
    const size = Math.max(1, Math.trunc(perPage));
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const clamped = Math.min(Math.max(1, Math.trunc(page)), totalPages);
    const start = (clamped - 1) * size;
    return {
        items: items.slice(start, start + size),
        page: clamped,
        totalPages,
    };
}

/** Formats a "02 / 04" page indicator. Pads to match the widest number. */
export function pageLabel(page: number, totalPages: number): string {
    const width = Math.max(String(page).length, String(totalPages).length, 2);
    const pad = (n: number) => String(n).padStart(width, "0");
    return `${pad(page)} / ${pad(totalPages)}`;
}
