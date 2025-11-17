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
      :model-value="showMinistryModal"
      :title="editingMinistryId ? 'Editar Ministério' : 'Novo Ministério'"
      @update:modelValue="showMinistryModal = $event"
    >
      <form @submit.prevent="submitMinistry" class="space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Nome do ministério <span class="text-red-500">*</span>
          </label>
          <input
            v-model="ministryForm.name"
            type="text"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            placeholder="Pastoral, música, comunicação..."
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Descrição
          </label>
          <textarea
            v-model="ministryForm.description"
            rows="3"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            placeholder="Responsabilidades, contatos, etc."
          />
        </div>
        <label
          for="ministry-active"
          class="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-neutral-700 shadow-inner transition hover:border-primary-300 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <input
            id="ministry-active"
            v-model="ministryForm.isActive"
            type="checkbox"
            class="h-5 w-5 rounded border-neutral-300 text-primary-600 transition focus:ring-primary-500 dark:border-white/40"
          />
          Ministério ativo
        </label>
        <p v-if="ministryError" class="text-xs text-red-500 dark:text-red-400">
          {{ ministryError }}
        </p>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="resetMinistryForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5"
          >
            {{ editingMinistryId ? "Salvar" : "Adicionar" }}
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
            Rede ministerial
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Ministérios</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Cadastre os ministérios responsáveis pelos eventos e defina quais equipes estão ativas em cada ciclo.
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
            @click="openNewMinistryModal"
          >
            + Novo Ministério
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
            Ministérios cadastrados
          </p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">Rede de apoio</h2>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 sm:max-w-xs">
          Atualize nomes, descrições e status para manter o painel sempre sincronizado com a realidade das equipes.
        </p>
      </div>
      <div
        class="mt-6 overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/40"
      >
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="px-5 py-3">Nome</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Descrição</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="ministry in catalog.ministries"
              :key="ministry.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-4 font-semibold text-neutral-900 dark:text-white">
                {{ ministry.name }}
              </td>
              <td class="px-5 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em]',
                    ministry.isActive
                      ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : 'border-neutral-200/80 bg-neutral-50 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300'
                  ]"
                >
                  <span
                    :class="[
                      'h-2 w-2 rounded-full',
                      ministry.isActive ? 'bg-emerald-500' : 'bg-neutral-400'
                    ]"
                  />
                  {{ ministry.isActive ? "Ativo" : "Inativo" }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ ministry.description || "Sem descrição" }}
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="startMinistryEdit(ministry)"
                  >
                    Editar
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
                    @click="confirmDeleteMinistry(ministry)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!catalog.ministries.length">
              <td class="px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" colspan="4">
                Nenhum ministério cadastrado até o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useCatalogStore } from "../../stores/catalog";
import type { Ministry } from "../../types/api";

const catalog = useCatalogStore();

const showMinistryModal = ref(false);
const editingMinistryId = ref<string | null>(null);
const ministryForm = reactive({
  name: "",
  description: "",
  isActive: true
});
const ministryError = ref("");

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

const openNewMinistryModal = () => {
  editingMinistryId.value = null;
  ministryForm.name = "";
  ministryForm.description = "";
  ministryForm.isActive = true;
  ministryError.value = "";
  showMinistryModal.value = true;
};

const startMinistryEdit = (ministry: Ministry) => {
  editingMinistryId.value = ministry.id;
  ministryForm.name = ministry.name;
  ministryForm.description = ministry.description ?? "";
  ministryForm.isActive = ministry.isActive;
  ministryError.value = "";
  showMinistryModal.value = true;
};

const resetMinistryForm = () => {
  editingMinistryId.value = null;
  ministryForm.name = "";
  ministryForm.description = "";
  ministryForm.isActive = true;
  ministryError.value = "";
  showMinistryModal.value = false;
};

const submitMinistry = async () => {
  const name = ministryForm.name.trim();
  if (!name) {
    ministryError.value = "Informe o nome do ministério.";
    return;
  }
  ministryError.value = "";

  try {
    if (editingMinistryId.value) {
      await catalog.updateMinistry(editingMinistryId.value, {
        name,
        description: ministryForm.description.trim() || null,
        isActive: ministryForm.isActive
      });
    } else {
      await catalog.createMinistry({
        name,
        description: ministryForm.description.trim() || undefined,
        isActive: ministryForm.isActive
      });
    }
    resetMinistryForm();
  } catch (error) {
    showError(
      editingMinistryId.value ? "Falha ao atualizar ministério" : "Falha ao criar ministério",
      error
    );
  }
};

const confirmDeleteMinistry = (ministry: Ministry) => {
  confirmDelete.open = true;
  confirmDelete.title = "Excluir Ministério";
  confirmDelete.description = `Tem certeza que deseja excluir o ministério "${ministry.name}"?`;
  confirmDelete.id = ministry.id;
};

const handleConfirmDelete = async () => {
  if (!confirmDelete.id) return;
  try {
    await catalog.deleteMinistry(confirmDelete.id);
  } catch (error) {
    showError("Falha ao excluir ministério", error);
  } finally {
    confirmDelete.open = false;
    confirmDelete.id = null;
  }
};

onMounted(async () => {
  try {
    await catalog.loadMinistries();
  } catch (error) {
    showError("Falha ao carregar ministérios", error);
  }
});
</script>
