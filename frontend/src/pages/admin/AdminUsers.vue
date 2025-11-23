<template>
  <div v-if="userPermissions.canList" class="space-y-6">
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
              :value="editRoleSelectValue"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              @change="onEditRoleChange(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in baseRoleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
              <optgroup v-if="catalog.ministries.length" label="Coordenadores por ministério">
                <option
                  v-for="ministry in catalog.ministries"
                  :key="ministry.id"
                  :value="`CoordenadorMinisterio:${ministry.id}`"
                >
                  Coordenador - {{ ministry.name }}
                </option>
              </optgroup>
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
          <div>
            <div class="flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300">
              <span>Distrito</span>
              <span v-if="editRequiresDistrict" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para administradores distritais
              </span>
            </div>
            <select
              v-model="editDialog.form.districtScopeId"
              :required="editRequiresDistrict"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </div>
          <div>
            <div class="flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300">
              <span>Igreja</span>
              <span v-if="editRequiresChurch" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para diretores locais ou tesoureiros
              </span>
            </div>
            <select
              v-model="editDialog.form.churchScopeId"
              :required="editRequiresChurch"
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
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Ministérios</label>
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
            <span>{{ editDialog.loading ? "Salvando..." : "Salvar alterações" }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <Modal
      :model-value="permissionDialog.open"
      title="Permissões personalizadas"
      @update:modelValue="(value) => {
        permissionDialog.open = value;
        if (!value) resetPermissionDialog();
      }"
    >
      <div v-if="permissionDialog.loading" class="flex h-24 items-center justify-center text-sm text-neutral-500 dark:text-neutral-300">
        Carregando permissões...
      </div>
      <div v-else-if="permissionDialog.user" class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Ajuste o que o usuário <span class="font-semibold text-primary-600 dark:text-primary-200">{{ permissionDialog.user.name }}</span>
          pode fazer além do perfil
          <span class="font-semibold">{{ permissionDialog.user.profile?.name ?? "sem perfil definido" }}</span>.
          Desative um módulo para herdar as permissões originais.
        </p>
        <div v-for="module in permissionModules" :key="module.key" class="rounded-2xl border border-neutral-100 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ module.label }}</p>
              <p class="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Perfil: <span class="font-semibold text-neutral-600 dark:text-neutral-300">{{ permissionDialog.user.profile?.name ?? "Padrāo" }}</span>
              </p>
            </div>
            <label class="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-300">
              <input
                class="h-4 w-4 rounded border-primary-200 text-primary-600 focus:ring-primary-500"
                type="checkbox"
                :checked="isModuleOverridden(module.key)"
                @change="toggleModuleOverride(module.key, ($event.target as HTMLInputElement).checked)"
              />
              Personalizar
            </label>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <label
              v-for="action in permissionActions"
              :key="`${module.key}-${action.key}`"
              class="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600 dark:border-white/10 dark:text-neutral-200"
              :class="{ 'opacity-60': !isModuleOverridden(module.key) }"
            >
              <input
                class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                type="checkbox"
                :disabled="!isModuleOverridden(module.key)"
                :checked="overrideHasPermission(module.key, action.key)"
                @change="handlePermissionOverrideChange(module.key, action.key, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ action.label }}</span>
              <span
                v-if="profileHasPermission(module.key, action.key)"
                class="ml-auto inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-white/10 dark:text-neutral-300"
              >
                Perfil
              </span>
            </label>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            class="text-xs font-semibold text-neutral-500 underline-offset-2 transition hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
            @click="clearAllOverrides"
          >
            Limpar personalizaçōes
          </button>
          <div class="flex gap-3">
            <button
              type="button"
              class="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200"
              @click="resetPermissionDialog"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-50"
              :disabled="permissionDialog.saving"
              @click="savePermissionOverrides"
            >
              <span v-if="permissionDialog.saving" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
              <span>{{ permissionDialog.saving ? "Salvando..." : "Salvar ajustes" }}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <BaseCard
      class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Central de acesso
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Usuários</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Cadastre usuários com acesso ao painel administrativo e controle suas permissões.
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
            @click="toggleCreateForm"
          >
            {{ showCreateForm ? "Fechar formulário" : "+ Novo usuário" }}
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      v-if="lastTempPassword"
      class="border border-white/30 bg-gradient-to-br from-white/90 to-primary-50/30 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="space-y-3">
        <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Senha temporaria gerada para {{ lastTempPassword.user }}
        </p>
        <p class="rounded-2xl bg-neutral-900/90 px-5 py-2 font-mono text-base tracking-wide text-white shadow-inner shadow-black/20">
          {{ lastTempPassword.password }}
        </p>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Compartilhe a senha com o usuario e lembre-se de orienta-lo a trocar no primeiro login.
        </p>
      </div>
    </BaseCard>

    <BaseCard
      v-if="showCreateForm"
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <form class="space-y-5" @submit.prevent="handleCreateUser">
        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Nome completo</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">CPF (opcional)</label>
            <input
              v-model="form.cpf"
              type="text"
              maxlength="14"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Telefone (opcional)</label>
            <input
              v-model="form.phone"
              type="text"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Papel</label>
            <select
              :value="createRoleSelectValue"
              required
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              @change="onCreateRoleChange(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in baseRoleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
              <optgroup v-if="catalog.ministries.length" label="Coordenadores por ministério">
                <option
                  v-for="ministry in catalog.ministries"
                  :key="ministry.id"
                  :value="`CoordenadorMinisterio:${ministry.id}`"
                >
                  Coordenador - {{ ministry.name }}
                </option>
              </optgroup>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Perfil de permissão</label>
            <select
              v-model="form.profileId"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            >
              <option value="">Selecione</option>
              <option v-for="profile in admin.profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300">
              <span>Distrito</span>
              <span v-if="requiresDistrict" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para administradores distritais
              </span>
            </div>
            <select
              v-model="form.districtScopeId"
              :required="requiresDistrict"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            >
              <option value="">Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                {{ district.name }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-300">
              <span>Igreja</span>
              <span v-if="requiresChurch" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para diretores locais ou tesoureiros
              </span>
            </div>
            <select
              v-model="form.churchScopeId"
              :required="requiresChurch"
              class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            >
              <option value="">Selecione</option>
              <option v-for="church in catalog.churches" :key="church.id" :value="church.id">
                {{ church.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresMinistry" class="space-y-2 md:col-span-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Ministérios</label>
            <div class="mt-1 grid gap-2 sm:grid-cols-2">
              <label
                v-for="ministry in catalog.ministries"
                :key="ministry.id"
                class="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-2 text-sm text-neutral-700 shadow-inner transition dark:border-white/10 dark:bg-white/5 dark:text-white"
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
            <p v-if="ministryError" class="text-xs text-red-500 dark:text-red-400">{{ ministryError }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="toggleCreateForm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="savingUser"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:opacity-70"
          >
            <span
              v-if="savingUser"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
            />
            <span>{{ savingUser ? "Salvando..." : "Criar usuario" }}</span>
          </button>
        </div>
      </form>
    </BaseCard>

    <BaseCard
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Usuários cadastrados
          </p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">
            Painel de credenciais ({{ admin.users.length }})
          </h2>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-600 transition hover:translate-y-0.5 dark:text-primary-300"
          :disabled="initialLoading"
          @click="refreshData"
        >
          Atualizar lista
        </button>
      </div>
      <TableSkeleton
        v-if="initialLoading"
        helperText="🔄 Carregando usuários..."
      />
      <div
        v-else
        class="mt-6 overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/30"
      >
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="px-5 py-3">Nome</th>
              <th class="px-5 py-3">Email</th>
              <th class="px-5 py-3">Perfil</th>
              <th class="px-5 py-3">Ministérios</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="user in admin.users"
              :key="user.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10"
                  >
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
                    <p class="font-semibold text-neutral-900 dark:text-white">{{ user.name }}</p>
                    <p v-if="user.cpf" class="text-xs text-neutral-500 dark:text-neutral-400">
                      CPF: {{ maskCpf(user.cpf) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">{{ user.email }}</td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">{{ roleLabel(user.role) }}</td>
              <td class="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                <span v-if="user.ministries?.length">{{ user.ministries.map((m) => m.name).join(", ") }}</span>
                <span v-else class="text-neutral-400 dark:text-neutral-500">--</span>
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase"
                  :class="
                    user.mustChangePassword
                      ? 'bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                      : 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100'
                  "
                >
                  {{ user.mustChangePassword ? 'Trocar senha' : 'Ativo' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="openPermissionDialog(user)"
                  >
                    Permissões
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="openEditDialog(user)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="openResetDialog(user)"
                  >
                    Resetar senha
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.users.length">
              <td class="px-5 py-6 text-sm text-neutral-500 dark:text-neutral-400" colspan="6">
                Nenhum usuario cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
  <AccessDeniedNotice v-else module="users" action="view" />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import { permissionModules, permissionActions } from "../../config/permission-schema";
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import {
  createPermissionMatrix,
  hydrateMatrixFromEntries,
  toPermissionPayload,
  toggleMatrixPermission,
  type PermissionFormEntry
} from "../../utils/permission-matrix";
import type { AdminUser, Role, PermissionAction } from "../../types/api";
import { useModulePermissions } from "../../composables/usePermissions";

const admin = useAdminStore();
const catalog = useCatalogStore();
const userPermissions = useModulePermissions("users");

const showCreateForm = ref(false);
const initialLoading = ref(true);
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
const permissionDialog = reactive({
  open: false,
  loading: false,
  saving: false,
  user: null as AdminUser | null,
  permissions: createPermissionMatrix(),
  profileMatrix: createPermissionMatrix(),
  enabledOverrides: {} as Record<string, boolean>
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

const resetPermissionDialog = () => {
  permissionDialog.open = false;
  permissionDialog.loading = false;
  permissionDialog.saving = false;
  permissionDialog.user = null;
  permissionDialog.permissions = createPermissionMatrix();
  permissionDialog.profileMatrix = createPermissionMatrix();
  permissionDialog.enabledOverrides = {};
};

const isModuleOverridden = (moduleKey: string) => Boolean(permissionDialog.enabledOverrides[moduleKey]);

const toggleModuleOverride = (moduleKey: string, enabled: boolean) => {
  if (enabled) {
    permissionDialog.enabledOverrides[moduleKey] = true;
    return;
  }
  delete permissionDialog.enabledOverrides[moduleKey];
  const blank = createPermissionMatrix().find((entry) => entry.module === moduleKey);
  const target = permissionDialog.permissions.find((entry) => entry.module === moduleKey);
  if (target && blank) {
    target.actions = { ...blank.actions };
  }
};

const profileHasPermission = (moduleKey: string, action: PermissionAction) => {
  const entry = permissionDialog.profileMatrix.find((item) => item.module === moduleKey);
  return entry ? entry.actions[action] : false;
};

const overrideHasPermission = (moduleKey: string, action: PermissionAction) => {
  const entry = permissionDialog.permissions.find((item) => item.module === moduleKey);
  return entry ? entry.actions[action] : false;
};

const handlePermissionOverrideChange = (
  moduleKey: string,
  action: PermissionAction,
  enabled: boolean
) => {
  if (enabled) {
    permissionDialog.enabledOverrides[moduleKey] = true;
  }
  permissionDialog.permissions = toggleMatrixPermission(
    permissionDialog.permissions,
    moduleKey,
    action,
    enabled
  );
};

const clearAllOverrides = () => {
  permissionDialog.permissions = createPermissionMatrix();
  permissionDialog.enabledOverrides = {};
};

const openPermissionDialog = async (user: AdminUser) => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar permissões.");
    return;
  }
  permissionDialog.user = user;
  permissionDialog.open = true;
  permissionDialog.loading = true;
  permissionDialog.profileMatrix = hydrateMatrixFromEntries(user.profile?.permissions ?? []);
  try {
    const overrides = await admin.getUserPermissions(user.id);
    permissionDialog.permissions = hydrateMatrixFromEntries(overrides);
    permissionDialog.enabledOverrides = overrides.reduce<Record<string, boolean>>((acc, curr) => {
      acc[curr.module] = true;
      return acc;
    }, {});
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Não foi possível carregar as permissões do usuário.";
    showError("Falha ao carregar permissões", message);
    resetPermissionDialog();
  } finally {
    permissionDialog.loading = false;
  }
};

const savePermissionOverrides = async () => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar permissões.");
    return;
  }
  if (!permissionDialog.user) return;
  permissionDialog.saving = true;
  try {
    const modules = Object.keys(permissionDialog.enabledOverrides).filter(
      (moduleKey) => permissionDialog.enabledOverrides[moduleKey]
    );
    const entries = permissionDialog.permissions.filter((entry) => modules.includes(entry.module));
    const payload = toPermissionPayload(entries, { keepEmpty: true });
    await admin.updateUserPermissions(permissionDialog.user.id, payload);
    resetPermissionDialog();
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Não foi possível salvar as permissões.";
    showError("Falha ao salvar permissões", message);
  } finally {
    permissionDialog.saving = false;
  }
};

const baseRoleOptions: Array<{ value: Role; label: string }> = [
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
const createRoleSelectValue = computed(() => {
  if (form.role === "CoordenadorMinisterio") {
    return form.ministryIds[0] ? `CoordenadorMinisterio:${form.ministryIds[0]}` : "CoordenadorMinisterio";
  }
  return form.role;
});
const editRoleSelectValue = computed(() => {
  if (editDialog.form.role === "CoordenadorMinisterio") {
    return editDialog.form.ministryIds[0]
      ? `CoordenadorMinisterio:${editDialog.form.ministryIds[0]}`
      : "CoordenadorMinisterio";
  }
  return editDialog.form.role;
});
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
  const option = baseRoleOptions.find((item) => item.value === role);
  return option?.label ?? role;
};

const parseRoleSelection = (value: string) => {
  if (value?.startsWith("CoordenadorMinisterio:")) {
    const [, ministryId] = value.split(":");
    return { role: "CoordenadorMinisterio" as Role, ministryId: ministryId || undefined };
  }
  return { role: (value as Role) || "CoordenadorMinisterio", ministryId: undefined };
};

const applyRoleSelection = (target: { role: Role; ministryIds: string[] }, value: string) => {
  const { role, ministryId } = parseRoleSelection(value);
  target.role = role;
  if (role === "CoordenadorMinisterio") {
    target.ministryIds = ministryId ? [ministryId] : [];
  } else {
    target.ministryIds = [];
  }
};

const onCreateRoleChange = (value: string) => {
  applyRoleSelection(form, value);
};

const onEditRoleChange = (value: string) => {
  applyRoleSelection(editDialog.form, value);
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
  if (!userPermissions.canCreate.value) {
    showError("Acesso negado", "Você não possui permissão para criar usuários.");
    return;
  }
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
  if (!userPermissions.canCreate.value) {
    showError("Acesso negado", "Você não possui permissão para criar usuários.");
    return;
  }
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
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar usuários.");
    return;
  }
  editDialog.userId = user.id;
  editDialog.form.name = user.name;
    editDialog.form.email = user.email;
  editDialog.form.cpf = user.cpf ?? "";
  editDialog.form.phone = user.phone ?? "";
  editDialog.form.role = user.role;
  editDialog.form.districtScopeId = user.districtScopeId ?? "";
  editDialog.form.churchScopeId = user.churchId ?? user.churchScopeId ?? "";
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
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar usuários.");
    return;
  }
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
    const message = error.response?.data?.message ?? "Não foi possível atualizar o usuário.";
    showError("Erro ao atualizar usuário", message);
  } finally {
    editDialog.loading = false;
  }
};

const openResetDialog = (user: AdminUser) => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar usuários.");
    return;
  }
  passwordDialog.target = user;
  passwordDialog.open = true;
};

const handleConfirmReset = async () => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Você não possui permissão para editar usuários.");
    return;
  }
  if (!passwordDialog.target) return;
  passwordDialog.loading = true;
  try {
    const result = await admin.resetUserPassword(passwordDialog.target.id);
    lastTempPassword.value = {
      user: passwordDialog.target.name,
      password: result.temporaryPassword
    };
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Não foi possível resetar a senha.";
    showError("Erro ao resetar senha", message);
  } finally {
    passwordDialog.loading = false;
    passwordDialog.open = false;
    passwordDialog.target = null;
  }
};

const refreshData = async () => {
  if (!userPermissions.canList.value) return;
  initialLoading.value = true;
  try {
    await Promise.all([admin.loadUsers(), admin.loadProfiles()]);
  } catch (error: any) {
    showError("Falha ao carregar usuários", error.response?.data?.message ?? "Tente novamente mais tarde.");
  } finally {
    initialLoading.value = false;
  }
};

onMounted(async () => {
  if (!userPermissions.canList.value) {
    initialLoading.value = false;
    return;
  }
  initialLoading.value = true;
  try {
    await Promise.all([
      admin.loadUsers(),
      admin.loadProfiles(),
      catalog.loadDistricts(),
      catalog.loadChurches(),
      catalog.loadMinistries()
    ]);
  } catch (error: any) {
    showError("Falha ao carregar dados", error.response?.data?.message ?? "Tente novamente mais tarde.");
  } finally {
    initialLoading.value = false;
  }
});

watch(
  () => form.role,
  () => {
    if (!requiresMinistry.value) form.ministryIds = [];
  }
);

watch(
  () => editDialog.form.role,
  () => {
    if (!editRequiresMinistry.value) editDialog.form.ministryIds = [];
  }
);
</script>

