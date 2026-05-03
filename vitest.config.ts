import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { PluginOption } from "vite";

export default defineConfig({
    plugins: [
        svelte({
            hot: !process.env.VITEST,
            compilerOptions: { dev: true },
        }) as unknown as PluginOption,
    ],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.{test,spec}.{js,ts,svelte}"],
        exclude: ["node_modules", "dist", ".astro"],
        coverage: {
            reporter: ["text", "json", "html", "json-summary"],
            exclude: [
                "node_modules/",
                "src/test/",
                "src/**/__tests__/**",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/*.test.js",
                "**/*.spec.js",
                "**/*.config.*",
                "**/*.d.ts",
                "dist/",
                ".astro/",
                "e2e/",
                "src/pages/**",
                "src/layouts/**",
                "src/middleware.ts",
                ".prettierrc.mjs",
                "src/types/**",
                "src/lib/galaxy/types.ts",
                "src/lib/planetary-system/types.ts",
                "src/lib/planetary-system/graphics/types.ts",
            ],
            thresholds: {
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
            },
        },
        // Mock Three.js for testing
        deps: {
            inline: ["three"],
        },
    },
    resolve: {
        alias: {
            "@": "/src",
        },
        conditions: ["browser"],
    },
});
