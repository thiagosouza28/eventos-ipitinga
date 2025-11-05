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
                Nome do distrito <span class="text-red-500">*</span>
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
                  <th class="pb-2">Pastor Distrital</th>
                  <th class="pb-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                <tr v-for="district in catalog.districts" :key="district.id">
                  <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ district.name }}</td>
                  <td class="py-2 text-neutral-600 dark:text-neutral-400">
                    {{ district.pastorName || "—" }}
                  </td>
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
                  <td class="py-3 text-sm text-neutral-500" colspan="3">
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
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Cadastro de igrejas
            </h2>
            <p class="text-sm text-neutral-500">
              Selecione um distrito para visualizar e adicionar igrejas.
            </p>
          </div>
          <button
            v-if="!showChurchForm"
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            @click="openNewChurchForm"
          >
            + Nova Igreja
          </button>
        </div>

        <div v-if="showChurchForm" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Distrito (filtro)
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
                Nome da igreja <span class="text-red-500">*</span>
              </label>
              <input
                v-model="churchForm.name"
                type="text"
                required
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="Nome completo"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Distrito vinculado <span class="text-red-500">*</span>
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

          <div class="border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <h3 class="text-sm font-semibold text-neutral-700 dark:text-neutral-100 mb-3">
              Dados do Diretor Jovem
            </h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Nome do Diretor Jovem <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="churchForm.directorName"
                  type="text"
                  required
                  class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  CPF <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="churchForm.directorCpf"
                  type="text"
                  required
                  maxlength="14"
                  class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                  placeholder="000.000.000-00"
                  @input="formatDirectorCpf"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Data de nascimento <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="churchForm.directorBirthDate"
                  type="date"
                  required
                  class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  E-mail <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="churchForm.directorEmail"
                  type="email"
                  required
                  class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                  placeholder="email@exemplo.com"
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
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Foto de perfil 3x4
                </label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleDirectorPhotoUpload"
                  class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
                <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Formato recomendado: 3x4 (retrato)
                </p>
                <div v-if="churchForm.directorPhotoUrl" class="mt-2">
                  <img
                    :src="churchForm.directorPhotoUrl"
                    alt="Foto do diretor"
                    class="h-24 w-18 rounded object-cover border border-neutral-300 dark:border-neutral-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              @click="submitChurch"
            >
              {{ editingChurchId ? "Salvar igreja" : "Adicionar igreja" }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="resetChurchForm"
            >
              Cancelar
            </button>
          </div>

          <p v-if="churchError" class="text-xs text-red-600 dark:text-red-400">
            {{ churchError }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full table-auto text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th class="pb-2">Igreja</th>
                <th class="pb-2">Distrito</th>
                <th class="pb-2">Pastor Distrital</th>
                <th class="pb-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr v-for="church in filteredChurches" :key="church.id">
                <td class="py-2 text-neutral-700 dark:text-neutral-100">{{ church.name }}</td>
                <td class="py-2 text-sm text-neutral-500">
                  {{ findDistrictName(church.districtId) }}
                </td>
                <td class="py-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {{ findDistrictPastorName(church.districtId) || "—" }}
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
                <td class="py-3 text-sm text-neutral-500" colspan="4">
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
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";

const catalog = useCatalogStore();

const editingDistrictId = ref<string | null>(null);
const districtForm = reactive({ name: "", pastorName: "" });
const districtError = ref("");

const editingChurchId = ref<string | null>(null);
const showChurchForm = ref(false);
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

const findDistrictPastorName = (districtId: string) => {
  return catalog.districts.find((district) => district.id === districtId)?.pastorName ?? null;
};

const resetDistrictForm = () => {
  editingDistrictId.value = null;
  districtForm.name = "";
  districtForm.pastorName = "";
  districtError.value = "";
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
    // Garantir que todos os valores sejam strings primitivas
    // Usar String() para criar nova string primitiva
    const nameStr = String(name || "").trim();
    const pastorNameStr = String(pastorName || "").trim();
    
    // Criar payload com strings primitivas novas
    const payload = {
      name: String(nameStr), // Forçar nova string primitiva
      pastorName: pastorNameStr ? String(pastorNameStr) : undefined
    };
    
    // Verificar se são realmente strings primitivas antes de enviar
    if (typeof payload.name !== "string" || Object.prototype.toString.call(payload.name) !== '[object String]') {
      console.error('[FRONTEND ERROR] Nome não é string primitiva:', payload.name, typeof payload.name);
      throw new Error("Nome deve ser uma string");
    }
    
    console.log('[FRONTEND DEBUG] Enviando payload:', JSON.stringify(payload, null, 2));
    console.log('[FRONTEND DEBUG] typeof payload.name:', typeof payload.name);
    
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
  districtForm.name = String(district.name || "");
  districtForm.pastorName = String(district.pastorName || "");
  districtError.value = "";
};

const formatDirectorCpf = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value.replace(/\D/g, "");
  const formattedValue = formatCPF(rawValue);
  churchForm.directorCpf = formattedValue;
};

const handleDirectorPhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input?.files?.length) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    churchForm.directorPhotoUrl = String(loadEvent.target?.result ?? "");
  };
  reader.readAsDataURL(file);
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

  // Validação dos campos obrigatórios do Diretor Jovem
  const directorName = churchForm.directorName.trim();
  const directorCpf = normalizeCPF(churchForm.directorCpf);
  const directorBirthDate = churchForm.directorBirthDate;
  const directorEmail = churchForm.directorEmail.trim();
  const directorWhatsapp = churchForm.directorWhatsapp.trim();

  if (!directorName) {
    churchError.value = "Informe o nome do Diretor Jovem.";
    return;
  }
  if (!directorCpf || directorCpf.length !== 11 || !validateCPF(directorCpf)) {
    churchError.value = "Informe um CPF válido do Diretor Jovem.";
    return;
  }
  if (!directorBirthDate) {
    churchError.value = "Informe a data de nascimento do Diretor Jovem.";
    return;
  }
  if (!directorEmail) {
    churchError.value = "Informe o e-mail do Diretor Jovem.";
    return;
  }
  if (!directorWhatsapp) {
    churchError.value = "Informe o WhatsApp do Diretor Jovem.";
    return;
  }

  churchError.value = "";

  try {
    // Garantir que todos os valores sejam strings
    const payload = {
      name: String(name || ""),
      districtId: String(churchForm.districtId || ""),
      directorName: String(directorName || ""),
      directorCpf: String(directorCpf || ""),
      directorBirthDate: directorBirthDate ? (directorBirthDate.includes('T') ? directorBirthDate : new Date(directorBirthDate + 'T00:00:00').toISOString()) : undefined,
      directorEmail: String(directorEmail || ""),
      directorWhatsapp: String(directorWhatsapp || ""),
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
  editingChurchId.value = String(church.id || "");
  churchForm.name = String(church.name || "");
  churchForm.districtId = String(church.districtId || "");
  churchForm.directorName = String((church as any).directorName || "");
  churchForm.directorCpf = (church as any).directorCpf ? formatCPF(String((church as any).directorCpf)) : "";
  churchForm.directorBirthDate = (church as any).directorBirthDate 
    ? new Date(String((church as any).directorBirthDate)).toISOString().split('T')[0]
    : "";
  churchForm.directorEmail = String((church as any).directorEmail || "");
  churchForm.directorWhatsapp = String((church as any).directorWhatsapp || "");
  churchForm.directorPhotoUrl = String((church as any).directorPhotoUrl || "");
  selectedDistrictId.value = String(church.districtId || "");
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
