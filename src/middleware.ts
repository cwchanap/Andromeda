import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
    const url = new URL(context.request.url);

    // Redirect /planetary/* to /en/planetary/*
    if (url.pathname.startsWith("/planetary/")) {
        const newPath = url.pathname.replace("/planetary/", "/en/planetary/");
        return context.redirect(newPath, 301); // 301 for permanent redirect
    }

    return next();
});
