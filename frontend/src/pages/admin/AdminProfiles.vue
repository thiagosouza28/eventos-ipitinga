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
      :model-value="deleteDialog.open"
      title="Excluir perfil"
      :description="deleteDialog.target ? `Tem certeza que deseja excluir o perfil '${deleteDialog.target.name}'?` : ''"
      confirm-label="Excluir"
      cancel-label="Cancelar"
      type="danger"
      :loading="deleteDialog.loading"
      @update:modelValue="deleteDialog.open = $event"
      @confirm="handleConfirmDelete"
      @cancel="deleteDialog.open = false"
    />

    <Modal
      :model-value="createDialog.open"
      title="Cadastrar perfil"
      @update:modelValue="(value) => {
        createDialog.open = value;
        if (!value) resetCreateForm();
      }"
    >
      <form class="space-y-4" @submit.prevent="handleCreateProfile">
        <ProfileForm
          v-model:name="createDialog.form.name"
          v-model:description="createDialog.form.description"
          v-model:permissions="createDialog.form.permissions"
        />
        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="createDialog.open = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="createDialog.loading"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            <span
              v-if="createDialog.loading"
              class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
            />
            <span>{{ createDialog.loading ? "Salvando..." : "Criar perfil" }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <Modal
      :model-value="editDialog.open"
      title="Editar perfil"
      @update:modelValue="(value) => {
        editDialog.open = value;
        if (!value) resetEditForm();
      }"
    >
      <form class="space-y-4" @submit.prevent="handleUpdateProfile">
        <ProfileForm
          v-model:name="editDialog.form.name"
          v-model:description="editDialog.form.description"
          v-model:permissions="editDialog.form.permissions"
        />
        <label class="inline-flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            v-model="editDialog.form.isActive"
            type="checkbox"
            class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Perfil ativo
        </label>
        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="editDialog.open = false"
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
            <span>{{ editDialog.loading ? "Salvando..." : "Atualizar perfil" }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <BaseCard>
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-primary-500">Perfis & Permissões</p>
          <h1 class="text-2xl font-semibold text-neutral-900 dark:text-white">Controle de acesso</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Gerencie papéis e defina o que cada usuário pode fazer em cada módulo.
          </p>
        </div>
        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-primary-500 dark:hover:text-primary-200"
            @click="refreshProfiles"
          >
            Atualizar
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-400/30 transition hover:bg-primary-500"
            @click="createDialog.open = true"
          >
            Novo perfil
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="profile in admin.profiles"
          :key="profile.id"
          class="rounded-2xl border border-neutral-100 bg-gradient-to-br from-white to-neutral-50/60 p-5 shadow-sm shadow-primary-900/5 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900/50"
        >
          <header class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">{{ profile.name }}</h3>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ profile.description || "Sem descrição" }}
              </p>
            </div>
            <span
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold',
                profile.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
              ]"
            >
              {{ profile.isActive ? "Ativo" : "Inativo" }}
            </span>
          </header>
          <div class="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Permissões
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="pill in summarizePermissions(profile.permissions)"
                :key="pill"
                class="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 dark:bg-primary-500/20 dark:text-primary-100"
              >
                {{ pill }}
              </span>
              <span v-if="!profile.permissions.length" class="text-xs text-neutral-400">Sem permissões atribuídas</span>
            </div>
          </div>
          <footer class="mt-4 flex flex-wrap gap-3 text-sm">
            <button type="button" class="font-medium text-primary-600 hover:text-primary-500" @click="openEditDialog(profile)">
              Editar
            </button>
            <button
              type="button"
              class="font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              @click="toggleProfileStatus(profile)"
            >
              {{ profile.isActive ? "Desativar" : "Ativar" }}
            </button>
            <button type="button" class="font-medium text-red-500 hover:text-red-400" @click="openDeleteDialog(profile)">
              Excluir
            </button>
          </footer>
        </article>
        <div
          v-if="!admin.profiles.length"
          class="col-span-full rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
        >
          Nenhum perfil cadastrado. Clique em “Novo perfil” para começar.
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";

import ProfileForm from "../../components/admin/ProfileForm.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import { permissionModules } from "../../config/permission-schema";
import { useAdminStore } from "../../stores/admin";
import type { AdminProfile, PermissionAction, PermissionState } from "../../types/api";
import {
  createPermissionMatrix,
  hydrateMatrixFromEntries,
  toPermissionPayload,
  type PermissionFormEntry
} from "../../utils/permission-matrix";

const admin = useAdminStore();

const errorDialog = reactive({
  open: false,
  title: "Erro",
  message: "",
  details: ""
});

const createDialog = reactive({
  open: false,
  loading: false,
  form: {
    name: "",
    description: "",
    permissions: createPermissionMatrix()
  }
});

const editDialog = reactive({
  open: false,
  loading: false,
  targetId: "",
  form: {
    name: "",
    description: "",
    isActive: true,
    permissions: createPermissionMatrix()
  }
});

const deleteDialog = reactive<{
  open: boolean;
  loading: boolean;
  target: AdminProfile | null;
}>({
  open: false,
  loading: false,
  target: null
});

const showError = (title: string, message: string, details?: string) => {
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = details ?? "";
  errorDialog.open = true;
};

const resetCreateForm = () => {
  createDialog.form.name = "";
  createDialog.form.description = "";
  createDialog.form.permissions = createPermissionMatrix();
  createDialog.loading = false;
};

const resetEditForm = () => {
  editDialog.targetId = "";
  editDialog.form = {
    name: "",
    description: "",
    isActive: true,
    permissions: createPermissionMatrix()
  };
  editDialog.loading = false;
};

const handleCreateProfile = async () => {
  try {
    createDialog.loading = true;
    await admin.createProfile({
      name: createDialog.form.name.trim(),
      description: createDialog.form.description?.trim() || undefined,
      permissions: toPermissionPayload(createDialog.form.permissions)
    });
    createDialog.open = false;
    resetCreateForm();
  } catch (error: any) {
    showError("Não foi possível criar o perfil", error.response?.data?.message ?? error.message);
  } finally {
    createDialog.loading = false;
  }
};

const openEditDialog = (profile: AdminProfile) => {
  editDialog.targetId = profile.id;
  editDialog.form.name = profile.name;
  editDialog.form.description = profile.description ?? "";
  editDialog.form.isActive = profile.isActive;
  editDialog.form.permissions = hydrateMatrixFromEntries(profile.permissions);
  editDialog.open = true;
};

const handleUpdateProfile = async () => {
  if (!editDialog.targetId) return;
  try {
    editDialog.loading = true;
    await admin.updateProfile(editDialog.targetId, {
      name: editDialog.form.name.trim(),
      description: editDialog.form.description?.trim() || undefined,
      isActive: editDialog.form.isActive,
      permissions: toPermissionPayload(editDialog.form.permissions)
    });
    editDialog.open = false;
    resetEditForm();
  } catch (error: any) {
    showError("Não foi possível atualizar o perfil", error.response?.data?.message ?? error.message);
  } finally {
    editDialog.loading = false;
  }
};

const toggleProfileStatus = async (profile: AdminProfile) => {
  try {
    await admin.updateProfileStatus(profile.id, !profile.isActive);
  } catch (error: any) {
    showError("Falha ao atualizar status", error.response?.data?.message ?? error.message);
  }
};

const openDeleteDialog = (profile: AdminProfile) => {
  deleteDialog.target = profile;
  deleteDialog.open = true;
};

const handleConfirmDelete = async () => {
  if (!deleteDialog.target) return;
  try {
    deleteDialog.loading = true;
    await admin.deleteProfile(deleteDialog.target.id);
    deleteDialog.open = false;
  } catch (error: any) {
    showError("Não foi possível excluir o perfil", error.response?.data?.message ?? error.message);
  } finally {
    deleteDialog.loading = false;
  }
};

const refreshProfiles = async () => {
  try {
    await admin.loadProfiles();
  } catch (error: any) {
    showError("Falha ao carregar perfis", error.response?.data?.message ?? error.message);
  }
};

const summarizePermissions = (permissions: AdminProfile["permissions"]) => {
  return permissions
    .filter((permission) => permission.canView || permission.canCreate || permission.canEdit)
    .map(
      (permission) =>
        permissionModules.find((module) => module.key === permission.module)?.label ?? permission.module
    );
};

onMounted(refreshProfiles);
</script>
