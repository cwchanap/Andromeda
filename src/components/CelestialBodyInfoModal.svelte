<script lang="ts">
  import type { CelestialBodyData } from '../types/game';
  import { gameState, gameActions } from '../stores/gameStore';
  import { routes, type AppLocale } from '../i18n/routes';
  import { getStatusBadge, factOrUnknown } from '@/lib/hud/statusBadge';
  import ModalShell from '@/components/ModalShell.svelte';

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
    return t(translationKey) !== translationKey ? t(translationKey).toUpperCase() : body.type.toUpperCase();
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
  
  // Get planet-specific styling
  const getPlanetTheme = (body: CelestialBodyData | null) => {
    if (!body) return { 
      primary: '#60a5fa', 
      secondary: '#3b82f6', 
      accent: '#ddd6fe',
      background: undefined,
      textColor: undefined
    };
    
    // Use custom theme if defined in the data
    if (body.modalTheme) {
      return {
        primary: body.modalTheme.primary,
        secondary: body.modalTheme.secondary,
        accent: body.modalTheme.accent,
        background: body.modalTheme.background,
        textColor: body.modalTheme.textColor
      };
    }
    
    // Fallback to hardcoded themes based on planet ID
    const defaultThemes: Record<string, { 
      primary: string; 
      secondary: string; 
      accent: string;
      background?: string;
      textColor?: string;
    }> = {
      sun: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fcd34d' },
      mercury: { primary: '#94a3b8', secondary: '#64748b', accent: '#cbd5e1' },
      venus: { primary: '#fbbf24', secondary: '#d97706', accent: '#fed7aa' },
      earth: { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#34d399' },
      mars: { primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5' },
      jupiter: { primary: '#f59e0b', secondary: '#d97706', accent: '#fde68a' },
      saturn: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fef3c7' },
      uranus: { primary: '#06b6d4', secondary: '#0891b2', accent: '#a5f3fc' },
      neptune: { primary: '#3b82f6', secondary: '#1e40af', accent: '#93c5fd' }
    };
    
    return defaultThemes[body.id] || { 
      primary: '#60a5fa', 
      secondary: '#3b82f6', 
      accent: '#ddd6fe',
      background: undefined,
      textColor: undefined
    };
  };
  
  $: theme = getPlanetTheme(celestialBody);

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
  <ModalShell
    isOpen={isOpen && celestialBody !== null}
    {onClose}
    closeLabel={`${t("modal.close")} ${getTranslatedName(celestialBody)}`}
    ariaLabelledby="modal-title"
    ariaDescribedby="modal-description"
    maxWidth="600px"
    decoration="cosmic"
    theme={theme}
  >
    <svelte:fragment slot="header">
      <!-- Header section -->
      <div class="modal-header">
        <div class="planet-icon">
          <div class="planet-sphere" style="background-color: {celestialBody.material.color}"></div>
          <div class="orbit-ring"></div>
        </div>
        <div class="header-text">
          <h2 id="modal-title" class="planet-name">{getTranslatedName(celestialBody)}</h2>
          <span class="planet-type">{getTranslatedType(celestialBody)}</span>
          {#if getStatusBadge(celestialBody)}
            <span class={getStatusBadge(celestialBody)!.className}>{t(getStatusBadge(celestialBody)!.label)}</span>
          {/if}
        </div>
      </div>
    </svelte:fragment>

    <!-- Description section -->
    <div class="modal-body">
      <p id="modal-description" class="planet-description">{getTranslatedDescription(celestialBody)}</p>

      <!-- Key facts section -->
      <div class="facts-section">
        <h3 class="facts-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9 8.91,8.26"></polygon>
          </svg>
          {t('modal.celestialData')}
        </h3>
        <div class="facts-grid">
          <div class="fact-item">
            <div class="fact-icon">🌍</div>
            <div class="fact-content">
              <span class="fact-label">{t('modal.diameter')}</span>
              <span class="fact-value">{getTranslatedFact(celestialBody, 'diameter', factOrUnknown(celestialBody.keyFacts.diameter, t('common.unknown')))}</span>
            </div>
          </div>

          <div class="fact-item">
            <div class="fact-icon">📏</div>
            <div class="fact-content">
              <span class="fact-label">{celestialBody.type === 'moon' ? t('modal.distanceFromParent') : t('modal.distanceFromSun')}</span>
              <span class="fact-value">{celestialBody.type === 'moon'
                ? getTranslatedFact(celestialBody, 'distanceFromParent', celestialBody.distanceFromParent?.formattedString ?? '-')
                : getTranslatedFact(celestialBody, 'distanceFromSun', celestialBody.keyFacts.distanceFromSun ?? '-')}</span>
            </div>
          </div>

          <div class="fact-item">
            <div class="fact-icon">🔄</div>
            <div class="fact-content">
              <span class="fact-label">{t('modal.orbitalPeriod')}</span>
              <span class="fact-value">{getTranslatedFact(celestialBody, 'orbitalPeriod', factOrUnknown(celestialBody.keyFacts.orbitalPeriod, t('common.unknown')))}</span>
            </div>
          </div>

          <div class="fact-item">
            <div class="fact-icon">🌡️</div>
            <div class="fact-content">
              <span class="fact-label">{t('modal.temperature')}</span>
              <span class="fact-value">{getTranslatedFact(celestialBody, 'temperature', factOrUnknown(celestialBody.keyFacts.temperature, t('common.unknown')))}</span>
            </div>
          </div>

          {#if celestialBody.keyFacts.equilibriumTemperature}
            <div class="fact-item">
              <div class="fact-icon">🌡️</div>
              <div class="fact-content">
                <span class="fact-label">{t('modal.equilibriumTemperature')}</span>
                <span class="fact-value">{celestialBody.keyFacts.equilibriumTemperature}</span>
              </div>
            </div>
          {/if}

          {#if celestialBody.keyFacts.moons}
            <div class="fact-item">
              <div class="fact-icon">🌙</div>
              <div class="fact-content">
                <span class="fact-label">{t('modal.moons')}</span>
                <span class="fact-value">{celestialBody.keyFacts.moons}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Composition section -->
      {#if celestialBody.keyFacts.composition && celestialBody.keyFacts.composition.length > 0}
        <div class="composition-section">
          <h3 class="composition-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
            </svg>
            {t('modal.composition')}
          </h3>
          <div class="composition-tags">
            {#each celestialBody.keyFacts.composition as element}
              <span class="composition-tag">{translateComposition(element)}</span>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer with cosmic decoration -->
    <div class="modal-footer">
      <div class="cosmic-divider"></div>
      <p class="footer-text">{t('modal.footerText')}</p>
    </div>

    <svelte:fragment slot="actions">
      <!-- Comparison button section -->
      <div class="action-section">
        {#if !isInComparison && comparisonCount < 4}
          <button
            class="compare-button"
            on:click={handleAddToComparison}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {t('comparison.addToCompare')}
          </button>
        {:else if isInComparison}
          <div class="in-comparison-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{t('comparison.inComparison')}</span>
            <button class="view-comparison-btn" on:click={handleOpenComparison} type="button">
              {t('comparison.viewComparison')} ({comparisonCount})
            </button>
          </div>
        {:else}
          <div class="comparison-full">
            {t('comparison.maxReached')}
          </div>
        {/if}
      </div>

      <!-- Action buttons section for terrain exploration -->
      {#if celestialBody.terrain && ['mercury', 'venus', 'earth', 'mars'].includes(celestialBody.id)}
        <div class="action-section">
          <button
            class="terrain-button"
            on:click={() => {
              window.location.href = routes.terrain(celestialBody.id, lang);
            }}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {t('modal.viewTerrain')}
          </button>
        </div>
      {/if}
    </svelte:fragment>
  </ModalShell>
{/if}

<style>
  .modal-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 30px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
  }
  
  .planet-icon {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .planet-sphere {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    position: relative;
    box-shadow: 
      0 0 20px rgba(255, 255, 255, 0.3),
      inset -10px -10px 20px rgba(0, 0, 0, 0.3),
      0 0 40px var(--primary-color);
    animation: rotate 20s linear infinite, pulse 3s ease-in-out infinite;
  }
  
  .planet-sphere::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--accent-color), transparent 70%);
    opacity: 0.3;
    animation: rotate 25s linear infinite reverse;
  }
  
  .orbit-ring {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px solid var(--primary-color);
    border-radius: 50%;
    opacity: 0.3;
    animation: rotate 15s linear infinite reverse;
  }
  
  .header-text {
    flex: 1;
  }
  
  .planet-name {
    margin: 0 0 8px 0;
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    text-shadow: 0 0 20px var(--primary-color);
    background: linear-gradient(45deg, var(--primary-color), var(--accent-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .planet-type {
    display: inline-block;
    background: rgba(var(--primary-color), 0.2);
    color: var(--accent-color);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    border: 1px solid var(--primary-color);
  }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }

  .status-badge--candidate {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.4);
  }

  .status-badge--controversial {
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.4);
  }
  
  .modal-body {
    padding: 30px;
    position: relative;
    z-index: 1;
  }
  
  .planet-description {
    margin: 0 0 30px 0;
    line-height: 1.7;
    color: var(--modal-text-color, rgba(255, 255, 255, 0.9));
    font-size: 1.1rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .facts-section {
    margin-bottom: 30px;
  }
  
  .facts-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px 0;
    color: var(--accent-color);
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .fact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }
  
  .fact-item:hover {
    background: rgba(var(--primary-color), 0.1);
    border-color: var(--primary-color);
    transform: translateY(-2px);
  }
  
  .fact-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 0 10px var(--primary-color));
  }
  
  .fact-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .fact-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
  
  .fact-value {
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .composition-section {
    margin-bottom: 20px;
  }
  
  .composition-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px 0;
    color: var(--accent-color);
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .composition-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .composition-tag {
    background: rgba(var(--secondary-color), 0.2);
    color: var(--accent-color);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--secondary-color);
    backdrop-filter: blur(5px);
  }
  
  .modal-footer {
    padding: 20px 30px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 1;
  }
  
  .cosmic-divider {
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--primary-color) 25%, 
      var(--accent-color) 50%, 
      var(--secondary-color) 75%, 
      transparent 100%);
    margin-bottom: 12px;
    border-radius: 1px;
  }
  
  .footer-text {
    margin: 0;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-style: italic;
  }
  
  .terrain-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
  }
  
  .terrain-button:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
  }
  
  .terrain-button:active {
    transform: translateY(0);
  }
  
  .terrain-button svg {
    width: 20px;
    height: 20px;
  }

  /* Compare button styles */
  .compare-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
  }

  .compare-button:hover {
    background: linear-gradient(135deg, #34d399, #10b981);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
  }

  .compare-button:active {
    transform: translateY(0);
  }

  .in-comparison-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: rgba(16, 185, 129, 0.1);
    border: 2px solid #10b981;
    border-radius: 12px;
    color: #34d399;
  }

  .in-comparison-badge span {
    font-weight: 500;
  }

  .view-comparison-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .view-comparison-btn:hover {
    background: #059669;
  }

  .comparison-full {
    padding: 12px 20px;
    background: rgba(251, 191, 36, 0.1);
    border: 2px solid #fbbf24;
    border-radius: 12px;
    color: #fcd34d;
    text-align: center;
    font-weight: 500;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 
        0 0 20px rgba(255, 255, 255, 0.3),
        inset -10px -10px 20px rgba(0, 0, 0, 0.3),
        0 0 40px var(--primary-color);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 
        0 0 30px rgba(255, 255, 255, 0.5),
        inset -10px -10px 20px rgba(0, 0, 0, 0.3),
        0 0 60px var(--primary-color);
    }
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .modal-header {
      flex-direction: column;
      text-align: center;
      padding: 20px;
    }
    
    .planet-name {
      font-size: 2rem;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .facts-grid {
      grid-template-columns: 1fr;
    }
    
    .modal-footer {
      padding: 15px 20px;
    }
  }
</style>
