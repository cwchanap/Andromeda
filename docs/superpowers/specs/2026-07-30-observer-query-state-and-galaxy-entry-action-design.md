# Observer Query State and Galaxy Entry Action Design

**Issue:** HPA-432  
**Epic:** HPA-426 — Sky From Another Star  
**Status:** Approved, revised after review  
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
- Protect existing Explore-system navigation and dialog behavior with regression tests.

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
          requestedObserver: string | null;
          reason: "empty" | "duplicate";
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

Names may vary during implementation, but these semantic distinctions are required.

### 2. Preserve fallback provenance

The effective observer alone is insufficient. These requests all eventually render Sol but have different meanings:

- `/constellation`: normal Sol mode; no notice.
- `/constellation?observer=sol`: explicit Sol mode; no notice.
- `/constellation?observer=unknown`: invalid request; HPA-435 shows a fallback notice.
- `/constellation?observer=`: malformed request; HPA-435 shows a fallback notice.

Resolution therefore preserves the requested value and a typed fallback reason. HPA-435 must not reparse or independently reinterpret the URL.

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
- one empty value: fallback reason `empty`;
- more than one value: fallback reason `duplicate`.

Duplicate observer parameters do not use first-value-wins or last-value-wins behavior. They deterministically fall back to Sol.

Unrelated query parameters are ignored by the observer parser and preserved during locale switching.

### 5. Canonicalize Sol to no query parameter

The serializer accepts an observer ID and omits `observer` when the ID is `sol`, `null`, or `undefined`.

```ts
serializeObserverQuery("sol");
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

Planetary exploration availability remains based on `planetarySystemRegistry` and `resolveRouteSystemId`. Sky availability is based on the selected local-galaxy system's exact ID and coordinate eligibility.

The capabilities must not be coupled. A system whose planetary experience is Coming Soon can still have an enabled **View sky from here** action.

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

The dialog keeps both product actions as peers:

- **Explore system** retains its current behavior and Coming Soon state;
- **View sky from here** launches Constellation observer mode.

Close remains a dialog-dismissal action. Existing focus trap, backdrop dismissal, and Escape behavior remain unchanged.

## Localization

Add equivalent non-empty strings to `en`, `zh`, and `ja` for:

```text
action.viewSkyFromHere
galaxy.skyUnavailableInvalidCoordinates
galaxy.skyUnavailableOriginCollision
```

Unknown-observer and Constellation fallback copy belongs to HPA-435.

The repository does not currently enforce general key parity across all locale catalogs. Add a focused test, for example `src/i18n/__tests__/observerUiI18nSync.test.ts`, that asserts these HPA-432 keys exist and are non-empty in every supported locale. Do not broaden this ticket into a repository-wide key-parity migration, which may expose unrelated historical differences.

## Testing strategy

### Observer route-state unit tests

Cover:

- missing parameter resolves to normal Sol mode;
- `observer=sol` resolves to explicit Sol mode;
- a known eligible system resolves to system mode;
- an unknown ID falls back with the requested ID and `unknown-system` reason;
- an empty value falls back with `empty` reason;
- duplicate values fall back with `duplicate` reason;
- any non-finite coordinate component falls back with `invalid-coordinates` reason;
- exact origin coordinates fall back with `origin-collision` reason;
- case variants and whitespace-padded IDs do not alias known IDs;
- unrelated query parameters do not change observer parsing;
- Sol serialization omits the observer parameter;
- system serialization encodes the ID;
- valid system parse/serialize round trips preserve the ID.

### Route helper tests

Extend `src/i18n/__tests__/routes.test.ts` to cover:

- English, Chinese, and Japanese observer URLs;
- query-free canonical Sol URLs;
- encoded observer IDs;
- locale switching that preserves observer, unrelated query parameters, and hash fragments;
- locale switching without duplicating an existing locale prefix.

### Localization coverage test

Add a focused parity guard for the three HPA-432 UI keys across every locale exposed by `ui`.

### Language-switch component tests

Add one focused component regression proving:

```text
/constellation?observer=alpha-centauri#details
```

becomes:

```text
/ja/constellation?observer=alpha-centauri#details
```

Pure helper tests carry the full locale/query matrix; do not duplicate the entire matrix in both language components.

### GalaxyWrapper tests

Refactor the existing `@/lib/galaxy` mock as needed so tests can provide observer candidates.

Cover:

- both Explore and View Sky actions are present;
- an eligible, non-explorable system still enables View Sky;
- View Sky navigates to the correct English URL;
- View Sky navigates to the correct localized URL;
- synthetic non-finite coordinates disable only View Sky and show the associated localized reason;
- synthetic origin coordinates disable only View Sky and show the associated localized reason;
- clicking Explore retains current registry and Coming Soon behavior;
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

1. Add failing observer route-state tests and lock parser/resolver semantics.
2. Implement the pure route-state module.
3. Add failing route tests for observer URLs and locale preservation.
4. Extend `routes.constellation` and add `switchLocaleUrl`.
5. Migrate both language-switching components to the shared helper.
6. Add the focused HPA-432 locale-key coverage test and translations.
7. Add GalaxyWrapper tests for independent capability behavior and synthetic invalid fixtures.
8. Add observer eligibility, navigation, CTA, and accessible disabled explanations while preserving `canExplore`.
9. Run focused tests, formatting, lint, type-check, the full Vitest suite, and build.

## Risks and mitigations

### Invalid requests lose provenance

**Risk:** Resolution returns only the effective observer and erases why it fell back.  
**Mitigation:** Require a typed fallback variant with requested value and reason.

### Planetary aliases leak into observer IDs

**Risk:** Reusing `resolveRouteSystemId` changes Galaxy IDs before observer serialization.  
**Mitigation:** Observer URLs always use exact `localGalaxyData` IDs.

### Query state is dropped during locale switching

**Risk:** One language selector preserves observer state while another only localizes the pathname.  
**Mitigation:** Both selectors use one tested `switchLocaleUrl` helper.

### Locale keys drift

**Risk:** A new observer action or disabled-state message is missing from one locale.  
**Mitigation:** Add a focused automated parity guard for the three HPA-432 UI keys.

### Defensive UI is mistaken for current production reachability

**Risk:** Reviewers assume the current 30-system catalog can trigger invalid-coordinate disabled states.  
**Mitigation:** Document that current production data is valid and exercise these paths through synthetic fixtures as forward-compatible data-integrity behavior.

### HPA-432 becomes dependent on astronomy implementation

**Risk:** Coordinate validation imports HPA-431 transform helpers or adopts transform tolerances.  
**Mitigation:** Check only finite components and exact-origin collision through a structural candidate type.

### Existing Explore behavior regresses

**Risk:** Adding another action changes `canExplore`, Coming Soon, focus, dismissal, or Explore routing.  
**Mitigation:** Preserve the existing `canExplore` binding, add observer eligibility alongside it, and retain component regressions.

## Acceptance criteria

- `/constellation`, `/zh/constellation`, and `/ja/constellation` are canonical Sol URLs.
- `observer=sol` parses as explicit Sol and serializes without an observer parameter.
- A valid local-galaxy system serializes to the correctly localized Constellation URL.
- Missing, empty, duplicate, unknown, non-finite, and origin-colliding observer requests have deterministic typed results.
- Invalid requests preserve the requested value where one exists and expose a fallback reason for HPA-435.
- Locale switching preserves the full query string and hash.
- The three HPA-432 UI keys are automatically verified across all supported locales.
- The Galaxy dialog keeps independent Explore and View Sky actions.
- A system may launch View Sky even when its planetary route is Coming Soon.
- Invalid or origin-colliding systems have a disabled View Sky action with localized accessible explanation; these states are defensive and fixture-covered with current data.
- Existing `canExplore`, Explore navigation, Coming Soon behavior, focus handling, dialog dismissal, and Escape behavior do not regress.
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
