<template>
  <div v-if="permissions.canList" class="space-y-6">
    <BaseCard class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Offline-first
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Inscritos sincronizados</h1>
          <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Sincronize antecipadamente, busque localmente e mantenha o sistema responsivo durante o evento.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.syncInProgress"
            @click="runSync('incremental')"
          >
            <span v-if="store.syncInProgress" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sincronizar incremental
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/90 px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
            :disabled="store.syncInProgress"
            @click="runSync('full')"
          >
            Sincronizar completa
          </button>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Ultima sincronizacao</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {{ lastSyncLabel }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Modo: {{ store.lastSyncMode ?? "N/A" }}
          </p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Total local</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {{ store.totalLocal }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Ultima contagem: {{ store.lastSyncCount }}
          </p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Status</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {{ syncStatusLabel }}
          </p>
          <p v-if="store.syncProgress" class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ store.syncProgress.stored }} itens salvos (pagina {{ store.syncProgress.page }})
          </p>
          <p v-else class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ store.syncError ? store.syncError : "Pronto para sincronizar." }}
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Buscar inscrito (local)</h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Digite o numero e pressione Enter para buscar no IndexedDB ou no cache em memoria.
          </p>
          <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="handleLookup">
            <input
              v-model="lookupNumero"
              type="text"
              inputmode="numeric"
              placeholder="Numero do inscrito"
              class="w-full flex-1 rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="lookupLoading"
            >
              {{ lookupLoading ? "Buscando..." : "Buscar" }}
            </button>
          </form>
          <label class="mt-3 inline-flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <input v-model="useMemoryCache" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-primary-600" />
            Usar cache em memoria quando disponivel
          </label>
          <div v-if="lookupMessage" class="mt-4 rounded-2xl border px-4 py-3 text-sm" :class="lookupMessageClass">
            {{ lookupMessage }}
          </div>
        </div>
        <div v-if="lookupResult" class="w-full max-w-md rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/60">
          <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">Resultado</p>
          <h3 class="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">{{ lookupResult.nome }}</h3>
          <div class="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p><span class="font-semibold">Numero:</span> {{ lookupResult.numero }}</p>
            <p><span class="font-semibold">Nascimento:</span> {{ lookupResult.dataNascimento }}</p>
            <p><span class="font-semibold">Igreja:</span> {{ lookupResult.igreja }}</p>
            <p><span class="font-semibold">Distrito:</span> {{ lookupResult.distrito }}</p>
          </div>
        </div>
        <div v-else-if="canSearchRemote && lookupNumero" class="w-full max-w-md rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm text-neutral-600 shadow-sm dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
          <p class="font-semibold text-neutral-800 dark:text-neutral-100">Nao encontrado localmente.</p>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Se estiver online, voce pode tentar a busca manual na API.
          </p>
          <button
            type="button"
            class="mt-3 inline-flex items-center justify-center rounded-full border border-sky-200/70 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100"
            :disabled="remoteLookupLoading"
            @click="handleRemoteLookup"
          >
            {{ remoteLookupLoading ? "Buscando online..." : "Buscar na API" }}
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Cache em memoria</h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Carregue todos os inscritos na memoria para buscas instantaneas durante sorteios.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="memoryLoading"
            @click="handleLoadMemory"
          >
            {{ memoryLoading ? "Carregando..." : "Carregar cache" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/90 px-5 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
            :disabled="memoryLoading"
            @click="store.clearMemoryCache"
          >
            Limpar cache
          </button>
        </div>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Itens carregados</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ store.memoryCount }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Ultimo carregamento</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {{ memoryLoadedLabel }}
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Dados locais do evento</h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Equipes, sorteios, gincanas, pontuacoes e penalidades ficam offline e podem ser sincronizados quando houver internet.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.eventSyncing"
            @click="handleSyncEventData"
          >
            {{ store.eventSyncing ? "Sincronizando..." : "Sincronizar pendencias" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
            @click="store.refreshEventCounts"
          >
            Atualizar contagens
          </button>
        </div>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Equipes</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ eventCountsLabel("teams") }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Sorteios</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ eventCountsLabel("raffles") }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Gincanas</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ eventCountsLabel("gincanas") }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Pontuacoes</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ eventCountsLabel("scores") }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Penalidades</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{{ eventCountsLabel("penalties") }}</p>
        </div>
        <div class="rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-300">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Pendencias</p>
          <p class="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {{ store.eventCounts?.outboxPending ?? 0 }}
          </p>
          <p v-if="store.eventSyncState?.message" class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ store.eventSyncState.message }}
          </p>
        </div>
      </div>
    </BaseCard>
  </div>
  <AccessDeniedNotice v-else module="checkin" action="view" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import BaseCard from "../../components/ui/BaseCard.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import { useOfflineInscritosStore } from "../../stores/offline-inscritos";
import { useModulePermissions } from "../../composables/usePermissions";
import type { Inscrito, InscritosSyncMode, OfflineEventStoreCounts } from "../../types/offline";
import { normalizeNumero } from "../../utils/inscritos";

const permissions = useModulePermissions("checkin");
const store = useOfflineInscritosStore();

const lookupNumero = ref("");
const lookupResult = ref<Inscrito | null>(null);
const lookupMessage = ref("");
const lookupMessageClass = ref("");
const lookupLoading = ref(false);
const remoteLookupLoading = ref(false);
const useMemoryCache = ref(true);
const memoryLoading = ref(false);

const canSearchRemote = computed(() => typeof navigator !== "undefined" && navigator.onLine);

const lastSyncLabel = computed(() => {
  const value = store.lastSyncCompletedAt ?? store.lastSyncAt;
  return value ? new Date(value).toLocaleString("pt-BR") : "Nunca sincronizado";
});
const memoryLoadedLabel = computed(() =>
  store.memoryLoadedAt ? new Date(store.memoryLoadedAt).toLocaleString("pt-BR") : "Nao carregado"
);
const syncStatusLabel = computed(() => {
  if (store.syncInProgress) return "Sincronizando...";
  if (store.syncError) return "Erro na sincronizacao";
  if (!store.lastSyncAt) return "Sem sincronizacao";
  return "Sincronizacao concluida";
});

const eventCountsLabel = (key: keyof OfflineEventStoreCounts) => {
  if (!store.eventCounts) return 0;
  return store.eventCounts[key] ?? 0;
};

const showLookupMessage = (message: string, variant: "success" | "error" | "info") => {
  lookupMessage.value = message;
  lookupMessageClass.value =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
      : variant === "error"
        ? "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-100"
        : "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100";
};

const handleLookup = async () => {
  const normalized = normalizeNumero(lookupNumero.value);
  lookupResult.value = null;
  if (!normalized) {
    showLookupMessage("Informe o numero do inscrito.", "error");
    return;
  }
  lookupLoading.value = true;
  try {
    const result = await store.searchLocal(normalized, { preferMemory: useMemoryCache.value });
    if (result) {
      lookupResult.value = result;
      showLookupMessage("Inscrito encontrado localmente.", "success");
    } else {
      showLookupMessage("Inscrito nao encontrado no banco local.", "info");
    }
  } catch (error: any) {
    showLookupMessage(error?.message ?? "Falha ao buscar inscrito.", "error");
  } finally {
    lookupLoading.value = false;
  }
};

const handleRemoteLookup = async () => {
  if (!lookupNumero.value.trim()) return;
  remoteLookupLoading.value = true;
  try {
    const result = await store.searchRemote(lookupNumero.value);
    if (result) {
      lookupResult.value = result;
      showLookupMessage("Inscrito encontrado na API e salvo localmente.", "success");
    } else {
      showLookupMessage("Inscrito nao encontrado na API.", "error");
    }
  } catch (error: any) {
    showLookupMessage(error?.message ?? "Falha ao buscar na API.", "error");
  } finally {
    remoteLookupLoading.value = false;
  }
};

const runSync = async (mode: InscritosSyncMode) => {
  await store.sync(mode);
};

const handleLoadMemory = async () => {
  memoryLoading.value = true;
  try {
    await store.loadMemoryCache();
  } finally {
    memoryLoading.value = false;
  }
};

const handleSyncEventData = async () => {
  await store.syncEventData();
};

onMounted(async () => {
  if (!permissions.canList.value) return;
  await store.initialize();
  if (typeof navigator !== "undefined" && navigator.onLine && !store.lastSyncAt && store.totalLocal === 0) {
    await store.sync("full");
  }
});
</script>
