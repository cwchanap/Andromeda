import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { useState, useEffect, useRef } from "react";
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (planetData?.images && planetData.images.length > 1) {
            setSelectedImageIndex((prev) =>
              prev === 0 ? planetData.images.length - 1 : prev - 1,
            );
          }
          break;
        case "ArrowRight":
          if (planetData?.images && planetData.images.length > 1) {
            setSelectedImageIndex((prev) =>
              prev === planetData.images.length - 1 ? 0 : prev + 1,
            );
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, planetData]);

  // Reset image selection when modal opens with new planet
  useEffect(() => {
    if (isOpen) {
      setSelectedImageIndex(0);
    }
  }, [isOpen, planetData?.id]);

  if (!planetData) return null;

  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI(`Tell me more about ${planetData.name}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[80vh] max-w-2xl overflow-y-auto"
        ref={modalRef}
        aria-labelledby="planet-modal-title"
        aria-describedby="planet-modal-description"
      >
        <DialogHeader>
          <DialogTitle
            id="planet-modal-title"
            className="flex items-center gap-3"
          >
            <div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: planetData.material.color }}
              aria-hidden="true"
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
          {/* Image Gallery */}
          {planetData.images && planetData.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <img
                      src={planetData.images[selectedImageIndex]}
                      alt={`${planetData.name} view ${selectedImageIndex + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {planetData.images.length > 1 && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedImageIndex((prev) =>
                            prev === 0
                              ? planetData.images.length - 1
                              : prev - 1,
                          )
                        }
                        aria-label={`Previous ${planetData.name} view`}
                        className="focus:ring-primary focus:ring-2"
                      >
                        ←
                      </Button>

                      <div className="flex items-center gap-1">
                        {planetData.images.map((_, index) => (
                          <button
                            key={index}
                            className={`focus:ring-primary h-2 w-2 rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                              index === selectedImageIndex
                                ? "bg-primary"
                                : "bg-muted hover:bg-muted-foreground/50"
                            }`}
                            onClick={() => setSelectedImageIndex(index)}
                            aria-label={`View ${planetData.name} ${index + 1} of ${planetData.images.length}`}
                          />
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedImageIndex((prev) =>
                            prev === planetData.images.length - 1
                              ? 0
                              : prev + 1,
                          )
                        }
                        aria-label={`Next ${planetData.name} view`}
                        className="focus:ring-primary focus:ring-2"
                      >
                        →
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                id="planet-modal-description"
                className="text-muted-foreground text-sm leading-relaxed"
              >
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
              <Button
                variant="outline"
                onClick={handleAskAI}
                aria-label={`Ask AI about ${planetData.name}`}
              >
                Ask AI About {planetData.name}
              </Button>
            )}
            <Button
              onClick={onClose}
              aria-label={`Close ${planetData.name} information modal`}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
