import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing expected ${label} snippet`);
  }
  return source.replace(before, after);
}

function updateFile(path, transform) {
  const source = readFileSync(path, "utf8");
  const updated = transform(source);
  if (updated !== source) writeFileSync(path, updated);
}

updateFile("src/components/GalaxyWrapper.svelte", (source) =>
  replaceRequired(
    source,
    `                    <div class="dialog-actions dialog-primary-actions">
                        <button
                            type="button"
                            class="action-button primary"
                            aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}
                            aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}
                            on:click={navigateToObserverSky}
                        >
                            {t('action.viewSkyFromHere')}
                        </button>
                        <button
                            class="action-button secondary"
                            on:click={() => navigateToSystem(selectedSystemId!)}
                        >`,
    `                    <div class="dialog-actions dialog-primary-actions">
                        <button
                            type="button"
                            class="action-button secondary"
                            aria-disabled={observerEligibility?.eligible === false ? 'true' : undefined}
                            aria-describedby={observerEligibility?.eligible === false ? 'galaxy-sky-unavailable' : undefined}
                            on:click={navigateToObserverSky}
                        >
                            {t('action.viewSkyFromHere')}
                        </button>
                        <button
                            class="action-button primary"
                            on:click={() => navigateToSystem(selectedSystemId!)}
                        >`,
    "Galaxy action hierarchy",
  ),
);

updateFile("src/components/__tests__/GalaxyWrapper.test.ts", (source) => {
  let updated = replaceRequired(
    source,
    `    it("keeps the primary observer action above the scrollable details body", async () => {`,
    `    it("keeps the fixed product actions above the scrollable details body", async () => {`,
    "Galaxy hierarchy test title",
  );
  updated = replaceRequired(
    updated,
    `        expect(actions[0].classList.contains("primary")).toBe(true);
        expect(actions[1].classList.contains("secondary")).toBe(true);`,
    `        expect(actions[0].classList.contains("secondary")).toBe(true);
        expect(actions[1].classList.contains("primary")).toBe(true);`,
    "Galaxy hierarchy assertions",
  );
  return updated;
});

updateFile("docs/superpowers/plans/2026-08-05-hpa-564-observer-switching.md", (source) => {
  let updated = replaceRequired(
    source,
    `**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its primary actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries.`,
    `**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its product actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries. ViewSwitcher already links to Galaxy; the dedicated **Choose another observer** action remains intentional because it exposes a labeled reselection exit beside **Return to Earth/Sol** without teaching users to reinterpret generic view navigation.`,
    "architecture rationale",
  );
  updated = replaceRequired(
    updated,
    `**Tech Stack:** Astro, Svelte 5, TypeScript, Vitest, Testing Library, existing i18n dictionaries and route helpers.`,
    `**Tech Stack:** Astro, Svelte 5, TypeScript, Vitest, Testing Library, Playwright, existing i18n dictionaries and route helpers.`,
    "tech stack",
  );
  updated = replaceRequired(
    updated,
    `- Preserve focusable \`aria-disabled\` behavior for ineligible Galaxy systems.
- Keep \`Return to Earth/Sol\` as the canonical query-free reset.
- HPA-436 owns the cross-view Playwright journey and shipping cleanup coverage.

---`,
    `- Preserve focusable \`aria-disabled\` behavior for ineligible Galaxy systems.
- Preserve the HPA-432 product hierarchy: **View sky from here** remains secondary and **Explore / Coming Soon** remains primary. HPA-564 changes placement only: the header close control stays separate while the two product actions move above the scrollable details body.
- Keep \`Return to Earth/Sol\` as the canonical query-free reset.
- HPA-436 owns the cross-view Playwright journey and shipping cleanup coverage.

## Risks and Exit Dependencies

- **Cross-view loop:** HPA-564 verifies each component boundary, but the complete Galaxy → observer sky → Choose another observer → Galaxy journey remains unproven until HPA-436. HPA-436 must assert that the keyboard-reachable action returns to the localized Galaxy route without an \`observer\` query.
- **Dialog prominence regression:** Future flex or overflow edits could hide the fixed action row again. The existing narrow-viewport Galaxy dialog Playwright test is the regression net and must keep targeting the header close control plus \`.dialog-primary-actions\`.

---`,
    "risks section",
  );
  updated = replaceRequired(
    updated,
    `- Produces: \`.dialog-primary-actions\` before \`.dialog-content\`, with View Sky primary and Explore secondary.`,
    `- Produces: \`.dialog-primary-actions\` before \`.dialog-content\`, with View Sky first but secondary and Explore / Coming Soon second but primary, preserving HPA-432 product priority.`,
    "Task 1 output",
  );
  updated = replaceRequired(
    updated,
    `- [x] Write a failing component test asserting the fixed action row precedes the details body and has the desired hierarchy.`,
    `- [x] Write a failing component test asserting the fixed action row precedes the details body and preserves the HPA-432 hierarchy.`,
    "Task 1 test step",
  );
  updated = replaceRequired(
    updated,
    `- [x] Run the existing Playwright suite in GitHub Actions.`,
    `- [x] Update the existing narrow-viewport Galaxy dialog Playwright selectors for the separate header close control and two-button fixed action row, then run the full Playwright suite in GitHub Actions.`,
    "Playwright verification",
  );
  return updated;
});
