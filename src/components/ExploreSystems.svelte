<script lang="ts">
  import { planetarySystemRegistry } from "@/lib/planetary-system";
  import { matchesQuery, paginate, pageLabel } from "@/lib/hud/list";
  import { knownCount } from "@/lib/hud/knownCount";
  import HudPanel from "@/components/hud/HudPanel.svelte";
  import HudButton from "@/components/hud/HudButton.svelte";
  import HudSearch from "@/components/hud/HudSearch.svelte";
  import GlitchText from "@/components/hud/GlitchText.svelte";

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
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
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
    <HudPanel title={t("explore.title")}>
      <div class="mb-4 flex items-center gap-3">
        <div class="flex-1">
          <HudSearch
            bind:value={query}
            autofocus={true}
            placeholder={t("explore.searchPlaceholder")}
            ariaLabel={t("explore.searchPlaceholder")}
          />
        </div>
        <HudButton bracket ariaLabel={t("finder.close")} on:click={onClose}>{t("finder.close")}</HudButton>
      </div>

      {#if pageResult.items.length === 0}
        <div class="hud-section-label text-center py-8">{t("explore.empty")}</div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each pageResult.items as system (system.id)}
            <div class="hud-readout mb-0">
              <h4 class="hud-panel-title" style="font-size:13px;">
                <GlitchText text={systemName(system).toUpperCase()} />
              </h4>
              <div class="readout-row">
                <span class="readout-label">{t("explore.knownPlanets")}</span>
                <span></span>
                <span class="readout-value">{knownCount(system)}</span>
              </div>
              {#if system.systemData?.metadata?.distance}
                <div class="readout-row">
                  <span class="readout-label">{t("explore.distance")}</span>
                  <span></span>
                  <span class="readout-value">{system.systemData.metadata.distance}</span>
                </div>
              {/if}
              <div class="mt-2.5">
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
