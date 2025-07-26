import { writable } from "svelte/store";

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

function createResponsiveStore() {
    const getBreakpointInfo = (): BreakpointInfo => {
        if (typeof window === "undefined") {
            // Server-side rendering fallback
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
        const devicePixelRatio = window.devicePixelRatio || 1;

        return {
            isMobile: width < BREAKPOINTS.mobile,
            isTablet:
                width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
            isDesktop: width >= BREAKPOINTS.desktop,
            screenWidth: width,
            screenHeight: height,
            devicePixelRatio,
        };
    };

    const { subscribe, set } = writable<BreakpointInfo>(getBreakpointInfo());

    if (typeof window !== "undefined") {
        const updateBreakpoint = () => set(getBreakpointInfo());

        window.addEventListener("resize", updateBreakpoint);
        window.addEventListener("orientationchange", updateBreakpoint);

        // Cleanup would be handled by component's onDestroy
    }

    return {
        subscribe,
        update: () => set(getBreakpointInfo()),
    };
}

export const responsive = createResponsiveStore();
