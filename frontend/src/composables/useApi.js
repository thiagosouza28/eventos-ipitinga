import axios, { AxiosHeaders } from "axios";
import { storeToRefs } from "pinia";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../stores/auth";
import { useLoaderStore } from "../stores/loader";
const toNumber = (value) => {
    if (!value)
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const isDev = import.meta.env.DEV;
const envTimeout = toNumber(import.meta.env.VITE_API_TIMEOUT_MS);
const envMaxRetries = toNumber(import.meta.env.VITE_API_MAX_RETRIES);
const envRetryDelay = toNumber(import.meta.env.VITE_API_RETRY_DELAY_MS);
const DEFAULT_TIMEOUT_MS = envTimeout ?? (isDev ? 8000 : 20000);
const MAX_RETRIES = Math.max(0, Math.floor(envMaxRetries ?? (isDev ? 0 : 2)));
const BASE_RETRY_DELAY_MS = envRetryDelay ?? 400;
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS
});
axios.defaults.timeout = DEFAULT_TIMEOUT_MS;
const clientsWithInterceptors = new WeakSet();
const AUTH_FREE_PATHS = ["/admin/login", "/admin/password/recover"];
let lastHandledToken = null;
const isAuthFreeEndpoint = (url) => {
    if (!url)
        return false;
    return AUTH_FREE_PATHS.some((path) => url.includes(path));
};
const isProtectedEndpoint = (url) => {
    if (!url)
        return false;
    if (isAuthFreeEndpoint(url))
        return false;
    return url.includes("/admin") || url.includes("/profile");
};
const resolveAuthErrorCode = (error) => {
    if (!error || typeof error !== "object")
        return null;
    const response = error.response;
    return response?.data?.details?.code ?? response?.data?.code ?? null;
};
const shouldForceSignOut = (code) => code === "TOKEN_EXPIRED" || code === "TOKEN_INVALID" || code === "TOKEN_MALFORMED";
const isNetworkError = (error) => {
    if (!error || typeof error !== "object")
        return false;
    const code = error.code;
    const message = error.message;
    return code === "ERR_NETWORK" || code === "ECONNABORTED" || message === "Network Error";
};
const resolveRetryAfterMs = (error) => {
    if (!error || typeof error !== "object")
        return null;
    const headers = error.response?.headers;
    const retryAfter = headers?.["retry-after"];
    if (!retryAfter)
        return null;
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const parsedDate = Date.parse(retryAfter);
    if (!Number.isNaN(parsedDate)) {
        return Math.max(0, parsedDate - Date.now());
    }
    return null;
};
const shouldRetryRequest = (error, config) => {
    if (!config)
        return false;
    if (config.retry === false)
        return false;
    const method = String(config.method || "get").toLowerCase();
    if (!RETRYABLE_METHODS.has(method))
        return false;
    if (!error || typeof error !== "object")
        return false;
    const response = error.response;
    if (!response) {
        return isNetworkError(error);
    }
    const status = response.status ?? 0;
    return status === 429 || status >= 500;
};
const getRetryDelay = (attempt, error) => {
    const retryAfter = resolveRetryAfterMs(error);
    if (retryAfter !== null) {
        return retryAfter;
    }
    const backoff = BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
    const jitter = Math.floor(Math.random() * 150);
    return Math.min(4000, backoff + jitter);
};
const attachLoaderInterceptors = (client) => {
    if (clientsWithInterceptors.has(client)) {
        return;
    }
    client.interceptors.request.use((config) => {
        const auth = useAuthStore();
        const loader = useLoaderStore();
        const authHeader = auth.getAuthorizationHeader();
        const protectedEndpoint = isProtectedEndpoint(config.url);
        if (protectedEndpoint && !authHeader) {
            console.warn("[api] Missing auth for protected request", { url: config.url });
            const error = new Error("AUTH_REQUIRED");
            error.code = "AUTH_REQUIRED";
            return Promise.reject(error);
        }
        if (!config.headers) {
            config.headers = new AxiosHeaders();
        }
        if (authHeader) {
            if (config.headers instanceof AxiosHeaders) {
                config.headers.set("Authorization", authHeader);
            }
            else {
                config.headers.Authorization = authHeader;
            }
        }
        loader.start(loader.messageForMethod(config.method));
        return config;
    });
    client.interceptors.response.use((response) => {
        const loader = useLoaderStore();
        loader.stop();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("api-online"));
        }
        return response;
    }, (error) => {
        const loader = useLoaderStore();
        loader.stop();
        const config = error?.config;
        if (shouldRetryRequest(error, config)) {
            const nextCount = (config?.__retryCount ?? 0) + 1;
            if (config && nextCount <= MAX_RETRIES) {
                config.__retryCount = nextCount;
                const delay = getRetryDelay(nextCount, error);
                return new Promise((resolve) => setTimeout(resolve, delay)).then(() => client.request(config));
            }
        }
        const isAuthRequiredError = error?.code === "AUTH_REQUIRED" || error?.message === "AUTH_REQUIRED";
        if (!error.response && typeof window !== "undefined" && !isAuthRequiredError && isNetworkError(error)) {
            window.dispatchEvent(new CustomEvent("api-offline", {
                detail: {
                    message: "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente."
                }
            }));
        }
        if (error.response?.status === 401) {
            const auth = useAuthStore();
            const code = resolveAuthErrorCode(error);
            if (auth.isAuthenticated && shouldForceSignOut(code)) {
                const currentToken = auth.token ?? null;
                if (currentToken && currentToken === lastHandledToken) {
                    return Promise.reject(error);
                }
                lastHandledToken = currentToken;
                console.warn("[auth] Unauthorized response. Signing out.", {
                    code,
                    url: error.config?.url
                });
                auth.signOut();
            }
            else if (code) {
                console.warn("[auth] Unauthorized response", { code, url: error.config?.url });
            }
        }
        return Promise.reject(error);
    });
    clientsWithInterceptors.add(client);
};
attachLoaderInterceptors(api);
attachLoaderInterceptors(axios);
export const useApi = () => {
    const auth = useAuthStore();
    const { token } = storeToRefs(auth);
    return { api, token };
};
//# sourceMappingURL=useApi.js.map