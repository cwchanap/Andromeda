import { useEffect, useState, useCallback } from "react";
import {
    useResponsive,
    usePerformanceInfo,
    useNetworkInfo,
} from "./useResponsive";

export interface MobileOptimizationSettings {
    // Rendering quality settings
    pixelRatio: number;
    antialias: boolean;
    shadowMapEnabled: boolean;

    // Geometry optimization
    sphereSegments: number;
    lodEnabled: boolean;
    cullingEnabled: boolean;

    // Animation settings
    animationsEnabled: boolean;
    particleEffectsEnabled: boolean;

    // Loading strategy
    progressiveLoading: boolean;
    preloadAssets: boolean;

    // Performance thresholds
    targetFPS: number;
    memoryThreshold: number;
}

export function useMobileOptimization(): {
    settings: MobileOptimizationSettings;
    isLowPerformanceDevice: boolean;
    shouldReduceQuality: boolean;
    updateSettings: (newSettings: Partial<MobileOptimizationSettings>) => void;
} {
    const { isMobile, isTablet, devicePixelRatio } = useResponsive();
    const { fps, memoryUsage, isLowPerformance } = usePerformanceInfo();
    const { isSlowConnection } = useNetworkInfo();

    const [settings, setSettings] = useState<MobileOptimizationSettings>(() => {
        const isMobileDevice = isMobile || isTablet;
        const basePixelRatio = Math.min(devicePixelRatio, 2); // Cap at 2x for performance

        return {
            // Mobile gets reduced pixel ratio for performance
            pixelRatio: isMobileDevice
                ? Math.min(basePixelRatio, 1.5)
                : basePixelRatio,
            antialias: !isMobileDevice, // Disable antialiasing on mobile
            shadowMapEnabled: !isMobileDevice, // Disable shadows on mobile

            // Reduce geometry complexity on mobile
            sphereSegments: isMobileDevice ? 16 : 32, // Fewer segments for mobile
            lodEnabled: true,
            cullingEnabled: true,

            // Reduce animations on mobile/low performance
            animationsEnabled: !isLowPerformance,
            particleEffectsEnabled: !isMobileDevice && !isLowPerformance,

            // Enable progressive loading for slow connections
            progressiveLoading: isSlowConnection || isMobileDevice,
            preloadAssets: !isSlowConnection && !isMobileDevice,

            // Performance targets
            targetFPS: isMobileDevice ? 30 : 60,
            memoryThreshold: isMobileDevice ? 50 : 100, // MB
        };
    });

    const [isLowPerformanceDevice, setIsLowPerformanceDevice] = useState(false);
    const [shouldReduceQuality, setShouldReduceQuality] = useState(false);

    // Monitor performance and adjust settings dynamically
    useEffect(() => {
        const isLowDevice =
            isMobile || isLowPerformance || fps < settings.targetFPS * 0.7;
        const shouldReduce =
            isLowDevice || memoryUsage > settings.memoryThreshold;

        setIsLowPerformanceDevice(isLowDevice);
        setShouldReduceQuality(shouldReduce);

        // Auto-adjust settings based on performance
        if (shouldReduce && !settings.progressiveLoading) {
            setSettings((prev) => ({
                ...prev,
                pixelRatio: Math.min(prev.pixelRatio, 1.0),
                antialias: false,
                shadowMapEnabled: false,
                sphereSegments: Math.min(prev.sphereSegments, 16),
                animationsEnabled: false,
                particleEffectsEnabled: false,
                progressiveLoading: true,
                preloadAssets: false,
            }));
        }
    }, [
        fps,
        memoryUsage,
        isLowPerformance,
        isMobile,
        settings.targetFPS,
        settings.memoryThreshold,
        settings.progressiveLoading,
    ]);

    const updateSettings = useCallback(
        (newSettings: Partial<MobileOptimizationSettings>) => {
            setSettings((prev) => ({ ...prev, ...newSettings }));
        },
        [],
    );

    return {
        settings,
        isLowPerformanceDevice,
        shouldReduceQuality,
        updateSettings,
    };
}

/**
 * Hook for adaptive touch gesture handling
 */
export function useTouchGestures() {
    const { isMobile } = useResponsive();
    const [gestureState, setGestureState] = useState({
        isPinching: false,
        pinchScale: 1,
        lastPinchScale: 1,
        isPanning: false,
        panDelta: { x: 0, y: 0 },
        isRotating: false,
        rotationAngle: 0,
    });

    const handleTouchStart = useCallback(
        (event: TouchEvent) => {
            if (!isMobile) return;

            if (event.touches.length === 2) {
                // Two finger gestures (pinch/rotate)
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];

                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2),
                );

                setGestureState((prev) => ({
                    ...prev,
                    isPinching: true,
                    lastPinchScale: distance,
                }));
            } else if (event.touches.length === 1) {
                // Single finger pan
                setGestureState((prev) => ({
                    ...prev,
                    isPanning: true,
                    panDelta: { x: 0, y: 0 },
                }));
            }
        },
        [isMobile],
    );

    const handleTouchMove = useCallback(
        (event: TouchEvent) => {
            if (!isMobile) return;

            if (event.touches.length === 2 && gestureState.isPinching) {
                // Handle pinch-to-zoom
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];

                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2),
                );

                const scale = distance / gestureState.lastPinchScale;

                setGestureState((prev) => ({
                    ...prev,
                    pinchScale: scale,
                }));
            } else if (event.touches.length === 1 && gestureState.isPanning) {
                // Handle single finger pan
                const touch = event.touches[0];
                const deltaX =
                    touch.clientX -
                    (touch.target as HTMLElement).getBoundingClientRect().left;
                const deltaY =
                    touch.clientY -
                    (touch.target as HTMLElement).getBoundingClientRect().top;

                setGestureState((prev) => ({
                    ...prev,
                    panDelta: { x: deltaX, y: deltaY },
                }));
            }
        },
        [
            isMobile,
            gestureState.isPinching,
            gestureState.isPanning,
            gestureState.lastPinchScale,
        ],
    );

    const handleTouchEnd = useCallback(() => {
        setGestureState({
            isPinching: false,
            pinchScale: 1,
            lastPinchScale: 1,
            isPanning: false,
            panDelta: { x: 0, y: 0 },
            isRotating: false,
            rotationAngle: 0,
        });
    }, []);

    return {
        gestureState,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}

/**
 * Hook for progressive asset loading
 */
export function useProgressiveLoading() {
    const [loadingState, setLoadingState] = useState({
        assetsLoaded: 0,
        totalAssets: 0,
        currentAsset: "",
        isLoading: false,
        error: null as string | null,
    });

    const startLoading = useCallback((assetList: string[]) => {
        setLoadingState({
            assetsLoaded: 0,
            totalAssets: assetList.length,
            currentAsset: "",
            isLoading: true,
            error: null,
        });
    }, []);

    const updateProgress = useCallback((assetName: string, loaded: number) => {
        setLoadingState((prev) => ({
            ...prev,
            assetsLoaded: loaded,
            currentAsset: assetName,
        }));
    }, []);

    const finishLoading = useCallback(() => {
        setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            currentAsset: "",
        }));
    }, []);

    const setError = useCallback((error: string) => {
        setLoadingState((prev) => ({
            ...prev,
            error,
            isLoading: false,
        }));
    }, []);

    const progress =
        loadingState.totalAssets > 0
            ? (loadingState.assetsLoaded / loadingState.totalAssets) * 100
            : 0;

    return {
        loadingState,
        progress,
        startLoading,
        updateProgress,
        finishLoading,
        setError,
    };
}
