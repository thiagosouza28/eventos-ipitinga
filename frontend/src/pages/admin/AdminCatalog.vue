<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />
    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Distritos e igrejas
          </h1>
          <p class="text-sm text-neutral-500">
            Cadastre distritos e mantenha a lista de igrejas vinculadas.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Voltar
        </RouterLink>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="grid gap-6 md:grid-cols-2">
        <section class="space-y-4">
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Cadastro de distritos
          </h2>
          <form @submit.prevent="submitDistrict" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Nome do distrito
              </label>
              <input
                v-model="districtForm.name"
                type="text"
                required
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p v-if="districtError" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ districtError }}
              </p>
            </div>
            <div class="flex gap-3">
              <button
                type="submit"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                {{ editingDistrictId ? "Salvar" : "Adicionar" }}
              </button>
              <button
                v-if="editingDistrictId"
                type="button"
                class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
                @click="resetDistrictForm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Distritos cadastrados
          </h2>
          <div class="mt-3 overflow-x-auto">
            <table class="w-full table-auto text-left text-sm">
              <thead class="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th class="pb-2">Nome</th>
                  <th class="pb-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                <tr v-for="district in catalog.districts" :key="district.id">
                  <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ district.name }}</td>
                  <td class="py-2 text-right">
                    <button
                      class="text-sm text-primary-600 hover:underline"
                      @click="startDistrictEdit(district)"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
                <tr v-if="!catalog.districts.length">
                  <td class="py-3 text-sm text-neutral-500" colspan="2">
                    Nenhum distrito cadastrado ate o momento.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Cadastro de igrejas
          </h2>
          <p class="text-sm text-neutral-500">
            Selecione um distrito para visualizar e adicionar igrejas.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Distrito
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
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Nome da igreja
            </label>
            <input
              v-model="churchForm.name"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Nome completo"
            />
            <p v-if="churchError" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ churchError }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <label class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span>Distrito vinculado</span>
            <select
              v-model="churchForm.districtId"
              class="rounded-lg border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </label>

          <div class="flex gap-3">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              @click="submitChurch"
            >
              {{ editingChurchId ? "Salvar igreja" : "Adicionar igreja" }}
            </button>
            <button
              v-if="editingChurchId"
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="resetChurchForm"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full table-auto text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th class="pb-2">Igreja</th>
                <th class="pb-2">Distrito</th>
                <th class="pb-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr v-for="church in filteredChurches" :key="church.id">
                <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ church.name }}</td>
                <td class="py-2 text-sm text-neutral-500">
                  {{ findDistrictName(church.districtId) }}
                </td>
                <td class="py-2 text-right">
                  <button
                    class="text-sm text-primary-600 hover:underline"
                    @click="startChurchEdit(church)"
                  >
                    Editar
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredChurches.length">
                <td class="py-3 text-sm text-neutral-500" colspan="3">
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

import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { useCatalogStore } from "../../stores/catalog";
import type { Church, District } from "../../types/api";

const catalog = useCatalogStore();

const editingDistrictId = ref<string | null>(null);
const districtForm = reactive({ name: "" });
const districtError = ref("");

const editingChurchId = ref<string | null>(null);
const churchForm = reactive({
  name: "",
  districtId: ""
});
const churchError = ref("");
const selectedDistrictId = ref("");

const errorDialog = reactive({
  open: false,
  title: "Ocorreu um erro",
  message: "",
  details: ""
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
  let details = "";
  const rawDetails = responseData?.details;
  if (rawDetails) {
    details =
      typeof rawDetails === "string" ? rawDetails : JSON.stringify(rawDetails, null, 2);
  }
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

const findDistrictName = (districtId: string) => {
  return catalog.districts.find((district) => district.id === districtId)?.name ?? "Distrito";
};

const resetDistrictForm = () => {
  editingDistrictId.value = null;
  districtForm.name = "";
  districtError.value = "";
};

const submitDistrict = async () => {
  const name = districtForm.name.trim();
  if (!name) {
    districtError.value = "Informe um nome para o distrito.";
    return;
  }
  districtError.value = "";

  try {
    if (editingDistrictId.value) {
      await catalog.updateDistrict(editingDistrictId.value, name);
    } else {
      await catalog.createDistrict(name);
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
  districtError.value = "";
};

const resetChurchForm = () => {
  editingChurchId.value = null;
  churchForm.name = "";
  churchForm.districtId = selectedDistrictId.value || "";
  churchError.value = "";
};

const submitChurch = async () => {
  const name = churchForm.name.trim();
  if (!name) {
    churchError.value = "Informe o nome da igreja.";
    return;
  }
  if (!churchForm.districtId) {
    churchError.value = "Selecione o distrito da igreja.";
    return;
  }
  churchError.value = "";

  try {
    if (editingChurchId.value) {
      await catalog.updateChurch(editingChurchId.value, {
        name,
        districtId: churchForm.districtId
      });
    } else {
      await catalog.createChurch({
        name,
        districtId: churchForm.districtId
      });
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
  selectedDistrictId.value = church.districtId;
  churchError.value = "";
};

watch(selectedDistrictId, () => {
  if (!editingChurchId.value) {
    churchForm.districtId = selectedDistrictId.value || "";
  }
});

onMounted(async () => {
  try {
    await catalog.loadDistricts();
    await catalog.loadChurches();
    if (catalog.districts.length) {
      selectedDistrictId.value = catalog.districts[0].id;
      churchForm.districtId = selectedDistrictId.value;
    }
  } catch (error) {
    showError("Falha ao carregar distritos ou igrejas", error);
  }
});
</script>
