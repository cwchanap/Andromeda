<script lang="ts">
  import Dialog from "./ui/Dialog.svelte";
  import Button from "./ui/Button.svelte";
  import Card from "./ui/Card.svelte";
  import CardContent from "./ui/CardContent.svelte";
  import CardHeader from "./ui/CardHeader.svelte";
  import CardTitle from "./ui/CardTitle.svelte";
  import Separator from "./ui/Separator.svelte";
  import Badge from "./ui/Badge.svelte";
  import type { GameSettings } from "../stores/gameStore";
  import type { AppLocale } from "../i18n/routes";

  interface SettingsModalProps {
    isOpen: boolean;
    currentSettings: GameSettings;
  }

  export let isOpen: boolean;
  export let currentSettings: GameSettings;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};

  // Translation function
  const t = (key: string) => translations[key] || key;

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

<Dialog open={isOpen} on:close={onClose} className="max-h-[80vh] max-w-2xl overflow-y-auto">
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3 pb-4">
      <h2 class="text-lg font-semibold">{t('settings.title')}</h2>
      <Badge variant="secondary">{t('settings.configuration')}</Badge>
    </div>

    <div class="space-y-6">
      <!-- Visual Settings -->
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.visual')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.enableAnimations')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.enableAnimationsDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.enableAnimations}
              class="h-4 w-4"
              aria-label={t('settings.enableAnimations')}
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.graphicsQuality')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.graphicsQualityDesc')}
              </p>
            </div>
            <select
              bind:value={settings.graphicsQuality}
              class="rounded border px-2 py-1"
            >
              <option value="low">{t('settings.qualityLow')}</option>
              <option value="medium">{t('settings.qualityMedium')}</option>
              <option value="high">{t('settings.qualityHigh')}</option>
            </select>
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.showControlHints')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.showControlHintsDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.showControlHints}
              class="h-4 w-4"
              aria-label={t('settings.showControlHints')}
            />
          </div>
        </CardContent>
      </Card>

      <!-- Audio Settings -->
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.audio')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.enableAudio')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.enableAudioDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.audioEnabled}
              class="h-4 w-4"
              aria-label={t('settings.enableAudio')}
            />
          </div>
        </CardContent>
      </Card>

      <!-- Control Settings -->
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.control')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <h4 class="text-sm font-semibold">{t('settings.mouseSensitivity')}</h4>
              <span class="text-muted-foreground text-sm">
                {settings.controlSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              bind:value={settings.controlSensitivity}
              class="w-full"
            />
            <div class="text-muted-foreground mt-1 flex justify-between text-xs">
              <span>{t('settings.sensitivitySlow')}</span>
              <span>{t('settings.sensitivityFast')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Accessibility Settings -->
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.accessibility')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.highContrast')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.highContrastDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.highContrastMode}
              class="h-4 w-4"
              aria-label={t('settings.highContrast')}
              aria-describedby="high-contrast-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.reducedMotion')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.reducedMotionDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.reducedMotion}
              class="h-4 w-4"
              aria-label={t('settings.reducedMotion')}
              aria-describedby="reduced-motion-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.keyboardNavigation')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.keyboardNavigationDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.enableKeyboardNavigation}
              class="h-4 w-4"
              aria-label={t('settings.keyboardNavigation')}
              aria-describedby="keyboard-nav-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.announceSceneChanges')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.announceSceneChangesDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.announceSceneChanges}
              class="h-4 w-4"
              aria-label={t('settings.announceSceneChanges')}
              aria-describedby="announce-changes-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">{t('settings.screenReaderMode')}</h4>
              <p class="text-muted-foreground text-sm">
                {t('settings.screenReaderModeDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.screenReaderMode}
              class="h-4 w-4"
              aria-label={t('settings.screenReaderMode')}
              aria-describedby="screen-reader-desc"
            />
          </div>
        </CardContent>
      </Card>

      <!-- Action Buttons -->
      <div class="flex justify-between gap-3">
        <Button variant="outline" on:click={handleReset}>
          {t('settings.resetDefaults')}
        </Button>
        <div class="flex gap-3">
          <Button variant="outline" on:click={onClose}>
            {t('action.cancel')}
          </Button>
          <Button on:click={handleSave}>{t('settings.save')}</Button>
        </div>
      </div>
    </div>
  </div>
</Dialog>
