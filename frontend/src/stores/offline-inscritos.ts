import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type { Inscrito, InscritosSyncMode, InscritosSyncResult, OfflineEventStoreCounts } from "../types/offline";
import {
  fetchRemoteInscrito,
  getLastSyncMeta,
  getLocalInscrito,
  saveRemoteInscritoLocally,
  syncInscritos
} from "../services/inscritosSync";
import {
  clearInscritosMemoryCache,
  getInscritoFromMemory,
  getMemoryCacheInfo,
  isMemoryCacheReady,
  loadInscritosIntoMemory
} from "../services/inscritosMemoryCache";
import { countStore, OFFLINE_STORES } from "../services/offlineDb";
import { getEventStoreCounts, syncEventOutbox } from "../services/offlineEventData";

type SyncProgress = {
  fetched: number;
  stored: number;
  page: number;
};

type EventSyncState = {
  status: "skipped" | "success" | "failed";
  message?: string;
  syncedCount?: number;
  failedCount?: number;
};

export const useOfflineInscritosStore = defineStore("offline-inscritos", () => {
  const { api } = useApi();

  const lastSyncAt = ref<string | null>(null);
  const lastSyncCompletedAt = ref<string | null>(null);
  const lastSyncMode = ref<InscritosSyncMode | null>(null);
  const lastSyncCount = ref<number>(0);
  const totalLocal = ref<number>(0);

  const syncInProgress = ref(false);
  const syncError = ref<string>("");
  const syncProgress = ref<SyncProgress | null>(null);

  const memoryCount = ref(0);
  const memoryLoadedAt = ref<string | null>(null);

  const eventCounts = ref<OfflineEventStoreCounts | null>(null);
  const eventSyncing = ref(false);
  const eventSyncState = ref<EventSyncState | null>(null);

  const refreshSyncStatus = async () => {
    const meta = await getLastSyncMeta();
    lastSyncAt.value = meta.lastSyncAt?.value ?? null;
    lastSyncCompletedAt.value = meta.lastSyncCompletedAt?.value ?? null;
    lastSyncMode.value = meta.lastSyncMode?.value ?? null;
    lastSyncCount.value = meta.lastSyncCount?.value ?? 0;
    totalLocal.value = await countStore(OFFLINE_STORES.inscritos);
  };

  const sync = async (mode?: InscritosSyncMode): Promise<InscritosSyncResult | null> => {
    if (syncInProgress.value) return null;
    syncInProgress.value = true;
    syncError.value = "";
    syncProgress.value = null;
    try {
      const result = await syncInscritos({
        mode,
        onProgress: (info) => {
          syncProgress.value = info;
        }
      });
      await refreshSyncStatus();
      if (isMemoryCacheReady()) {
        const info = await loadInscritosIntoMemory();
        memoryCount.value = info.count;
        memoryLoadedAt.value = info.loadedAt;
      }
      return result;
    } catch (error: any) {
      syncError.value = error?.message ?? "Falha ao sincronizar inscritos.";
      return null;
    } finally {
      syncInProgress.value = false;
    }
  };

  const searchLocal = async (numero: string, options?: { preferMemory?: boolean }) => {
    if (options?.preferMemory && isMemoryCacheReady()) {
      return getInscritoFromMemory(numero);
    }
    return getLocalInscrito(numero);
  };

  const searchRemote = async (numero: string) => {
    const remote = await fetchRemoteInscrito(numero);
    if (remote) {
      await saveRemoteInscritoLocally(remote);
      await refreshSyncStatus();
    }
    return remote;
  };

  const loadMemoryCache = async () => {
    const info = await loadInscritosIntoMemory();
    memoryCount.value = info.count;
    memoryLoadedAt.value = info.loadedAt;
    return info;
  };

  const clearMemoryCache = () => {
    clearInscritosMemoryCache();
    memoryCount.value = 0;
    memoryLoadedAt.value = null;
  };

  const refreshMemoryInfo = () => {
    const info = getMemoryCacheInfo();
    memoryCount.value = info.count;
    memoryLoadedAt.value = info.loadedAt;
    return info;
  };

  const refreshEventCounts = async () => {
    eventCounts.value = await getEventStoreCounts();
    return eventCounts.value;
  };

  const syncEventData = async () => {
    if (eventSyncing.value) return null;
    eventSyncing.value = true;
    eventSyncState.value = null;
    try {
      const result = await syncEventOutbox(api);
      eventSyncState.value = result;
      await refreshEventCounts();
      return result;
    } catch (error: any) {
      eventSyncState.value = {
        status: "failed",
        message: error?.message ?? "Falha ao sincronizar dados do evento."
      };
      return null;
    } finally {
      eventSyncing.value = false;
    }
  };

  const initialize = async () => {
    try {
      await refreshSyncStatus();
      refreshMemoryInfo();
      await refreshEventCounts();
    } catch (error: any) {
      syncError.value = error?.message ?? "Falha ao inicializar o banco local.";
    }
  };

  return {
    lastSyncAt,
    lastSyncCompletedAt,
    lastSyncMode,
    lastSyncCount,
    totalLocal,
    syncInProgress,
    syncError,
    syncProgress,
    memoryCount,
    memoryLoadedAt,
    eventCounts,
    eventSyncing,
    eventSyncState,
    initialize,
    sync,
    searchLocal,
    searchRemote,
    loadMemoryCache,
    clearMemoryCache,
    refreshMemoryInfo,
    refreshSyncStatus,
    refreshEventCounts,
    syncEventData
  };
});
