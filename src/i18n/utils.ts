import { ui, defaultLang, type UiKey } from "./ui";
import {
    getLocaleFromPath,
    isAppLocale,
    localizePath,
    stripLocaleFromPath,
    type AppLocale,
} from "./routes";

export function getLangFromUrl(url: URL, currentLocale?: string): AppLocale {
    if (isAppLocale(currentLocale)) return currentLocale;
    return getLocaleFromPath(url.pathname);
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(
        key: UiKey,
        replacements?: Record<string, string>,
    ): string {
        let text: string = ui[lang][key] || ui[defaultLang][key];

        if (replacements) {
            Object.entries(replacements).forEach(([placeholder, value]) => {
                text = text.replace(`{${placeholder}}`, value);
            });
        }

        return text;
    };
}

export function useTranslatedPath(lang: keyof typeof ui) {
    return function translatePath(path: string, l: keyof typeof ui = lang) {
        return localizePath(path, l);
    };
}

export function getStaticPaths() {
    return Object.keys(ui).map((lang) => ({ params: { lang } }));
}

export function pathHasLocale(pathname: string) {
    const segments = pathname.split("/");
    return segments.length > 1 && isAppLocale(segments[1]);
}

export function addLocaleToPath(pathname: string, locale: keyof typeof ui) {
    return localizePath(pathname, locale);
}

export { stripLocaleFromPath };
