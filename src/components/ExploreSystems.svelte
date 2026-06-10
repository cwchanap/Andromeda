<script lang="ts">
  import { planetarySystemRegistry } from "../lib/planetary-system";
  import type { PlanetarySystem } from "../lib/planetary-system";
  import { matchesQuery, paginate, pageLabel } from "../lib/hud/list";
  import HudPanel from "./hud/HudPanel.svelte";
  import HudButton from "./hud/HudButton.svelte";
  import HudSearch from "./hud/HudSearch.svelte";
  import GlitchText from "./hud/GlitchText.svelte";

  export let t: (key: string) => string;
  export let currentSystemId: string | null = null;
  export let onSelect: (systemId: string) => void = () => {};
  export let onClose: () => void = () => {};

  const PER_PAGE = 6;
  const allSystems = planetarySystemRegistry.getAllSystems();

  let query = "";
  let page = 1;

  // Reset to page 1 whenever the query changes.
  $: query, (page = 1);

  $: filtered = allSystems.filter((s) =>
    matchesQuery(query, [
      s.name,
      s.systemData?.systemType,
      s.systemData?.metadata?.distance,
      s.systemData?.metadata?.constellation,
    ]),
  );
  $: pageResult = paginate(filtered, page, PER_PAGE);

  function bodyCount(s: PlanetarySystem): number {
    return s.systemData?.celestialBodies?.length ?? 0;
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
  role="dialog"
  aria-modal="true"
  aria-label={t("explore.title")}
>
  <div class="w-full max-w-4xl">
    <HudPanel title={t("explore.title")}>
      <div class="mb-4 flex items-center gap-3">
        <div class="flex-1">
          <HudSearch
            bind:value={query}
            placeholder={t("explore.searchPlaceholder")}
            ariaLabel={t("explore.searchPlaceholder")}
          />
        </div>
        <HudButton bracket ariaLabel={t("finder.close")} on:click={onClose}>{t("finder.close")}</HudButton>
      </div>

      {#if pageResult.items.length === 0}
        <div class="hud-section-label" style="text-align:center; padding:2rem 0;">{t("explore.empty")}</div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each pageResult.items as system (system.id)}
            <div class="hud-readout" style="margin-bottom:0;">
              <h4 class="hud-panel-title" style="font-size:13px;">
                <GlitchText text={system.name.toUpperCase()} />
              </h4>
              <div class="readout-row">
                <span class="readout-label">{t("explore.bodies")}</span>
                <span></span>
                <span class="readout-value">{bodyCount(system)}</span>
              </div>
              {#if system.systemData?.metadata?.distance}
                <div class="readout-row">
                  <span class="readout-label">{t("explore.distance")}</span>
                  <span></span>
                  <span class="readout-value">{system.systemData.metadata.distance}</span>
                </div>
              {/if}
              <div style="margin-top:10px;">
                {#if system.id === currentSystemId}
                  <HudButton disabled>{t("explore.current")}</HudButton>
                {:else}
                  <HudButton bracket on:click={() => onSelect(system.id)}>{t("explore.action")}</HudButton>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if pageResult.totalPages > 1}
          <div class="hud-pager">
            <HudButton ariaLabel={t("explore.prev")} disabled={pageResult.page <= 1} on:click={() => (page = pageResult.page - 1)}>{t("explore.prev")}</HudButton>
            <span class="hud-pager-label">{pageLabel(pageResult.page, pageResult.totalPages)}</span>
            <HudButton ariaLabel={t("explore.next")} disabled={pageResult.page >= pageResult.totalPages} on:click={() => (page = pageResult.page + 1)}>{t("explore.next")}</HudButton>
          </div>
        {/if}
      {/if}
    </HudPanel>
  </div>
</div>
