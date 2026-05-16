import { defaultLang, languages, showDefaultLang } from "./ui";

export type AppLocale = keyof typeof languages;

export const appLocales = Object.keys(languages) as AppLocale[];

export function isAppLocale(value: string | undefined): value is AppLocale {
    return Boolean(value && value in languages);
}

function normalizePath(pathname: string): string {
    if (!pathname || pathname === "/") return "/";
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return normalized.replace(/\/+$/, "") || "/";
}

export function getLocaleFromPath(pathname: string): AppLocale {
    const [, segment] = pathname.split("/");
    return isAppLocale(segment) ? segment : defaultLang;
}

export function stripLocaleFromPath(pathname: string): string {
    const normalized = normalizePath(pathname);
    const segments = normalized.split("/");

    if (isAppLocale(segments[1])) {
        const stripped = `/${segments.slice(2).join("/")}`;
        return normalizePath(stripped);
    }

    return normalized;
}

export function localizePath(pathname: string, locale: AppLocale): string {
    const canonicalPath = stripLocaleFromPath(pathname);
    if (!showDefaultLang && locale === defaultLang) {
        return canonicalPath;
    }

    return canonicalPath === "/" ? `/${locale}/` : `/${locale}${canonicalPath}`;
}

export function switchLocalePath(pathname: string, locale: AppLocale): string {
    return localizePath(stripLocaleFromPath(pathname), locale);
}

export const routes = {
    home: (locale: AppLocale) => localizePath("/", locale),
    galaxy: (locale: AppLocale) => localizePath("/galaxy", locale),
    constellation: (locale: AppLocale) =>
        localizePath("/constellation", locale),
    planetarySystem: (systemId: string, locale: AppLocale) =>
        localizePath(`/planetary/${systemId}`, locale),
    terrain: (planetId: string, locale: AppLocale) =>
        localizePath(`/planetary/terrain/${planetId}`, locale),
};
