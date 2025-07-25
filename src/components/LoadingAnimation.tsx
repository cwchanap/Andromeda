import React from "react";
import { Progress } from "./ui/progress";
import { SpaceDust } from "./ParticleSystem";

interface LoadingAnimationProps {
  progress?: number;
  message?: string;
  className?: string;
}

export function LoadingAnimation({
  progress = 0,
  message = "Loading solar system...",
  className = "",
}: LoadingAnimationProps) {
  return (
    <div
      className={`bg-opacity-90 fixed inset-0 z-50 flex items-center justify-center bg-black ${className}`}
    >
      {/* Background particle effects */}
      <SpaceDust />

      <div className="relative z-10 mx-4 flex w-full max-w-md flex-col items-center space-y-6 rounded-lg border border-gray-700 bg-gray-900 p-8">
        {/* Animated solar system loader */}
        <div className="relative h-24 w-24">
          {/* Sun */}
          <div className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-yellow-400" />

          {/* Orbiting planets */}
          <div
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: "3s" }}
          >
            <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 transform rounded-full bg-blue-400" />
          </div>

          <div
            className="absolute inset-2 animate-spin"
            style={{ animationDuration: "4s", animationDirection: "reverse" }}
          >
            <div className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 transform rounded-full bg-red-400" />
          </div>

          <div
            className="absolute inset-4 animate-spin"
            style={{ animationDuration: "5s" }}
          >
            <div className="absolute top-0 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-green-400" />
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">{message}</h2>
          <p className="text-sm text-gray-400">
            Preparing your space exploration experience
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <Progress value={progress} className="h-2 w-full" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Loading assets...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Animated stars background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-0.5 w-0.5 animate-pulse rounded-full bg-white"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Shimmer loading animation for content placeholders
export function ShimmerLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="animate-shimmer rounded bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]" />
    </div>
  );
}

// Skeleton loader for planet info cards
export function PlanetInfoSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="animate-pulse">
        {/* Title skeleton */}
        <div className="mb-4 h-8 w-3/4 rounded bg-gray-700" />

        {/* Image skeleton */}
        <div className="mb-4 h-48 rounded bg-gray-700" />

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-700" />
          <div className="h-4 w-5/6 rounded bg-gray-700" />
          <div className="h-4 w-4/6 rounded bg-gray-700" />
        </div>

        {/* Facts skeleton */}
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-1/3 rounded bg-gray-700" />
              <div className="h-4 w-1/2 rounded bg-gray-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Smooth fade-in transition wrapper
export function FadeInTransition({
  children,
  isLoaded = false,
  duration = 300,
  className = "",
}: {
  children: React.ReactNode;
  isLoaded?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`transition-opacity duration-${duration} ${
        isLoaded ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
