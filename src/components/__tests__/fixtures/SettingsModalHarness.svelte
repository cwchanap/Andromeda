<script lang="ts">
  import SettingsModal from "@/components/SettingsModal.svelte";
  import type { AppLocale } from "@/i18n/routes";
  import type { GameSettings } from "@/stores/gameStore";

  export let isOpen = false;
  export let currentSettings: GameSettings;
  export let lang: AppLocale = "en";
  export let translations: Record<string, string> = {};
  export let onClose: () => void = () => {};
  export let onSave: (settings: GameSettings) => void = () => {};

  function handleSave(event: CustomEvent<GameSettings>) {
    onSave(event.detail);
  }
</script>

<SettingsModal
  {isOpen}
  {currentSettings}
  {lang}
  {translations}
  on:close={onClose}
  on:save={handleSave}
/>
