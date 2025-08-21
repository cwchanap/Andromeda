import { ui, defaultLang, showDefaultLang, type UiKey } from "./ui";

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split("/");
    if (lang in ui) return lang as keyof typeof ui;
    return defaultLang;
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
        return !showDefaultLang && l === defaultLang ? path : `/${l}${path}`;
    };
}

export function getStaticPaths() {
    return Object.keys(ui).map((lang) => ({ params: { lang } }));
}

export function pathHasLocale(pathname: string) {
    const segments = pathname.split("/");
    return segments.length > 1 && segments[1] in ui;
}

export function stripLocaleFromPath(pathname: string) {
    const segments = pathname.split("/");
    if (segments.length > 1 && segments[1] in ui) {
        return "/" + segments.slice(2).join("/");
    }
    return pathname;
}

export function addLocaleToPath(pathname: string, locale: keyof typeof ui) {
    if (!showDefaultLang && locale === defaultLang) {
        return pathname;
    }
    return `/${locale}${pathname}`;
}
