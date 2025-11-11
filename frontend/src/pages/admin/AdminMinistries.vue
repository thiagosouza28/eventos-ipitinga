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
      <form @submit.prevent="submitMinistry" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nome do ministério <span class="text-red-500">*</span>
          </label>
          <input
            v-model="ministryForm.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Descrição
          </label>
          <textarea
            v-model="ministryForm.description"
            rows="3"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Responsabilidades, contatos, etc."
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            id="ministry-active"
            v-model="ministryForm.isActive"
            type="checkbox"
            class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600"
          />
          <label for="ministry-active" class="text-sm text-neutral-600 dark:text-neutral-300">
            Ministério ativo
          </label>
        </div>
        <p v-if="ministryError" class="text-sm text-red-600 dark:text-red-400">
          {{ ministryError }}
        </p>
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetMinistryForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            {{ editingMinistryId ? "Salvar" : "Adicionar" }}
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Ministérios</h1>
          <p class="text-sm text-neutral-500">
            Cadastre os ministérios responsáveis pelos eventos e defina quais estão ativos.
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
            @click="openNewMinistryModal"
          >
            + Novo Ministério
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
              <th class="pb-2">Status</th>
              <th class="pb-2">Descrição</th>
              <th class="pb-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="ministry in catalog.ministries" :key="ministry.id">
              <td class="py-2 font-medium text-neutral-800 dark:text-neutral-100">{{ ministry.name }}</td>
              <td class="py-2">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                    ministry.isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'
                  ]"
                >
                  {{ ministry.isActive ? "Ativo" : "Inativo" }}
                </span>
              </td>
              <td class="py-2 text-neutral-600 dark:text-neutral-400">
                {{ ministry.description || "Sem descrição" }}
              </td>
              <td class="py-2 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button
                    class="text-sm text-primary-600 hover:underline"
                    @click="startMinistryEdit(ministry)"
                  >
                    Editar
                  </button>
                  <button
                    class="text-sm text-red-600 hover:underline"
                    @click="confirmDeleteMinistry(ministry)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!catalog.ministries.length">
              <td class="py-3 text-sm text-neutral-500" colspan="4">
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
