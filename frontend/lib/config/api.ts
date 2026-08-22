const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : undefined);
const ensureApiSuffix = (value?: string) => {
  const base = normalizeBaseUrl(value);
  if (!base) return undefined;
  return base.endsWith("/api") ? base : `${base}/api`;
};

const envApiUrl = ensureApiSuffix(process.env.NEXT_PUBLIC_API_URL);
const appUrlFallback = ensureApiSuffix(process.env.NEXT_PUBLIC_APP_URL);
const runtimeFallback =
  typeof window !== "undefined" && window.location?.origin ? ensureApiSuffix(window.location.origin) : undefined;

const resolvedApiUrl = envApiUrl ?? appUrlFallback ?? runtimeFallback ?? "/api";

export const API_BASE_URL = resolvedApiUrl;

export const resolveApiOrigin = () => {
  if (API_BASE_URL.startsWith("http")) {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};
