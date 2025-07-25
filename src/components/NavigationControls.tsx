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
  isMobile?: boolean;
  isTouch?: boolean;
}

export default function NavigationControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  currentZoom,
  maxZoom = 200,
  minZoom = 10,
  isMobile = false,
  isTouch = false,
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
    <div
      className={`fixed z-50 ${isMobile ? "right-2 bottom-16" : "right-4 bottom-4"}`}
    >
      <div
        className={`bg-background/90 flex flex-col gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm ${isMobile ? "min-w-[100px]" : "min-w-[120px]"}`}
      >
        {/* Zoom Level Indicator */}
        {currentZoom && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye
                className={`text-muted-foreground ${isMobile ? "h-2.5 w-2.5" : "h-3 w-3"}`}
              />
              <div
                className={`font-medium ${isMobile ? "text-xs" : "text-xs"}`}
              >
                {getZoomDescription(currentZoom)}
              </div>
            </div>
            <Progress
              value={zoomPercentage}
              className={`${isMobile ? "h-1" : "h-1.5"}`}
              title={`Zoom: ${Math.round(currentZoom)}`}
            />
            <div
              className={`text-muted-foreground text-center ${isMobile ? "text-xs" : "text-xs"}`}
            >
              {Math.round(currentZoom)}x zoom
            </div>
          </div>
        )}

        <div className="bg-border h-px" />

        {/* Control Buttons - Larger for touch devices */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onZoomIn}
            disabled={isZoomInDisabled}
            title="Zoom In (Get Closer)"
            className={`transition-all hover:scale-105 ${isMobile || isTouch ? "h-12 w-12" : "h-10 w-10"}`}
          >
            <ZoomIn
              className={`${isMobile || isTouch ? "h-5 w-5" : "h-4 w-4"}`}
            />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onZoomOut}
            disabled={isZoomOutDisabled}
            title="Zoom Out (Get Further)"
            className={`transition-all hover:scale-105 ${isMobile || isTouch ? "h-12 w-12" : "h-10 w-10"}`}
          >
            <ZoomOut
              className={`${isMobile || isTouch ? "h-5 w-5" : "h-4 w-4"}`}
            />
          </Button>

          <div className="bg-border mx-1 h-px" />

          <Button
            variant="outline"
            size="icon"
            onClick={onResetView}
            title="Reset to Default View"
            className={`transition-all hover:scale-105 ${isMobile || isTouch ? "h-12 w-12" : "h-10 w-10"}`}
          >
            <Home
              className={`${isMobile || isTouch ? "h-5 w-5" : "h-4 w-4"}`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
