import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SERVERLESS_DESTINATION = "_render";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRouteSource(source) {
  return source.replaceAll("\\/", "/");
}

function localizeRouteSource(source, locales) {
  const normalizedSource = normalizeRouteSource(source);
  const localePattern = `(?:${locales.map(escapeRegExp).join("|")})`;

  if (normalizedSource === "^/$") {
    return `^/${localePattern}/?$`;
  }

  if (!normalizedSource.startsWith("^/")) {
    return undefined;
  }

  return normalizedSource.replace(/^\^\//, `^/${localePattern}/`);
}

export function createLocaleRouteDefinitions(
  routes,
  locales,
  destination = SERVERLESS_DESTINATION,
) {
  const routeDefinitions = [];
  const seenSources = new Set();
  const activeLocales = locales.filter(Boolean);

  if (activeLocales.length === 0) {
    return routeDefinitions;
  }

  for (const route of routes) {
    if (
      route.type !== "page" ||
      route.isPrerendered ||
      route.pattern.startsWith("/_")
    ) {
      continue;
    }

    const source = localizeRouteSource(
      route.patternRegex.source,
      activeLocales,
    );
    if (!source || seenSources.has(source)) {
      continue;
    }

    seenSources.add(source);
    routeDefinitions.push({
      src: source,
      dest: destination,
    });
  }

  return routeDefinitions;
}

export function injectLocaleRouteDefinitions(config, routeDefinitions) {
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const existingSources = new Set(
    routes
      .map((route) => route.src)
      .filter((source) => typeof source === "string"),
  );
  const missingDefinitions = routeDefinitions.filter(
    (route) => !existingSources.has(route.src),
  );

  if (missingDefinitions.length === 0) {
    return config;
  }

  const firstRenderRouteIndex = routes.findIndex(
    (route) => route.dest === SERVERLESS_DESTINATION,
  );
  const insertAt =
    firstRenderRouteIndex === -1 ? routes.length : firstRenderRouteIndex;
  const patchedRoutes = [...routes];
  patchedRoutes.splice(insertAt, 0, ...missingDefinitions);

  return {
    ...config,
    routes: patchedRoutes,
  };
}

export function patchVercelOutputConfig({
  configPath,
  routes,
  locales,
  logger,
}) {
  if (!existsSync(configPath)) {
    logger?.warn(`Vercel output config not found at ${configPath}`);
    return { patched: false, count: 0 };
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const routeDefinitions = createLocaleRouteDefinitions(routes, locales);
  const patchedConfig = injectLocaleRouteDefinitions(config, routeDefinitions);

  if (patchedConfig === config) {
    return { patched: false, count: 0 };
  }

  const count = patchedConfig.routes.length - (config.routes?.length ?? 0);
  writeFileSync(configPath, `${JSON.stringify(patchedConfig, null, "\t")}\n`);
  logger?.info(
    `Added ${count} locale-prefixed Vercel route${count === 1 ? "" : "s"}.`,
  );

  return { patched: true, count };
}
