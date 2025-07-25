import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ErrorLogger } from "../utils/errorHandling";
import type { ErrorInfo as CustomErrorInfo } from "../utils/errorHandling";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorId: string = "";

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorId = this.state.errorId || `error_${Date.now()}`;

    // Log the error using our error logger
    const customErrorInfo: CustomErrorInfo = {
      message: error.message,
      code: "COMPONENT_ERROR",
      severity: "high",
      timestamp: Date.now(),
      context: {
        errorId: this.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: "ErrorBoundary",
        stack: error.stack,
      },
    };

    ErrorLogger.getInstance().log(customErrorInfo);

    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, also log to console
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <Card className="w-full max-w-md border-slate-700 bg-slate-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-slate-100">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-slate-400">
                A component encountered an unexpected error. Don't worry, we can
                help you get back on track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="rounded-md bg-slate-700 p-3">
                  <p className="font-mono text-xs break-all text-red-400">
                    {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="mt-1 text-xs text-slate-500">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-200"
                  size="sm"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for 3D/Three.js components
interface ThreeJSErrorBoundaryProps {
  children: ReactNode;
  onWebGLError?: () => void;
}

export class ThreeJSErrorBoundary extends Component<
  ThreeJSErrorBoundaryProps,
  State
> {
  constructor(props: ThreeJSErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `threejs_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isWebGLError =
      error.message.includes("WebGL") ||
      error.message.includes("webgl") ||
      error.message.includes("context");

    const customErrorInfo: CustomErrorInfo = {
      message: error.message,
      code: isWebGLError ? "WEBGL_ERROR" : "THREEJS_ERROR",
      severity: isWebGLError ? "critical" : "high",
      timestamp: Date.now(),
      context: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: "ThreeJSErrorBoundary",
        isWebGLError,
        stack: error.stack,
      },
    };

    ErrorLogger.getInstance().log(customErrorInfo);

    if (isWebGLError && this.props.onWebGLError) {
      this.props.onWebGLError();
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isWebGLError =
        this.state.error?.message.includes("WebGL") ||
        this.state.error?.message.includes("webgl");

      return (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
          <Card className="w-full max-w-md border-slate-700 bg-slate-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-slate-100">
                {isWebGLError ? "3D Graphics Error" : "Rendering Error"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isWebGLError
                  ? "Your browser or graphics card may not support WebGL, or there was a graphics driver issue."
                  : "There was an issue rendering the 3D scene. This might be due to browser compatibility or system resources."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isWebGLError && (
                <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Try updating your browser or graphics drivers, or switch to
                    a different browser that supports WebGL.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap components with error boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// HOC specifically for Three.js components
export function withThreeJSErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ThreeJSErrorBoundaryProps, "children">,
) {
  const WrappedComponent = (props: T) => (
    <ThreeJSErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ThreeJSErrorBoundary>
  );

  WrappedComponent.displayName = `withThreeJSErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
