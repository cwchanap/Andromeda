import React from "react";
import { AlertTriangle, Monitor, Smartphone, Globe } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface WebGLFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function WebGLFallback({ onRetry, onGoHome }: WebGLFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-2xl border-slate-700 bg-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-slate-100">
            3D Graphics Not Available
          </CardTitle>
          <CardDescription className="text-base text-slate-400">
            Your browser or device doesn't support WebGL, which is required for
            the 3D solar system experience.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg bg-slate-700 p-4">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">
              What can you try?
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Monitor className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                <div>
                  <h4 className="font-medium text-slate-200">
                    Update Your Browser
                  </h4>
                  <p className="text-sm text-slate-400">
                    Make sure you're using the latest version of Chrome,
                    Firefox, Safari, or Edge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                <div>
                  <h4 className="font-medium text-slate-200">
                    Enable Hardware Acceleration
                  </h4>
                  <p className="text-sm text-slate-400">
                    Check your browser settings to enable hardware acceleration.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
                <div>
                  <h4 className="font-medium text-slate-200">
                    Different Browser
                  </h4>
                  <p className="text-sm text-slate-400">
                    Try opening this page in a different web browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Monitor className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
                <div>
                  <h4 className="font-medium text-slate-200">
                    Update Graphics Drivers
                  </h4>
                  <p className="text-sm text-slate-400">
                    Update your computer's graphics drivers to the latest
                    version.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
              Alternative Learning Options
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              While you work on getting 3D graphics working, you can still learn
              about space through our AI chatbot feature, which provides
              detailed information about planets, stars, and space exploration!
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleRetry} className="flex-1" variant="default">
              Try Again
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Back to Home
            </Button>
          </div>

          <div className="text-center text-xs text-slate-500">
            <p>
              Need help? Contact support with error code: WEBGL_NOT_SUPPORTED
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebGLFallback;
