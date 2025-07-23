// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    // @ts-expect-error - this is a valid configuration for Astro
    plugins: [tailwindcss()],
  },
});
