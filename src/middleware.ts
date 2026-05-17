import { defineMiddleware } from "astro:middleware";
import { normalizeCanonicalPath } from "@/utils/pathUtils";

export const onRequest = defineMiddleware((context, next) => {
    const url = new URL(context.request.url);

    if (url.pathname === "/en" || url.pathname.startsWith("/en/")) {
        const rawPath = url.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
        const canonicalPath = normalizeCanonicalPath(rawPath);
        return context.redirect(`${canonicalPath}${url.search}`, 301);
    }

    return next();
});
