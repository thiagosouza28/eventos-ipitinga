export const OFFLINE_DB_NAME = "eventos-ipitinga-offline";
export const OFFLINE_DB_VERSION = 1;

export const OFFLINE_STORES = {
  inscritos: "inscritos",
  syncMeta: "sync_meta",
  eventTeams: "event_teams",
  eventRaffles: "event_raffles",
  eventGincanas: "event_gincanas",
  eventScores: "event_scores",
  eventPenalties: "event_penalties",
  outbox: "sync_outbox"
} as const;

export type OfflineStoreName = typeof OFFLINE_STORES[keyof typeof OFFLINE_STORES];

export type OfflineMetaEntry<T = unknown> = {
  key: string;
  value: T;
  updatedAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

const wrapRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB request failed"));
  });

const waitForTransaction = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
  });

const ensureObjectStore = (
  db: IDBDatabase,
  name: string,
  options?: IDBObjectStoreParameters,
  indexes: Array<{ name: string; keyPath: string | string[]; options?: IDBIndexParameters }> = []
) => {
  if (db.objectStoreNames.contains(name)) return;
  const store = db.createObjectStore(name, options);
  indexes.forEach((index) => {
    store.createIndex(index.name, index.keyPath, index.options);
  });
};

export const openOfflineDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB nao esta disponivel neste navegador."));
      return;
    }
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      ensureObjectStore(
        db,
        OFFLINE_STORES.inscritos,
        { keyPath: "numero" },
        [
          { name: "numero", keyPath: "numero", options: { unique: true } },
          { name: "updatedAt", keyPath: "updatedAt" }
        ]
      );
      ensureObjectStore(db, OFFLINE_STORES.syncMeta, { keyPath: "key" });
      const eventIndexes = [
        { name: "eventId", keyPath: "eventId" },
        { name: "updatedAt", keyPath: "updatedAt" }
      ];
      ensureObjectStore(db, OFFLINE_STORES.eventTeams, { keyPath: "id" }, eventIndexes);
      ensureObjectStore(db, OFFLINE_STORES.eventRaffles, { keyPath: "id" }, eventIndexes);
      ensureObjectStore(db, OFFLINE_STORES.eventGincanas, { keyPath: "id" }, eventIndexes);
      ensureObjectStore(db, OFFLINE_STORES.eventScores, { keyPath: "id" }, eventIndexes);
      ensureObjectStore(db, OFFLINE_STORES.eventPenalties, { keyPath: "id" }, eventIndexes);
      ensureObjectStore(
        db,
        OFFLINE_STORES.outbox,
        { keyPath: "id" },
        [
          { name: "status", keyPath: "status" },
          { name: "entityType", keyPath: "entityType" },
          { name: "updatedAt", keyPath: "updatedAt" }
        ]
      );
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir IndexedDB"));
  });
  return dbPromise;
};

export const runTransaction = async <T>(
  storeNames: OfflineStoreName | OfflineStoreName[],
  mode: IDBTransactionMode,
  handler: (stores: Record<string, IDBObjectStore>, tx: IDBTransaction) => Promise<T> | T
) => {
  const db = await openOfflineDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = db.transaction(names, mode);
  const stores = Object.fromEntries(names.map((name) => [name, tx.objectStore(name)]));
  const result = await handler(stores, tx);
  await waitForTransaction(tx);
  return result;
};

export const getByKey = async <T>(storeName: OfflineStoreName, key: IDBValidKey) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const value = await wrapRequest(stores[storeName].get(key));
    return (value as T) ?? null;
  });

export const getByIndex = async <T>(
  storeName: OfflineStoreName,
  indexName: string,
  key: IDBValidKey
) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const index = stores[storeName].index(indexName);
    const value = await wrapRequest(index.get(key));
    return (value as T) ?? null;
  });

export const countByIndex = async (
  storeName: OfflineStoreName,
  indexName: string,
  key: IDBValidKey
) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const index = stores[storeName].index(indexName);
    const value = await wrapRequest(index.count(key));
    return value ?? 0;
  });

export const getAllFromStore = async <T>(storeName: OfflineStoreName) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const value = await wrapRequest(stores[storeName].getAll());
    return (value as T[]) ?? [];
  });

export const getAllByIndex = async <T>(
  storeName: OfflineStoreName,
  indexName: string,
  key: IDBValidKey
) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const index = stores[storeName].index(indexName);
    const value = await wrapRequest(index.getAll(key));
    return (value as T[]) ?? [];
  });

export const countStore = async (storeName: OfflineStoreName) =>
  runTransaction(storeName, "readonly", async (stores) => {
    const value = await wrapRequest(stores[storeName].count());
    return value ?? 0;
  });

export const clearStore = async (storeName: OfflineStoreName) =>
  runTransaction(storeName, "readwrite", async (stores) => {
    await wrapRequest(stores[storeName].clear());
  });

export const putItem = async <T extends Record<string, unknown>>(
  storeName: OfflineStoreName,
  item: T
) =>
  runTransaction(storeName, "readwrite", async (stores) => {
    await wrapRequest(stores[storeName].put(item as Record<string, unknown>));
  });

export const bulkPut = async <T extends Record<string, unknown>>(
  storeName: OfflineStoreName,
  items: T[],
  chunkSize = 500
) => {
  if (!items.length) return;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await runTransaction(storeName, "readwrite", async (stores) => {
      chunk.forEach((item) => {
        stores[storeName].put(item as Record<string, unknown>);
      });
    });
  }
};

export const getMetaValue = async <T>(key: string) =>
  getByKey<OfflineMetaEntry<T>>(OFFLINE_STORES.syncMeta, key);

export const setMetaValue = async <T>(key: string, value: T) => {
  const entry: OfflineMetaEntry<T> = {
    key,
    value,
    updatedAt: new Date().toISOString()
  };
  await putItem(OFFLINE_STORES.syncMeta, entry);
  return entry;
};
