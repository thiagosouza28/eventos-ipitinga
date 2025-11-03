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
    districts.value = response.data;
  };

  const loadChurches = async (districtId?: string) => {
    lastChurchFilter.value = districtId;
    const response = await api.get("/catalog/churches", {
      params: districtId ? { districtId } : undefined
    });
    churches.value = response.data;
  };

  const refreshChurches = async () => {
    await loadChurches(lastChurchFilter.value);
  };

  const createDistrict = async (name: string) => {
    await api.post("/admin/districts", { name });
    await loadDistricts();
  };

  const updateDistrict = async (id: string, name: string) => {
    await api.patch(`/admin/districts/${id}`, { name });
    await loadDistricts();
  };

  const createChurch = async (payload: { name: string; districtId: string }) => {
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
