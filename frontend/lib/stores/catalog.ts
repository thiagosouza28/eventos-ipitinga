import { create } from "zustand";

import { useApi } from "@/lib/api/client";
import type { Church, ChurchDirectorMatch, District, Ministry } from "@/types/api";
import { normalizeCPF } from "@/lib/utils/cpf";

type CatalogState = {
  districts: District[];
  churches: Church[];
  ministries: Ministry[];
  lastChurchFilter?: string;
  loadDistricts: () => Promise<void>;
  loadChurches: (districtId?: string) => Promise<void>;
  refreshChurches: () => Promise<void>;
  loadMinistries: () => Promise<void>;
  findChurchByDirectorCpf: (cpf: string) => Promise<ChurchDirectorMatch | null>;
};

const ensureArray = <T,>(input: unknown, fallbackKeys: string[] = []): T[] => {
  if (Array.isArray(input)) {
    return input as T[];
  }
  if (input && typeof input === "object") {
    for (const key of fallbackKeys) {
      const value = (input as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }
  return [];
};

export const useCatalogStore = create<CatalogState>((set, get) => ({
  districts: [],
  churches: [],
  ministries: [],
  lastChurchFilter: undefined,
  loadDistricts: async () => {
    const { api } = useApi();
    const response = await api.get("/catalog/districts");
    const districts = (response.data || []).map((d: any) => ({
      id: String(d.id || ""),
      name: typeof d.name === "string" ? d.name : String(d.name ?? ""),
      pastorName: d.pastorName ? String(d.pastorName) : null
    }));
    set({ districts });
  },
  loadChurches: async (districtId?: string) => {
    const { api } = useApi();
    const response = await api.get("/catalog/churches", {
      params: districtId ? { districtId } : undefined
    });
    const churches = (response.data || []).map((c: any) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      districtId: String(c.districtId || ""),
      directorName: c.directorName ? String(c.directorName) : null,
      directorCpf: c.directorCpf ? String(c.directorCpf) : null,
      directorBirthDate: c.directorBirthDate || null,
      directorEmail: c.directorEmail ? String(c.directorEmail) : null,
      directorWhatsapp: c.directorWhatsapp ? String(c.directorWhatsapp) : null,
      directorPhotoUrl: c.directorPhotoUrl ? String(c.directorPhotoUrl) : null
    }));
    set({ churches, lastChurchFilter: districtId });
  },
  refreshChurches: async () => {
    const { lastChurchFilter } = get();
    await get().loadChurches(lastChurchFilter);
  },
  loadMinistries: async () => {
    const { api } = useApi();
    const response = await api.get("/catalog/ministries");
    const data = ensureArray<Ministry>(response.data, ["ministries", "data"]);
    const ministries = data.map((m: any) => ({
      id: String(m.id || ""),
      name: String(m.name || ""),
      description: m.description ? String(m.description) : null,
      isActive: Boolean(m.isActive)
    }));
    set({ ministries });
  },
  findChurchByDirectorCpf: async (cpf: string) => {
    const { api } = useApi();
    const digits = normalizeCPF(cpf);
    if (!digits) return null;
    try {
      const response = await api.get("/catalog/churches/director", { params: { cpf: digits } });
      return response.data as ChurchDirectorMatch;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }
}));
