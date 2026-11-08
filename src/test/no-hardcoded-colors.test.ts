import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guards the Observatory theme: component styles must read colors from the
 * tokens in src/styles/tokens.css (via var(--color-*)), never hard-code them.
 */
const ROOT = join(process.cwd(), "src/components");
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;

function svelteFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            return name === "__tests__" ? [] : svelteFiles(path);
        }
        return name.endsWith(".svelte") ? [path] : [];
    });
}

describe("theme tokens", () => {
    it("keeps color literals out of component <style> blocks", () => {
        const offenders: string[] = [];
        for (const file of svelteFiles(ROOT)) {
            const source = readFileSync(file, "utf8");
            for (const [, css] of source.matchAll(
                /<style[^>]*>([\s\S]*?)<\/style>/g,
            )) {
                const hits = css.match(COLOR_LITERAL);
                if (hits)
                    offenders.push(
                        `${relative(ROOT, file)}: ${hits.join(", ")}`,
                    );
            }
        }
        expect(offenders).toEqual([]);
    });
});
