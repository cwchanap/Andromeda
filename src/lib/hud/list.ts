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
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const clamped = Math.min(Math.max(1, Math.trunc(page)), totalPages);
    const start = (clamped - 1) * perPage;
    return {
        items: items.slice(start, start + perPage),
        page: clamped,
        totalPages,
    };
}

/** Formats a "02 / 04" page indicator. */
export function pageLabel(page: number, totalPages: number): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(page)} / ${pad(totalPages)}`;
}
