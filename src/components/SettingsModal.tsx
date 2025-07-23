import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GameSettings) => void;
  currentSettings: GameSettings;
}

export interface GameSettings {
  enableAnimations: boolean;
  audioEnabled: boolean;
  controlSensitivity: number;
  graphicsQuality: "low" | "medium" | "high";
  showControlHints: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);

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
    setSettings(defaultSettings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Game Settings
            <Badge variant="secondary">Configuration</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visual Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Enable Animations</h4>
                  <p className="text-muted-foreground text-sm">
                    Enable planet rotation and orbital animations
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAnimations}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableAnimations: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Graphics Quality</h4>
                  <p className="text-muted-foreground text-sm">
                    Adjust rendering quality for performance
                  </p>
                </div>
                <select
                  value={settings.graphicsQuality}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      graphicsQuality: e.target.value as
                        | "low"
                        | "medium"
                        | "high",
                    })
                  }
                  className="rounded border px-2 py-1"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Show Control Hints</h4>
                  <p className="text-muted-foreground text-sm">
                    Display helpful control hints in the game
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showControlHints}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showControlHints: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Enable Audio</h4>
                  <p className="text-muted-foreground text-sm">
                    Enable background music and sound effects
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.audioEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, audioEnabled: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Mouse Sensitivity</h4>
                  <span className="text-muted-foreground text-sm">
                    {settings.controlSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.controlSensitivity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      controlSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                  <span>Slow (0.1x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
