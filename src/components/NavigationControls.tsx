import { Button } from "./ui/button";
import { ZoomIn, ZoomOut, Home } from "lucide-react";

interface NavigationControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  currentZoom?: number;
  maxZoom?: number;
  minZoom?: number;
}

export default function NavigationControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  currentZoom,
  maxZoom = 200,
  minZoom = 10,
}: NavigationControlsProps) {
  const isZoomInDisabled = currentZoom ? currentZoom >= maxZoom : false;
  const isZoomOutDisabled = currentZoom ? currentZoom <= minZoom : false;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="bg-background/80 flex flex-col gap-2 rounded-lg border p-2 shadow-lg backdrop-blur-sm">
        <Button
          variant="outline"
          size="icon"
          onClick={onZoomIn}
          disabled={isZoomInDisabled}
          title="Zoom In"
          className="h-10 w-10"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onZoomOut}
          disabled={isZoomOutDisabled}
          title="Zoom Out"
          className="h-10 w-10"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <div className="bg-border mx-1 h-px" />

        <Button
          variant="outline"
          size="icon"
          onClick={onResetView}
          title="Reset View"
          className="h-10 w-10"
        >
          <Home className="h-4 w-4" />
        </Button>

        {currentZoom && (
          <div className="text-muted-foreground mt-1 px-1 text-center text-xs">
            {Math.round(currentZoom)}x
          </div>
        )}
      </div>
    </div>
  );
}
