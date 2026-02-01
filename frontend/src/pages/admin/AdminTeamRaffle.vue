<template>
  <div v-if="permissions.canList" class="space-y-6">
    <BaseCard class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Sorteio por equipes
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Modulo de sorteios</h1>
          <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Crie equipes, carregue inscritos em memoria e execute sorteios instantaneos mesmo offline.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/90 px-4 py-2 text-xs text-neutral-600 shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-neutral-200">
            <span class="font-semibold">Cache:</span>
            <span>{{ memoryLabel }}</span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="memoryLoading"
            @click="handleLoadMemory"
          >
            {{ memoryLoading ? "Carregando..." : "Carregar memoria" }}
          </button>
        </div>
      </div>
      <div class="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col">
          <span class="text-xs uppercase tracking-[0.3em] text-neutral-400">Evento</span>
          <select
            v-model="selectedEventId"
            class="mt-2 w-full rounded-full border border-neutral-200/70 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/60 dark:text-white"
          >
            <option value="" disabled>Selecione o evento</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">
              {{ event.title }}
            </option>
          </select>
        </div>
        <div class="text-sm text-neutral-500 dark:text-neutral-400">
          <span class="font-semibold">Equipes:</span> {{ raffleStore.teams.length }} |
          <span class="font-semibold">Sorteios:</span> {{ raffleStore.raffles.length }}
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Equipes</h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Cadastre equipes e membros (numero do inscrito). Os dados ficam locais e podem ser sincronizados depois.
          </p>
          <form class="mt-4 space-y-3" @submit.prevent="handleSaveTeam">
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Nome</label>
                <input
                  v-model="teamForm.name"
                  type="text"
                  class="mt-2 w-full rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
                />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Cor</label>
                <select
                  v-model="teamForm.color"
                  class="mt-2 w-full rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
                >
                  <option v-for="color in teamColors" :key="color.value" :value="color.value">
                    {{ color.label }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Membros</label>
              <textarea
                v-model="teamForm.membersText"
                rows="3"
                placeholder="Digite numeros separados por virgula ou quebra de linha"
                class="mt-2 w-full rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
              />
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <label class="inline-flex items-center gap-2">
                <input v-model="teamForm.replaceMembers" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-primary-600" />
                Substituir membros atuais
              </label>
              <span v-if="editingTeam">Editando equipe: {{ editingTeam.name }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!selectedEventId || teamSaving"
              >
                {{ teamSaving ? "Salvando..." : editingTeam ? "Salvar equipe" : "Criar equipe" }}
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 bg-white/90 px-5 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
                @click="resetTeamForm"
              >
                Limpar
              </button>
              <span v-if="teamMessage" class="text-xs text-neutral-500 dark:text-neutral-400">{{ teamMessage }}</span>
            </div>
          </form>
        </div>
        <div class="w-full max-w-md">
          <div class="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm text-neutral-600 shadow-sm dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
            <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">Membros atuais</p>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {{ teamMembers.length }} membros carregados
            </p>
            <div v-if="teamMembers.length" class="mt-3 space-y-2">
              <div
                v-for="member in teamMembers"
                :key="member.numero"
                class="flex items-center justify-between rounded-xl border border-neutral-200/60 bg-white/80 px-3 py-2 text-xs text-neutral-700 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-200"
              >
                <span>
                  <span class="font-semibold">{{ member.numero }}</span>
                  <span v-if="member.nome"> - {{ member.nome }}</span>
                </span>
                <button
                  type="button"
                  class="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500"
                  @click="removeMember(member.numero)"
                >
                  Remover
                </button>
              </div>
            </div>
            <p v-else class="mt-3 text-xs text-neutral-400">Nenhum membro carregado.</p>
          </div>
        </div>
      </div>
      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        <div
          v-for="team in raffleStore.teams"
          :key="team.id"
          class="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/60"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: team.color }" />
              <h3 class="text-base font-semibold text-neutral-900 dark:text-white">{{ team.name }}</h3>
            </div>
            <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{{ team.members.length }} membros</span>
              <button
                type="button"
                class="font-semibold uppercase tracking-[0.2em] text-primary-600"
                @click="startEditTeam(team)"
              >
                Editar
              </button>
              <button
                type="button"
                class="font-semibold uppercase tracking-[0.2em] text-red-500"
                @click="handleDeleteTeam(team)"
              >
                Excluir
              </button>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <span
              v-for="member in team.members.slice(0, 6)"
              :key="member.numero"
              class="rounded-full border border-neutral-200/60 bg-white/80 px-2 py-1 dark:border-white/10 dark:bg-neutral-900/50"
            >
              {{ member.nome ?? member.numero }}
            </span>
            <span v-if="team.members.length > 6" class="text-xs text-neutral-400">
              +{{ team.members.length - 6 }} membros
            </span>
          </div>
        </div>
        <div v-if="!raffleStore.teams.length" class="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm text-neutral-500 dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
          Nenhuma equipe cadastrada para este evento.
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">Sorteios</h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Configure sorteios por equipe ou por participante. Os resultados ficam salvos localmente.
          </p>
          <form class="mt-4 space-y-3" @submit.prevent="handleSaveRaffle">
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Nome do sorteio</label>
                <input
                  v-model="raffleForm.name"
                  type="text"
                  class="mt-2 w-full rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
                />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Modo</label>
                <select
                  v-model="raffleForm.mode"
                  class="mt-2 w-full rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
                >
                  <option value="TEAM">Equipes</option>
                  <option value="MEMBER">Participantes</option>
                </select>
              </div>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Escopo</label>
                <select
                  v-model="raffleForm.teamScope"
                  class="mt-2 w-full rounded-full border border-neutral-200/80 bg-white px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
                >
                  <option value="ALL">Todas as equipes</option>
                  <option value="SELECTED">Equipes selecionadas</option>
                </select>
              </div>
              <div class="flex flex-col justify-center">
                <label class="inline-flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <input v-model="raffleForm.allowRepeat" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-primary-600" />
                  Permitir repeticao de ganhadores
                </label>
                <span v-if="editingRaffle" class="mt-1 text-xs text-neutral-400">
                  Editando sorteio: {{ editingRaffle.name }}
                </span>
              </div>
            </div>
            <div v-if="raffleForm.teamScope === 'SELECTED'" class="mt-2">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Equipes selecionadas</label>
              <div class="mt-2 flex flex-wrap gap-2">
                <label
                  v-for="team in raffleStore.teams"
                  :key="`scope-${team.id}`"
                  class="inline-flex items-center gap-2 rounded-full border border-neutral-200/60 bg-white/80 px-3 py-1 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-300"
                >
                  <input
                    v-model="raffleForm.teamIds"
                    type="checkbox"
                    :value="team.id"
                    class="h-4 w-4 rounded border-neutral-300 text-primary-600"
                  />
                  {{ team.name }}
                </label>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!selectedEventId || raffleSaving"
              >
                {{ raffleSaving ? "Salvando..." : editingRaffle ? "Salvar sorteio" : "Criar sorteio" }}
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 bg-white/90 px-5 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white"
                @click="resetRaffleForm"
              >
                Limpar
              </button>
              <span v-if="raffleMessage" class="text-xs text-neutral-500 dark:text-neutral-400">{{ raffleMessage }}</span>
            </div>
          </form>
        </div>
        <div class="w-full max-w-md rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm text-neutral-600 shadow-sm dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
          <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">Dicas rapidas</p>
          <ul class="mt-2 space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
            <li>Use "Equipes" para sortear grupos inteiros.</li>
            <li>Use "Participantes" para sortear pessoas dentro das equipes.</li>
            <li>Quando "Permitir repeticao" estiver desligado, sorteios nao repetem ganhadores.</li>
          </ul>
        </div>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        <div
          v-for="raffle in raffleStore.raffles"
          :key="raffle.id"
          class="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-neutral-900 dark:text-white">{{ raffle.name }}</h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ raffle.mode === "TEAM" ? "Equipes" : "Participantes" }} |
                {{ raffle.teamScope === "ALL" ? "Todas as equipes" : "Equipes selecionadas" }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <button
                type="button"
                class="font-semibold uppercase tracking-[0.2em] text-primary-600"
                @click="startEditRaffle(raffle)"
              >
                Editar
              </button>
              <button
                type="button"
                class="font-semibold uppercase tracking-[0.2em] text-red-500"
                @click="handleDeleteRaffle(raffle)"
              >
                Excluir
              </button>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Historico: {{ raffle.draws.length }} sorteios</span>
            <span>Repeticao: {{ raffle.allowRepeat ? "Liberada" : "Bloqueada" }}</span>
          </div>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              v-model.number="drawCounts[raffle.id]"
              type="number"
              min="1"
              class="w-24 rounded-full border border-neutral-200/70 bg-white px-3 py-2 text-sm text-neutral-700 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-neutral-900/40 dark:text-white"
            />
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="drawInProgress"
              @click="performDraw(raffle)"
            >
              {{ drawInProgress ? "Sorteando..." : "Sortear agora" }}
            </button>
          </div>
          <div v-if="raffle.draws.length" class="mt-4 space-y-3">
            <div
              v-for="draw in raffle.draws.slice(0, 3)"
              :key="draw.id"
              class="rounded-xl border border-neutral-200/60 bg-white/80 p-3 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-900/50 dark:text-neutral-300"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">Sorteio {{ formatDateTime(draw.drawnAt) }}</span>
                <span>Pool: {{ draw.poolSize }}</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="winner in draw.winners"
                  :key="winner.id"
                  class="rounded-full border border-neutral-200/60 bg-white px-3 py-1 text-xs text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <span v-if="winner.teamName">{{ winner.teamName }}</span>
                  <span v-else>{{ winner.nome ?? winner.numero }}</span>
                </span>
              </div>
            </div>
            <p v-if="raffle.draws.length > 3" class="text-xs text-neutral-400">
              +{{ raffle.draws.length - 3 }} sorteios anteriores
            </p>
          </div>
          <p v-else class="mt-4 text-xs text-neutral-400">Nenhum sorteio executado ainda.</p>
        </div>
        <div v-if="!raffleStore.raffles.length" class="rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm text-neutral-500 dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
          Nenhum sorteio criado para este evento.
        </div>
      </div>
    </BaseCard>
  </div>
  <AccessDeniedNotice v-else module="checkin" action="view" />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

import BaseCard from "../../components/ui/BaseCard.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import { useAdminStore } from "../../stores/admin";
import { useModulePermissions } from "../../composables/usePermissions";
import { useOfflineRaffleStore } from "../../stores/offline-raffle";
import type { Team, TeamMember, TeamRaffle, RaffleDraw, RaffleWinner, RaffleMode } from "../../types/raffle";
import { normalizeNumero } from "../../utils/inscritos";
import {
  getInscritoFromMemory,
  getMemoryCacheInfo,
  isMemoryCacheReady,
  loadInscritosIntoMemory
} from "../../services/inscritosMemoryCache";
import { getLocalInscrito } from "../../services/inscritosSync";

const admin = useAdminStore() as any;
const permissions = useModulePermissions("checkin");
const raffleStore = useOfflineRaffleStore();

const selectedEventId = ref<string | null>(null);
const memoryLoading = ref(false);
const memoryInfo = ref<{ count: number; loadedAt: string | null }>({ count: 0, loadedAt: null });

const teamSaving = ref(false);
const teamMessage = ref("");
const editingTeam = ref<Team | null>(null);
const teamMembers = ref<TeamMember[]>([]);

const raffleSaving = ref(false);
const raffleMessage = ref("");
const editingRaffle = ref<TeamRaffle | null>(null);
const drawInProgress = ref(false);

const teamColors = [
  { label: "Azul", value: "#3b82f6" },
  { label: "Verde", value: "#10b981" },
  { label: "Laranja", value: "#f97316" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Cinza", value: "#64748b" }
];

const teamForm = reactive({
  name: "",
  color: teamColors[0].value,
  membersText: "",
  replaceMembers: false
});

const raffleForm = reactive({
  name: "",
  mode: "TEAM" as RaffleMode,
  allowRepeat: false,
  teamScope: "ALL" as "ALL" | "SELECTED",
  teamIds: [] as string[]
});

const drawCounts = reactive<Record<string, number>>({});

const memoryLabel = computed(() => {
  if (memoryInfo.value.count === 0) return "Nao carregado";
  const time = memoryInfo.value.loadedAt ? new Date(memoryInfo.value.loadedAt).toLocaleString("pt-BR") : "";
  return `${memoryInfo.value.count} inscritos (${time})`;
});

const refreshMemoryInfo = () => {
  const info = getMemoryCacheInfo();
  memoryInfo.value = {
    count: info.count,
    loadedAt: info.loadedAt ?? null
  };
};

const handleLoadMemory = async () => {
  memoryLoading.value = true;
  try {
    await loadInscritosIntoMemory();
    refreshMemoryInfo();
  } finally {
    memoryLoading.value = false;
  }
};

const resolveMemberName = async (numero: string) => {
  const memory = getInscritoFromMemory(numero);
  if (memory?.nome) return memory.nome;
  const local = await getLocalInscrito(numero);
  return local?.nome ?? null;
};

const parseMemberNumbers = (input: string) => {
  const tokens = input.split(/[\s,;]+/).map((item) => normalizeNumero(item));
  const unique = new Set<string>();
  tokens.forEach((token) => {
    if (token) unique.add(token);
  });
  return Array.from(unique);
};

const buildMembers = async (numbers: string[]) => {
  const result: TeamMember[] = [];
  for (const numero of numbers) {
    const nome = await resolveMemberName(numero);
    result.push({ numero, nome, addedAt: new Date().toISOString() });
  }
  return result;
};

const mergeMembers = (base: TeamMember[], incoming: TeamMember[]) => {
  const map = new Map<string, TeamMember>();
  base.forEach((member) => map.set(member.numero, member));
  incoming.forEach((member) => {
    const existing = map.get(member.numero);
    if (existing) {
      map.set(member.numero, { ...existing, nome: existing.nome ?? member.nome });
    } else {
      map.set(member.numero, member);
    }
  });
  return Array.from(map.values());
};

const resetTeamForm = () => {
  teamForm.name = "";
  teamForm.color = teamColors[0].value;
  teamForm.membersText = "";
  teamForm.replaceMembers = false;
  teamMessage.value = "";
  editingTeam.value = null;
  teamMembers.value = [];
};

const startEditTeam = (team: Team) => {
  editingTeam.value = team;
  teamForm.name = team.name;
  teamForm.color = team.color;
  teamForm.membersText = "";
  teamForm.replaceMembers = false;
  teamMembers.value = [...(team.members ?? [])];
};

const removeMember = (numero: string) => {
  teamMembers.value = teamMembers.value.filter((member) => member.numero !== numero);
};

const handleSaveTeam = async () => {
  if (!selectedEventId.value) {
    teamMessage.value = "Selecione um evento.";
    return;
  }
  if (!teamForm.name.trim()) {
    teamMessage.value = "Informe o nome da equipe.";
    return;
  }
  teamSaving.value = true;
  teamMessage.value = "";
  try {
    const numbers = parseMemberNumbers(teamForm.membersText);
    const incoming = numbers.length ? await buildMembers(numbers) : [];
    const baseMembers = teamForm.replaceMembers ? [] : teamMembers.value;
    const members = mergeMembers(baseMembers, incoming);
    const payload: Team = {
      id: editingTeam.value?.id ?? "",
      eventId: selectedEventId.value,
      name: teamForm.name.trim(),
      color: teamForm.color,
      members,
      createdAt: editingTeam.value?.createdAt,
      updatedAt: editingTeam.value?.updatedAt ?? new Date().toISOString()
    };
    const saved = await raffleStore.saveTeam(payload);
    teamMessage.value = editingTeam.value ? "Equipe atualizada." : "Equipe criada.";
    startEditTeam(saved);
    teamForm.membersText = "";
  } catch (error: any) {
    teamMessage.value = error?.message ?? "Falha ao salvar equipe.";
  } finally {
    teamSaving.value = false;
  }
};

const handleDeleteTeam = async (team: Team) => {
  if (!confirm(`Excluir equipe ${team.name}?`)) return;
  await raffleStore.deleteTeam(team.id);
  if (editingTeam.value?.id === team.id) {
    resetTeamForm();
  }
};

const resetRaffleForm = () => {
  raffleForm.name = "";
  raffleForm.mode = "TEAM";
  raffleForm.allowRepeat = false;
  raffleForm.teamScope = "ALL";
  raffleForm.teamIds = [];
  raffleMessage.value = "";
  editingRaffle.value = null;
};

const startEditRaffle = (raffle: TeamRaffle) => {
  editingRaffle.value = raffle;
  raffleForm.name = raffle.name;
  raffleForm.mode = raffle.mode;
  raffleForm.allowRepeat = raffle.allowRepeat;
  raffleForm.teamScope = raffle.teamScope;
  raffleForm.teamIds = [...(raffle.teamIds ?? [])];
};

const handleSaveRaffle = async () => {
  if (!selectedEventId.value) {
    raffleMessage.value = "Selecione um evento.";
    return;
  }
  if (!raffleForm.name.trim()) {
    raffleMessage.value = "Informe o nome do sorteio.";
    return;
  }
  raffleSaving.value = true;
  raffleMessage.value = "";
  try {
    const payload: TeamRaffle = {
      id: editingRaffle.value?.id ?? "",
      eventId: selectedEventId.value,
      name: raffleForm.name.trim(),
      mode: raffleForm.mode,
      allowRepeat: raffleForm.allowRepeat,
      teamScope: raffleForm.teamScope,
      teamIds: raffleForm.teamScope === "SELECTED" ? raffleForm.teamIds : [],
      draws: editingRaffle.value?.draws ?? [],
      createdAt: editingRaffle.value?.createdAt,
      updatedAt: editingRaffle.value?.updatedAt ?? new Date().toISOString()
    };
    await raffleStore.saveRaffle(payload);
    raffleMessage.value = editingRaffle.value ? "Sorteio atualizado." : "Sorteio criado.";
    resetRaffleForm();
  } catch (error: any) {
    raffleMessage.value = error?.message ?? "Falha ao salvar sorteio.";
  } finally {
    raffleSaving.value = false;
  }
};

const handleDeleteRaffle = async (raffle: TeamRaffle) => {
  if (!confirm(`Excluir sorteio ${raffle.name}?`)) return;
  await raffleStore.deleteRaffle(raffle.id);
  if (editingRaffle.value?.id === raffle.id) {
    resetRaffleForm();
  }
};

const getTeamPool = (raffle: TeamRaffle) => {
  const teams =
    raffle.teamScope === "SELECTED"
      ? raffleStore.teams.filter((team) => raffle.teamIds.includes(team.id))
      : raffleStore.teams;
  if (!raffle.allowRepeat) {
    const used = new Set<string>();
    raffle.draws.forEach((draw) => {
      draw.winners.forEach((winner) => {
        if (winner.teamId) used.add(winner.teamId);
      });
    });
    return teams.filter((team) => !used.has(team.id));
  }
  return teams;
};

const getMemberPool = (raffle: TeamRaffle) => {
  const teams =
    raffle.teamScope === "SELECTED"
      ? raffleStore.teams.filter((team) => raffle.teamIds.includes(team.id))
      : raffleStore.teams;
  const map = new Map<string, { numero: string; nome?: string | null; team: Team }>();
  teams.forEach((team) => {
    team.members.forEach((member) => {
      if (!map.has(member.numero)) {
        map.set(member.numero, { numero: member.numero, nome: member.nome, team });
      }
    });
  });
  let list = Array.from(map.values());
  if (!raffle.allowRepeat) {
    const used = new Set<string>();
    raffle.draws.forEach((draw) => {
      draw.winners.forEach((winner) => {
        if (winner.numero) used.add(winner.numero);
      });
    });
    list = list.filter((member) => !used.has(member.numero));
  }
  return list;
};

const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const sampleWithoutReplacement = <T,>(list: T[], count: number) => {
  const copy = [...list];
  const result: T[] = [];
  while (copy.length && result.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }
  return result;
};

const resolveWinnerNames = async (winners: RaffleWinner[]) => {
  for (const winner of winners) {
    if (!winner.nome && winner.numero) {
      const resolved = await resolveMemberName(winner.numero);
      if (resolved) winner.nome = resolved;
    }
  }
};

const buildDraw = async (raffle: TeamRaffle, count: number): Promise<RaffleDraw> => {
  const drawId = crypto?.randomUUID ? crypto.randomUUID() : `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const drawnAt = new Date().toISOString();
  if (raffle.mode === "TEAM") {
    const pool = getTeamPool(raffle);
    const winnersPool = raffle.allowRepeat
      ? Array.from({ length: count }).map(() => pickRandom(pool))
      : sampleWithoutReplacement(pool, count);
    const winners: RaffleWinner[] = winnersPool.map((team) => ({
      id: `${drawId}-${team.id}`,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color
    }));
    return { id: drawId, drawnAt, mode: raffle.mode, poolSize: pool.length, winners };
  }

  const pool = getMemberPool(raffle);
  const winnersPool = raffle.allowRepeat
    ? Array.from({ length: count }).map(() => pickRandom(pool))
    : sampleWithoutReplacement(pool, count);
  const winners: RaffleWinner[] = winnersPool.map((member) => ({
    id: `${drawId}-${member.numero}`,
    numero: member.numero,
    nome: member.nome ?? null,
    teamId: member.team.id,
    teamName: member.team.name,
    teamColor: member.team.color
  }));
  await resolveWinnerNames(winners);
  return { id: drawId, drawnAt, mode: raffle.mode, poolSize: pool.length, winners };
};

const performDraw = async (raffle: TeamRaffle) => {
  if (drawInProgress.value) return;
  const count = Math.max(1, Number(drawCounts[raffle.id] ?? 1));
  const poolSize = raffle.mode === "TEAM" ? getTeamPool(raffle).length : getMemberPool(raffle).length;
  if (!poolSize) {
    alert("Pool vazio para sorteio.");
    return;
  }
  if (!raffle.allowRepeat && count > poolSize) {
    alert("Quantidade de ganhadores maior que o pool disponivel.");
    return;
  }
  drawInProgress.value = true;
  try {
    const draw = await buildDraw(raffle, count);
    const updated: TeamRaffle = {
      ...raffle,
      draws: [draw, ...(raffle.draws ?? [])]
    };
    await raffleStore.saveRaffle(updated);
  } finally {
    drawInProgress.value = false;
  }
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

watch(
  () => selectedEventId.value,
  async (eventId) => {
    await raffleStore.loadForEvent(eventId);
  }
);

onMounted(async () => {
  if (!permissions.canList.value) return;
  await admin.loadEvents();
  if (!selectedEventId.value && admin.events?.length) {
    selectedEventId.value = admin.events[0].id;
  }
  await raffleStore.loadForEvent(selectedEventId.value);
  refreshMemoryInfo();
  if (!isMemoryCacheReady()) {
    await handleLoadMemory();
  }
});
</script>
