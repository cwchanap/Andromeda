import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { useEffect, useRef, useState, memo } from "react";
import type { CelestialBodyData } from "../types/game";

interface PlanetInfoModalProps {
  planetData: CelestialBodyData | null;
  isOpen: boolean;
  onClose: () => void;
  onAskAI?: () => void;
  isMobile?: boolean;
}

function PlanetInfoModal({
  planetData,
  isOpen,
  onClose,
  onAskAI,
  isMobile = false,
}: PlanetInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [displayData, setDisplayData] = useState<CelestialBodyData | null>(
    null,
  );

  // Update display data when modal opens with new planet data
  useEffect(() => {
    if (isOpen && planetData) {
      setDisplayData(planetData);
    }
  }, [isOpen, planetData]);

  // Clear display data when modal closes completely
  useEffect(() => {
    if (!isOpen) {
      // Clear display data after a delay to allow closing animation
      const timeoutId = setTimeout(() => {
        setDisplayData(null);
      }, 300); // Match typical modal closing animation duration

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !displayData) return;

      switch (event.key) {
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, displayData]);

  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI();
    }
  };

  // Don't render the Dialog at all if we don't have data OR if modal shouldn't be open
  if (!displayData || !isOpen) {
    return null;
  }

  // Always render the Dialog, but control its content
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`overflow-y-auto ${isMobile ? "max-h-[90vh] max-w-[95vw] p-3" : "max-h-[80vh] max-w-2xl"}`}
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
              style={{ backgroundColor: displayData.material.color }}
              aria-hidden="true"
            />
            {displayData.name}
            <Badge
              variant={
                displayData.type === "star" ? "destructive" : "secondary"
              }
            >
              {displayData.type}
            </Badge>
          </DialogTitle>
          <DialogDescription id="planet-modal-description" className="sr-only">
            Detailed information about {displayData.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {displayData.description}
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
                    {displayData.keyFacts.diameter}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Distance from Sun</h4>
                  <p className="text-muted-foreground text-sm">
                    {displayData.keyFacts.distanceFromSun}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Orbital Period</h4>
                  <p className="text-muted-foreground text-sm">
                    {displayData.keyFacts.orbitalPeriod}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Temperature</h4>
                  <p className="text-muted-foreground text-sm">
                    {displayData.keyFacts.temperature}
                  </p>
                </div>

                {displayData.keyFacts.moons !== undefined && (
                  <div>
                    <h4 className="text-sm font-semibold">Moons</h4>
                    <p className="text-muted-foreground text-sm">
                      {displayData.keyFacts.moons}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="mb-2 text-sm font-semibold">Composition</h4>
                <div className="flex flex-wrap gap-2">
                  {displayData.keyFacts.composition.map((component, index) => (
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
                aria-label={`Ask AI about ${displayData.name}`}
              >
                Ask AI About {displayData.name}
              </Button>
            )}
            <Button
              onClick={onClose}
              aria-label={`Close ${displayData.name} information modal`}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(PlanetInfoModal);
