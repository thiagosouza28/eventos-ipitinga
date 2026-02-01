import type { OfflineEventEntity } from "./offline";

export type TeamMember = {
  numero: string;
  nome?: string | null;
  addedAt: string;
};

export type Team = OfflineEventEntity & {
  name: string;
  color: string;
  members: TeamMember[];
};

export type RaffleMode = "TEAM" | "MEMBER";
export type RaffleScope = "ALL" | "SELECTED";

export type RaffleWinner = {
  id: string;
  numero?: string | null;
  nome?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
};

export type RaffleDraw = {
  id: string;
  drawnAt: string;
  mode: RaffleMode;
  poolSize: number;
  winners: RaffleWinner[];
};

export type TeamRaffle = OfflineEventEntity & {
  name: string;
  mode: RaffleMode;
  allowRepeat: boolean;
  teamScope: RaffleScope;
  teamIds: string[];
  draws: RaffleDraw[];
};
