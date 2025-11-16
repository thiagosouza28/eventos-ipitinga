const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : undefined);
const buildApiUrl = (value?: string) => {
  const base = normalizeBaseUrl(value);
  return base ? `${base}/api` : undefined;
};

const envApiUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
const appUrlFallback = buildApiUrl(import.meta.env.VITE_APP_URL);
const runtimeFallback =
  typeof window !== "undefined" && window.location?.origin ? buildApiUrl(window.location.origin) : undefined;

const resolvedApiUrl = envApiUrl ?? appUrlFallback ?? runtimeFallback;

if (!resolvedApiUrl) {
  throw new Error(
    "API_BASE_URL could not be resolved. Configure VITE_API_URL or VITE_APP_URL in the frontend environment variables."
  );
}

export const API_BASE_URL = resolvedApiUrl;
