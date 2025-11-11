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
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Perfil</label>
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
                <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ user.name }}</div>
                <div v-if="user.cpf" class="text-xs text-neutral-500">CPF: {{ maskCpf(user.cpf) }}</div>
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
                <button
                  type="button"
                  class="text-sm text-primary-600 hover:text-primary-500"
                  @click="openResetDialog(user)"
                >
                  Resetar senha
                </button>
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
}>({
  name: "",
  email: "",
  cpf: "",
  phone: "",
  role: "CoordenadorMinisterio",
  districtScopeId: "",
  churchScopeId: "",
  ministryIds: []
});

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

const requiresDistrict = computed(() => form.role === "AdminDistrital");
const requiresChurch = computed(() => form.role === "DiretorLocal" || form.role === "Tesoureiro");
const requiresMinistry = computed(() => form.role === "CoordenadorMinisterio");
const ministryError = ref("");

const maskCpf = (value?: string | null) => {
  if (!value) return "--";
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
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

const handleCreateUser = async () => {
  if (!validateForm()) return;
  savingUser.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      cpf: form.cpf ? normalizeCpf(form.cpf) : undefined,
      phone: form.phone.trim() || undefined,
      role: form.role,
      districtScopeId: form.districtScopeId || undefined,
      churchScopeId: form.churchScopeId || undefined,
      ministryIds: form.ministryIds.length ? [...form.ministryIds] : undefined
    };
    const response = await admin.createUser(payload);
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
</script>
