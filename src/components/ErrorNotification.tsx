import React, { useState, useEffect } from "react";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  ErrorLogger,
  createUserFriendlyErrorMessage,
  getRecoveryActions,
} from "../utils/errorHandling";
import type { ErrorInfo, RecoveryAction } from "../utils/errorHandling";

interface ErrorNotificationProps {
  className?: string;
  maxVisible?: number;
  autoHideDelay?: number;
}

const severityIcons: Record<
  ErrorInfo["severity"],
  React.ComponentType<{ className?: string }>
> = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const severityColors: Record<ErrorInfo["severity"], string> = {
  low: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
  medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  high: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
  critical: "border-red-500 bg-red-50 dark:bg-red-900/20",
};

const severityIconColors: Record<ErrorInfo["severity"], string> = {
  low: "text-blue-600 dark:text-blue-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

interface NotificationItemProps {
  error: ErrorInfo;
  onDismiss: (error: ErrorInfo) => void;
  onAction: (action: RecoveryAction) => void;
}

function NotificationItem({
  error,
  onDismiss,
  onAction,
}: NotificationItemProps) {
  const Icon = severityIcons[error.severity];
  const message = createUserFriendlyErrorMessage(error);
  const actions = getRecoveryActions(error);

  return (
    <Card className={`mb-2 ${severityColors[error.severity]} border-l-4`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-5 w-5 ${severityIconColors[error.severity]}`}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {message}
            </p>

            {import.meta.env.DEV && (
              <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
                [{error.code}] {error.message}
              </p>
            )}

            {actions.length > 0 && (
              <div className="mt-2 flex gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={
                      action.type === "primary"
                        ? "default"
                        : action.type === "danger"
                          ? "destructive"
                          : "outline"
                    }
                    onClick={() => onAction(action)}
                    className="h-7 px-2 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(error)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorNotification({
  className = "",
  maxVisible = 3,
  autoHideDelay = 10000,
}: ErrorNotificationProps) {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    // Poll for new errors from the error logger
    const pollErrors = () => {
      const allErrors = ErrorLogger.getInstance().getErrors();
      const newErrors = allErrors.filter(
        (error) => !dismissedErrors.has(error.timestamp),
      );
      setErrors(newErrors.slice(0, maxVisible));
    };

    // Initial poll
    pollErrors();

    // Set up polling interval
    const interval = setInterval(pollErrors, 1000);

    return () => clearInterval(interval);
  }, [dismissedErrors, maxVisible]);

  useEffect(() => {
    // Auto-hide low severity errors after delay
    if (autoHideDelay > 0) {
      const timers = errors
        .filter((error) => error.severity === "low")
        .map((error) => {
          return setTimeout(() => {
            handleDismiss(error);
          }, autoHideDelay);
        });

      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [errors, autoHideDelay]);

  const handleDismiss = (error: ErrorInfo) => {
    setDismissedErrors((prev) => new Set(prev).add(error.timestamp));
  };

  const handleAction = async (action: RecoveryAction) => {
    try {
      await action.action();
    } catch (error) {
      console.error("Recovery action failed:", error);
      ErrorLogger.getInstance().log({
        message: `Recovery action failed: ${action.label}`,
        code: "RECOVERY_ACTION_FAILED",
        severity: "medium",
        timestamp: Date.now(),
        context: { actionLabel: action.label, error: String(error) },
      });
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] ${className}`}
    >
      {errors.map((error) => (
        <NotificationItem
          key={error.timestamp}
          error={error}
          onDismiss={handleDismiss}
          onAction={handleAction}
        />
      ))}
    </div>
  );
}

// Hook for programmatically showing error notifications
export function useErrorNotification() {
  const showError = (
    message: string,
    code: string = "USER_ERROR",
    severity: ErrorInfo["severity"] = "medium",
    context?: Record<string, unknown>,
  ) => {
    ErrorLogger.getInstance().log({
      message,
      code,
      severity,
      timestamp: Date.now(),
      context,
    });
  };

  const showSuccess = (message: string) => {
    // For success messages, we use a low severity info error
    // In a real app, you might want a separate success notification system
    ErrorLogger.getInstance().log({
      message,
      code: "SUCCESS_MESSAGE",
      severity: "low",
      timestamp: Date.now(),
    });
  };

  return { showError, showSuccess };
}

// Global error handler for unhandled promise rejections and errors
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    ErrorLogger.getInstance().log({
      message: `Unhandled promise rejection: ${event.reason}`,
      code: "UNHANDLED_PROMISE_REJECTION",
      severity: "high",
      timestamp: Date.now(),
      context: {
        reason: String(event.reason),
        promise: event.promise,
      },
    });
  });

  // Handle uncaught errors
  window.addEventListener("error", (event) => {
    ErrorLogger.getInstance().log({
      message: event.message,
      code: "UNCAUGHT_ERROR",
      severity: "high",
      timestamp: Date.now(),
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
    });
  });

  // Handle network errors
  window.addEventListener("online", () => {
    ErrorLogger.getInstance().log({
      message: "Network connection restored",
      code: "NETWORK_RESTORED",
      severity: "low",
      timestamp: Date.now(),
    });
  });

  window.addEventListener("offline", () => {
    ErrorLogger.getInstance().log({
      message: "Network connection lost",
      code: "NETWORK_LOST",
      severity: "medium",
      timestamp: Date.now(),
    });
  });
}
