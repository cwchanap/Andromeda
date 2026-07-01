import { stripLocaleFromPath } from "@/i18n/routes";

export type ViewId = "star" | "galaxy" | "constellation";

export function getCurrentView(pathname: string): ViewId | null {
    const p = stripLocaleFromPath(pathname || "/");
    if (p.startsWith("/galaxy")) return "galaxy";
    if (p.startsWith("/constellation")) return "constellation";
    if (p.startsWith("/planetary")) return "star";
    return null;
}
