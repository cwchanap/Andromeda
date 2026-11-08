<script lang="ts">
  import Modal from "@/components/ui/Modal.svelte";
  import LanguageOptions from "@/components/LanguageOptions.svelte";
  import Button from "@/components/ui/Button.svelte";
  import type { GameSettings } from "../stores/gameStore";
  import type { AppLocale } from "@/i18n/routes";

  export let isOpen: boolean;
  export let currentSettings: GameSettings;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  // Translation function
  const t = (key: string) => translations[key] || key;

  type ToggleKey =
    | "enableAnimations"
    | "showControlHints"
    | "audioEnabled"
    | "highContrastMode"
    | "reducedMotion"
    | "enableKeyboardNavigation"
    | "announceSceneChanges"
    | "screenReaderMode";
  type ToggleRow = { key: ToggleKey; label: string; desc: string; describedby?: string };

  const visualToggles: ToggleRow[] = [
    { key: "enableAnimations", label: "settings.enableAnimations", desc: "settings.enableAnimationsDesc" },
    { key: "showControlHints", label: "settings.showControlHints", desc: "settings.showControlHintsDesc" },
  ];
  const audioToggles: ToggleRow[] = [
    { key: "audioEnabled", label: "settings.enableAudio", desc: "settings.enableAudioDesc" },
  ];
  const accessibilityToggles: ToggleRow[] = [
    { key: "highContrastMode", label: "settings.highContrast", desc: "settings.highContrastDesc", describedby: "high-contrast-desc" },
    { key: "reducedMotion", label: "settings.reducedMotion", desc: "settings.reducedMotionDesc", describedby: "reduced-motion-desc" },
    { key: "enableKeyboardNavigation", label: "settings.keyboardNavigation", desc: "settings.keyboardNavigationDesc", describedby: "keyboard-nav-desc" },
    { key: "announceSceneChanges", label: "settings.announceSceneChanges", desc: "settings.announceSceneChangesDesc", describedby: "announce-changes-desc" },
    { key: "screenReaderMode", label: "settings.screenReaderMode", desc: "settings.screenReaderModeDesc", describedby: "screen-reader-desc" },
  ];

  let settings: GameSettings = { ...currentSettings };

  // Reactive statement to update settings when currentSettings changes
  $: settings = { ...currentSettings };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: GameSettings = {
      enableAnimations: true,
      audioEnabled: true,
      controlSensitivity: 1.0,
      graphicsQuality: "medium",
      showControlHints: true,
      orbitSpeedMultiplier: 1.0,
      // Accessibility defaults
      highContrastMode: false,
      reducedMotion: false,
      enableKeyboardNavigation: true,
      announceSceneChanges: true,
      screenReaderMode: false,
    };
    settings = defaultSettings;
  };

  // Event dispatchers
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    close: void;
    save: GameSettings;
  }>();

  function onClose() {
    dispatch('close');
  }

  function onSave(newSettings: GameSettings) {
    dispatch('save', newSettings);
  }
</script>

<Modal
  {isOpen}
  onClose={onClose}
  closeLabel={t('action.close')}
  ariaLabelledby="settings-title"
  maxWidth="600px"
>
  <svelte:fragment slot="header">
    <div class="ui-caption">{t('settings.configuration')}</div>
    <h2 id="settings-title" class="settings-title">{t('settings.title')}</h2>
  </svelte:fragment>

  <div class="settings-body">
    <section class="settings-section">
      <h3 class="settings-heading">{t('settings.language')}</h3>
      <LanguageOptions {lang} {translations} />
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">{t('settings.visual')}</h3>
      {#each visualToggles.slice(0, 1) as row (row.key)}
        <label class="settings-row">
          <span class="settings-text">
            <span class="settings-label">{t(row.label)}</span>
            <span class="settings-desc">{t(row.desc)}</span>
          </span>
          <input type="checkbox" class="ui-toggle" bind:checked={settings[row.key]} aria-label={t(row.label)} />
        </label>
      {/each}
      <div class="settings-row">
        <span class="settings-text">
          <span class="settings-label">{t('settings.graphicsQuality')}</span>
          <span class="settings-desc">{t('settings.graphicsQualityDesc')}</span>
        </span>
        <select bind:value={settings.graphicsQuality} class="ui-select" aria-label={t('settings.graphicsQuality')}>
          <option value="low">{t('settings.qualityLow')}</option>
          <option value="medium">{t('settings.qualityMedium')}</option>
          <option value="high">{t('settings.qualityHigh')}</option>
        </select>
      </div>
      {#each visualToggles.slice(1) as row (row.key)}
        <label class="settings-row">
          <span class="settings-text">
            <span class="settings-label">{t(row.label)}</span>
            <span class="settings-desc">{t(row.desc)}</span>
          </span>
          <input type="checkbox" class="ui-toggle" bind:checked={settings[row.key]} aria-label={t(row.label)} />
        </label>
      {/each}
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">{t('settings.audio')}</h3>
      {#each audioToggles as row (row.key)}
        <label class="settings-row">
          <span class="settings-text">
            <span class="settings-label">{t(row.label)}</span>
            <span class="settings-desc">{t(row.desc)}</span>
          </span>
          <input type="checkbox" class="ui-toggle" bind:checked={settings[row.key]} aria-label={t(row.label)} />
        </label>
      {/each}
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">{t('settings.control')}</h3>
      <div class="settings-row settings-row--stacked">
        <span class="settings-text settings-text--inline">
          <span class="settings-label">{t('settings.mouseSensitivity')}</span>
          <span class="settings-desc">{settings.controlSensitivity.toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          bind:value={settings.controlSensitivity}
          class="settings-range"
          aria-label={t('settings.mouseSensitivity')}
        />
        <span class="settings-range-labels">
          <span>{t('settings.sensitivitySlow')}</span>
          <span>{t('settings.sensitivityFast')}</span>
        </span>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="settings-heading">{t('settings.accessibility')}</h3>
      {#each accessibilityToggles as row (row.key)}
        <label class="settings-row">
          <span class="settings-text">
            <span class="settings-label">{t(row.label)}</span>
            <span class="settings-desc">{t(row.desc)}</span>
          </span>
          <input
            type="checkbox"
            class="ui-toggle"
            bind:checked={settings[row.key]}
            aria-label={t(row.label)}
            aria-describedby={row.describedby}
          />
        </label>
      {/each}
    </section>
  </div>

  <svelte:fragment slot="actions">
    <div class="settings-actions">
      <Button variant="ghost" class="settings-reset" on:click={handleReset}>
        {t('settings.resetDefaults')}
      </Button>
      <div class="settings-actions-trailing">
        <Button on:click={onClose}>
          {t('action.cancel')}
        </Button>
        <Button variant="primary" on:click={handleSave}>{t('settings.save')}</Button>
      </div>
    </div>
  </svelte:fragment>
</Modal>

<style>
  .settings-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 600;
    line-height: 1;
  }

  .settings-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
  }

  .settings-heading {
    margin: 0 0 6px;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-line);
    cursor: pointer;
  }
  .settings-section > .settings-row:last-child {
    border-bottom: none;
  }
  .settings-row--stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    cursor: default;
  }

  .settings-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .settings-text--inline {
    flex-direction: row;
    justify-content: space-between;
  }
  .settings-label {
    font-size: 14px;
    color: var(--color-text);
  }
  .settings-desc {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .settings-range {
    width: 100%;
    accent-color: var(--color-accent);
  }
  .settings-range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .settings-actions {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .settings-actions :global(.settings-reset) {
    color: var(--color-danger);
  }

  .settings-actions-trailing {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 480px) {
    .settings-actions,
    .settings-actions-trailing {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }

    .settings-actions > :global(button),
    .settings-actions-trailing > :global(button) {
      width: 100%;
    }
  }
</style>
