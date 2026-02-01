import type { OfflineEventEntity, OfflineEventEntityType, OfflineOutboxEntry, OfflineEventStoreCounts } from "../types/offline";
import {
  OFFLINE_STORES,
  bulkPut,
  countByIndex,
  countStore,
  getAllByIndex,
  getAllFromStore,
  getByKey,
  putItem
} from "./offlineDb";

const STORE_BY_TYPE: Record<OfflineEventEntityType, typeof OFFLINE_STORES[keyof typeof OFFLINE_STORES]> = {
  teams: OFFLINE_STORES.eventTeams,
  raffles: OFFLINE_STORES.eventRaffles,
  gincanas: OFFLINE_STORES.eventGincanas,
  scores: OFFLINE_STORES.eventScores,
  penalties: OFFLINE_STORES.eventPenalties
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const enqueueOutbox = async (
  entry: Omit<OfflineOutboxEntry, "id" | "retries" | "status" | "updatedAt">
) => {
  const outboxEntry: OfflineOutboxEntry = {
    id: generateId(),
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    payload: entry.payload,
    updatedAt: new Date().toISOString(),
    status: "pending",
    retries: 0
  };
  await putItem(OFFLINE_STORES.outbox, outboxEntry);
  return outboxEntry;
};

export const upsertEventEntity = async (
  type: OfflineEventEntityType,
  entity: OfflineEventEntity
) => {
  const now = new Date().toISOString();
  const resolved: OfflineEventEntity = {
    ...entity,
    id: entity.id || generateId(),
    updatedAt: entity.updatedAt || now
  };
  const storeName = STORE_BY_TYPE[type];
  await putItem(storeName, resolved);
  await enqueueOutbox({ entityType: type, entityId: resolved.id, action: "upsert", payload: resolved });
  return resolved;
};

export const deleteEventEntity = async (type: OfflineEventEntityType, entityId: string) => {
  const storeName = STORE_BY_TYPE[type];
  const existing = await getByKey<OfflineEventEntity>(storeName, entityId);
  const now = new Date().toISOString();
  const resolved: OfflineEventEntity = {
    ...(existing ?? {}),
    id: entityId,
    updatedAt: now,
    deletedAt: now
  };
  await putItem(storeName, resolved);
  await enqueueOutbox({ entityType: type, entityId, action: "delete", payload: resolved });
  return resolved;
};

export const upsertEventBatch = async (
  type: OfflineEventEntityType,
  entities: OfflineEventEntity[]
) => {
  const now = new Date().toISOString();
  const resolved = entities.map((entity) => ({
    ...entity,
    id: entity.id || generateId(),
    updatedAt: entity.updatedAt || now
  }));
  const storeName = STORE_BY_TYPE[type];
  await bulkPut(storeName, resolved);
  for (const entity of resolved) {
    await enqueueOutbox({ entityType: type, entityId: entity.id, action: "upsert", payload: entity });
  }
  return resolved;
};

export const getEventStoreCounts = async (): Promise<OfflineEventStoreCounts> => {
  const [teams, raffles, gincanas, scores, penalties, outboxPending] = await Promise.all([
    countStore(OFFLINE_STORES.eventTeams),
    countStore(OFFLINE_STORES.eventRaffles),
    countStore(OFFLINE_STORES.eventGincanas),
    countStore(OFFLINE_STORES.eventScores),
    countStore(OFFLINE_STORES.eventPenalties),
    countByIndex(OFFLINE_STORES.outbox, "status", "pending")
  ]);
  return {
    teams,
    raffles,
    gincanas,
    scores,
    penalties,
    outboxPending
  };
};

export const listEventEntities = async <T extends OfflineEventEntity>(
  type: OfflineEventEntityType,
  options?: { eventId?: string | null; includeDeleted?: boolean }
) => {
  const storeName = STORE_BY_TYPE[type];
  const items = await getAllFromStore<T>(storeName);
  const includeDeleted = options?.includeDeleted ?? false;
  return items
    .filter((item) => {
      if (!includeDeleted && item.deletedAt) return false;
      if (options?.eventId === undefined || options?.eventId === null) return true;
      return item.eventId === options.eventId;
    })
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
};

export const getEventEntityById = async <T extends OfflineEventEntity>(
  type: OfflineEventEntityType,
  id: string
) => {
  const storeName = STORE_BY_TYPE[type];
  return getByKey<T>(storeName, id);
};

type SyncResult = {
  status: "skipped" | "success" | "failed";
  message?: string;
  syncedCount?: number;
  failedCount?: number;
};

export const syncEventOutbox = async (
  api: { post: (url: string, payload?: unknown) => Promise<{ data?: any }> },
  options?: { endpoint?: string }
): Promise<SyncResult> => {
  const endpoint = options?.endpoint ?? import.meta.env.VITE_OFFLINE_EVENT_SYNC_ENDPOINT;
  if (!endpoint) {
    return { status: "skipped", message: "Endpoint de sincronizacao nao configurado." };
  }
  const list = await getAllByIndex<OfflineOutboxEntry>(OFFLINE_STORES.outbox, "status", "pending");
  if (!list.length) {
    return { status: "success", message: "Nenhuma pendencia para sincronizar.", syncedCount: 0 };
  }
  try {
    const response = await api.post(endpoint, { changes: list });
    const appliedIds = Array.isArray(response.data?.appliedIds) ? response.data.appliedIds : null;
    const failedIds = Array.isArray(response.data?.failedIds) ? response.data.failedIds : null;
    if (appliedIds || failedIds) {
      const successIds = appliedIds ?? list.map((entry) => entry.id).filter((id) => !failedIds?.includes(id));
      for (const id of successIds) {
        await putItem(OFFLINE_STORES.outbox, { ...(list.find((entry) => entry.id === id) as OfflineOutboxEntry), status: "synced" });
      }
      if (failedIds) {
        for (const id of failedIds) {
          const entry = list.find((item) => item.id === id);
          if (entry) {
            await putItem(OFFLINE_STORES.outbox, { ...entry, status: "failed", retries: entry.retries + 1 });
          }
        }
      }
      return {
        status: "success",
        syncedCount: successIds.length,
        failedCount: failedIds?.length ?? 0
      };
    }
    for (const entry of list) {
      await putItem(OFFLINE_STORES.outbox, { ...entry, status: "synced" });
    }
    return { status: "success", syncedCount: list.length };
  } catch (error: any) {
    for (const entry of list) {
      await putItem(OFFLINE_STORES.outbox, {
        ...entry,
        status: "failed",
        retries: entry.retries + 1,
        lastError: error?.message ?? "Falha ao sincronizar"
      });
    }
    return { status: "failed", message: error?.message ?? "Falha ao sincronizar" };
  }
};
