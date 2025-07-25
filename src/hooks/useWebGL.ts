import { useState, useEffect } from "react";
import { WebGLErrorHandler } from "../utils/errorHandling";

export interface WebGLSupport {
    webgl: boolean;
    webgl2: boolean;
    error?: string;
}

export function useWebGLSupport() {
    const [support, setSupport] = useState<WebGLSupport | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkWebGLSupport = () => {
            try {
                const handler = new WebGLErrorHandler();
                const webglSupport = handler.checkWebGLSupport();

                setSupport({
                    webgl: webglSupport.webgl,
                    webgl2: webglSupport.webgl2,
                });
            } catch (error) {
                setSupport({
                    webgl: false,
                    webgl2: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown WebGL error",
                });
            } finally {
                setIsChecking(false);
            }
        };

        // Small delay to avoid blocking the main thread
        const timer = setTimeout(checkWebGLSupport, 100);

        return () => clearTimeout(timer);
    }, []);

    return {
        support,
        isChecking,
        hasWebGL: support?.webgl || false,
        hasWebGL2: support?.webgl2 || false,
    };
}

export function useWebGLContext() {
    const [contextLost, setContextLost] = useState(false);
    const [contextRestored, setContextRestored] = useState(true);

    const handleContextLost = () => {
        setContextLost(true);
        setContextRestored(false);
    };

    const handleContextRestored = () => {
        setContextLost(false);
        setContextRestored(true);
    };

    return {
        contextLost,
        contextRestored,
        onContextLost: handleContextLost,
        onContextRestored: handleContextRestored,
    };
}
