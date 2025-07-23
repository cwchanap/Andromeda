import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import type { CelestialBodyData } from "../types/game";

interface PlanetInfoModalProps {
  planetData: CelestialBodyData | null;
  isOpen: boolean;
  onClose: () => void;
  onAskAI?: (question: string) => void;
}

export default function PlanetInfoModal({
  planetData,
  isOpen,
  onClose,
  onAskAI,
}: PlanetInfoModalProps) {
  if (!planetData) return null;

  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI(`Tell me more about ${planetData.name}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: planetData.material.color }}
            />
            {planetData.name}
            <Badge
              variant={planetData.type === "star" ? "destructive" : "secondary"}
            >
              {planetData.type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {planetData.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold">Diameter</h4>
                  <p className="text-muted-foreground text-sm">
                    {planetData.keyFacts.diameter}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Distance from Sun</h4>
                  <p className="text-muted-foreground text-sm">
                    {planetData.keyFacts.distanceFromSun}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Orbital Period</h4>
                  <p className="text-muted-foreground text-sm">
                    {planetData.keyFacts.orbitalPeriod}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Temperature</h4>
                  <p className="text-muted-foreground text-sm">
                    {planetData.keyFacts.temperature}
                  </p>
                </div>

                {planetData.keyFacts.moons !== undefined && (
                  <div>
                    <h4 className="text-sm font-semibold">Moons</h4>
                    <p className="text-muted-foreground text-sm">
                      {planetData.keyFacts.moons}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="mb-2 text-sm font-semibold">Composition</h4>
                <div className="flex flex-wrap gap-2">
                  {planetData.keyFacts.composition.map((component, index) => (
                    <Badge key={index} variant="outline">
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            {onAskAI && (
              <Button variant="outline" onClick={handleAskAI}>
                Ask AI About {planetData.name}
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
