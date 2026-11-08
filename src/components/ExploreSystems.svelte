<script lang="ts">
  import { planetarySystemRegistry } from "@/lib/planetary-system";
  import { matchesQuery, paginate, pageLabel } from "@/lib/hud/list";
  import { knownCount } from "@/lib/hud/knownCount";
  import Panel from "@/components/ui/Panel.svelte";
  import Button from "@/components/ui/Button.svelte";
  import SearchInput from "@/components/ui/SearchInput.svelte";

  export let t: (key: string) => string;
  export let currentSystemId: string | null = null;
  export let onSelect: (systemId: string) => void = () => {};
  export let onClose: () => void = () => {};

  const PER_PAGE = 6;
  const allSystems = planetarySystemRegistry.getAllSystems();

  // Resolve a system's display name via i18n, falling back to the registry
  // name when no translation is available. Without this the explore modal
  // always shows the English registry name, ignoring the active locale.
  //
  // The fallback must handle two "missing" shapes: `useTranslations` returns
  // a falsy value for unknown keys, while the pre-computed translations prop
  // path (see MainMenu.svelte / index.astro) returns the raw key string. We
  // treat a returned raw key as "not translated" so users never see a literal
  // "systems.<id>.name" label.
  const systemName = (system: { id: string; name: string }) => {
    const key = `systems.${system.id}.name`;
    const translated = t(key);
    return !translated || translated === key ? system.name : translated;
  };

  let query = "";
  let page = 1;

  // Reset to page 1 whenever the query changes.
  $: { query; page = 1; }

  $: filtered = allSystems.filter((s) =>
    matchesQuery(query, [
      s.name,
      s.systemData?.systemType,
      s.systemData?.metadata?.distance,
      s.systemData?.metadata?.constellation,
    ]),
  );
  $: pageResult = paginate(filtered, page, PER_PAGE);
</script>

<div
  class="explore-overlay"
  role="dialog"
  aria-modal="true"
  aria-label={t("explore.title")}
  tabindex="-1"
  on:keydown={(e) => {
    if (e.key === "Escape") onClose();
    // Prevent navigation keys from bubbling to parent window listeners (e.g. MainMenu)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
      e.stopPropagation();
    }
  }}
>
  <div class="w-full max-w-4xl">
    <Panel title={t("explore.title")}>
      <div class="mb-4 flex items-center gap-3">
        <div class="flex-1">
          <SearchInput
            bind:value={query}
            autofocus={true}
            placeholder={t("explore.searchPlaceholder")}
            ariaLabel={t("explore.searchPlaceholder")}
          />
        </div>
        <Button variant="ghost" ariaLabel={t("finder.close")} on:click={onClose}>{t("finder.close")}</Button>
      </div>

      {#if pageResult.items.length === 0}
        <p class="explore-empty">{t("explore.empty")}</p>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each pageResult.items as system (system.id)}
            <article class="system-card" class:is-current={system.id === currentSystemId}>
              <h4 class="system-name">{systemName(system)}</h4>
              <dl class="system-stats">
                <div class="ui-stat">
                  <dt class="ui-stat-label">{t("explore.knownPlanets")}</dt>
                  <dd class="ui-stat-value">{knownCount(system)}</dd>
                </div>
                {#if system.systemData?.metadata?.distance}
                  <div class="ui-stat">
                    <dt class="ui-stat-label">{t("explore.distance")}</dt>
                    <dd class="ui-stat-value">{system.systemData.metadata.distance}</dd>
                  </div>
                {/if}
              </dl>
              {#if system.id === currentSystemId}
                <Button size="sm" disabled>{t("explore.current")}</Button>
              {:else}
                <Button size="sm" on:click={() => onSelect(system.id)}>{t("explore.action")} →</Button>
              {/if}
            </article>
          {/each}
        </div>

        {#if pageResult.totalPages > 1}
          <div class="ui-pager">
            <Button ariaLabel={t("explore.prev")} disabled={pageResult.page <= 1} on:click={() => (page = pageResult.page - 1)}>{t("explore.prev")}</Button>
            <span class="ui-pager-label">{pageLabel(pageResult.page, pageResult.totalPages)}</span>
            <Button ariaLabel={t("explore.next")} disabled={pageResult.page >= pageResult.totalPages} on:click={() => (page = pageResult.page + 1)}>{t("explore.next")}</Button>
          </div>
        {/if}
      {/if}
    </Panel>
  </div>
</div>

<style>
  .explore-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--color-scrim);
  }
  .system-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--color-line);
    border-radius: var(--radius-panel);
    background: var(--color-bg);
  }
  .system-card.is-current {
    border-color: var(--color-accent);
  }
  .system-name {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--color-text);
  }
  .system-stats {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0;
    border-top: 1px solid var(--color-line);
  }
  .system-stats .ui-stat {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--color-line);
  }
  .system-stats dd {
    margin: 0;
    white-space: nowrap;
  }
  .explore-empty {
    margin: 0;
    padding: 32px 0;
    text-align: center;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 18px;
    color: var(--color-text-muted);
  }
</style>
