import { env } from "../config/env";

export const getPublicAppBaseUrl = () => {
  const base = (env.PUBLIC_APP_URL ?? env.APP_URL).trim();
  return base.replace(/\/$/, "");
};

export const getPublicAssetBaseUrl = () => {
  const url = new URL(env.API_URL.trim());
  url.pathname = url.pathname.replace(/\/api\/?$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

export const normalizePublicApiBaseUrl = (value: string) => {
  const url = new URL(value.trim());
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .filter((segment, index, all) => segment.toLowerCase() !== "api" || index === all.length - 1);

  if (segments.at(-1)?.toLowerCase() !== "api") {
    segments.push("api");
  }

  url.pathname = `/${segments.join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

export const getPublicApiBaseUrl = () => normalizePublicApiBaseUrl(env.API_URL);
