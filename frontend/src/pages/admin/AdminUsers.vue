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
      :model-value="passwordDialog.open"
      title="Resetar senha"
      description="Gerar uma nova senha temporaria para este usuario? A senha atual sera invalidada."
      confirm-label="Gerar nova senha"
      cancel-label="Cancelar"
      :loading="passwordDialog.loading"
      @confirm="handleConfirmReset"
      @cancel="passwordDialog.open = false"
    />
    <Modal
      :model-value="editDialog.open"
      title="Editar usuario"
      @update:modelValue="(value) => {
        editDialog.open = value;
        if (!value) closeEditDialog();
      }"
    >
      <form class="space-y-4" @submit.prevent="handleUpdateUser">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nome completo</label>
            <input
              v-model="editDialog.form.name"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input
              v-model="editDialog.form.email"
              type="email"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF</label>
            <input
              v-model="editDialog.form.cpf"
              type="text"
              maxlength="14"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Telefone</label>
            <input
              v-model="editDialog.form.phone"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Papel</label>
            <select
              v-model="editDialog.form.role"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Perfil de permissão</label>
            <select
              v-model="editDialog.form.profileId"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="profile in admin.profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }}
              </option>
            </select>
          </div>
          <div v-if="editRequiresDistrict">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Distrito</label>
            <select
              v-model="editDialog.form.districtScopeId"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </div>
          <div v-if="editRequiresChurch">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Igreja</label>
            <select
              v-model="editDialog.form.churchScopeId"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="church in catalog.churches" :key="church.id" :value="church.id">
                {{ church.name }}
              </option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Foto de perfil</label>
            <div class="mt-2 flex items-center gap-4">
              <div class="h-14 w-14 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <img
                  v-if="editDialog.photoPreview"
                  :src="editDialog.photoPreview"
                  alt="Foto do usuario"
                  class="h-full w-full object-cover"
                />
                <span v-else class="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                  {{ userInitials(editDialog.form.name) }}
                </span>
              </div>
              <div class="flex flex-col gap-2">
                <label
                  class="inline-flex cursor-pointer items-center rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <input type="file" accept="image/*" class="hidden" @change="handleEditPhotoChange" />
                  Selecionar foto
                </label>
                <button
                  v-if="editDialog.photoPreview"
                  type="button"
                  class="text-xs text-red-500 hover:text-red-400"
                  @click="clearEditPhoto"
                >
                  Remover foto
                </button>
              </div>
            </div>
          </div>
          <div v-if="editRequiresMinistry" class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Ministerios</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                v-for="ministry in catalog.ministries"
                :key="ministry.id"
                class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <input
                  v-model="editDialog.form.ministryIds"
                  type="checkbox"
                  :value="ministry.id"
                  class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{{ ministry.name }}</span>
              </label>
            </div>
            <p v-if="editMinistryError" class="mt-1 text-xs text-red-500">{{ editMinistryError }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="closeEditDialog"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="editDialog.loading"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            <span
              v-if="editDialog.loading"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
            />
            <span>{{ editDialog.loading ? "Salvando..." : "Salvar alteracoes" }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">Usuarios</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Cadastre usuarios com acesso ao painel administrativo e controle suas permissoes.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            @click="toggleCreateForm"
          >
            {{ showCreateForm ? "Fechar formulario" : "Novo usuario" }}
          </button>
          <RouterLink
            to="/admin/dashboard"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Voltar
          </RouterLink>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="lastTempPassword">
      <div class="space-y-2">
        <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Senha temporaria gerada para {{ lastTempPassword.user }}
        </p>
        <p class="rounded-lg bg-neutral-900 px-4 py-2 font-mono text-white">
          {{ lastTempPassword.password }}
        </p>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Compartilhe a senha com o usuario e lembre-se de orienta-lo a trocar no primeiro login.
        </p>
      </div>
    </BaseCard>

    <BaseCard v-if="showCreateForm">
      <form class="space-y-4" @submit.prevent="handleCreateUser">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nome completo</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF (opcional)</label>
            <input
              v-model="form.cpf"
              type="text"
              maxlength="14"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Telefone (opcional)</label>
            <input
              v-model="form.phone"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Papel</label>
            <select
              v-model="form.role"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Perfil de permissão</label>
            <select
              v-model="form.profileId"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="profile in admin.profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresDistrict">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Distrito</label>
            <select
              v-model="form.districtScopeId"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresChurch">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Igreja</label>
            <select
              v-model="form.churchScopeId"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="church in catalog.churches" :key="church.id" :value="church.id">
                {{ church.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresMinistry" class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Ministerios</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                v-for="ministry in catalog.ministries"
                :key="ministry.id"
                class="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <input
                  v-model="form.ministryIds"
                  type="checkbox"
                  :value="ministry.id"
                  class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{{ ministry.name }}</span>
              </label>
            </div>
            <p v-if="ministryError" class="mt-1 text-xs text-red-500">{{ ministryError }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="toggleCreateForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="savingUser"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            <span v-if="savingUser" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
            <span>{{ savingUser ? "Salvando..." : "Criar usuario" }}</span>
          </button>
        </div>
      </form>
    </BaseCard>

    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Usuarios cadastrados</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Total: {{ admin.users.length }}
          </p>
        </div>
        <button
          type="button"
          class="text-sm text-primary-600 hover:text-primary-500"
          @click="refreshData"
        >
          Atualizar lista
        </button>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Nome</th>
              <th class="pb-2">Email</th>
              <th class="pb-2">Perfil</th>
              <th class="pb-2">Ministerios</th>
              <th class="pb-2">Status</th>
              <th class="pb-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="user in admin.users" :key="user.id">
              <td class="py-3">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <img
                      v-if="user.photoUrl"
                      :src="user.photoUrl"
                      alt="Foto do usuario"
                      class="h-full w-full object-cover"
                    />
                    <span
                      v-else
                      class="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500 dark:text-neutral-300"
                    >
                      {{ userInitials(user.name) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ user.name }}</div>
                    <div v-if="user.cpf" class="text-xs text-neutral-500">CPF: {{ maskCpf(user.cpf) }}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 text-sm text-neutral-600 dark:text-neutral-300">{{ user.email }}</td>
              <td class="py-3 text-sm text-neutral-600 dark:text-neutral-300">{{ roleLabel(user.role) }}</td>
              <td class="py-3 text-sm text-neutral-600 dark:text-neutral-300">
                <span v-if="user.ministries?.length">{{ user.ministries.map((m) => m.name).join(", ") }}</span>
                <span v-else class="text-neutral-400">--</span>
              </td>
              <td class="py-3">
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase"
                  :class="user.mustChangePassword ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ user.mustChangePassword ? "Trocar senha" : "Ativo" }}
                </span>
              </td>
              <td class="py-3 text-right">
                <div class="flex flex-wrap justify-end gap-3 text-sm">
                  <button
                    type="button"
                    class="text-primary-600 hover:text-primary-500"
                    @click="openEditDialog(user)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="text-primary-600 hover:text-primary-500"
                    @click="openResetDialog(user)"
                  >
                    Resetar senha
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.users.length">
              <td class="py-4 text-sm text-neutral-500" colspan="6">
                Nenhum usuario cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import type { AdminUser, Role } from "../../types/api";

const admin = useAdminStore();
const catalog = useCatalogStore();

const showCreateForm = ref(false);
const savingUser = ref(false);
const lastTempPassword = ref<{ user: string; password: string } | null>(null);

const form = reactive<{
  name: string;
  email: string;
  cpf: string;
  phone: string;
  role: Role;
  districtScopeId: string;
  churchScopeId: string;
  ministryIds: string[];
  profileId: string;
  status: "ACTIVE" | "INACTIVE";
}>({
  name: "",
  email: "",
  cpf: "",
  phone: "",
  role: "CoordenadorMinisterio",
  districtScopeId: "",
  churchScopeId: "",
  ministryIds: [],
  profileId: "",
  status: "ACTIVE"
});
const editDialog = reactive({
  open: false,
  loading: false,
  userId: "",
  photoPreview: "",
  photoPayload: undefined as string | null | undefined,
  form: {
    name: "",
    email: "",
    cpf: "",
    phone: "",
    role: "AdminGeral" as Role,
    districtScopeId: "",
    churchScopeId: "",
    ministryIds: [] as string[],
    profileId: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE"
  }
});
const editMinistryError = ref("");

const errorDialog = reactive({
  open: false,
  title: "Erro",
  message: "",
  details: ""
});

const passwordDialog = reactive<{
  open: boolean;
  loading: boolean;
  target: AdminUser | null;
}>({
  open: false,
  loading: false,
  target: null
});

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "AdminGeral", label: "Admin geral" },
  { value: "AdminDistrital", label: "Admin distrital" },
  { value: "DiretorLocal", label: "Diretor local" },
  { value: "Tesoureiro", label: "Tesoureiro" },
  { value: "CoordenadorMinisterio", label: "Coordenador de ministerio" }
];

const roleRequiresDistrict = (role: Role) => role === "AdminDistrital";
const roleRequiresChurch = (role: Role) => role === "DiretorLocal" || role === "Tesoureiro";
const roleRequiresMinistry = (role: Role) => role === "CoordenadorMinisterio";

const requiresDistrict = computed(() => roleRequiresDistrict(form.role));
const requiresChurch = computed(() => roleRequiresChurch(form.role));
const requiresMinistry = computed(() => roleRequiresMinistry(form.role));
const editRequiresDistrict = computed(() => roleRequiresDistrict(editDialog.form.role));
const editRequiresChurch = computed(() => roleRequiresChurch(editDialog.form.role));
const editRequiresMinistry = computed(() => roleRequiresMinistry(editDialog.form.role));
const ministryError = ref("");

const maskCpf = (value?: string | null) => {
  if (!value) return "--";
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const userInitials = (value: string) => {
  if (!value) return "US";
  const parts = value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const initials = `${first}${second}`.trim();
  return (initials || value.slice(0, 2)).toUpperCase();
};

const roleLabel = (role: Role) => {
  const option = roleOptions.find((item) => item.value === role);
  return option?.label ?? role;
};

const showError = (title: string, message: string, details?: string) => {
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = details ?? "";
  errorDialog.open = true;
};

const resetForm = () => {
  form.name = "";
  form.email = "";
  form.cpf = "";
  form.phone = "";
  form.role = "CoordenadorMinisterio";
  form.districtScopeId = "";
  form.churchScopeId = "";
  form.ministryIds = [];
  form.profileId = "";
  form.status = "ACTIVE";
};

const toggleCreateForm = () => {
  showCreateForm.value = !showCreateForm.value;
  if (!showCreateForm.value) {
    resetForm();
  }
};

const validateForm = () => {
  ministryError.value = "";
  if (requiresMinistry.value && !form.ministryIds.length) {
    ministryError.value = "Selecione ao menos um ministerio.";
    return false;
  }
  if (requiresDistrict.value && !form.districtScopeId) {
    showError("Campos obrigatorios", "Selecione um distrito para este perfil.");
    return false;
  }
  if (requiresChurch.value && !form.churchScopeId) {
    showError("Campos obrigatorios", "Selecione uma igreja para este perfil.");
    return false;
  }
  return true;
};

const normalizeCpf = (value: string) => value.replace(/\D/g, "") || undefined;

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const handleCreateUser = async () => {
  if (!validateForm()) return;
  savingUser.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      districtScopeId: form.districtScopeId || undefined,
      churchScopeId: form.churchScopeId || undefined,
      ministryIds: form.ministryIds.length ? [...form.ministryIds] : []
    };
    if (form.cpf.trim()) {
      payload.cpf = normalizeCpf(form.cpf) ?? undefined;
    } else {
      payload.cpf = null;
    }
    payload.phone = form.phone.trim() || null;
    if (form.profileId) {
      payload.profileId = form.profileId;
    }
    payload.status = form.status;
    const response = await admin.createUser(payload as any);
    lastTempPassword.value = {
      user: response.user.name,
      password: response.temporaryPassword
    };
    resetForm();
    showCreateForm.value = false;
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Falha ao criar usuario.";
    showError("Erro ao criar usuario", message);
  } finally {
    savingUser.value = false;
  }
};

const openEditDialog = (user: AdminUser) => {
  editDialog.userId = user.id;
  editDialog.form.name = user.name;
    editDialog.form.email = user.email;
  editDialog.form.cpf = user.cpf ?? "";
  editDialog.form.phone = user.phone ?? "";
  editDialog.form.role = user.role;
  editDialog.form.districtScopeId = user.districtScopeId ?? "";
  editDialog.form.churchScopeId = user.churchScopeId ?? "";
  editDialog.form.ministryIds = user.ministries?.map((ministry) => ministry.id) ?? [];
  editDialog.form.profileId = user.profile?.id ?? "";
  editDialog.form.status = user.status ?? "ACTIVE";
  editDialog.photoPreview = user.photoUrl ?? "";
  editDialog.photoPayload = undefined;
  editMinistryError.value = "";
  editDialog.open = true;
};

const closeEditDialog = () => {
  editDialog.open = false;
  editDialog.loading = false;
  editDialog.userId = "";
  editDialog.photoPreview = "";
  editDialog.photoPayload = undefined;
  editMinistryError.value = "";
};

const handleEditPhotoChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    showError("Imagem muito grande", "Selecione um arquivo de ate 4 MB.");
    if (input) input.value = "";
    return;
  }
  try {
    const base64 = await fileToBase64(file);
    editDialog.photoPayload = base64;
    editDialog.photoPreview = base64;
  } catch (error) {
    showError("Erro ao processar imagem", "Tente novamente.");
  } finally {
    if (input) input.value = "";
  }
};

const clearEditPhoto = () => {
  editDialog.photoPayload = null;
  editDialog.photoPreview = "";
};

const handleUpdateUser = async () => {
  if (!editDialog.userId) return;
  editMinistryError.value = "";
  if (editRequiresMinistry.value && !editDialog.form.ministryIds.length) {
    editMinistryError.value = "Selecione ao menos um ministerio.";
    return;
  }
  if (editRequiresDistrict.value && !editDialog.form.districtScopeId) {
    showError("Campos obrigatorios", "Selecione um distrito para este perfil.");
    return;
  }
  if (editRequiresChurch.value && !editDialog.form.churchScopeId) {
    showError("Campos obrigatorios", "Selecione uma igreja para este perfil.");
    return;
  }
  editDialog.loading = true;
  try {
    const payload: Record<string, unknown> = {
      name: editDialog.form.name.trim(),
      email: editDialog.form.email.trim(),
      role: editDialog.form.role,
      districtScopeId: editDialog.form.districtScopeId || undefined,
      churchScopeId: editDialog.form.churchScopeId || undefined,
      ministryIds: editDialog.form.ministryIds.length ? [...editDialog.form.ministryIds] : [],
      status: editDialog.form.status
    };
    if (editDialog.form.cpf.trim()) {
      payload.cpf = normalizeCpf(editDialog.form.cpf) ?? undefined;
    } else {
      payload.cpf = null;
    }
    payload.phone = editDialog.form.phone.trim() || null;
    if (editDialog.form.profileId) {
      payload.profileId = editDialog.form.profileId;
    } else {
      payload.profileId = null;
    }
    if (editDialog.photoPayload !== undefined) {
      payload.photoUrl = editDialog.photoPayload;
    }
    await admin.updateUser(editDialog.userId, payload);
    closeEditDialog();
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Nao foi possivel atualizar o usuario.";
    showError("Erro ao atualizar usuario", message);
  } finally {
    editDialog.loading = false;
  }
};

const openResetDialog = (user: AdminUser) => {
  passwordDialog.target = user;
  passwordDialog.open = true;
};

const handleConfirmReset = async () => {
  if (!passwordDialog.target) return;
  passwordDialog.loading = true;
  try {
    const result = await admin.resetUserPassword(passwordDialog.target.id);
    lastTempPassword.value = {
      user: passwordDialog.target.name,
      password: result.temporaryPassword
    };
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Nao foi possivel resetar a senha.";
    showError("Erro ao resetar senha", message);
  } finally {
    passwordDialog.loading = false;
    passwordDialog.open = false;
    passwordDialog.target = null;
  }
};

const refreshData = async () => {
  try {
    await admin.loadUsers();
  } catch (error: any) {
    showError("Falha ao carregar usuarios", error.response?.data?.message ?? "Tente novamente mais tarde.");
  }
};

onMounted(async () => {
  try {
    await Promise.all([
      admin.loadUsers(),
      catalog.loadDistricts(),
      catalog.loadChurches(),
      catalog.loadMinistries()
    ]);
  } catch (error: any) {
    showError("Falha ao carregar dados", error.response?.data?.message ?? "Tente novamente mais tarde.");
  }
});

watch(
  () => form.role,
  () => {
    if (!requiresDistrict.value) form.districtScopeId = "";
    if (!requiresChurch.value) form.churchScopeId = "";
    if (!requiresMinistry.value) form.ministryIds = [];
  }
);

watch(
  () => editDialog.form.role,
  () => {
    if (!editRequiresDistrict.value) editDialog.form.districtScopeId = "";
    if (!editRequiresChurch.value) editDialog.form.churchScopeId = "";
    if (!editRequiresMinistry.value) editDialog.form.ministryIds = [];
  }
);
</script>
