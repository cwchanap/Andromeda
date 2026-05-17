// @ts-check
import { URL } from "node:url";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import { patchVercelOutputConfig } from "./src/i18n/vercelFallbackRoutes.js";

/** @type {["en", "zh", "ja"]} */
const locales = ["en", "zh", "ja"];
/** @type {"en"} */
const defaultLocale = "en";
/** @type {{ zh: "en"; ja: "en" }} */
const fallbackLocales = {
  zh: defaultLocale,
  ja: defaultLocale,
};

/**
 * @typedef {ReturnType<typeof vercel>} VercelAdapter
 * @typedef {NonNullable<VercelAdapter["hooks"]["astro:config:done"]>} ConfigDoneHook
 * @typedef {NonNullable<VercelAdapter["hooks"]["astro:routes:resolved"]>} RoutesResolvedHook
 * @typedef {NonNullable<VercelAdapter["hooks"]["astro:build:done"]>} BuildDoneHook
 */

/**
 * @param {Parameters<typeof vercel>[0]} [options]
 * @returns {VercelAdapter}
 */
function vercelWithLocaleRoutes(options) {
  const adapter = vercel(options);
  /** @type {URL | undefined} */
  let root;
  /** @type {Parameters<RoutesResolvedHook>[0]["routes"]} */
  let routes = [];

  /** @param {Parameters<ConfigDoneHook>[0]} hookOptions */
  const onConfigDone = (hookOptions) => {
    root = hookOptions.config.root;
    return adapter.hooks["astro:config:done"]?.(hookOptions);
  };

  /** @param {Parameters<RoutesResolvedHook>[0]} hookOptions */
  const onRoutesResolved = (hookOptions) => {
    routes = hookOptions.routes;
    return adapter.hooks["astro:routes:resolved"]?.(hookOptions);
  };

  /** @param {Parameters<BuildDoneHook>[0]} hookOptions */
  const onBuildDone = (hookOptions) => {
    return Promise.resolve(
      adapter.hooks["astro:build:done"]?.(hookOptions),
    ).then(() => {
      if (!root) {
        throw new Error(
          "Vercel adapter config hook did not provide a root URL.",
        );
      }

      patchVercelOutputConfig({
        configPath: new URL("./.vercel/output/config.json", root),
        routes,
        locales,
        logger: hookOptions.logger,
      });
    });
  };

  return {
    ...adapter,
    hooks: {
      ...adapter.hooks,
      "astro:config:done": onConfigDone,
      "astro:routes:resolved": onRoutesResolved,
      "astro:build:done": onBuildDone,
    },
  };
}

// https://astro.build/config
export default defineConfig({
  server: {
    port: 3600,
  },
  trailingSlash: "ignore",
  output: "server",
  adapter: vercelWithLocaleRoutes(),
  integrations: [svelte()],
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
  },
  i18n: {
    defaultLocale,
    locales,
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true,
      fallbackType: "rewrite",
    },
    fallback: fallbackLocales,
  },
});
