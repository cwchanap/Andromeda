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

  interface SettingsModalProps {
    isOpen: boolean;
    currentSettings: GameSettings;
  }

  export let isOpen: boolean;
  export let currentSettings: GameSettings;

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
      <h2 class="text-lg font-semibold">Game Settings</h2>
      <Badge variant="secondary">Configuration</Badge>
    </div>

    <div class="space-y-6">
      <!-- Visual Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Visual Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Enable Animations</h4>
              <p class="text-muted-foreground text-sm">
                Enable planet rotation and orbital animations
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.enableAnimations}
              class="h-4 w-4"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Graphics Quality</h4>
              <p class="text-muted-foreground text-sm">
                Adjust rendering quality for performance
              </p>
            </div>
            <select
              bind:value={settings.graphicsQuality}
              class="rounded border px-2 py-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Show Control Hints</h4>
              <p class="text-muted-foreground text-sm">
                Display helpful control hints in the game
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.showControlHints}
              class="h-4 w-4"
            />
          </div>
        </CardContent>
      </Card>

      <!-- Audio Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Audio Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Enable Audio</h4>
              <p class="text-muted-foreground text-sm">
                Enable background music and sound effects
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.audioEnabled}
              class="h-4 w-4"
            />
          </div>
        </CardContent>
      </Card>

      <!-- Control Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Control Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <h4 class="text-sm font-semibold">Mouse Sensitivity</h4>
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
              <span>Slow (0.1x)</span>
              <span>Fast (2.0x)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Action Buttons -->
      <div class="flex justify-between gap-3">
        <Button variant="outline" on:click={handleReset}>
          Reset to Defaults
        </Button>
        <div class="flex gap-3">
          <Button variant="outline" on:click={onClose}>
            Cancel
          </Button>
          <Button on:click={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  </div>
</Dialog>
