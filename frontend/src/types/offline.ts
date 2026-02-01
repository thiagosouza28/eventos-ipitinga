export type Inscrito = {
  numero: string;
  nome: string;
  dataNascimento: string;
  igreja: string;
  distrito: string;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type InscritosSyncMode = "full" | "incremental";

export type InscritosSyncResult = {
  mode: InscritosSyncMode;
  fetched: number;
  stored: number;
  totalLocal: number;
  startedAt: string;
  finishedAt: string;
  updatedAfter?: string | null;
  hasIncrementalSupport: boolean;
};

export type OfflineEventEntityType =
  | "teams"
  | "raffles"
  | "gincanas"
  | "scores"
  | "penalties";

export type OfflineEventEntity = {
  id: string;
  eventId?: string | null;
  updatedAt: string;
  createdAt?: string;
  deletedAt?: string | null;
  [key: string]: unknown;
};

export type OfflineOutboxEntry = {
  id: string;
  entityType: OfflineEventEntityType;
  entityId: string;
  action: "upsert" | "delete";
  payload: OfflineEventEntity | Record<string, unknown>;
  updatedAt: string;
  status: "pending" | "synced" | "failed";
  retries: number;
  lastError?: string | null;
};

export type OfflineEventStoreCounts = {
  teams: number;
  raffles: number;
  gincanas: number;
  scores: number;
  penalties: number;
  outboxPending: number;
};
