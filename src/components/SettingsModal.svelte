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
              aria-label="Enable Animations"
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
              aria-label="Show Control Hints"
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
              aria-label="Enable Audio"
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

      <!-- Accessibility Settings -->
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">High Contrast Mode</h4>
              <p class="text-muted-foreground text-sm">
                Enable high contrast colors for better visibility
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.highContrastMode}
              class="h-4 w-4"
              aria-label="High Contrast Mode"
              aria-describedby="high-contrast-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Reduced Motion</h4>
              <p class="text-muted-foreground text-sm">
                Minimize animations and transitions
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.reducedMotion}
              class="h-4 w-4"
              aria-label="Reduced Motion"
              aria-describedby="reduced-motion-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Keyboard Navigation</h4>
              <p class="text-muted-foreground text-sm">
                Enable keyboard controls for 3D navigation
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.enableKeyboardNavigation}
              class="h-4 w-4"
              aria-label="Keyboard Navigation"
              aria-describedby="keyboard-nav-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Announce Scene Changes</h4>
              <p class="text-muted-foreground text-sm">
                Announce when celestial bodies are selected
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.announceSceneChanges}
              class="h-4 w-4"
              aria-label="Announce Scene Changes"
              aria-describedby="announce-changes-desc"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold">Screen Reader Mode</h4>
              <p class="text-muted-foreground text-sm">
                Optimize interface for screen readers
              </p>
            </div>
            <input
              type="checkbox"
              bind:checked={settings.screenReaderMode}
              class="h-4 w-4"
              aria-label="Screen Reader Mode"
              aria-describedby="screen-reader-desc"
            />
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
