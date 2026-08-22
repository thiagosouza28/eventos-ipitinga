export type Handler = (request: any, response: any, next: (error?: any) => void) => any;

export type RouteOptions = {
  upload?: boolean;
};

export type RouteDef = {
  method: string;
  path: string;
  handlers: Handler[];
  options?: RouteOptions;
};

export type CompiledRoute = RouteDef & {
  regex: RegExp;
  keys: string[];
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compilePath = (path: string) => {
  const keys: string[] = [];
  const segments = path.split("/").filter(Boolean);
  const pattern = segments
    .map((segment) => {
      let segmentPattern = "";
      let lastIndex = 0;
      const matcher = /:([A-Za-z0-9_]+)/g;
      let match: RegExpExecArray | null = null;
      while ((match = matcher.exec(segment))) {
        segmentPattern += escapeRegex(segment.slice(lastIndex, match.index));
        segmentPattern += "([^/]+)";
        keys.push(match[1]);
        lastIndex = match.index + match[0].length;
      }
      segmentPattern += escapeRegex(segment.slice(lastIndex));
      return segmentPattern;
    })
    .join("/");

  const regex = new RegExp(`^/${pattern}$`);
  return { regex, keys };
};

export const compileRoutes = (routes: RouteDef[]): CompiledRoute[] =>
  routes.map((route) => ({
    ...route,
    ...compilePath(route.path)
  }));

export const matchRoute = (routes: CompiledRoute[], method: string, path: string) => {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.regex.exec(path);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.keys.forEach((key, index) => {
      params[key] = match[index + 1];
    });

    return { route, params };
  }
  return null;
};
