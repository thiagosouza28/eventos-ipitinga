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
      <form @submit.prevent="submitDistrict" class="space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Nome do distrito <span class="text-red-500">*</span>
          </label>
          <input
            v-model="districtForm.name"
            type="text"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            placeholder="Nome do distrito"
          />
          <p v-if="districtError" class="text-xs text-red-500 dark:text-red-400">
            {{ districtError }}
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Nome do Pastor Distrital <span class="text-red-500">*</span>
          </label>
          <input
            v-model="districtForm.pastorName"
            type="text"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            placeholder="Nome completo do pastor distrital"
          />
        </div>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="resetDistrictForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5"
          >
            {{ editingDistrictId ? "Salvar" : "Adicionar" }}
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard
      class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Catálogo oficial
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Distritos</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Cadastre e atualize os distritos que serão disponibilizados durante as inscrições.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink
            to="/admin/dashboard"
            class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Voltar
          </RouterLink>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5"
            @click="openNewDistrictForm"
          >
            + Novo Distrito
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Distritos cadastrados
          </p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">Mapa de liderança</h2>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 sm:max-w-xs">
          Atualize nomes e pastores para manter as igrejas alinhadas ao catálogo.
        </p>
      </div>
      <div
        class="mt-6 overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/40"
      >
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="px-5 py-3">Nome</th>
              <th class="px-5 py-3">Pastor Distrital</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="district in catalog.districts"
              :key="district.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-4">
                <p class="font-semibold text-neutral-900 dark:text-white">{{ district.name }}</p>
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ district.pastorName || "Não informado" }}
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="startDistrictEdit(district)"
                  >
                    Editar
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
                    @click="confirmDeleteDistrict(district)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!catalog.districts.length">
              <td class="px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" colspan="3">
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
