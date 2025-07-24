import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { ZoomIn, ZoomOut, Home, Eye } from "lucide-react";

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
  const isZoomInDisabled = currentZoom ? currentZoom <= minZoom : false;
  const isZoomOutDisabled = currentZoom ? currentZoom >= maxZoom : false;

  // Calculate zoom level as percentage for progress bar
  const zoomPercentage = currentZoom
    ? ((maxZoom - currentZoom) / (maxZoom - minZoom)) * 100
    : 50;

  // Get zoom level description
  const getZoomDescription = (zoom: number) => {
    if (zoom <= 15) return "Very Close";
    if (zoom <= 30) return "Close";
    if (zoom <= 60) return "Normal";
    if (zoom <= 120) return "Far";
    return "Very Far";
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="bg-background/90 flex min-w-[120px] flex-col gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
        {/* Zoom Level Indicator */}
        {currentZoom && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="text-muted-foreground h-3 w-3" />
              <div className="text-xs font-medium">
                {getZoomDescription(currentZoom)}
              </div>
            </div>
            <Progress
              value={zoomPercentage}
              className="h-1.5"
              title={`Zoom: ${Math.round(currentZoom)}`}
            />
            <div className="text-muted-foreground text-center text-xs">
              {Math.round(currentZoom)}x zoom
            </div>
          </div>
        )}

        <div className="bg-border h-px" />

        {/* Control Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onZoomIn}
            disabled={isZoomInDisabled}
            title="Zoom In (Get Closer)"
            className="h-10 w-10 transition-all hover:scale-105"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onZoomOut}
            disabled={isZoomOutDisabled}
            title="Zoom Out (Get Further)"
            className="h-10 w-10 transition-all hover:scale-105"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="bg-border mx-1 h-px" />

          <Button
            variant="outline"
            size="icon"
            onClick={onResetView}
            title="Reset to Default View"
            className="h-10 w-10 transition-all hover:scale-105"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
