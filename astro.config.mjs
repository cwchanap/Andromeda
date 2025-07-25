// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), svelte()],
  vite: {
    // @ts-expect-error - this is a valid configuration for Astro
    plugins: [tailwindcss()],
  },
});
