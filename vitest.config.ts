import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
    plugins: [
        svelte({ hot: !process.env.VITEST, compilerOptions: { dev: true } }),
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
                "**/*.config.*",
                "**/*.d.ts",
                "dist/",
                ".astro/",
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
