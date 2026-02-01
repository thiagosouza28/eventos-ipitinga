import type { Inscrito } from "../types/offline";
import { OFFLINE_STORES, getAllFromStore } from "./offlineDb";
import { normalizeNumero } from "../utils/inscritos";

const cache = new Map<string, Inscrito>();
let cacheLoadedAt: string | null = null;

export const loadInscritosIntoMemory = async () => {
  const list = await getAllFromStore<Inscrito>(OFFLINE_STORES.inscritos);
  cache.clear();
  list.forEach((item) => {
    const numero = normalizeNumero(item.numero);
    if (!numero) return;
    cache.set(numero, item);
  });
  cacheLoadedAt = new Date().toISOString();
  return { count: cache.size, loadedAt: cacheLoadedAt };
};

export const clearInscritosMemoryCache = () => {
  cache.clear();
  cacheLoadedAt = null;
};

export const getInscritoFromMemory = (numero: string | number) =>
  cache.get(normalizeNumero(numero)) ?? null;

export const isMemoryCacheReady = () => cache.size > 0;

export const getMemoryCacheInfo = () => ({
  count: cache.size,
  loadedAt: cacheLoadedAt
});
