# Observer Query State and Galaxy Entry Action Design

**Issue:** HPA-432  
**Epic:** HPA-426 — Sky From Another Star  
**Status:** Approved, revised after third-pass review  
**Date:** 2026-07-30

## Summary

Add a shareable observer-state URL contract for the Constellation view and a second, independent **View sky from here** action to the Galaxy system dialog.

This slice establishes:

- parsing, resolution, and serialization contracts for `observer=<systemId>`;
- canonical query-free Sol URLs;
- locale-safe full-page navigation;
- the Galaxy launch action; and
- defensive observer eligibility handling.

It deliberately stops before alternate-observer rendering. HPA-435 will consume the resolved observer state when integrating transformed catalogs, HUD controls, and fallback notices.

Canonical URLs:

- Sol observer: `/constellation`
- Localized Sol observer: `/zh/constellation` or `/ja/constellation`
- System observer: `/constellation?observer=<systemId>`
- Localized system observer: `/zh/constellation?observer=<systemId>`

A request containing exactly one `observer=sol` parameter redirects server-side to the corresponding query-free localized URL.

## Goals

- Represent observer selection in the URL rather than transient component state.
- Preserve observer query state through locale switching and full-page navigation.
- Give every coordinate-valid `localGalaxyData` system an independent Galaxy entry action.
- Preserve invalid-state provenance so HPA-435 can show the correct fallback explanation.
- Provide one shared eligibility contract for direct URLs and Galaxy availability.
- Keep this PR independent of astronomy transforms, prepared catalogs, and renderer changes.
- Protect existing Explore navigation and dialog behavior with regression tests.

## Non-goals

- Observer-relative coordinate transformation.
- Constellation catalog preparation or synthetic Sol creation.
- Changes to `ConstellationRenderer` or `ConstellationWrapper` behavior.
- Observer HUD, Find Sol, Earth-reference overlay, or fallback notice UI in Constellation view.
- A generic application-wide query-state framework.
- Client-side routing.
- Coordinate tolerances owned by HPA-431's astronomy transform layer.
- Full Galaxy-to-Constellation journey coverage, which remains in HPA-436.

## Existing architecture

The repository currently has these relevant boundaries:

- `src/i18n/routes.ts` creates localized pathnames but does not create query-bearing Constellation URLs.
- `LanguageSelector.svelte` and `SettingsPanel.svelte` already preserve `search` and `hash` with equivalent inline URL composition.
- `GalaxyWrapper.svelte` owns Galaxy selection state, the selected-system dialog, planetary navigation, and current Coming Soon behavior.
- `localGalaxyData.starSystems` is the authoritative list of observer candidates and exposes each system's exact ID and light-year Cartesian position.
- `ConstellationWrapper.svelte` currently initializes only the Earth/Sol sky path and will consume resolved observer state in HPA-435.
- `src/pages/constellation.astro` is rendered on demand because the project uses `output: "server"`.
- Localized Vercel fallback routes are path-based rewrites into the same server renderer.

The locale URL helper is therefore a focused deduplication and drift-prevention change, not a fix for a current query-loss bug.

HPA-432 must not import or depend on HPA-431's astronomy transformation implementation. The two tickets can proceed independently.

## Design decisions

### 1. Separate URL parsing from observer resolution

Parsing answers what the URL requested. Resolution answers whether that request maps to a valid observer candidate.

Keeping these operations separate prevents URL syntax code from importing `localGalaxyData` and prevents invalid requests from becoming indistinguishable from ordinary Sol mode.

Required semantic types:

```ts
export type ParsedObserverQuery =
    | { kind: "missing" }
    | { kind: "explicit-sol" }
    | { kind: "candidate"; observerId: string }
    | {
          kind: "malformed";
          reason: "empty";
          requestedObserver: "";
      }
    | {
          kind: "malformed";
          reason: "duplicate";
          requestedObserver: null;
      };

export type ResolvedObserverState =
    | {
          kind: "sol";
          observerId: "sol";
          source: "missing" | "explicit-sol";
      }
    | {
          kind: "system";
          observerId: string;
      }
    | {
          kind: "fallback";
          observerId: "sol";
          requestedObserver: string | null;
          reason:
              | "empty"
              | "duplicate"
              | "unknown-system"
              | "invalid-coordinates"
              | "origin-collision";
      };
```

Names may vary during implementation, but these semantic distinctions and field values are required.

### 2. Preserve exact fallback provenance

The effective observer alone is insufficient. These requests all eventually render Sol but have different meanings:

- `/constellation`: normal Sol mode; no notice.
- `/constellation?observer=sol`: explicit Sol request; canonical redirect.
- `/constellation?observer=unknown`: invalid request; HPA-435 shows a fallback notice.
- `/constellation?observer=`: malformed request; HPA-435 shows a fallback notice.
- `/constellation?observer=a&observer=b`: ambiguous request; HPA-435 shows a fallback notice without claiming either value was selected.

Exact provenance contract:

| Input class | `requestedObserver` | Reason |
| --- | --- | --- |
| One empty value | `""` | `empty` |
| More than one value | `null` | `duplicate` |
| Unknown candidate ID | exact candidate ID | `unknown-system` |
| Candidate with non-finite coordinates | exact candidate ID | `invalid-coordinates` |
| Candidate at exact origin | exact candidate ID | `origin-collision` |

`null` for duplicate parameters is intentional: there is no single requested observer. The parser does not select the first value, select the last value, or join the values.

HPA-435 must consume this result rather than reparse or independently reinterpret the URL.

### 3. Use exact local-galaxy IDs

Observer IDs are exact, case-sensitive IDs from `localGalaxyData.starSystems`.

The route contract does not:

- trim whitespace;
- lowercase values;
- create aliases;
- map planetary route IDs; or
- reuse the Galaxy-specific `solar-system -> solar` planetary route conversion.

A single non-empty `observer` value is parsed as a candidate. Resolution then performs exact ID lookup.

The alias rule is defensive documentation. No separate Galaxy component test is required for `solar-system`, because the current Galaxy dialog only opens for IDs present in `localGalaxyData.starSystems` and that catalog contains no such entry.

### 4. Define deterministic malformed-query behavior

Use `URLSearchParams.getAll("observer")`:

- zero values: `missing`;
- one value equal to `sol`: `explicit-sol`;
- one non-empty value: `candidate`;
- one empty value: `malformed`, `reason: "empty"`, `requestedObserver: ""`;
- more than one value: `malformed`, `reason: "duplicate"`, `requestedObserver: null`.

Duplicate observer parameters do not use first-value-wins or last-value-wins behavior. They deterministically fall back to Sol.

Unrelated query parameters are ignored by the observer parser and preserved during locale switching and explicit-Sol canonicalization.

### 5. Serialize observer state as a query suffix

`serializeObserverQuery()` returns a suffix suitable for direct concatenation to a localized pathname:

- `""` when no observer parameter should be emitted;
- a string beginning with `?` for a system observer.

The serializer omits `observer` when the ID is `sol`, `null`, or `undefined`.

```ts
serializeObserverQuery("sol");
// ""

serializeObserverQuery(null);
// ""

serializeObserverQuery(undefined);
// ""

serializeObserverQuery("alpha-centauri");
// "?observer=alpha-centauri"
```

System IDs must be encoded with `URLSearchParams` or equivalent standard URL encoding rather than manual concatenation.

### 6. Canonicalize explicit Sol requests server-side

The project uses on-demand server rendering, and existing pages already use `Astro.redirect()`. HPA-432 therefore provides one stable shareable Sol URL rather than merely producing canonical URLs from application navigation.

`src/pages/constellation.astro` imports the observer parser and redirects only when parsing returns `explicit-sol`:

```ts
const observerQuery = parseObserverQuery(Astro.url.searchParams);

if (observerQuery.kind === "explicit-sol") {
    const canonicalUrl = new URL(Astro.url);
    canonicalUrl.searchParams.delete("observer");

    return Astro.redirect(
        `${canonicalUrl.pathname}${canonicalUrl.search}`,
        308,
    );
}
```

Required behavior:

- `/constellation?observer=sol` redirects to `/constellation`;
- `/ja/constellation?observer=sol` redirects to `/ja/constellation`;
- unrelated query parameters remain present;
- malformed duplicate parameters, including `observer=sol&observer=x`, do not redirect and remain available to the typed fallback contract;
- no client-side `history.replaceState` logic is introduced.

`parseObserverQuery()` therefore has a narrow production consumer in this slice. `resolveObserverState()` remains a module contract exercised by unit tests until HPA-435 integrates it into `ConstellationWrapper`.

## Observer route-state module

Add `src/lib/constellation/observerRouteState.ts` with DOM-free functions:

```ts
parseObserverQuery(searchParams: URLSearchParams): ParsedObserverQuery;

resolveObserverState(
    parsed: ParsedObserverQuery,
    candidates: readonly ObserverCandidate[],
): ResolvedObserverState;

serializeObserverQuery(
    observerId: string | "sol" | null | undefined,
): string;

isObserverCandidateEligible(candidate: ObserverCandidate):
    | { eligible: true }
    | {
          eligible: false;
          reason: "invalid-coordinates" | "origin-collision";
      };
```

`ObserverCandidate` is deliberately structural:

```ts
interface ObserverCandidate {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
}
```

`THREE.Vector3` exposes public numeric `x`, `y`, and `z` fields, so `StarSystemData.position` is structurally assignable to this plain shape. Production callers can pass `localGalaxyData.starSystems` directly without importing Three.js into the route-state module or creating a mapping layer. Tests can use plain objects.

The module must not import Svelte, DOM APIs, Three.js, a renderer, or the global galaxy catalog.

### Shared eligibility invariant

`isObserverCandidateEligible()` is the single implementation of finite-coordinate and exact-origin validation.

- `resolveObserverState()` must call it after resolving a candidate ID.
- `GalaxyWrapper.svelte` must call it for the selected system when computing `observerEligibility`.
- Neither caller may duplicate the finite/origin predicates inline.

This keeps direct-URL fallback behavior and Galaxy button availability on the same contract.

## Coordinate eligibility

A candidate is eligible when:

- `position.x`, `position.y`, and `position.z` are all finite; and
- the position is not exactly `(0, 0, 0)`.

Typed failure reasons remain distinct in the domain contract:

- `invalid-coordinates` for any non-finite component;
- `origin-collision` for an exact origin vector.

Do not introduce an epsilon in this ticket. Near-zero vector tolerances and transform failures belong to HPA-431.

### Current-data reachability

The current CSV-generated `localGalaxyData` contains 30 nearby systems with positive distances. `radialToCartesian()` derives finite non-origin system positions from those distances and catalog coordinates, so the production catalog does not currently exercise an ineligible Galaxy selection.

The eligibility guard remains because generated or future imported data can regress. However, the Galaxy user-facing treatment is intentionally generic rather than exposing separate coordinate failure reasons.

## Route helper design

Extend the typed route API without changing full-page navigation:

```ts
interface ConstellationRouteOptions {
    observerId?: string | "sol" | null;
}

routes.constellation(locale, options?);
```

Examples:

```ts
routes.constellation("en");
// /constellation

routes.constellation("en", { observerId: undefined });
// /constellation

routes.constellation("en", { observerId: null });
// /constellation

routes.constellation("ja", { observerId: "alpha-centauri" });
// /ja/constellation?observer=alpha-centauri

routes.constellation("zh", { observerId: "sol" });
// /zh/constellation
```

Use an options object rather than a positional observer argument.

### Locale-switch URL helper

Centralize the equivalent locale-switch composition in `src/i18n/routes.ts`:

```ts
switchLocaleUrl(url: URL, locale: AppLocale): string;
```

It returns the localized pathname plus the original search and hash. Both `LanguageSelector.svelte` and `SettingsPanel.svelte` use this helper.

This is a maintainability change that prevents the two call sites from drifting. It does not claim either component currently drops query state.

## Galaxy dialog integration

Add **View sky from here** to the existing Galaxy system details dialog.

### Independent capabilities

Leave the existing reactive `canExplore` calculation and binding untouched. Add `observerEligibility` alongside it.

Planetary exploration availability remains based on `planetarySystemRegistry` and `resolveRouteSystemId`. Sky availability is based on the selected local-galaxy system's exact ID and the shared `isObserverCandidateEligible()` helper.

The capabilities must not be coupled. A system whose planetary experience is Coming Soon can still have an enabled **View sky from here** action.

Recommended reactive shape:

```ts
$: observerEligibility = selectedSystemData
    ? isObserverCandidateEligible(selectedSystemData)
    : null;
```

### Navigation

For an eligible selected system:

```ts
window.location.href = routes.constellation(lang, {
    observerId: selectedSystemData.id,
});
```

Use the exact selected Galaxy ID. Do not pass it through `resolveRouteSystemId`, which exists only for planetary navigation.

### Ineligible observer action

Both typed eligibility failures map to one localized Galaxy message:

```text
galaxy.skyUnavailable
```

Suggested English copy:

> Sky view is unavailable for this system.

The View Sky action remains visible and keyboard-focusable:

- use `aria-disabled="true"`, not the native `disabled` attribute;
- keep the button in the tab order;
- associate it with the persistent explanation through `aria-describedby`;
- guard the click handler so pointer, Enter, and Space activation do not navigate;
- style the `aria-disabled` state consistently with unavailable controls;
- do not expose `invalid-coordinates` or `origin-collision` as user-facing Galaxy copy.

This preserves discoverability and allows assistive-technology users to focus the action and hear why it is unavailable.

### Reconcile the two unavailable patterns

The two dialog actions represent different semantics:

- **Explore / Coming Soon** is an enabled action that intentionally opens the existing inline Coming Soon notice.
- **View sky from here / unavailable** is a non-activatable data-integrity state represented by a focusable `aria-disabled` button with persistent explanatory text.

HPA-432 does not reuse the Coming Soon click-notice behavior for View Sky, because an `aria-disabled` action must not perform an activation side effect.

### Action hierarchy

Keep the existing dialog hierarchy and add one product action:

1. **Close** — existing secondary dismissal action.
2. **View sky from here** — new secondary product action.
3. **Explore** or **Coming Soon** — existing primary action using the existing `action.explore` or `common.comingSoon` copy.

The DOM and visual order is `Close · View sky from here · Explore/Coming Soon`. Explore remains primary even when it displays Coming Soon and remains clickable to show the existing inline notice. View Sky does not replace, overload, or restyle the Explore path.

Existing focus trap, backdrop dismissal, and Escape behavior remain unchanged.

## Localization

Add equivalent non-empty strings to `en`, `zh`, and `ja` for:

```text
action.viewSkyFromHere
galaxy.skyUnavailable
```

Do not add:

- separate user-facing messages for invalid coordinates and origin collision; or
- a new Explore label.

The existing product action continues to use `action.explore`, whose English copy is **Explore**.

Unknown-observer and Constellation fallback copy belongs to HPA-435.

Add `src/i18n/__tests__/observerUiI18nSync.test.ts` to assert the two HPA-432 keys exist and are non-empty in every supported locale. Do not broaden this ticket into a repository-wide key-parity migration.

## Testing strategy

### Observer route-state unit tests

Cover:

- missing parameter parses and resolves to normal Sol mode;
- `observer=sol` parses as explicit Sol;
- a known eligible system resolves to system mode;
- an unknown ID falls back with the exact requested ID and `unknown-system` reason;
- an empty value produces `requestedObserver: ""` and `empty` reason;
- duplicate values produce `requestedObserver: null` and `duplicate` reason;
- any non-finite coordinate component falls back with the exact candidate ID and `invalid-coordinates` reason;
- exact origin coordinates fall back with the exact candidate ID and `origin-collision` reason;
- case variants and whitespace-padded IDs do not alias known IDs;
- unrelated query parameters do not change observer parsing;
- Sol, `null`, and `undefined` serialization produce `""`;
- system serialization produces an encoded suffix beginning with `?`;
- valid system parse/serialize round trips preserve the ID; and
- resolver eligibility failures match direct `isObserverCandidateEligible()` results.

These are module-contract tests. Except for explicit-Sol parsing used by the page redirect, renderer fallback behavior is not implemented in HPA-432.

### Route helper tests

Extend `src/i18n/__tests__/routes.test.ts` to cover:

- English, Chinese, and Japanese observer URLs;
- query-free canonical Sol URLs;
- `{ observerId: undefined }` and `{ observerId: null }` returning the query-free route;
- encoded observer IDs;
- locale switching that preserves observer, unrelated query parameters, and hash fragments; and
- locale switching without duplicating an existing locale prefix.

### Explicit-Sol redirect integration

Add one focused route-level Playwright test for the server canonicalization behavior:

- `/constellation?observer=sol` redirects to `/constellation`;
- unrelated query parameters are preserved; and
- a duplicate observer request is not canonicalized as explicit Sol.

This is not the full alien-sky journey. HPA-436 retains cross-view and localized observer-route E2E coverage.

### Localization coverage test

Add a focused parity guard for the two HPA-432 UI keys across every locale exposed by `ui`.

### Locale-switch component coverage

Do not add a second standalone locale-switch test solely for HPA-432.

Instead, strengthen the existing SettingsPanel navigation test fixture so its existing assertion includes an observer query and hash. Pure `switchLocaleUrl()` tests carry the complete locale/query matrix.

`LanguageSelector.svelte` migrates to the shared helper, but its component suite does not duplicate that matrix.

### GalaxyWrapper tests

Refactor the existing `@/lib/galaxy` mock as needed so tests can provide observer candidates.

Cover:

- Close, View Sky, and Explore actions appear in the specified order;
- Explore remains primary and View Sky uses secondary styling;
- an eligible, non-explorable system still enables View Sky;
- View Sky navigates to the correct English URL;
- View Sky navigates to the correct localized URL;
- synthetic non-finite and origin candidates each produce the same focusable `aria-disabled` View Sky state and generic description;
- the ineligible click handler does not navigate;
- the component consumes `isObserverCandidateEligible()` rather than duplicating coordinate predicates;
- clicking Explore on a Coming Soon system still shows the current notice while View Sky remains enabled; and
- closing, backdrop dismissal, focus trap, and Escape behavior do not regress.

Full Galaxy-to-Constellation Playwright coverage remains in HPA-436.

## Localized deployment coverage

The Vercel locale fallback routes are path-anchored rewrites into the server renderer. Query strings are expected to reach the page unchanged, but that deployment behavior is not proven by route-helper unit tests.

HPA-436 must explicitly load at least one localized observer URL such as:

```text
/zh/constellation?observer=alpha-centauri
```

and verify that the observer state reaches the completed Constellation integration. Its existing targeted `zh` and `ja` route coverage should include query-bearing URLs, not only localized pathnames.

## Expected file changes

```text
src/lib/constellation/observerRouteState.ts
src/lib/constellation/__tests__/observerRouteState.test.ts
src/i18n/routes.ts
src/i18n/__tests__/routes.test.ts
src/i18n/__tests__/observerUiI18nSync.test.ts
src/pages/constellation.astro
src/components/LanguageSelector.svelte
src/components/hud/SettingsPanel.svelte
src/components/hud/__tests__/SettingsPanel.test.ts
src/components/GalaxyWrapper.svelte
src/components/__tests__/GalaxyWrapper.test.ts
src/i18n/en.ts
src/i18n/zh.ts
src/i18n/ja.ts
e2e/observer-routing.spec.ts
```

A small test helper may be added if it materially reduces fixture duplication. No renderer, astronomy-transform, or Constellation-wrapper file should require behavioral changes in this PR.

## Implementation sequence

1. Add failing observer route-state tests and lock exact malformed provenance.
2. Implement parsing, shared eligibility, resolution, and query-suffix serialization in the pure route-state module.
3. Add failing route tests for observer URLs, nullish options, and locale preservation.
4. Extend `routes.constellation` and add `switchLocaleUrl`.
5. Add the explicit-Sol canonical redirect to `constellation.astro` and its focused route integration test.
6. Migrate both language-switching components to the shared helper and strengthen the existing SettingsPanel navigation test.
7. Add the focused HPA-432 locale-key coverage test and two localized strings.
8. Add GalaxyWrapper tests for action hierarchy, independent capability behavior, shared eligibility use, and generic `aria-disabled` handling.
9. Add observer navigation, CTA, and accessible ineligible explanation while preserving `canExplore` and the existing Explore primary action.
10. Run focused tests, formatting, lint, type-check, the full Vitest suite, the focused Playwright route test, and build.

## Risks and mitigations

### Invalid requests lose provenance

**Risk:** Resolution returns only the effective observer or chooses an arbitrary duplicate value.  
**Mitigation:** Lock exact provenance: empty maps to `""`, duplicate maps to `null`, and candidate failures preserve the exact ID.

### Resolver and Galaxy eligibility drift

**Risk:** Direct URLs and the Galaxy button use separate coordinate predicates.  
**Mitigation:** Both paths call the exported `isObserverCandidateEligible()` helper.

### Canonical output and browser URL diverge

**Risk:** Application navigation omits `observer=sol`, but manually opened explicit-Sol URLs remain shareable duplicates.  
**Mitigation:** `constellation.astro` issues a server-side 308 redirect for exactly one explicit Sol parameter.

### Locale helper changes are mistaken for a current bug fix

**Risk:** The design overstates current query-loss behavior.  
**Mitigation:** Document the helper as deduplication and drift prevention; strengthen one existing component test rather than adding a redundant matrix.

### Ineligible controls are inaccessible

**Risk:** A native disabled button leaves the tab order, so keyboard and screen-reader users do not encounter its description.  
**Mitigation:** Use focusable `aria-disabled`, persistent `aria-describedby` text, and a guarded handler.

### Defensive UI is over-specified

**Risk:** Separate user-facing messages and tests are built for coordinate states absent from the current catalog.  
**Mitigation:** Preserve typed domain reasons but map both to one generic Galaxy message and one parameterized component behavior.

### Existing Explore behavior regresses

**Risk:** Adding another action changes `canExplore`, Coming Soon, visual priority, focus, dismissal, or Explore routing.  
**Mitigation:** Leave `canExplore` untouched, preserve the existing primary Explore action, add View Sky as the preceding secondary action, and retain component regressions.

### Localized deployment rewrites lose query state

**Risk:** Unit tests prove URL construction but not query propagation through Vercel's localized fallback routes.  
**Mitigation:** Require explicit query-bearing localized URL coverage in HPA-436.

## Acceptance criteria

### Module contract

- `parseObserverQuery()` distinguishes missing, explicit Sol, candidate, empty, and duplicate input deterministically.
- Empty observer input preserves `requestedObserver: ""`; duplicate input uses `requestedObserver: null`.
- Unknown, non-finite, and origin-colliding candidates preserve the exact requested ID.
- `resolveObserverState()` and Galaxy availability both use `isObserverCandidateEligible()`.
- `serializeObserverQuery()` returns either `""` or a leading-`?` query suffix.
- Sol, `null`, and `undefined` serialize without an observer parameter.

### Route and page behavior

- `/constellation`, `/zh/constellation`, and `/ja/constellation` are canonical Sol URLs.
- Exactly one `observer=sol` parameter redirects server-side to the corresponding query-free localized path.
- Explicit-Sol canonicalization preserves unrelated query parameters.
- Valid local-galaxy systems serialize to correctly localized Constellation URLs.
- Locale switching preserves the full query string and hash.
- All observer navigation emitted by HPA-432 stores observer selection in the URL; no component-only observer source is introduced.

### Galaxy behavior

- The Galaxy dialog order is Close, View sky from here, Explore/Coming Soon.
- Explore keeps its existing primary styling, copy, route mapping, `canExplore` binding, and Coming Soon behavior.
- View Sky is an independent secondary action and may be enabled when Explore is Coming Soon.
- Ineligible systems retain a focusable `aria-disabled` View Sky action with one localized generic explanation.
- Ineligible View Sky activation never navigates.
- Existing focus handling, dialog dismissal, and Escape behavior do not regress.

### Scope and localization

- The two HPA-432 UI keys are automatically verified across all supported locales.
- Current invalid-coordinate and origin-collision results remain typed domain distinctions but do not create separate Galaxy copy.
- `resolveObserverState()` is treated as a module contract until HPA-435 consumes it in the application.
- No astronomy transforms, renderer support, observer HUD, or Constellation fallback UI are added in this PR.

## Validation commands

```bash
bunx vitest src/lib/constellation/__tests__/observerRouteState.test.ts
bunx vitest src/i18n/__tests__/routes.test.ts
bunx vitest src/i18n/__tests__/observerUiI18nSync.test.ts
bunx vitest src/components/hud/__tests__/SettingsPanel.test.ts
bunx vitest src/components/__tests__/GalaxyWrapper.test.ts
bunx playwright test e2e/observer-routing.spec.ts
bun run lint
bun run type-check
bun run test:run
bun run build
```
