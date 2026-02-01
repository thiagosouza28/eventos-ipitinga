import axios, { type AxiosInstance } from "axios";
import { API_BASE_URL } from "../config/api";
import type { Inscrito, InscritosSyncMode, InscritosSyncResult } from "../types/offline";
import {
  OFFLINE_STORES,
  bulkPut,
  clearStore,
  countStore,
  getByKey,
  getMetaValue,
  setMetaValue,
  type OfflineMetaEntry
} from "./offlineDb";
import { normalizeDateString, normalizeNumero } from "../utils/inscritos";
import { useAuthStore } from "../stores/auth";

const INSCRITOS_ENDPOINT = import.meta.env.VITE_INSCRITOS_ENDPOINT ?? "/inscritos";
const INSCRITOS_PAGE_PARAM = import.meta.env.VITE_INSCRITOS_PAGE_PARAM ?? "page";
const INSCRITOS_LIMIT_PARAM = import.meta.env.VITE_INSCRITOS_LIMIT_PARAM ?? "limit";
const INSCRITOS_UPDATED_AFTER_PARAM = import.meta.env.VITE_INSCRITOS_UPDATED_AFTER_PARAM ?? "updatedAfter";

const resolveBaseUrl = () => {
  const raw = import.meta.env.VITE_INSCRITOS_API_URL;
  if (raw && raw.trim().length > 0) {
    return raw.replace(/\/+$/, "");
  }
  return API_BASE_URL;
};

let cachedClient: AxiosInstance | null = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  const client = axios.create({
    baseURL: resolveBaseUrl(),
    timeout: Number(import.meta.env.VITE_INSCRITOS_TIMEOUT_MS) || 20000
  });
  client.interceptors.request.use((config) => {
    const auth = useAuthStore();
    const authHeader = auth.getAuthorizationHeader();
    if (authHeader) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = authHeader;
    }
    return config;
  });
  cachedClient = client;
  return client;
};

const normalizeInscrito = (input: Record<string, unknown>): Inscrito | null => {
  const numero =
    normalizeNumero(
      (input.numero as string | number | null | undefined) ??
        (input.number as string | number | null | undefined) ??
        (input.registrationNumber as string | number | null | undefined)
    ) || "";
  if (!numero) return null;
  const nome =
    String(
      input.nome ??
        input.name ??
        input.fullName ??
        input.nomeCompleto ??
        input.participantName ??
        ""
    ).trim() || "Sem nome";
  const dataNascimento = normalizeDateString(
    input.dataNascimento ?? input.data_nascimento ?? input.birthDate ?? ""
  );
  const igreja = String(input.igreja ?? input.church ?? input.igrejaNome ?? "").trim();
  const distrito = String(input.distrito ?? input.district ?? input.distritoNome ?? "").trim();
  const updatedAt = normalizeDateString(input.updatedAt ?? input.updated_at ?? "");
  return {
    ...input,
    numero,
    nome,
    dataNascimento,
    igreja,
    distrito,
    updatedAt: updatedAt || null
  };
};

type PaginationInfo = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
  nextPage?: number;
  isPaginated: boolean;
};

const extractPaginationInfo = (data: any, pageSize: number, page: number): PaginationInfo => {
  if (!data || Array.isArray(data)) {
    return { isPaginated: false };
  }
  const meta = data.meta ?? data.pagination ?? data.pageInfo ?? data.paging ?? {};
  const hasSignals = Boolean(
    data.page ||
      data.limit ||
      data.pageSize ||
      data.total ||
      data.totalPages ||
      data.hasMore ||
      data.nextPage ||
      meta.page ||
      meta.limit ||
      meta.pageSize ||
      meta.total ||
      meta.totalPages ||
      meta.hasMore ||
      meta.nextPage
  );
  if (!hasSignals) {
    return { isPaginated: false };
  }
  const resolvedPage = Number(data.page ?? meta.page ?? page) || page;
  const resolvedLimit =
    Number(data.limit ?? data.pageSize ?? meta.limit ?? meta.pageSize ?? pageSize) || pageSize;
  const resolvedTotal = Number(data.total ?? meta.total) || undefined;
  const resolvedTotalPages = Number(data.totalPages ?? meta.totalPages) || undefined;
  const resolvedNextPage = Number(data.nextPage ?? meta.nextPage) || undefined;
  const hasMoreFlag = data.hasMore ?? meta.hasMore;
  const hasMore =
    typeof hasMoreFlag === "boolean"
      ? hasMoreFlag
      : resolvedTotalPages
        ? resolvedPage < resolvedTotalPages
        : resolvedTotal && resolvedLimit
          ? resolvedPage * resolvedLimit < resolvedTotal
          : undefined;
  return {
    page: resolvedPage,
    limit: resolvedLimit,
    total: resolvedTotal,
    totalPages: resolvedTotalPages,
    hasMore,
    nextPage: resolvedNextPage,
    isPaginated: true
  };
};

const extractItems = (data: any): Record<string, unknown>[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.items,
    data.data,
    data.results,
    data.registros,
    data.inscritos
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as { items?: unknown; data?: unknown }).items ?? (candidate as { data?: unknown }).data;
      if (Array.isArray(nested)) return nested as Record<string, unknown>[];
    }
  }
  return [];
};

const fetchInscritosPage = async (
  client: AxiosInstance,
  page: number,
  limit: number,
  updatedAfter?: string | null
) => {
  const params: Record<string, string | number> = {
    [INSCRITOS_PAGE_PARAM]: page,
    [INSCRITOS_LIMIT_PARAM]: limit
  };
  if (updatedAfter) {
    params[INSCRITOS_UPDATED_AFTER_PARAM] = updatedAfter;
  }
  const response = await client.get(INSCRITOS_ENDPOINT, { params });
  const items = extractItems(response.data);
  const pagination = extractPaginationInfo(response.data, limit, page);
  return { items, pagination };
};

export const getLocalInscrito = async (numero: string | number) => {
  const normalized = normalizeNumero(numero);
  if (!normalized) return null;
  return getByKey<Inscrito>(OFFLINE_STORES.inscritos, normalized);
};

export const getLastSyncMeta = async () => {
  const lastSyncAt = await getMetaValue<string>("inscritos.lastSyncAt");
  const lastSyncCompletedAt = await getMetaValue<string>("inscritos.lastSyncCompletedAt");
  const lastSyncMode = await getMetaValue<InscritosSyncMode>("inscritos.lastSyncMode");
  const lastSyncCount = await getMetaValue<number>("inscritos.lastSyncCount");
  return { lastSyncAt, lastSyncCompletedAt, lastSyncMode, lastSyncCount };
};

export const fetchRemoteInscrito = async (numero: string | number) => {
  const normalized = normalizeNumero(numero);
  if (!normalized) return null;
  const client = getClient();
  const response = await client.get(`${INSCRITOS_ENDPOINT}/${encodeURIComponent(normalized)}`);
  const raw = response.data;
  const payload =
    raw?.data ??
    raw?.inscrito ??
    raw?.item ??
    (raw && typeof raw === "object" ? raw : { numero: normalized });
  const data = payload as Record<string, unknown>;
  return normalizeInscrito(data);
};

type SyncOptions = {
  mode?: InscritosSyncMode;
  pageSize?: number;
  forceFull?: boolean;
  updatedAfter?: string | null;
  onProgress?: (info: { fetched: number; stored: number; page: number }) => void;
};

const resolveSyncMode = async (options?: SyncOptions): Promise<InscritosSyncMode> => {
  if (options?.forceFull) return "full";
  if (options?.mode) return options.mode;
  const lastSync = await getMetaValue<string>("inscritos.lastSyncAt");
  if (lastSync?.value) return "incremental";
  return "full";
};

export const syncInscritos = async (options?: SyncOptions): Promise<InscritosSyncResult> => {
  const startedAt = new Date().toISOString();
  const client = getClient();
  let mode = await resolveSyncMode(options);
  const lastSyncMeta = await getMetaValue<string>("inscritos.lastSyncAt");
  const updatedAfter =
    mode === "incremental"
      ? options?.updatedAfter ?? lastSyncMeta?.value ?? null
      : null;
  if (mode === "incremental" && !updatedAfter) {
    mode = "full";
  }
  if (mode === "full") {
    await clearStore(OFFLINE_STORES.inscritos);
  }
  const pageSize = Math.max(
    1,
    Math.floor(options?.pageSize ?? (Number(import.meta.env.VITE_INSCRITOS_PAGE_SIZE) || 500))
  );
  let page = 1;
  let fetched = 0;
  let stored = 0;
  let hasMore = true;
  let hasIncrementalSupport = Boolean(updatedAfter);
  while (hasMore) {
    const { items, pagination } = await fetchInscritosPage(client, page, pageSize, updatedAfter ?? undefined);
    const normalizedItems = items
      .map((item) => normalizeInscrito(item))
      .filter((item): item is Inscrito => Boolean(item));
    fetched += items.length;
    stored += normalizedItems.length;
    await bulkPut(OFFLINE_STORES.inscritos, normalizedItems);
    if (options?.onProgress) {
      options.onProgress({ fetched, stored, page });
    }
    if (!pagination.isPaginated) {
      hasMore = false;
      break;
    }
    if (pagination.hasMore === false) {
      hasMore = false;
      break;
    }
    if (pagination.nextPage) {
      page = pagination.nextPage;
    } else {
      page += 1;
    }
    if (pagination.hasMore === undefined && items.length < pageSize) {
      hasMore = false;
    }
  }
  const finishedAt = new Date().toISOString();
  const totalLocal = await countStore(OFFLINE_STORES.inscritos);
  await setMetaValue("inscritos.lastSyncAt", startedAt);
  await setMetaValue("inscritos.lastSyncCompletedAt", finishedAt);
  await setMetaValue("inscritos.lastSyncMode", mode);
  await setMetaValue("inscritos.lastSyncCount", totalLocal);
  if (updatedAfter) {
    await setMetaValue("inscritos.lastIncrementalBase", updatedAfter);
  }
  return {
    mode,
    fetched,
    stored,
    totalLocal,
    startedAt,
    finishedAt,
    updatedAfter,
    hasIncrementalSupport
  };
};

export const saveRemoteInscritoLocally = async (inscrito: Inscrito | null) => {
  if (!inscrito) return;
  const normalized = normalizeInscrito(inscrito as Record<string, unknown>);
  if (!normalized) return;
  await bulkPut(OFFLINE_STORES.inscritos, [normalized]);
  const totalLocal = await countStore(OFFLINE_STORES.inscritos);
  await setMetaValue("inscritos.lastSyncCount", totalLocal);
};

export const getSyncMetaValue = async <T>(key: string): Promise<OfflineMetaEntry<T> | null> =>
  getMetaValue<T>(key);
