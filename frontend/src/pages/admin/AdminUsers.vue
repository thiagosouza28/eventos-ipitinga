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
    <ConfirmDialog
      :model-value="statusDialog.open"
      :title="statusDialogTitle"
      :description="statusDialogDescription"
      confirm-label="Confirmar"
      cancel-label="Cancelar"
      @update:modelValue="statusDialog.open = $event"
      @confirm="handleConfirmStatusChange"
      @cancel="statusDialog.open = false"
    />
    <ConfirmDialog
      :model-value="deleteDialog.open"
      title="Excluir usuario"
      :description="deleteDialogDescription"
      confirm-label="Excluir"
      cancel-label="Cancelar"
      type="danger"
      @update:modelValue="deleteDialog.open = $event"
      @confirm="handleConfirmDelete"
      @cancel="deleteDialog.open = false"
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
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input
              v-model="editDialog.form.email"
              type="email"
              required
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF</label>
            <input
              v-model="editDialog.form.cpf"
              type="text"
              maxlength="14"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Telefone</label>
            <input
              v-model="editDialog.form.phone"
              type="text"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Papel</label>
            <select
              :value="editRoleSelectValue"
              required
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              @change="onEditRoleChange(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in baseRoleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
              <optgroup v-if="catalog.ministries.length" label="Coordenadores por ministÃ©rio">
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
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
                Obrigatário para administradores distritais
              </span>
            </div>
            <select
              v-model="editDialog.form.districtScopeId"
              :required="editRequiresDistrict"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              <div class="h-14 w-14 overflow-hidden rounded-sm bg-neutral-200 dark:bg-neutral-800">
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
                  class="inline-flex cursor-pointer items-center rounded-sm border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
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
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">MinistÃ©rios</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                v-for="ministry in catalog.ministries"
                :key="ministry.id"
                class="flex items-center gap-2 rounded-sm border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <input
                  v-model="editDialog.form.ministryIds"
                  type="checkbox"
                  :value="ministry.id"
                  class="h-4 w-4 rounded-sm border-neutral-300 text-primary-600 focus:ring-primary-500"
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
            class="rounded-sm border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="closeEditDialog"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="editDialog.loading"
            class="inline-flex items-center justify-center rounded-sm bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            <span
              v-if="editDialog.loading"
              class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent"
            />
            <span>{{ editDialog.loading ? "Salvando..." : "Salvar alteraÃ§Ãµes" }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <Modal
      :model-value="showCreateForm"
      title="Novo usuário"
      @update:modelValue="(value) => {
        if (!value) closeCreateDialog();
      }"
    >
      <form class="space-y-4" @submit.prevent="handleCreateUser">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nome completo</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF (opcional)</label>
            <input
              v-model="form.cpf"
              type="text"
              maxlength="14"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Telefone (opcional)</label>
            <input
              v-model="form.phone"
              type="text"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Papel</label>
            <select
              :value="createRoleSelectValue"
              required
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Perfil de permissão</label>
            <select
              v-model="form.profileId"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              <span v-if="requiresDistrict" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para administradores distritais
              </span>
            </div>
            <select
              v-model="form.districtScopeId"
              :required="requiresDistrict"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              <span v-if="requiresChurch" class="text-[10px] font-medium text-primary-600 dark:text-primary-300">
                Obrigatório para diretores locais ou tesoureiros
              </span>
            </div>
            <select
              v-model="form.churchScopeId"
              :required="requiresChurch"
              class="mt-1 w-full rounded-sm border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">Selecione</option>
              <option v-for="church in catalog.churches" :key="church.id" :value="church.id">
                {{ church.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresMinistry" class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Ministérios</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                v-for="ministry in catalog.ministries"
                :key="ministry.id"
                class="flex items-center gap-2 rounded-sm border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <input
                  v-model="form.ministryIds"
                  type="checkbox"
                  :value="ministry.id"
                  class="h-4 w-4 rounded-sm border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span>{{ ministry.name }}</span>
              </label>
            </div>
            <p v-if="ministryError" class="mt-1 text-xs text-red-500">{{ ministryError }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-sm border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="closeCreateDialog"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="savingUser"
            class="inline-flex items-center justify-center rounded-sm bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
          >
            <span
              v-if="savingUser"
              class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent"
            />
            <span>{{ savingUser ? "Salvando..." : "Criar usuário" }}</span>
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
            class="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Voltar
          </RouterLink>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5"
            @click="openCreateDialog"
          >
            + Novo usuário
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
        <p class="rounded-sm bg-neutral-900/90 px-5 py-2 font-mono text-base tracking-wide text-white shadow-inner shadow-black/20">
          {{ lastTempPassword.password }}
        </p>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Compartilhe a senha com o usuario e lembre-se de orienta-lo a trocar no primeiro login.
        </p>
      </div>
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
        helperText="ðŸ”„ Carregando usuÃ¡rios..."
      />
      <div v-else>
        <div
          class="mt-6 hidden overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/30 md:block"
        >
          <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="px-5 py-3">Nome</th>
              <th class="px-5 py-3">E-mail</th>
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
                    class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10"
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
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex rounded-sm px-3 py-1 text-xs font-semibold uppercase"
                    :class="statusPillClass(user.status)"
                  >
                    {{ user.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                  </span>
                  <span
                    v-if="user.mustChangePassword"
                    class="inline-flex rounded-sm px-3 py-1 text-xs font-semibold uppercase bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    Trocar senha
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-sm border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="openEditDialog(user)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-sm border border-primary-200/60 px-4 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="openResetDialog(user)"
                  >
                    Resetar senha
                  </button>
                  <button
                    v-if="userPermissions.canDeactivate"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-sm border px-4 py-1.5 text-xs font-semibold transition hover:bg-amber-50 dark:hover:bg-amber-500/10"
                    :class="
                      user.status === 'ACTIVE'
                        ? 'border-amber-200/70 text-amber-700 dark:border-amber-500/30 dark:text-amber-200'
                        : 'border-emerald-200/70 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200'
                    "
                    @click="openStatusDialog(user)"
                  >
                    {{ user.status === 'ACTIVE' ? 'Desativar' : 'Reativar' }}
                  </button>
                  <button
                    v-if="userPermissions.canDelete"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-sm border border-red-200/70 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    @click="openDeleteDialog(user)"
                  >
                    Excluir
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
        <div class="mt-6 flex flex-col gap-4 md:hidden">
          <div
            v-for="user in admin.users"
            :key="user.id"
            class="rounded-sm border border-white/10 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)] dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-100"
          >
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm border border-white/70 bg-white/40 shadow-inner dark:border-white/10 dark:bg-white/10">
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
                <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ user.email }}</p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <div>
                <p class="font-semibold text-neutral-800 dark:text-neutral-100">Perfil</p>
                <p>{{ roleLabel(user.role) }}</p>
              </div>
              <div>
                <p class="font-semibold text-neutral-800 dark:text-neutral-100">Status</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  <span
                    class="inline-flex rounded-sm px-3 py-1 text-[11px] font-semibold uppercase"
                    :class="statusPillClass(user.status)"
                  >
                    {{ user.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                  </span>
                  <span
                    v-if="user.mustChangePassword"
                    class="inline-flex rounded-sm px-3 py-1 text-[11px] font-semibold uppercase bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    Trocar senha
                  </span>
                </div>
              </div>
              <div class="col-span-2">
                <p class="font-semibold text-neutral-800 dark:text-neutral-100">MinistÃ©rios</p>
                <p>
                  <span v-if="user.ministries?.length">{{ user.ministries.map((m) => m.name).join(", ") }}</span>
                  <span v-else class="text-neutral-400 dark:text-neutral-500">--</span>
                </p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold">
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="rounded-sm border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
                  @click="openEditDialog(user)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="rounded-sm border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
                  @click="openResetDialog(user)"
                >
                  Resetar senha
                </button>
                <button
                  v-if="userPermissions.canDeactivate"
                  type="button"
                  class="rounded-sm px-4 py-2 text-xs font-semibold transition hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  :class="
                    user.status === 'ACTIVE'
                      ? 'border-amber-200/70 text-amber-700 dark:border-amber-500/30 dark:text-amber-200'
                      : 'border-emerald-200/70 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200'
                  "
                  @click="openStatusDialog(user)"
                >
                  {{ user.status === 'ACTIVE' ? 'Desativar' : 'Reativar' }}
                </button>
                <button
                  v-if="userPermissions.canDelete"
                  type="button"
                  class="rounded-sm border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                  @click="openDeleteDialog(user)"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
          <div v-if="!admin.users.length" class="rounded-sm border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Nenhum usuário cadastrado até o momento.
          </div>
        </div>
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
import { useAdminStore } from "../../stores/admin";
import { useCatalogStore } from "../../stores/catalog";
import type { AdminUser, Role, UserStatus } from "../../types/api";
import { useModulePermissions } from "../../composables/usePermissions";
import { maskCpf as maskCpfUtil } from "../../utils/format";

const admin = useAdminStore();
const catalog = useCatalogStore();
const userPermissions = useModulePermissions("users");

const showCreateForm = ref(false);
const initialLoading = ref(true);
const savingUser = ref(false);
const lastTempPassword = ref<{ user: string; password: string } | null>(null);
const ministryError = ref("");
const editMinistryError = ref("");

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
  status: UserStatus;
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
    status: "ACTIVE" as UserStatus
  }
});

const errorDialog = reactive({
  open: false,
  title: "Erro",
  message: "",
  details: ""
});

const passwordDialog = reactive({
  open: false,
  loading: false,
  target: null as AdminUser | null
});

const statusDialog = reactive({
  open: false,
  loading: false,
  target: null as AdminUser | null,
  nextStatus: "INACTIVE" as UserStatus
});

const deleteDialog = reactive({
  open: false,
  loading: false,
  target: null as AdminUser | null
});

const showError = (title: string, message: string, details?: string) => {
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = details ?? "";
  errorDialog.open = true;
};

const baseRoleOptions = [
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

const maskCpf = (value?: string | null) => {
  if (!value) return "--";
  return maskCpfUtil(value);
};

const userInitials = (value?: string | null) => {
  const name = value?.trim();
  if (!name) return "US";
  const parts = name.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const initials = `${first}${second}`.trim();
  return (initials || name.slice(0, 2)).toUpperCase();
};

const roleLabel = (role: Role) => baseRoleOptions.find((option) => option.value === role)?.label ?? role;

const statusPillClass = (status: UserStatus) =>
  status === "ACTIVE"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-100";

const deleteDialogDescription = computed(() => {
  if (!deleteDialog.target) return "Excluir usuario selecionado?";
  return `Tem certeza que deseja excluir ${deleteDialog.target.name}? Essa acao nao pode ser desfeita.`;
});

const statusDialogTitle = computed(() =>
  statusDialog.nextStatus === "INACTIVE" ? "Desativar usuario" : "Reativar usuario"
);

const statusDialogDescription = computed(() => {
  if (!statusDialog.target) {
    return "";
  }
  return statusDialog.nextStatus === "INACTIVE"
    ? `Desativar o acesso de ${statusDialog.target.name}? Ele podera ser ativado novamente depois.`
    : `Reativar o acesso de ${statusDialog.target.name}?`;
});

const applyRoleSelection = (target: { role: Role; ministryIds: string[] }, value: string) => {
  if (value.startsWith("CoordenadorMinisterio:")) {
    const [, ministryId] = value.split(":");
    target.role = "CoordenadorMinisterio";
    target.ministryIds = ministryId ? [ministryId] : [];
    return;
  }
  target.role = (value as Role) || "CoordenadorMinisterio";
  if (target.role !== "CoordenadorMinisterio") {
    target.ministryIds = [];
  }
};

const onCreateRoleChange = (value: string) => {
  applyRoleSelection(form, value);
};

const onEditRoleChange = (value: string) => {
  applyRoleSelection(editDialog.form, value);
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
  ministryError.value = "";
};

const openCreateDialog = () => {
  if (!userPermissions.canCreate.value) {
    showError("Acesso negado", "Voce nao possui permissao para criar usuarios.");
    return;
  }
  showCreateForm.value = true;
};

const closeCreateDialog = () => {
  showCreateForm.value = false;
  resetForm();
};

const normalizeCpf = (value: string) => value.replace(/\D/g, "") || undefined;

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

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const handleCreateUser = async () => {
  if (!userPermissions.canCreate.value) {
    showError("Acesso negado", "Voce nao possui permissao para criar usuarios.");
    return;
  }
  if (!validateForm()) return;

  savingUser.value = true;
  try {
    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      districtScopeId: form.districtScopeId || undefined,
      churchScopeId: form.churchScopeId || undefined,
      ministryIds: form.ministryIds.length ? [...form.ministryIds] : [],
      status: form.status
    };
    payload.cpf = form.cpf.trim() ? normalizeCpf(form.cpf) ?? undefined : null;
    payload.phone = form.phone.trim() || null;
    if (form.profileId) {
      payload.profileId = form.profileId;
    }

    const response = await admin.createUser(payload);
    lastTempPassword.value = {
      user: response.user.name,
      password: response.temporaryPassword
    };
    closeCreateDialog();
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Falha ao criar usuario.";
    showError("Erro ao criar usuario", message);
  } finally {
    savingUser.value = false;
  }
};

const openEditDialog = (user: AdminUser) => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
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
  } catch {
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
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
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
    const payload: any = {
      name: editDialog.form.name.trim(),
      email: editDialog.form.email.trim(),
      role: editDialog.form.role,
      districtScopeId: editDialog.form.districtScopeId || undefined,
      churchScopeId: editDialog.form.churchScopeId || undefined,
      ministryIds: editDialog.form.ministryIds.length ? [...editDialog.form.ministryIds] : [],
      status: editDialog.form.status
    };
    payload.cpf = editDialog.form.cpf.trim() ? normalizeCpf(editDialog.form.cpf) ?? undefined : null;
    payload.phone = editDialog.form.phone.trim() || null;
    payload.profileId = editDialog.form.profileId || null;
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
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
    return;
  }
  passwordDialog.target = user;
  passwordDialog.open = true;
};

const handleConfirmReset = async () => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
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
    const message = error.response?.data?.message ?? "Nao foi possivel resetar a senha.";
    showError("Erro ao resetar senha", message);
  } finally {
    passwordDialog.loading = false;
    passwordDialog.open = false;
    passwordDialog.target = null;
  }
};

const openStatusDialog = (user: AdminUser) => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
    return;
  }
  statusDialog.target = user;
  statusDialog.nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  statusDialog.open = true;
};

const handleConfirmStatusChange = async () => {
  if (!userPermissions.canEdit.value) {
    showError("Acesso negado", "Voce nao possui permissao para editar usuarios.");
    return;
  }
  if (!statusDialog.target) return;

  statusDialog.loading = true;
  try {
    await admin.updateUserStatus(statusDialog.target.id, statusDialog.nextStatus);
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Nao foi possivel atualizar o status.";
    showError("Erro ao atualizar status", message);
  } finally {
    statusDialog.loading = false;
    statusDialog.open = false;
    statusDialog.target = null;
  }
};

const openDeleteDialog = (user: AdminUser) => {
  if (!userPermissions.canDelete.value) {
    showError("Acesso negado", "Voce nao possui permissao para excluir usuarios.");
    return;
  }
  deleteDialog.target = user;
  deleteDialog.open = true;
};

const handleConfirmDelete = async () => {
  if (!userPermissions.canDelete.value) {
    showError("Acesso negado", "Voce nao possui permissao para excluir usuarios.");
    return;
  }
  if (!deleteDialog.target) return;

  deleteDialog.loading = true;
  try {
    await admin.deleteUser(deleteDialog.target.id);
  } catch (error: any) {
    const message = error.response?.data?.message ?? "Nao foi possivel excluir o usuario.";
    showError("Erro ao excluir usuario", message);
  } finally {
    deleteDialog.loading = false;
    deleteDialog.open = false;
    deleteDialog.target = null;
  }
};

const refreshData = async () => {
  if (!userPermissions.canList.value) return;
  initialLoading.value = true;
  try {
    await Promise.all([admin.loadUsers(), admin.loadProfiles()]);
  } catch (error: any) {
    showError("Falha ao carregar usuarios", error.response?.data?.message ?? "Tente novamente mais tarde.");
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















