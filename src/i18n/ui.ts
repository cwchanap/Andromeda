import { en } from "./en";
import { zh } from "./zh";
import { ja } from "./ja";

export const languages = {
    en: "English",
    zh: "中文",
    ja: "日本語",
};

export const defaultLang = "en";
export const showDefaultLang = false;

export const ui = { en, zh, ja } as const;

export type UiKey = keyof (typeof ui)[typeof defaultLang];
