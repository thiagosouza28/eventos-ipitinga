<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />
    <ConfirmDialog
      :model-value="confirmDelete.open"
      :title="confirmDelete.title"
      :description="confirmDelete.description"
      type="danger"
      confirm-label="Excluir"
      cancel-label="Cancelar"
      @confirm="handleConfirmDelete"
      @cancel="confirmDelete.open = false"
    />
    <Modal
      :model-value="showDistrictModal"
      :title="editingDistrictId ? 'Editar Distrito' : 'Novo Distrito'"
      @update:modelValue="showDistrictModal = $event"
    >
      <form @submit.prevent="submitDistrict" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nome do distrito <span class="text-red-500">*</span>
          </label>
          <input
            v-model="districtForm.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Nome do distrito"
          />
          <p v-if="districtError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ districtError }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nome do Pastor Distrital <span class="text-red-500">*</span>
          </label>
          <input
            v-model="districtForm.pastorName"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Nome completo do pastor distrital"
          />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetDistrictForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            {{ editingDistrictId ? "Salvar" : "Adicionar" }}
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Distritos</h1>
          <p class="text-sm text-neutral-500">
            Cadastre e atualize os distritos que serão disponibilizados durante as inscrições.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            to="/admin/dashboard"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Voltar
          </RouterLink>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            @click="openNewDistrictForm"
          >
            + Novo Distrito
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Nome</th>
              <th class="pb-2">Pastor Distrital</th>
              <th class="pb-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="district in catalog.districts" :key="district.id">
              <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ district.name }}</td>
              <td class="py-2 text-neutral-600 dark:text-neutral-400">
                {{ district.pastorName || "—" }}
              </td>
              <td class="py-2 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button
                    class="text-sm text-primary-600 hover:underline"
                    @click="startDistrictEdit(district)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-sm text-red-600 hover:underline"
                    @click="confirmDeleteDistrict(district)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!catalog.districts.length">
              <td class="py-3 text-sm text-neutral-500" colspan="3">
                Nenhum distrito cadastrado até o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useCatalogStore } from "../../stores/catalog";
import type { District } from "../../types/api";

const catalog = useCatalogStore();

const editingDistrictId = ref<string | null>(null);
const showDistrictModal = ref(false);
const districtForm = reactive({ name: "", pastorName: "" });
const districtError = ref("");

const errorDialog = reactive({
  open: false,
  title: "Ocorreu um erro",
  message: "",
  details: ""
});

const confirmDelete = reactive({
  open: false,
  title: "",
  description: "",
  id: "" as string | null
});

const extractErrorInfo = (error: unknown) => {
  const anyError = error as {
    response?: { data?: { message?: string; details?: unknown } };
    message?: string;
  };
  const responseData = anyError?.response?.data ?? {};
  const message =
    (typeof responseData.message === "string" && responseData.message) ||
    anyError?.message ||
    "Ocorreu um erro inesperado.";
  const rawDetails = responseData?.details;
  const details =
    typeof rawDetails === "string"
      ? rawDetails
      : rawDetails
      ? JSON.stringify(rawDetails, null, 2)
      : "";
  return { message, details };
};

const showError = (title: string, error: unknown) => {
  const { message, details } = extractErrorInfo(error);
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = details;
  errorDialog.open = true;
};

const openNewDistrictForm = () => {
  editingDistrictId.value = null;
  districtForm.name = "";
  districtForm.pastorName = "";
  districtError.value = "";
  showDistrictModal.value = true;
};

const resetDistrictForm = () => {
  editingDistrictId.value = null;
  districtForm.name = "";
  districtForm.pastorName = "";
  districtError.value = "";
  showDistrictModal.value = false;
};

const submitDistrict = async () => {
  const name = districtForm.name.trim();
  const pastorName = districtForm.pastorName.trim();

  if (!name) {
    districtError.value = "Informe um nome para o distrito.";
    return;
  }
  if (!pastorName) {
    districtError.value = "Informe o nome do pastor distrital.";
    return;
  }
  districtError.value = "";

  try {
    const payload = {
      name: String(name),
      pastorName: String(pastorName)
    };
    if (editingDistrictId.value) {
      await catalog.updateDistrict(editingDistrictId.value, payload);
    } else {
      await catalog.createDistrict(payload);
    }
    resetDistrictForm();
  } catch (error) {
    showError(
      editingDistrictId.value ? "Falha ao atualizar distrito" : "Falha ao criar distrito",
      error
    );
  }
};

const startDistrictEdit = (district: District) => {
  editingDistrictId.value = district.id;
  districtForm.name = district.name;
  districtForm.pastorName = district.pastorName ?? "";
  districtError.value = "";
  showDistrictModal.value = true;
};

const confirmDeleteDistrict = (district: District) => {
  confirmDelete.open = true;
  confirmDelete.title = "Excluir Distrito";
  confirmDelete.description = `Tem certeza que deseja excluir o distrito "${district.name}"? Esta ação não pode ser desfeita.`;
  confirmDelete.id = district.id;
};

const handleConfirmDelete = async () => {
  if (!confirmDelete.id) return;
  try {
    await catalog.deleteDistrict(confirmDelete.id);
    confirmDelete.open = false;
    confirmDelete.id = null;
  } catch (error) {
    showError("Falha ao excluir distrito", error);
  }
};

onMounted(async () => {
  try {
    await catalog.loadDistricts();
  } catch (error) {
    showError("Falha ao carregar distritos", error);
  }
});
</script>
