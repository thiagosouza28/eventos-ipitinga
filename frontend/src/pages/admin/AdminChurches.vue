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
      <form @submit.prevent="submitChurch" class="space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Nome da igreja <span class="text-red-500">*</span>
          </label>
          <input
            v-model="churchForm.name"
            type="text"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Distrito <span class="text-red-500">*</span>
          </label>
          <select
            v-model="churchForm.districtId"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">Selecione</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
              {{ district.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Nome do Diretor Jovem <span class="text-red-500">*</span>
          </label>
          <input
            v-model="churchForm.directorName"
            type="text"
            required
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
              CPF do Diretor <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorCpf"
              type="text"
              required
              maxlength="14"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              v-maska="{ mask: '###.###.###-##' }"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
              Data de nascimento <span class="text-red-500">*</span>
            </label>
            <DateField
              v-model="churchForm.directorBirthDate"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
              E-mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorEmail"
              type="email"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
              WhatsApp <span class="text-red-500">*</span>
            </label>
            <input
              v-model="churchForm.directorWhatsapp"
              type="text"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
        </div>
        <div class="space-y-3">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
            Foto do diretor (opcional)
          </label>
          <input
            ref="directorPhotoInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onDirectorPhotoChange"
          />
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              @click="selectDirectorPhoto"
              :disabled="directorPhotoUploading"
            >
              {{
                directorPhotoUploading
                  ? "Enviando..."
                  : churchForm.directorPhotoUrl
                  ? "Trocar foto"
                  : "Selecionar imagem"
              }}
            </button>
            <button
              v-if="churchForm.directorPhotoUrl && !directorPhotoUploading"
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-red-200/70 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
              @click="removeDirectorPhoto"
            >
              Remover
            </button>
            <span
              v-if="churchForm.directorPhotoUrl"
              class="text-xs text-neutral-600 dark:text-neutral-300 break-all"
            >
              {{ churchForm.directorPhotoUrl }}
            </span>
          </div>
          <div
            class="flex items-center gap-4 rounded-2xl border border-dashed border-neutral-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <img
              :src="resolvePhoto(churchForm.directorPhotoUrl)"
              alt="Pré-visualização da foto do diretor"
              class="h-16 w-16 rounded-full border border-white/70 object-cover dark:border-white/20"
            />
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              A imagem será exibida na listagem das igrejas. Prefira arquivos quadrados (até 5 MB).
            </p>
          </div>
        </div>
        <p v-if="churchError" class="text-sm text-red-500 dark:text-red-400">
          {{ churchError }}
        </p>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="resetChurchForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5"
          >
            {{ editingChurchId ? "Salvar" : "Adicionar" }}
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
            Mapa congregacional
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Igrejas</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Consulte e mantenha as igrejas cadastradas para cada distrito.
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
            @click="openNewChurchForm"
          >
            + Nova Igreja
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full space-y-2 sm:max-w-xs">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Filtro por distrito
          </p>
          <div ref="districtDropdownRef" class="relative w-full">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-left text-sm text-neutral-900 shadow-inner transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-primary-900/40"
              :aria-expanded="districtDropdownOpen"
              @click.stop="toggleDistrictDropdown"
            >
              <span class="truncate">{{ selectedDistrictLabel }}</span>
              <svg
                class="ml-3 h-4 w-4 text-neutral-500 transition-transform duration-200"
                :class="{ 'rotate-180': districtDropdownOpen }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="districtDropdownOpen"
                class="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-neutral-200/80 bg-white/95 p-2 text-sm shadow-2xl shadow-neutral-200/60 ring-1 ring-black/5 dark:border-white/10 dark:bg-neutral-900/95 dark:text-neutral-100 dark:shadow-black/50"
              >
                <div class="custom-scroll max-h-60 overflow-y-auto pr-1">
                  <button
                    v-for="option in districtOptions"
                    :key="option.id || 'all-districts'"
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-neutral-700 transition hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-100 dark:hover:bg-primary-500/10"
                    :class="{
                      'bg-primary-600/10 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100':
                        selectedDistrictId === option.id
                    }"
                    @click.stop="selectDistrict(option.id)"
                  >
                    <span class="truncate">{{ option.name }}</span>
                    <svg
                      v-if="selectedDistrictId === option.id"
                      class="ml-2 h-4 w-4 text-primary-600 dark:text-primary-200"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 sm:max-w-sm">
          Visualize rapidamente os diretores de juventude associados a cada igreja e distrito.
        </p>
      </div>

      <div
        class="mt-6 hidden overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/40 md:block"
      >
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="px-5 py-3">Diretor (foto)</th>
              <th class="px-5 py-3">Nome do diretor</th>
              <th class="px-5 py-3">CPF</th>
              <th class="px-5 py-3">Telefone</th>
              <th class="px-5 py-3">Igreja</th>
              <th class="px-5 py-3">Distrito</th>
              <th class="px-5 py-3">Pastor Distrital</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="church in filteredChurches"
              :key="church.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-4">
                <div
                  class="h-12 w-12 overflow-hidden rounded-full border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10"
                >
                  <img
                    :src="resolvePhoto(church.directorPhotoUrl)"
                    :alt="`Foto do diretor jovem da igreja ${church.name}`"
                    class="h-full w-full object-cover"
                  />
                </div>
              </td>
              <td class="px-5 py-4">
                <p class="font-semibold text-neutral-900 dark:text-white">
                  {{ church.directorName ?? "Não informado" }}
                </p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Contato principal</p>
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ church.directorCpf ? formatCPF(String(church.directorCpf)) : "Não informado" }}
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{
                  church.directorWhatsapp
                    ? formatPhone(String(church.directorWhatsapp))
                    : "Não informado"
                }}
              </td>
              <td class="px-5 py-4 font-semibold text-neutral-900 dark:text-white">
                {{ church.name }}
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ findDistrictName(church.districtId) }}
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ findDistrictPastorName(church.districtId) ?? "Não informado" }}
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="startChurchEdit(church)"
                  >
                    Editar
                  </button>
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
                    @click="confirmDeleteChurch(church)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredChurches.length">
              <td class="px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" colspan="8">
                Nenhuma igreja encontrada para o filtro selecionado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-6 flex flex-col gap-4 md:hidden">
        <div
          v-for="church in filteredChurches"
          :key="church.id"
          class="rounded-3xl border border-white/10 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)] dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-100"
        >
          <div class="flex items-start gap-3">
            <div class="h-14 w-14 overflow-hidden rounded-full border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/5">
              <img
                :src="resolvePhoto(church.directorPhotoUrl)"
                :alt="`Foto do diretor jovem da igreja ${church.name}`"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="flex-1">
              <p class="text-xs uppercase tracking-[0.35em] text-neutral-500">Diretor</p>
              <p class="text-base font-semibold text-neutral-900 dark:text-white">
                {{ church.directorName ?? "Não informado" }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Contato principal</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">CPF</p>
              <p>{{ church.directorCpf ? formatCPF(String(church.directorCpf)) : "Não informado" }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Whatsapp</p>
              <p>
                {{
                  church.directorWhatsapp
                    ? formatPhone(String(church.directorWhatsapp))
                    : "Não informado"
                }}
              </p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Igreja</p>
              <p>{{ church.name }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Distrito</p>
              <p>{{ findDistrictName(church.districtId) }}</p>
            </div>
            <div class="col-span-2">
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Pastor distrital</p>
              <p>{{ findDistrictPastorName(church.districtId) ?? "Não informado" }}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              class="rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
              @click="startChurchEdit(church)"
            >
              Editar
            </button>
            <button
              class="rounded-full border border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
              @click="confirmDeleteChurch(church)"
            >
              Excluir
            </button>
          </div>
        </div>
        <div v-if="!filteredChurches.length" class="rounded-3xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Nenhuma igreja encontrada para o filtro selecionado.
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import DateField from "../../components/forms/DateField.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import type { Church } from "../../types/api";
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";
import { formatPhone } from "../../utils/format";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { API_BASE_URL } from "../../config/api";

const admin = useAdminStore();
const catalog = useCatalogStore();
const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
const normalizedApiOrigin = apiOrigin.replace(/\/$/, "");
const uploadsBaseUrl = `${normalizedApiOrigin}/uploads`;

const editingChurchId = ref<string | null>(null);
const showChurchModal = ref(false);
const selectedDistrictId = ref("");
const districtDropdownOpen = ref(false);
const districtDropdownRef = ref<HTMLElement | null>(null);
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
const directorPhotoInput = ref<HTMLInputElement | null>(null);
const directorPhotoUploading = ref(false);

const districtOptions = computed(() => [
  { id: "", name: "Todos os distritos" },
  ...catalog.districts.map((district) => ({ id: district.id, name: district.name }))
]);

const selectedDistrictLabel = computed(() => {
  const match = districtOptions.value.find((option) => option.id === selectedDistrictId.value);
  return match ? match.name : "Todos os distritos";
});

const buildUploadUrl = (value: string) => {
  const sanitized = value.replace(/^\/+/, "");
  if (!sanitized) return "";
  if (sanitized.startsWith("uploads/")) {
    return `${normalizedApiOrigin}/${sanitized}`;
  }
  return `${uploadsBaseUrl}/${sanitized}`;
};

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

const resolvePhoto = (url?: string | null) => {
  if (!url || !url.length) return DEFAULT_PHOTO_DATA_URL;
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  const sanitized = url.replace(/^\/+/, "");
  if (!sanitized) return DEFAULT_PHOTO_DATA_URL;
  if (sanitized.startsWith("uploads/")) {
    return `${normalizedApiOrigin}/${sanitized}`;
  }
  return `${uploadsBaseUrl}/${sanitized}`;
};

const toggleDistrictDropdown = () => {
  districtDropdownOpen.value = !districtDropdownOpen.value;
};

const selectDistrict = (districtId: string) => {
  selectedDistrictId.value = districtId;
  districtDropdownOpen.value = false;
};

const handleDistrictDropdownClickOutside = (event: MouseEvent) => {
  if (!districtDropdownOpen.value || !districtDropdownRef.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (!districtDropdownRef.value.contains(target)) {
    districtDropdownOpen.value = false;
  }
};

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

const selectDirectorPhoto = () => {
  directorPhotoInput.value?.click();
};

const uploadDirectorPhoto = async (file: File) => {
  directorPhotoUploading.value = true;
  try {
    const result = await admin.uploadAsset(file);
    const remoteUrl =
      (result.url && result.url.length ? result.url : undefined) ??
      (result.fileName ? buildUploadUrl(result.fileName) : "");
    churchForm.directorPhotoUrl = remoteUrl;
  } catch (error) {
    showError("Falha ao enviar foto do diretor", error);
  } finally {
    directorPhotoUploading.value = false;
  }
};

const onDirectorPhotoChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  await uploadDirectorPhoto(file);
  if (input) {
    input.value = "";
  }
};

const removeDirectorPhoto = () => {
  churchForm.directorPhotoUrl = "";
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
  if (typeof window !== "undefined") {
    document.addEventListener("click", handleDistrictDropdownClickOutside);
  }
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

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    document.removeEventListener("click", handleDistrictDropdownClickOutside);
  }
});
</script>
