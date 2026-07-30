# Observer Query State and Galaxy Entry Action Design

**Issue:** HPA-432  
**Epic:** HPA-426 — Sky From Another Star  
**Status:** Approved, revised after second-pass review  
**Date:** 2026-07-30

## Summary

Add a shareable observer-state URL contract for the Constellation view and a second, independent **View sky from here** action to the Galaxy system dialog.

This slice deliberately stops before alternate-observer rendering. It establishes the route-state semantics and Galaxy launch path that HPA-435 will later consume when integrating observer rendering, HUD controls, and fallback notices.

Canonical URLs:

- Sol observer: `/constellation`
- Localized Sol observer: `/zh/constellation` or `/ja/constellation`
- System observer: `/constellation?observer=<systemId>`
- Localized system observer: `/zh/constellation?observer=<systemId>`

`observer=sol` is accepted when parsing but serializes to the query-free canonical Sol URL.

## Goals

- Represent observer selection in the URL rather than transient component state.
- Preserve observer query state through locale switching and full-page navigation.
- Give every coordinate-valid `localGalaxyData` system an independent Galaxy entry action.
- Preserve invalid-state provenance so HPA-435 can show the correct fallback explanation.
- Keep this PR independent of astronomy transforms, prepared catalogs, and renderer changes.
- Protect existing Explore navigation and dialog behavior with regression tests.

## Non-goals

- Observer-relative coordinate transformation.
- Constellation catalog preparation or synthetic Sol creation.
- Changes to `ConstellationRenderer` or `ConstellationWrapper` behavior.
- Observer HUD, Find Sol, Earth-reference overlay, or fallback notice UI in Constellation view.
- A generic application-wide query-state framework.
- Client-side routing or changes to the current full-page navigation model.
- Coordinate tolerances owned by HPA-431's astronomy transform layer.

## Existing architecture

The repository currently has these relevant boundaries:

- `src/i18n/routes.ts` creates localized pathnames but does not create query-bearing Constellation URLs.
- `LanguageSelector.svelte` and `SettingsPanel.svelte` independently compose `switchLocalePath(...) + search + hash`.
- `GalaxyWrapper.svelte` owns Galaxy selection state, the selected-system dialog, planetary navigation, and current Coming Soon behavior.
- `localGalaxyData.starSystems` is the authoritative list of observer candidates and exposes each system's exact ID and light-year Cartesian position.
- `ConstellationWrapper.svelte` currently initializes only the Earth/Sol sky path and will consume resolved observer state in HPA-435.

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

### 2. Preserve fallback provenance

The effective observer alone is insufficient. These requests all eventually render Sol but have different meanings:

- `/constellation`: normal Sol mode; no notice.
- `/constellation?observer=sol`: explicit Sol mode; no notice.
- `/constellation?observer=unknown`: invalid request; HPA-435 shows a fallback notice.
- `/constellation?observer=`: malformed request; HPA-435 shows a fallback notice.
- `/constellation?observer=a&observer=b`: ambiguous request; HPA-435 shows a fallback notice without claiming either value was selected.

The exact provenance contract is:

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

### 4. Define deterministic malformed-query behavior

Use `URLSearchParams.getAll("observer")`:

- zero values: `missing`;
- one value equal to `sol`: `explicit-sol`;
- one non-empty value: `candidate`;
- one empty value: `malformed`, `reason: "empty"`, `requestedObserver: ""`;
- more than one value: `malformed`, `reason: "duplicate"`, `requestedObserver: null`.

Duplicate observer parameters do not use first-value-wins or last-value-wins behavior. They deterministically fall back to Sol.

Unrelated query parameters are ignored by the observer parser and preserved during locale switching.

### 5. Canonicalize Sol to no query parameter

`serializeObserverQuery()` returns a query suffix suitable for direct concatenation to a localized pathname:

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

parseObserverQuery(new URLSearchParams("observer=sol"));
// { kind: "explicit-sol" }
```

HPA-432 does not need to replace the browser URL when a user manually opens `observer=sol`; canonicalization is guaranteed when application code serializes or navigates to Sol.

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

`THREE.Vector3` exposes public numeric `x`, `y`, and `z` fields, so `StarSystemData.position` is structurally assignable to this plain shape. Production callers can pass `localGalaxyData.starSystems` directly without importing Three.js into the route-state module; tests can use plain objects.

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

Failure reasons:

- `invalid-coordinates` for any non-finite component;
- `origin-collision` for an exact origin vector.

Do not introduce an epsilon in this ticket. Near-zero vector tolerances and transform failures belong to HPA-431.

### Current-data reachability

The current CSV-generated `localGalaxyData` contains 30 nearby systems with positive distances. `radialToCartesian()` derives finite non-origin system positions from those distances and catalog coordinates, so the production catalog does not currently exercise the disabled Galaxy action.

The disabled-button states are intentionally defensive and are tested with synthetic component fixtures. They remain in HPA-432 because:

- the route resolver already defines typed invalid-coordinate and origin-collision behavior;
- future generated/imported catalog data must not create unusable observer URLs;
- Galaxy should explain an unusable selection instead of navigating to a URL that HPA-435 must immediately reject; and
- the existing HPA-432 scope explicitly requires the disabled accessible state.

This is not a claim that current users will encounter these states with today's generated data.

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

Use an options object rather than a positional observer argument. Encode observer IDs through `URLSearchParams` or equivalent standard URL encoding rather than string concatenation.

### Locale-switch URL helper

Centralize the duplicated locale-switch composition in `src/i18n/routes.ts`:

```ts
switchLocaleUrl(url: URL, locale: AppLocale): string;
```

It returns the localized pathname plus the original search and hash. Both `LanguageSelector.svelte` and `SettingsPanel.svelte` use this helper.

This is a focused deduplication serving observer-state preservation, not a broader navigation refactor.

## Galaxy dialog integration

Add **View sky from here** to the existing Galaxy system details dialog.

### Independent capabilities

Preserve the existing reactive `canExplore` calculation and binding. Add `observerEligibility` alongside it rather than renaming or rewriting the established Explore path.

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

### Disabled behavior

For non-finite or origin-colliding coordinates:

- render the View Sky button disabled;
- keep Explore behavior unchanged;
- show localized explanatory text near the actions;
- associate the disabled button with that text through `aria-describedby`;
- do not rely exclusively on a native title tooltip;
- do not navigate or silently substitute Sol.

The explanation remains visible while the selected system dialog is open.

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
galaxy.skyUnavailableInvalidCoordinates
galaxy.skyUnavailableOriginCollision
```

Do not add a new Explore label. The existing product action continues to use `action.explore`, whose English copy is **Explore**.

Unknown-observer and Constellation fallback copy belongs to HPA-435.

The repository does not currently enforce general key parity across all locale catalogs. Add `src/i18n/__tests__/observerUiI18nSync.test.ts` to assert these HPA-432 keys exist and are non-empty in every supported locale. Do not broaden this ticket into a repository-wide key-parity migration, which may expose unrelated historical differences.

## Testing strategy

### Observer route-state unit tests

Cover:

- missing parameter resolves to normal Sol mode;
- `observer=sol` resolves to explicit Sol mode;
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
- valid system parse/serialize round trips preserve the ID;
- resolver eligibility failures match direct `isObserverCandidateEligible()` results.

### Route helper tests

Extend `src/i18n/__tests__/routes.test.ts` to cover:

- English, Chinese, and Japanese observer URLs;
- query-free canonical Sol URLs;
- `{ observerId: undefined }` and `{ observerId: null }` returning the query-free route;
- encoded observer IDs;
- locale switching that preserves observer, unrelated query parameters, and hash fragments;
- locale switching without duplicating an existing locale prefix.

### Localization coverage test

Add a focused parity guard for the three HPA-432 UI keys across every locale exposed by `ui`.

### SettingsPanel locale-switch regression

Add the single component regression to `src/components/hud/__tests__/SettingsPanel.test.ts`.

Prove that:

```text
/constellation?observer=alpha-centauri#details
```

becomes:

```text
/ja/constellation?observer=alpha-centauri#details
```

`LanguageSelector.svelte` is migrated to the same shared helper, but its existing component test does not need a duplicate navigation matrix. Pure route-helper tests cover the full locale/query behavior.

### GalaxyWrapper tests

Refactor the existing `@/lib/galaxy` mock as needed so tests can provide observer candidates.

Cover:

- Close, View Sky, and Explore actions appear in the specified order;
- Explore remains primary and View Sky uses secondary styling;
- an eligible, non-explorable system still enables View Sky;
- View Sky navigates to the correct English URL;
- View Sky navigates to the correct localized URL;
- synthetic non-finite coordinates disable only View Sky and show the associated localized reason;
- synthetic origin coordinates disable only View Sky and show the associated localized reason;
- the component consumes `isObserverCandidateEligible()` rather than duplicating coordinate predicates, using a module mock or equivalent assertion;
- clicking Explore on a Coming Soon system still shows the current notice while View Sky remains enabled;
- closing, backdrop dismissal, focus trap, and Escape behavior do not regress.

Full Galaxy-to-Constellation Playwright coverage remains in HPA-436.

## Expected file changes

```text
src/lib/constellation/observerRouteState.ts
src/lib/constellation/__tests__/observerRouteState.test.ts
src/i18n/routes.ts
src/i18n/__tests__/routes.test.ts
src/i18n/__tests__/observerUiI18nSync.test.ts
src/components/LanguageSelector.svelte
src/components/hud/SettingsPanel.svelte
src/components/hud/__tests__/SettingsPanel.test.ts
src/components/GalaxyWrapper.svelte
src/components/__tests__/GalaxyWrapper.test.ts
src/i18n/en.ts
src/i18n/zh.ts
src/i18n/ja.ts
```

A small test helper may be added if it materially reduces fixture duplication. No renderer, astronomy-transform, or Constellation-wrapper file should require behavioral changes in this PR.

## Implementation sequence

1. Add failing observer route-state tests and lock exact malformed provenance.
2. Implement parsing, shared eligibility, resolution, and query-suffix serialization in the pure route-state module.
3. Add failing route tests for observer URLs, nullish options, and locale preservation.
4. Extend `routes.constellation` and add `switchLocaleUrl`.
5. Migrate both language-switching components to the shared helper and add the focused SettingsPanel regression.
6. Add the focused HPA-432 locale-key coverage test and translations.
7. Add GalaxyWrapper tests for action hierarchy, independent capability behavior, shared eligibility use, and synthetic invalid fixtures.
8. Add observer navigation, CTA, and accessible disabled explanations while preserving `canExplore` and the existing Explore primary action.
9. Run focused tests, formatting, lint, type-check, the full Vitest suite, and build.

## Risks and mitigations

### Invalid requests lose provenance

**Risk:** Resolution returns only the effective observer or chooses an arbitrary duplicate value.  
**Mitigation:** Lock exact provenance: empty maps to `""`, duplicate maps to `null`, and candidate failures preserve the exact ID.

### Resolver and Galaxy eligibility drift

**Risk:** Direct URLs and the Galaxy button use separate coordinate predicates.  
**Mitigation:** Both paths call the exported `isObserverCandidateEligible()` helper; component coverage proves that dependency.

### Planetary aliases leak into observer IDs

**Risk:** Reusing `resolveRouteSystemId` changes Galaxy IDs before observer serialization.  
**Mitigation:** Observer URLs always use exact `localGalaxyData` IDs.

### Query state is dropped during locale switching

**Risk:** One language selector preserves observer state while another only localizes the pathname.  
**Mitigation:** Both selectors use one tested `switchLocaleUrl` helper, with the component regression located in SettingsPanel tests.

### Locale keys drift

**Risk:** A new observer action or disabled-state message is missing from one locale.  
**Mitigation:** Add a focused automated parity guard for the three HPA-432 UI keys.

### Defensive UI is mistaken for current production reachability

**Risk:** Reviewers assume the current 30-system catalog can trigger invalid-coordinate disabled states.  
**Mitigation:** Document that current production data is valid and exercise these paths through synthetic fixtures as forward-compatible data-integrity behavior.

### HPA-432 becomes dependent on astronomy implementation

**Risk:** Coordinate validation imports HPA-431 transform helpers or adopts transform tolerances.  
**Mitigation:** Check only finite components and exact-origin collision through the structural shared helper.

### Existing Explore behavior regresses

**Risk:** Adding another action changes `canExplore`, Coming Soon, visual priority, focus, dismissal, or Explore routing.  
**Mitigation:** Preserve the existing `canExplore` binding and primary Explore action, add View Sky as the preceding secondary action, and retain component regressions.

## Acceptance criteria

- `/constellation`, `/zh/constellation`, and `/ja/constellation` are canonical Sol URLs.
- `observer=sol` parses as explicit Sol and serializes without an observer parameter.
- `serializeObserverQuery()` returns either `""` or a leading-`?` query suffix.
- A valid local-galaxy system serializes to the correctly localized Constellation URL.
- Empty observer input preserves `requestedObserver: ""`; duplicate input uses `requestedObserver: null`.
- Unknown, non-finite, and origin-colliding candidates preserve the exact requested ID.
- Missing, empty, duplicate, unknown, non-finite, and origin-colliding observer requests have deterministic typed results.
- Resolver and Galaxy eligibility both use `isObserverCandidateEligible()`.
- Locale switching preserves the full query string and hash.
- The three HPA-432 UI keys are automatically verified across all supported locales.
- The Galaxy dialog order is Close, View sky from here, Explore/Coming Soon.
- Explore keeps its existing primary styling, copy, route mapping, and Coming Soon behavior.
- View Sky is an independent secondary action and may be enabled when Explore is Coming Soon.
- Invalid or origin-colliding systems have a disabled View Sky action with localized accessible explanation; these states are defensive and fixture-covered with current data.
- Existing `canExplore`, focus handling, dialog dismissal, and Escape behavior do not regress.
- The locale-switch component regression is implemented in `SettingsPanel.test.ts`.
- No observer state exists only in a transient Svelte variable.
- No astronomy transforms, renderer support, observer HUD, or Constellation fallback UI are added in this PR.

## Validation commands

```bash
bunx vitest src/lib/constellation/__tests__/observerRouteState.test.ts
bunx vitest src/i18n/__tests__/routes.test.ts
bunx vitest src/i18n/__tests__/observerUiI18nSync.test.ts
bunx vitest src/components/hud/__tests__/SettingsPanel.test.ts
bunx vitest src/components/__tests__/GalaxyWrapper.test.ts
bun run lint
bun run type-check
bun run test:run
bun run build
```
