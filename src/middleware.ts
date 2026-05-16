import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
    const url = new URL(context.request.url);

    if (url.pathname === "/en" || url.pathname.startsWith("/en/")) {
        const canonicalPath = url.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
        return context.redirect(`${canonicalPath}${url.search}`, 301);
    }

    return next();
});
