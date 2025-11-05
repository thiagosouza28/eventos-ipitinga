import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "../composables/useApi";
export const useCatalogStore = defineStore("catalog", () => {
    const { api } = useApi();
    const districts = ref([]);
    const churches = ref([]);
    const lastChurchFilter = ref(undefined);
    const loadDistricts = async () => {
        const response = await api.get("/catalog/districts");
        districts.value = response.data;
    };
    const loadChurches = async (districtId) => {
        lastChurchFilter.value = districtId;
        const response = await api.get("/catalog/churches", {
            params: districtId ? { districtId } : undefined
        });
        churches.value = response.data;
    };
    const refreshChurches = async () => {
        await loadChurches(lastChurchFilter.value);
    };
    const createDistrict = async (name) => {
        await api.post("/admin/districts", { name });
        await loadDistricts();
    };
    const updateDistrict = async (id, name) => {
        await api.patch(`/admin/districts/${id}`, { name });
        await loadDistricts();
    };
    const createChurch = async (payload) => {
        await api.post("/admin/churches", payload);
        if (payload.districtId !== lastChurchFilter.value) {
            await loadChurches(payload.districtId);
        }
        else {
            await refreshChurches();
        }
    };
    const updateChurch = async (id, payload) => {
        await api.patch(`/admin/churches/${id}`, payload);
        if (payload.districtId && payload.districtId !== lastChurchFilter.value) {
            await loadChurches(payload.districtId);
        }
        else {
            await refreshChurches();
        }
    };
    const deleteDistrict = async (id) => {
        await api.delete(`/admin/districts/${id}`);
        await loadDistricts();
    };
    const deleteChurch = async (id) => {
        await api.delete(`/admin/churches/${id}`);
        await refreshChurches();
    };
    return {
        districts,
        churches,
        loadDistricts,
        loadChurches,
        createDistrict,
        updateDistrict,
        deleteDistrict,
        createChurch,
        updateChurch,
        deleteChurch
    };
});
//# sourceMappingURL=catalog.js.map