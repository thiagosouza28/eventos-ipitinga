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
      :model-value="showChurchModal"
      :title="editingChurchId ? 'Editar Igreja' : 'Nova Igreja'"
      @update:modelValue="showChurchModal = $event"
    >
      <form @submit.prevent="submitChurch" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nome da igreja <span class="text-red-500">*</span>
          </label>
          <input
            v-model="churchForm.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Distrito <span class="text-red-500">*</span>
          </label>
          <select
            v-model="churchForm.districtId"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Selecione</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
              {{ district.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nome do Diretor Jovem <span class="text-red-500">*</span>
          </label>
          <input
            v-model="churchForm.directorName"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              CPF do Diretor <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorCpf"
              type="text"
              required
              maxlength="14"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              v-maska="'###.###.###-##'"
            />
          </div>
          <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Data de nascimento <span class="text-red-500">*</span>
          </label>
          <DateField v-model="churchForm.directorBirthDate" required class="mt-1" />
        </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              E-mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorEmail"
              type="email"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              WhatsApp <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorWhatsapp"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            URL da foto (opcional)
          </label>
          <input
            v-model="churchForm.directorPhotoUrl"
            type="text"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="https://..."
          />
        </div>
        <p v-if="churchError" class="text-sm text-red-600 dark:text-red-400">
          {{ churchError }}
        </p>
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetChurchForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          >
            {{ editingChurchId ? "Salvar" : "Adicionar" }}
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Igrejas</h1>
          <p class="text-sm text-neutral-500">
            Consulte e mantenha as igrejas cadastradas para cada distrito.
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
            @click="openNewChurchForm"
          >
            + Nova Igreja
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Filtro por distrito
          </label>
          <select
            v-model="selectedDistrictId"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Todos os distritos</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
              {{ district.name }}
            </option>
          </select>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full table-auto text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th class="pb-2">Diretor (foto)</th>
                <th class="pb-2">Nome do diretor</th>
                <th class="pb-2">Igreja</th>
                <th class="pb-2">Distrito</th>
                <th class="pb-2">Pastor Distrital</th>
                <th class="pb-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr v-for="church in filteredChurches" :key="church.id">
                <td class="py-2">
                  <img
                    :src="resolvePhoto(church.directorPhotoUrl)"
                    :alt="`Foto do diretor jovem da igreja ${church.name}`"
                    class="h-12 w-12 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
                  />
                </td>
                <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ church.directorName ?? "—" }}</td>
                <td class="py-2 font-medium text-neutral-800 dark:text-neutral-50">{{ church.name }}</td>
                <td class="py-2 text-neutral-600 dark:text-neutral-300">
                  {{ findDistrictName(church.districtId) }}
                </td>
                <td class="py-2 text-neutral-600 dark:text-neutral-300">
                  {{ findDistrictPastorName(church.districtId) ?? "—" }}
                </td>
                <td class="py-2 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      class="text-sm text-primary-600 hover:underline"
                      @click="startChurchEdit(church)"
                    >
                      Editar
                    </button>
                    <button
                      class="text-sm text-red-600 hover:underline"
                      @click="confirmDeleteChurch(church)"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredChurches.length">
                <td class="py-3 text-sm text-neutral-500" colspan="6">
                  Nenhuma igreja encontrada para o filtro selecionado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import DateField from "../../components/forms/DateField.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useCatalogStore } from "../../stores/catalog";
import type { Church, District } from "../../types/api";
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";

const catalog = useCatalogStore();

const editingChurchId = ref<string | null>(null);
const showChurchModal = ref(false);
const selectedDistrictId = ref("");
const churchForm = reactive({
  name: "",
  districtId: "",
  directorName: "",
  directorCpf: "",
  directorBirthDate: "",
  directorEmail: "",
  directorWhatsapp: "",
  directorPhotoUrl: ""
});
const churchError = ref("");

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

const filteredChurches = computed(() => {
  if (!selectedDistrictId.value) return catalog.churches;
  return catalog.churches.filter((church) => church.districtId === selectedDistrictId.value);
});

const findDistrictName = (districtId: string) =>
  catalog.districts.find((district) => district.id === districtId)?.name ?? "Distrito";

const findDistrictPastorName = (districtId: string) =>
  catalog.districts.find((district) => district.id === districtId)?.pastorName ?? null;

const resolvePhoto = (url?: string | null) =>
  url && url.length ? url : DEFAULT_PHOTO_DATA_URL;

const openNewChurchForm = () => {
  editingChurchId.value = null;
  churchForm.name = "";
  churchForm.districtId = selectedDistrictId.value || "";
  churchForm.directorName = "";
  churchForm.directorCpf = "";
  churchForm.directorBirthDate = "";
  churchForm.directorEmail = "";
  churchForm.directorWhatsapp = "";
  churchForm.directorPhotoUrl = "";
  churchError.value = "";
  showChurchModal.value = true;
};

const resetChurchForm = () => {
  editingChurchId.value = null;
  churchForm.name = "";
  churchForm.districtId = selectedDistrictId.value || "";
  churchForm.directorName = "";
  churchForm.directorCpf = "";
  churchForm.directorBirthDate = "";
  churchForm.directorEmail = "";
  churchForm.directorWhatsapp = "";
  churchForm.directorPhotoUrl = "";
  churchError.value = "";
  showChurchModal.value = false;
};

const submitChurch = async () => {
  const name = churchForm.name.trim();
  const directorName = churchForm.directorName.trim();
  const directorCpf = churchForm.directorCpf.trim();
  const directorBirthDate = churchForm.directorBirthDate;
  const directorEmail = churchForm.directorEmail.trim();
  const directorWhatsapp = churchForm.directorWhatsapp.trim();

  if (!churchForm.districtId) {
    churchError.value = "Selecione um distrito.";
    return;
  }
  if (!name || !directorName || !directorCpf || !directorBirthDate || !directorEmail || !directorWhatsapp) {
    churchError.value = "Preencha todos os campos obrigatórios.";
    return;
  }
  if (!validateCPF(directorCpf)) {
    churchError.value = "CPF inválido.";
    return;
  }
  churchError.value = "";

  try {
    const payload = {
      name: String(name),
      districtId: String(churchForm.districtId),
      directorName: String(directorName),
      directorCpf: normalizeCPF(directorCpf),
      directorBirthDate: new Date(directorBirthDate + "T00:00:00").toISOString(),
      directorEmail: directorEmail,
      directorWhatsapp: directorWhatsapp,
      directorPhotoUrl: churchForm.directorPhotoUrl ? String(churchForm.directorPhotoUrl) : undefined
    };
    if (editingChurchId.value) {
      await catalog.updateChurch(editingChurchId.value, payload);
    } else {
      await catalog.createChurch(payload);
    }
    await catalog.loadChurches(selectedDistrictId.value || undefined);
    resetChurchForm();
  } catch (error) {
    showError(
      editingChurchId.value ? "Falha ao atualizar igreja" : "Falha ao criar igreja",
      error
    );
  }
};

const startChurchEdit = (church: Church) => {
  editingChurchId.value = church.id;
  churchForm.name = church.name;
  churchForm.districtId = church.districtId;
  churchForm.directorName = (church as any).directorName ?? "";
  churchForm.directorCpf = (church as any).directorCpf ? formatCPF(String((church as any).directorCpf)) : "";
  churchForm.directorBirthDate = (church as any).directorBirthDate
    ? new Date(String((church as any).directorBirthDate)).toISOString().split("T")[0]
    : "";
  churchForm.directorEmail = (church as any).directorEmail ?? "";
  churchForm.directorWhatsapp = (church as any).directorWhatsapp ?? "";
  churchForm.directorPhotoUrl = (church as any).directorPhotoUrl ?? "";
  selectedDistrictId.value = church.districtId;
  churchError.value = "";
  showChurchModal.value = true;
};

const confirmDeleteChurch = (church: Church) => {
  confirmDelete.open = true;
  confirmDelete.title = "Excluir Igreja";
  confirmDelete.description = `Tem certeza que deseja excluir a igreja "${church.name}"? Esta ação não pode ser desfeita.`;
  confirmDelete.id = church.id;
};

const handleConfirmDelete = async () => {
  if (!confirmDelete.id) return;
  try {
    await catalog.deleteChurch(confirmDelete.id);
    confirmDelete.open = false;
    confirmDelete.id = null;
  } catch (error) {
    showError("Falha ao excluir igreja", error);
  }
};

watch(selectedDistrictId, () => {
  if (!editingChurchId.value) {
    churchForm.districtId = selectedDistrictId.value || "";
  }
});

onMounted(async () => {
  try {
    await Promise.all([catalog.loadDistricts(), catalog.loadChurches()]);
    if (catalog.districts.length) {
      selectedDistrictId.value = catalog.districts[0].id;
      churchForm.districtId = selectedDistrictId.value;
    }
  } catch (error) {
    showError("Falha ao carregar distritos ou igrejas", error);
  }
});
</script>
