import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: ["dist", ".astro", ".vercel"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginAstro.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      // override/add rules settings here, such as:
      // "no-unused-vars": "warn"
    },
  },
);
