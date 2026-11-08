<script lang="ts">
  import type { CelestialBodyData } from '../types/game';
  import { gameState, gameActions } from '../stores/gameStore';
  import { routes, type AppLocale } from '../i18n/routes';
  import { getStatusBadge, factOrUnknown } from '@/lib/hud/statusBadge';
  import Modal from '@/components/ui/Modal.svelte';

  export let isOpen: boolean = false;
  export let celestialBody: CelestialBodyData | null = null;
  export let onClose: () => void;
  export let lang: AppLocale = 'en';
  export let translations: Record<string, string> = {};
  
  // Create translation function with fallback
  $: t = (key: string) => translations[key] || key;
  
  // Get translated planet content
  $: getTranslatedName = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.${body.id}.name`;
    return t(translationKey) !== translationKey ? t(translationKey) : body.name;
  };
  
  $: getTranslatedDescription = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.${body.id}.description`;
    return t(translationKey) !== translationKey ? t(translationKey) : body.description;
  };
  
  $: getTranslatedType = (body: CelestialBodyData | null) => {
    if (!body) return '';
    const translationKey = `planet.type.${body.type}`;
    return t(translationKey) !== translationKey ? t(translationKey) : body.type;
  };
  
  // Translate composition elements
  $: translateComposition = (composition: string) => {
    // First, try to translate the entire normalized string (for compound entries without percentages)
    const normalizedFull = composition.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fullKey = `element.${normalizedFull}`;
    const translatedFull = t(fullKey);
    if (translatedFull !== fullKey) {
      return translatedFull;
    }

    // Extract element name and percentage/description
    const match = composition.match(/^(.+?)\s*\((.+)\)$/);
    if (match) {
      const elementName = match[1].trim();
      const percentage = match[2].trim();

      // Handle specific cases first
      if (elementName.toLowerCase() === 'trace metals') {
        return `${t('element.trace')} ${t('element.metals')} (${percentage})`;
      }
      if (elementName.toLowerCase().includes('other elements')) {
        return `${t('element.other')} ${t('element.elements')} (${percentage})`;
      }

      // Try to translate the element name directly
      const normalizedElement = elementName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const translationKey = `element.${normalizedElement}`;
      const translatedElement = t(translationKey);

      if (translatedElement !== translationKey) {
        return `${translatedElement} (${percentage})`;
      }

      // Try common patterns for fallback
      if (elementName.toLowerCase().includes('trace')) {
        return `${t('element.trace')} ${t('element.metals')} (${percentage})`;
      }
      if (elementName.toLowerCase().includes('other')) {
        return `${t('element.other')} ${t('element.elements')} (${percentage})`;
      }
    }

    // Fallback to original text
    return composition;
  };

  // Translate measurement values (diameter, distance, period, temperature)
  function translateFactValue(value: string): string {
    if (!value) return value;

    // Helper: return translated value if key exists, otherwise fallback
    const tr = (key: string, fallback: string) => {
      const translated = t(key);
      return translated !== key ? translated : fallback;
    };

    // Step 1: Handle atomic patterns that span multiple tokens so the
    // scale word between the number and unit doesn't break translation.
    // This covers temperature-with-modifier (e.g. "15 million K (core)")
    // and composite distance (e.g. "149.6 million km"). Must run before
    // generic single-token replacements so the number-K / number-km pair
    // is still intact.
    const atomicReplacements: [RegExp, (...args: string[]) => string][] = [
      [/([\d,.-]+)(?:\s+(million|billion))?\s+K\s*\((surface|core|average|day|night|volcanoes)\)/g,
        (_, num, scale, modifier) => {
          const scaleStr = scale ? `${tr(`unit.${scale}`, scale)} ` : '';
          return `${num} ${scaleStr}${tr('unit.kelvin', 'K')} (${tr(`unit.${modifier}`, modifier)})`;
        }],
      // Composite: number + (million|billion) + km — handled atomically so the
      // scale word between the number and "km" doesn't break km translation
      // (e.g. "149.6 million km" → "149.6 百万 公里" in zh, not "149.6 百万 km").
      [/([\d,.-]+)\s+(million|billion)\s+km\b/g,
        (_, num, scale) => `${num} ${tr(`unit.${scale}`, scale)} ${tr('unit.km', 'km')}`],
    ];
    let result = value;
    for (const [pattern, replacer] of atomicReplacements) {
      result = result.replace(pattern, replacer);
    }

    // Step 2: Generic replacements
    const genericReplacements: [RegExp, (...args: string[]) => string][] = [
      // Generic Kelvin (only when not already handled above)
      [/([\d,.-]+)\s+K\b/g, (_, num) => `${num} ${tr('unit.kelvin', 'K')}`],
      // Celsius with optional modifier
      [/([\d,.-]+)\s*°C\s*\((surface|core|average|day|night|volcanoes)\)/g,
        (_, num, modifier) => `${num}${tr('unit.celsius', '°C')} (${tr(`unit.${modifier}`, modifier)})`],
      // Standalone Celsius
      [/°C/g, () => tr('unit.celsius', '°C')],
      // Distance scale (million/billion) when followed by K. Composite
      // "N million km" was already consumed atomically above. The K-only
      // case here is defensive — current data always pairs "million K" with
      // a (modifier) which is matched in Step 1, but this branch keeps a
      // bare "N million K" (no modifier) translatable if introduced later.
      [/\bmillion\b(?=\s*K)/g, () => tr('unit.million', 'million')],
      [/\bbillion\b(?=\s*K)/g, () => tr('unit.billion', 'billion')],
      // Distance unit (only matches when number is immediately before km;
      // "X million km" was already consumed atomically above)
      [/([\d,.-]+)\s*km\b/g, (_, num) => `${num} ${tr('unit.km', 'km')}`],
      // Time units
      [/\bdays\b/g, () => tr('unit.days', 'days')],
      [/\byears\b/g, () => tr('unit.years', 'years')],
      [/\bhours\b/g, () => tr('unit.hours', 'hours')],
      // Special
      [/\bN\/A\b/g, () => tr('unit.na', 'N/A')],
      // NOTE: bare "from" is intentionally NOT translated here.
      // Word order differs per locale (zh: "距离 X N AU", ja: "X から N AU"),
      // so translating only the token produces broken mixed-language strings
      // like "0.05 AU 来自 Proxima Centauri". Phrases containing "from" must
      // be localized via full facts.<id>.distanceFromSun/distanceFromParent
      // overrides instead.
    ];

    for (const [pattern, replacer] of genericReplacements) {
      result = result.replace(pattern, replacer);
    }
    return result;
  }

  // Helper to get translated fact with fallback
  $: getTranslatedFact = (body: CelestialBodyData | null, factName: string, rawValue: string | undefined) => {
    if (!body || rawValue === undefined) return rawValue ?? '-';
    // Try full fact translation first
    const fullKey = `facts.${body.id}.${factName}`;
    const fullTranslation = t(fullKey);
    if (fullTranslation !== fullKey) {
      return fullTranslation;
    }
    // Fall back to unit translation
    return translateFactValue(rawValue);
  };
  
  // Comparison mode state
  $: isInComparison = $gameState.comparison?.selectedBodies.some(b => b.id === celestialBody?.id) || false;
  $: comparisonCount = $gameState.comparison?.selectedBodies.length || 0;

  const handleAddToComparison = () => {
    if (celestialBody && comparisonCount < 4) {
      gameActions.addToComparison(celestialBody);
    }
  };

  const handleOpenComparison = () => {
    gameActions.showComparisonModal(true);
  };
</script>

{#if isOpen && celestialBody}
  <Modal
    isOpen={isOpen && celestialBody !== null}
    {onClose}
    closeLabel={`${t("modal.close")} ${getTranslatedName(celestialBody)}`}
    ariaLabelledby="modal-title"
    ariaDescribedby="modal-description"
    maxWidth="400px"
    placement="right"
  >
    <svelte:fragment slot="header">
      <div class="modal-header">
        <span class="planet-swatch" style="background-color: {celestialBody.material.color}" aria-hidden="true"></span>
        <div class="header-text">
          <span class="ui-caption planet-type">{getTranslatedType(celestialBody)}</span>
          <h2 id="modal-title" class="planet-name">{getTranslatedName(celestialBody)}</h2>
        </div>
      </div>
      {#if getStatusBadge(celestialBody)}
        <span class="ui-tag {getStatusBadge(celestialBody)!.className}">{t(getStatusBadge(celestialBody)!.label)}</span>
      {/if}
    </svelte:fragment>

    <div class="modal-body">
      <p id="modal-description" class="planet-description">{getTranslatedDescription(celestialBody)}</p>

      <section class="facts-section" aria-labelledby="facts-title">
        <h3 id="facts-title" class="ui-caption section-title">{t('modal.celestialData')}</h3>
        <dl class="facts-grid">
          <div class="ui-stat fact-item">
            <dt class="ui-stat-label">{t('modal.diameter')}</dt>
            <dd class="ui-stat-value">{getTranslatedFact(celestialBody, 'diameter', factOrUnknown(celestialBody.keyFacts.diameter, t('common.unknown')))}</dd>
          </div>

          <div class="ui-stat fact-item">
            <dt class="ui-stat-label">{celestialBody.type === 'moon' ? t('modal.distanceFromParent') : t('modal.distanceFromSun')}</dt>
            <dd class="ui-stat-value">{celestialBody.type === 'moon'
              ? getTranslatedFact(celestialBody, 'distanceFromParent', celestialBody.distanceFromParent?.formattedString ?? '-')
              : getTranslatedFact(celestialBody, 'distanceFromSun', celestialBody.keyFacts.distanceFromSun ?? '-')}</dd>
          </div>

          <div class="ui-stat fact-item">
            <dt class="ui-stat-label">{t('modal.orbitalPeriod')}</dt>
            <dd class="ui-stat-value">{getTranslatedFact(celestialBody, 'orbitalPeriod', factOrUnknown(celestialBody.keyFacts.orbitalPeriod, t('common.unknown')))}</dd>
          </div>

          <div class="ui-stat fact-item">
            <dt class="ui-stat-label">{t('modal.temperature')}</dt>
            <dd class="ui-stat-value">{getTranslatedFact(celestialBody, 'temperature', factOrUnknown(celestialBody.keyFacts.temperature, t('common.unknown')))}</dd>
          </div>

          {#if celestialBody.keyFacts.equilibriumTemperature}
            <div class="ui-stat fact-item">
              <dt class="ui-stat-label">{t('modal.equilibriumTemperature')}</dt>
              <dd class="ui-stat-value">{celestialBody.keyFacts.equilibriumTemperature}</dd>
            </div>
          {/if}

          {#if celestialBody.keyFacts.moons}
            <div class="ui-stat fact-item">
              <dt class="ui-stat-label">{t('modal.moons')}</dt>
              <dd class="ui-stat-value">{celestialBody.keyFacts.moons}</dd>
            </div>
          {/if}
        </dl>
      </section>

      {#if celestialBody.keyFacts.composition && celestialBody.keyFacts.composition.length > 0}
        <section class="composition-section" aria-labelledby="composition-title">
          <h3 id="composition-title" class="ui-caption section-title">{t('modal.composition')}</h3>
          <ul class="composition-tags">
            {#each celestialBody.keyFacts.composition as element}
              <li class="composition-tag">{translateComposition(element)}</li>
            {/each}
          </ul>
        </section>
      {/if}

      <p class="footer-text">{t('modal.footerText')}</p>
    </div>

    <svelte:fragment slot="actions">
      <div class="action-grid">
        {#if !isInComparison && comparisonCount < 4}
          <button class="ui-btn compare-button" on:click={handleAddToComparison} type="button">
            {t('comparison.addToCompare')}
          </button>
        {:else if isInComparison}
          <button class="ui-btn view-comparison-btn" on:click={handleOpenComparison} type="button">
            ✓ {t('comparison.viewComparison')} ({comparisonCount})
          </button>
        {:else}
          <p class="comparison-full">{t('comparison.maxReached')}</p>
        {/if}

        {#if celestialBody.terrain && ['mercury', 'venus', 'earth', 'mars'].includes(celestialBody.id)}
          <button
            class="ui-btn ui-btn--primary terrain-button"
            on:click={() => {
              window.location.href = routes.terrain(celestialBody.id, lang);
            }}
            type="button"
          >
            {t('modal.viewTerrain')}
          </button>
        {/if}
      </div>
    </svelte:fragment>
  </Modal>
{/if}

<style>
  .modal-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .planet-swatch {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    box-shadow: inset -8px -8px 16px color-mix(in srgb, var(--color-bg-deep) 55%, transparent);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .planet-name {
    margin: 0;
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 600;
    line-height: 1;
    color: var(--color-text);
  }

  .modal-header + :global(.ui-tag) {
    margin-top: 10px;
  }

  :global(.status-badge--candidate) {
    color: var(--color-info);
  }
  :global(.status-badge--controversial) {
    color: var(--color-danger);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .planet-description {
    margin: 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 19px;
    line-height: 1.4;
    color: var(--color-text-soft);
  }

  .section-title {
    margin: 0 0 10px;
  }

  .facts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 18px;
    margin: 0;
    padding: 14px 0;
    border-top: 1px solid var(--color-line);
    border-bottom: 1px solid var(--color-line);
  }
  .facts-grid dd {
    margin: 0;
  }

  .composition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .composition-tag {
    padding: 4px 10px;
    border: 1px solid var(--color-line-strong);
    border-radius: 999px;
    font-size: 12px;
    color: var(--color-text);
  }

  .footer-text {
    margin: 0;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
    width: 100%;
  }

  .comparison-full {
    margin: 0;
    align-self: center;
    font-size: 12px;
    color: var(--color-text-muted);
  }
</style>
