import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { Team, TeamRaffle } from "../types/raffle";
import type { OfflineEventEntityType } from "../types/offline";
import {
  deleteEventEntity,
  listEventEntities,
  upsertEventEntity
} from "../services/offlineEventData";

const nowIso = () => new Date().toISOString();

const ensureTimestamps = <T extends { createdAt?: string; updatedAt?: string }>(input: T) => {
  const createdAt = input.createdAt ?? nowIso();
  return {
    ...input,
    createdAt,
    updatedAt: nowIso()
  };
};

const entityTypeMap: Record<"teams" | "raffles", OfflineEventEntityType> = {
  teams: "teams",
  raffles: "raffles"
};

export const useOfflineRaffleStore = defineStore("offline-raffle", () => {
  const teams = ref<Team[]>([]);
  const raffles = ref<TeamRaffle[]>([]);
  const loading = ref(false);
  const error = ref("");

  const hasTeams = computed(() => teams.value.length > 0);
  const hasRaffles = computed(() => raffles.value.length > 0);

  const loadTeams = async (eventId?: string | null) => {
    const list = await listEventEntities<Team>(entityTypeMap.teams, { eventId });
    teams.value = list.map((team) => ({
      ...team,
      members: Array.isArray(team.members) ? team.members : []
    }));
    return teams.value;
  };

  const loadRaffles = async (eventId?: string | null) => {
    const list = await listEventEntities<TeamRaffle>(entityTypeMap.raffles, { eventId });
    raffles.value = list.map((raffle) => ({
      ...raffle,
      draws: Array.isArray(raffle.draws) ? raffle.draws : []
    }));
    return raffles.value;
  };

  const loadForEvent = async (eventId?: string | null) => {
    loading.value = true;
    error.value = "";
    try {
      await Promise.all([loadTeams(eventId), loadRaffles(eventId)]);
    } catch (err: any) {
      error.value = err?.message ?? "Falha ao carregar dados locais.";
    } finally {
      loading.value = false;
    }
  };

  const saveTeam = async (input: Team) => {
    const payload = ensureTimestamps(input);
    const saved = (await upsertEventEntity("teams", payload)) as Team;
    const index = teams.value.findIndex((team) => team.id === saved.id);
    if (index >= 0) {
      teams.value = [...teams.value.slice(0, index), saved, ...teams.value.slice(index + 1)];
    } else {
      teams.value = [saved, ...teams.value];
    }
    return saved;
  };

  const deleteTeam = async (teamId: string) => {
    await deleteEventEntity("teams", teamId);
    teams.value = teams.value.filter((team) => team.id !== teamId);
  };

  const saveRaffle = async (input: TeamRaffle) => {
    const payload = ensureTimestamps(input);
    const saved = (await upsertEventEntity("raffles", payload)) as TeamRaffle;
    const index = raffles.value.findIndex((raffle) => raffle.id === saved.id);
    if (index >= 0) {
      raffles.value = [...raffles.value.slice(0, index), saved, ...raffles.value.slice(index + 1)];
    } else {
      raffles.value = [saved, ...raffles.value];
    }
    return saved;
  };

  const deleteRaffle = async (raffleId: string) => {
    await deleteEventEntity("raffles", raffleId);
    raffles.value = raffles.value.filter((raffle) => raffle.id !== raffleId);
  };

  return {
    teams,
    raffles,
    loading,
    error,
    hasTeams,
    hasRaffles,
    loadTeams,
    loadRaffles,
    loadForEvent,
    saveTeam,
    deleteTeam,
    saveRaffle,
    deleteRaffle
  };
});
