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
  if (updated === source) {
    throw new Error(`No changes produced for ${path}`);
  }
  writeFileSync(path, updated);
}

updateFile("src/components/GalaxyWrapper.svelte", (source) => {
  source = replaceRequired(
    source,
    'class="dialog-actions dialog-primary-actions"',
    'class="dialog-actions"',
    "Galaxy action-row class",
  );
  return replaceRequired(
    source,
    ".dialog-content { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; padding-right: 4px; }",
    ".dialog-content { display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 6rem; overflow-y: auto; padding-right: 4px; }",
    "Galaxy dialog-content flex sizing",
  );
});

updateFile("src/components/__tests__/GalaxyWrapper.test.ts", (source) =>
  replaceRequired(
    source,
    ".system-dialog .dialog-primary-actions",
    ".system-dialog .dialog-actions",
    "Galaxy component-test selector",
  ),
);

updateFile("e2e/main-user-journeys.spec.ts", (source) => {
  const testStart = source.indexOf(
    '    test("system dialog actions do not overflow on narrow viewports"',
  );
  if (testStart < 0) throw new Error("Missing narrow-viewport Galaxy test");
  const testEnd = source.indexOf("\n    });", testStart);
  if (testEnd < 0) throw new Error("Missing narrow-viewport Galaxy test end");

  let block = source.slice(testStart, testEnd);
  block = replaceRequired(
    block,
    '.dialog-primary-actions',
    '.dialog-actions',
    "Galaxy E2E action selector",
  );

  const insertionPoint = block.lastIndexOf("\n        }");
  if (insertionPoint < 0) throw new Error("Missing Galaxy E2E button loop end");
  const verticalAssertions = `

        // Short landscape-style viewports exercise the vertical flex split:
        // fixed header/actions remain visible while the details body keeps a
        // usable scroll area that can reach the final content.
        await page.setViewportSize({ width: 360, height: 400 });
        const details = dialog.locator(".dialog-content");
        await expect(details).toBeVisible();
        const scrollState = await details.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
            return {
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                scrollTop: element.scrollTop,
            };
        });
        expect(scrollState.clientHeight).toBeGreaterThan(0);
        expect(scrollState.scrollHeight).toBeGreaterThan(
            scrollState.clientHeight,
        );
        expect(
            scrollState.scrollTop + scrollState.clientHeight,
        ).toBeGreaterThanOrEqual(scrollState.scrollHeight - 1);`;
  block =
    block.slice(0, insertionPoint + "\n        }".length) +
    verticalAssertions +
    block.slice(insertionPoint + "\n        }".length);

  return source.slice(0, testStart) + block + source.slice(testEnd);
});

updateFile("e2e/observer-routing.spec.ts", (source) => {
  const addition = `

test.describe("observer selection round trip", () => {
    test("returns from localized Galaxy through observer sky without carrying observer state back", async ({
        page,
    }) => {
        await page.goto("/ja/galaxy");
        await page.waitForSelector("#galaxy-renderer", { timeout: 15000 });
        await expect(page.locator(".animate-spin")).toHaveCount(0, {
            timeout: 15000,
        });

        const systems = page.locator(".galaxy-nearby .hud-list-row");
        await expect(systems).toHaveCount(30, { timeout: 5000 });
        const alphaCentauri = systems.filter({
            hasText: "ケンタウルス座アルファ恒星系",
        });
        await expect(alphaCentauri).toBeVisible();
        await alphaCentauri.click();

        const viewSky = page.getByRole("button", {
            name: "ここから星空を見る",
        });
        await expect(viewSky).toBeVisible();
        await viewSky.click();
        await expect(page).toHaveURL(
            /\/ja\/constellation\?observer=alpha-centauri$/,
            { timeout: 15000 },
        );

        const chooseAnother = page.getByRole("button", {
            name: "別の観測地点を選ぶ",
        });
        await expect(chooseAnother).toBeVisible({ timeout: 20000 });
        await chooseAnother.click();
        await expect(page).toHaveURL(/\/ja\/galaxy\/?$/, {
            timeout: 15000,
        });
        expect(new URL(page.url()).searchParams.has("observer")).toBe(false);
    });
});
`;
  if (source.includes('test.describe("observer selection round trip"')) {
    throw new Error("Observer round-trip test already exists");
  }
  return source.trimEnd() + addition;
});

updateFile(
  "docs/superpowers/plans/2026-08-05-hpa-564-observer-switching.md",
  (source) => {
    source = replaceRequired(
      source,
      "**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its product actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries. ViewSwitcher already links to Galaxy; the dedicated **Choose another observer** action remains intentional because it exposes a labeled reselection exit beside **Return to Earth/Sol** without teaching users to reinterpret generic view navigation.",
      "**Architecture:** Keep URL-driven full-page navigation as the only observer state. Restructure the existing Galaxy dialog so its product actions remain visible above a scrollable details body, and extend the existing Constellation observer action group with a localized Galaxy route. Reuse the current eligibility helper, route helpers, HUD styling, and component boundaries. ViewSwitcher already links to Galaxy; the dedicated **Choose another observer** action remains intentional because it exposes a labeled reselection exit beside **Return to Earth/Sol** without teaching users to reinterpret generic view navigation. Reselection appears first because it continues the active observer-selection task; **Return to Earth/Sol** follows as the canonical reset.",
      "plan architecture",
    );
    source = replaceRequired(
      source,
      "- HPA-436 owns the cross-view Playwright journey and shipping cleanup coverage.",
      "- HPA-564 owns the minimal localized Galaxy → observer sky → Choose another observer → Galaxy happy path. HPA-436 retains keyboard reachability, reference-control assertions, and shipping cleanup coverage.",
      "HPA-436 ownership line",
    );
    source = replaceRequired(
      source,
      "- **Cross-view loop:** HPA-564 verifies each component boundary, but the complete Galaxy → observer sky → Choose another observer → Galaxy journey remains unproven until HPA-436. HPA-436 must assert that the keyboard-reachable action returns to the localized Galaxy route without an `observer` query.",
      "- **Cross-view loop:** This PR verifies the minimal localized round trip and absence of a carried `observer` query. HPA-436 remains the exit gate for keyboard reachability, reference controls, and broader cleanup coverage.",
      "cross-view risk",
    );
    source = replaceRequired(
      source,
      "- **Dialog prominence regression:** Future flex or overflow edits could hide the fixed action row again. The existing narrow-viewport Galaxy dialog Playwright test is the regression net and must keep targeting the header close control plus `.dialog-primary-actions`.",
      "- **Dialog prominence regression:** Future flex or overflow edits could hide the fixed action row or collapse the details body. The existing narrow-viewport Galaxy dialog Playwright test is the regression net and covers horizontal bounds plus a 360×400 vertical-scroll case using the unique `.dialog-actions` row.",
      "dialog regression risk",
    );
    source = source.replaceAll("`.dialog-primary-actions`", "`.dialog-actions`");
    source = replaceRequired(
      source,
      "- Keep `Return to Earth/Sol` as the canonical query-free reset.",
      "- Keep `Return to Earth/Sol` as the canonical query-free reset. Place **Choose another observer** first because it continues the active observer-selection flow; keep the reset second as the explicit exit.\n- Preserve the existing native HUD button and WebGL-fallback `Button` conventions; do not introduce a third action-control variant.",
      "observer action-order constraint",
    );

    const task2Start = source.indexOf("### Task 2: Add observer reselection navigation");
    const task3Start = source.indexOf("### Task 3: Add locale parity");
    const task4Start = source.indexOf("### Task 4: Verify the focused PR");
    if (task2Start < 0 || task3Start < 0 || task4Start < 0) {
      throw new Error("Missing plan task sections");
    }
    const task2 = source
      .slice(task2Start, task3Start)
      .replace("### Task 2:", "### Task 3:");
    const task3 = source
      .slice(task3Start, task4Start)
      .replace("### Task 3:", "### Task 2:");
    source =
      source.slice(0, task2Start) + task3 + task2 + source.slice(task4Start);

    source = replaceRequired(
      source,
      "- [x] Update the existing narrow-viewport Galaxy dialog Playwright selectors for the separate header close control and two-button fixed action row, then run the full Playwright suite in GitHub Actions.",
      "- [x] Extend the existing narrow-viewport Galaxy dialog Playwright test to cover the separate header Close control, horizontal button bounds, and a 360×400 details-body scroll case.\n- [x] Add a minimal localized Galaxy → observer sky → Choose another observer → Galaxy Playwright round trip without carrying the `observer` query; leave keyboard and cleanup coverage to HPA-436.",
      "Task 4 E2E verification",
    );
    return source;
  },
);
