import { stripLocaleFromPath } from "@/i18n/routes";

export type ViewId = "star" | "galaxy" | "constellation";

export function getCurrentView(pathname: string): ViewId | null {
    const p = stripLocaleFromPath(pathname || "/");
    // Boundary-aware matching: a segment must be followed by "/" or end-of-string
    // so paths like "/galaxynews" or "/planetary-info" don't match.
    const matches = (seg: string) =>
        p === `/${seg}` || p.startsWith(`/${seg}/`);
    if (matches("galaxy")) return "galaxy";
    if (matches("constellation")) return "constellation";
    if (matches("planetary")) return "star";
    return null;
}
