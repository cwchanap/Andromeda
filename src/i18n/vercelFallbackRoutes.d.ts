type VercelRoute = {
    src?: string;
    dest?: string;
    handle?: string;
    headers?: Record<string, string>;
    continue?: boolean;
    [key: string]: unknown;
};

type VercelOutputConfig = {
    version: number;
    routes?: VercelRoute[];
    [key: string]: unknown;
};

type AstroResolvedRoute = {
    type: string;
    isPrerendered: boolean;
    pattern: string;
    patternRegex: RegExp;
};

type PatchLogger = {
    info?: (message: string) => void;
    warn?: (message: string) => void;
};

export function createLocaleRouteDefinitions(
    routes: AstroResolvedRoute[],
    locales: string[],
    destination?: string,
): Array<{ src: string; dest: string }>;

export function injectLocaleRouteDefinitions(
    config: VercelOutputConfig,
    routeDefinitions: Array<{ src: string; dest: string }>,
): VercelOutputConfig;

export function patchVercelOutputConfig(options: {
    configPath: URL | string;
    routes: AstroResolvedRoute[];
    locales: string[];
    logger?: PatchLogger;
}): { patched: boolean; count: number };
