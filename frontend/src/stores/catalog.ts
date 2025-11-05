import { defineStore } from "pinia";
import { ref } from "vue";

import { useApi } from "../composables/useApi";
import type { District, Church } from "../types/api";

export const useCatalogStore = defineStore("catalog", () => {
  const { api } = useApi();
  const districts = ref<District[]>([]);
  const churches = ref<Church[]>([]);
  const lastChurchFilter = ref<string | undefined>(undefined);

  const loadDistricts = async () => {
    const response = await api.get("/catalog/districts");
    // Normalizar os dados para garantir que sejam strings
    districts.value = (response.data || []).map((d: any) => {
      // Extrair name - pode ser objeto ou string
      let nameStr: string;
      if (typeof d.name === "string") {
        nameStr = d.name;
      } else if (d.name && typeof d.name === "object") {
        // Se for objeto, tentar extrair valor
        if ("value" in d.name) {
          nameStr = String(d.name.value);
        } else if ("name" in d.name) {
          nameStr = String(d.name.name);
        } else {
          // Tentar pegar o primeiro valor string do objeto
          const values = Object.values(d.name);
          const firstString = values.find(v => typeof v === "string");
          nameStr = firstString ? String(firstString) : JSON.stringify(d.name);
        }
      } else {
        nameStr = String(d.name || "");
      }
      
      // Extrair pastorName
      let pastorNameStr: string | null = null;
      if (d.pastorName) {
        if (typeof d.pastorName === "string") {
          pastorNameStr = d.pastorName;
        } else if (d.pastorName && typeof d.pastorName === "object") {
          if ("value" in d.pastorName) {
            pastorNameStr = String(d.pastorName.value);
          } else if ("pastorName" in d.pastorName) {
            pastorNameStr = String(d.pastorName.pastorName);
          } else {
            const values = Object.values(d.pastorName);
            const firstString = values.find(v => typeof v === "string");
            pastorNameStr = firstString ? String(firstString) : null;
          }
        } else {
          pastorNameStr = String(d.pastorName);
        }
      }
      
      return {
        id: String(d.id || ""),
        name: nameStr,
        pastorName: pastorNameStr,
        createdAt: d.createdAt
      };
    });
  };

  const loadChurches = async (districtId?: string) => {
    lastChurchFilter.value = districtId;
    const response = await api.get("/catalog/churches", {
      params: districtId ? { districtId } : undefined
    });
    // Normalizar os dados para garantir que sejam strings
    churches.value = (response.data || []).map((c: any) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      districtId: String(c.districtId || ""),
      directorName: c.directorName ? String(c.directorName) : null,
      directorCpf: c.directorCpf ? String(c.directorCpf) : null,
      directorBirthDate: c.directorBirthDate || null,
      directorEmail: c.directorEmail ? String(c.directorEmail) : null,
      directorWhatsapp: c.directorWhatsapp ? String(c.directorWhatsapp) : null,
      directorPhotoUrl: c.directorPhotoUrl ? String(c.directorPhotoUrl) : null,
      createdAt: c.createdAt,
      district: c.district ? {
        id: String(c.district.id || ""),
        name: String(c.district.name || ""),
        pastorName: c.district.pastorName ? String(c.district.pastorName) : null,
        createdAt: c.district.createdAt
      } : null
    }));
  };

  const refreshChurches = async () => {
    await loadChurches(lastChurchFilter.value);
  };

  const createDistrict = async (data: { name: string; pastorName?: string }) => {
    // Garantir que os dados sejam strings primitivas
    const payload = {
      name: String(data.name),
      ...(data.pastorName ? { pastorName: String(data.pastorName) } : {})
    };
    console.log('[STORE DEBUG] createDistrict payload:', JSON.stringify(payload, null, 2));
    await api.post("/admin/districts", payload);
    await loadDistricts();
  };

  const updateDistrict = async (id: string, data: { name?: string; pastorName?: string }) => {
    // Garantir que os dados sejam strings primitivas
    const payload: { name?: string; pastorName?: string } = {};
    if (data.name !== undefined) {
      payload.name = String(data.name);
    }
    if (data.pastorName !== undefined) {
      payload.pastorName = data.pastorName ? String(data.pastorName) : undefined;
    }
    console.log('[STORE DEBUG] updateDistrict payload:', JSON.stringify(payload, null, 2));
    await api.patch(`/admin/districts/${id}`, payload);
    await loadDistricts();
  };

  const createChurch = async (payload: {
    name: string;
    districtId: string;
    directorName?: string;
    directorCpf?: string;
    directorBirthDate?: string;
    directorEmail?: string;
    directorWhatsapp?: string;
    directorPhotoUrl?: string;
  }) => {
    await api.post("/admin/churches", payload);
    if (payload.districtId !== lastChurchFilter.value) {
      await loadChurches(payload.districtId);
    } else {
      await refreshChurches();
    }
  };

  const updateChurch = async (
    id: string,
    payload: {
      name?: string;
      districtId?: string;
      directorName?: string;
      directorCpf?: string;
      directorBirthDate?: string;
      directorEmail?: string;
      directorWhatsapp?: string;
      directorPhotoUrl?: string;
    }
  ) => {
    await api.patch(`/admin/churches/${id}`, payload);
    if (payload.districtId && payload.districtId !== lastChurchFilter.value) {
      await loadChurches(payload.districtId);
    } else {
      await refreshChurches();
    }
  };

  return {
    districts,
    churches,
    loadDistricts,
    loadChurches,
    createDistrict,
    updateDistrict,
    createChurch,
    updateChurch
  };
});
