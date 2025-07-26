import { writable } from "svelte/store";
import { WebGLErrorHandler } from "../utils/errorHandling";

export interface WebGLSupport {
    webgl: boolean;
    webgl2: boolean;
    error?: string;
}

export function createWebGLStore() {
    const { subscribe, set } = writable<WebGLSupport | null>(null);
    const isChecking = writable(true);

    const checkWebGLSupport = () => {
        try {
            const handler = new WebGLErrorHandler();
            const webglSupport = handler.checkWebGLSupport();

            set({
                webgl: webglSupport.webgl,
                webgl2: webglSupport.webgl2,
            });
        } catch (error) {
            set({
                webgl: false,
                webgl2: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown WebGL error",
            });
        } finally {
            isChecking.set(false);
        }
    };

    // Auto-check on creation
    checkWebGLSupport();

    return {
        subscribe,
        checkWebGLSupport,
        isChecking: { subscribe: isChecking.subscribe },
    };
}

export const webglSupport = createWebGLStore();
