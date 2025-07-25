import { useState, useEffect } from "react";

export interface BreakpointInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    screenWidth: number;
    screenHeight: number;
    devicePixelRatio: number;
}

export const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
} as const;

/**
 * Hook for responsive design and device detection
 */
export function useResponsive(): BreakpointInfo {
    const [breakpointInfo, setBreakpointInfo] = useState<BreakpointInfo>(() => {
        // Server-side rendering fallback
        if (typeof window === "undefined") {
            return {
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                screenWidth: 1920,
                screenHeight: 1080,
                devicePixelRatio: 1,
            };
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        return {
            isMobile: width < BREAKPOINTS.mobile,
            isTablet:
                width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
            isDesktop: width >= BREAKPOINTS.desktop,
            screenWidth: width,
            screenHeight: height,
            devicePixelRatio: dpr,
        };
    });

    useEffect(() => {
        const updateBreakpointInfo = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            setBreakpointInfo({
                isMobile: width < BREAKPOINTS.mobile,
                isTablet:
                    width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
                isDesktop: width >= BREAKPOINTS.desktop,
                screenWidth: width,
                screenHeight: height,
                devicePixelRatio: dpr,
            });
        };

        // Initial check
        updateBreakpointInfo();

        // Listen for resize events
        window.addEventListener("resize", updateBreakpointInfo);
        window.addEventListener("orientationchange", updateBreakpointInfo);

        return () => {
            window.removeEventListener("resize", updateBreakpointInfo);
            window.removeEventListener(
                "orientationchange",
                updateBreakpointInfo,
            );
        };
    }, []);

    return breakpointInfo;
}

/**
 * Hook for detecting touch devices
 */
export function useTouchDevice(): boolean {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouchDevice = () => {
            return (
                "ontouchstart" in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-expect-error - for older IE support
                navigator.msMaxTouchPoints > 0
            );
        };

        setIsTouchDevice(checkTouchDevice());
    }, []);

    return isTouchDevice;
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceInfo() {
    const [performanceInfo, setPerformanceInfo] = useState({
        memoryUsage: 0,
        fps: 60,
        isLowPerformance: false,
    });

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const measurePerformance = (currentTime: number) => {
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                const fps = Math.round(
                    (frameCount * 1000) / (currentTime - lastTime),
                );

                // Get memory usage if available
                const performanceMemory = (
                    performance as unknown as {
                        memory?: { usedJSHeapSize: number };
                    }
                ).memory;
                const memoryUsage = performanceMemory
                    ? performanceMemory.usedJSHeapSize / 1024 / 1024
                    : 0;

                setPerformanceInfo({
                    memoryUsage: Math.round(memoryUsage),
                    fps,
                    isLowPerformance: fps < 30 || memoryUsage > 100,
                });

                frameCount = 0;
                lastTime = currentTime;
            }

            animationFrameId = requestAnimationFrame(measurePerformance);
        };

        animationFrameId = requestAnimationFrame(measurePerformance);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    return performanceInfo;
}

/**
 * Hook for network information
 */
export function useNetworkInfo() {
    const [networkInfo, setNetworkInfo] = useState({
        effectiveType: "4g",
        downlink: 10,
        isSlowConnection: false,
    });

    useEffect(() => {
        const updateNetworkInfo = () => {
            // @ts-expect-error - experimental API
            const connection =
                navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection;

            if (connection) {
                const effectiveType = connection.effectiveType || "4g";
                const downlink = connection.downlink || 10;
                const isSlowConnection =
                    effectiveType === "slow-2g" ||
                    effectiveType === "2g" ||
                    downlink < 1.5;

                setNetworkInfo({
                    effectiveType,
                    downlink,
                    isSlowConnection,
                });
            }
        };

        updateNetworkInfo();

        // @ts-expect-error - experimental API
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;
        if (connection) {
            connection.addEventListener("change", updateNetworkInfo);
            return () =>
                connection.removeEventListener("change", updateNetworkInfo);
        }
    }, []);

    return networkInfo;
}
