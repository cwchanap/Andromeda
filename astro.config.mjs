// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  trailingSlash: "always",
  output: "server",
  adapter: vercel(),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "ja"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true,
      fallbackType: "redirect",
    },
    fallback: {
      zh: "en",
      ja: "en",
    },
  },
});
