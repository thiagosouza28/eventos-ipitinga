<template>
  <div v-if="eventPermissions.canList" class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />
    <BaseCard class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/20">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.3em] text-primary-500 dark:text-primary-300">
            Gestão de eventos
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Eventos</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Cadastre novos eventos, edite os existentes e controle o status público e financeiro.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            v-if="eventPermissions.canCreate"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5"
            @click="openCreateModal"
          >
            <PlusIcon class="h-5 w-5" aria-hidden="true" />
            <span>Novo evento</span>
          </button>
          <RouterLink
            to="/admin/dashboard"
            class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            <ArrowUturnLeftIcon class="h-5 w-5" aria-hidden="true" />
            <span>Voltar</span>
          </RouterLink>
        </div>
      </div>
    </BaseCard>
    <BaseCard class="border border-white/40 bg-gradient-to-br from-neutral-50/60 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-primary-500 dark:text-primary-300">
            Eventos cadastrados
          </p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-white">
            Controle em tempo real
          </h2>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Clique em editar para ajustar dados ou exclua eventos sem inscrições.
        </p>
      </div>
      <TableSkeleton
        v-if="loadingEvents"
        helperText="ð Carregando eventos..."
      />
      <div
        v-else
        class="mt-6 hidden overflow-hidden rounded-sm border border-white/40 bg-white/60 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/40 md:block"
      >
        <table class="w-full table-auto text-left text-sm text-neutral-700 dark:text-neutral-200">
          <thead class="bg-white/50 text-[11px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
              <th class="px-4 py-3">Título</th>
              <th class="px-4 py-3">Distrito</th>
              <th class="px-4 py-3">Período</th>
              <th class="px-4 py-3">Valor vigente</th>
              <th class="px-4 py-3">Regra de valor pendente</th>
              <th class="px-4 py-3">Lote atual</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Açoes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <tr v-for="event in admin.events" :key="event.id">
              <td class="px-4 py-4">
                <div class="font-semibold text-neutral-900 dark:text-white">
                  {{ event.title }}
                </div>
                <div class="text-xs text-neutral-500">Slug: {{ event.slug }}</div>
              </td>
              <td class="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                <div class="font-semibold text-neutral-900 dark:text-neutral-100">
                  {{ event.district?.name ?? "Nao informado" }}
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </td>
              <td class="px-4 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                {{ event.isFree ? "Gratuito" : formatCurrency(event.currentPriceCents ?? event.priceCents) }}
              </td>
              <td
                class="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-300"
                :title="getPendingPaymentValueRuleDescription(event.pendingPaymentValueRule)"
              >
                {{ getPendingPaymentValueRuleLabel(event.pendingPaymentValueRule) }}
              </td>
              <td class="px-4 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                {{ event.currentLot?.name ?? "--" }}
              </td>
              <td class="px-4 py-4">
                <span
                  :class="[
                    'rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide',
                    event.isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/40'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  ]"
                >
                  {{ event.isActive ? "Ativo" : "Inativo" }}
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-white/10"
                    @click="openDetails(event)"
                  >
                    Detalhes
                  </button>
                  <button
                    v-if="eventPermissions.canEdit"
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="startEdit(event)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="eventPermissions.canEdit"
                    class="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    @click="toggleActive(event)"
                  >
                    {{ event.isActive ? "Desativar" : "Ativar" }}
                  </button>
                  <button
                    v-if="eventPermissions.canDelete"
                    class="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
                    @click="openDelete(event)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.events.length">
              <td class="px-4 py-6 text-sm text-neutral-500" colspan="8">
                Nenhum evento cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loadingEvents" class="mt-6 flex flex-col gap-4 md:hidden">
        <div
          v-for="event in admin.events"
          :key="event.id"
          class="rounded-3xl border border-white/10 bg-white/90 p-4 text-sm shadow-[0_18px_40px_-25px_rgba(15,23,42,0.75)] dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-100"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-neutral-500">TÃ­tulo</p>
              <p class="text-base font-semibold text-neutral-900 dark:text-white">{{ event.title }}</p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Slug: {{ event.slug }}</p>
            </div>
            <span
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                event.isActive
                  ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                  : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
              ]"
            >
              {{ event.isActive ? "Ativo" : "Inativo" }}
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">InÃ­cio</p>
              <p>{{ formatDate(event.startDate) }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Fim</p>
              <p>{{ formatDate(event.endDate) }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Valor vigente</p>
              <p>{{ event.isFree ? "Gratuito" : formatCurrency(event.currentPriceCents ?? event.priceCents) }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Lote atual</p>
              <p>{{ event.currentLot?.name ?? "--" }}</p>
            </div>
            <div>
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Distrito</p>
              <p>{{ event.district?.name ?? "Nao informado" }}</p>
            </div>
            <div class="col-span-2">
              <p class="font-semibold text-neutral-800 dark:text-neutral-100">Regra de valor pendente</p>
              <p>{{ getPendingPaymentValueRuleLabel(event.pendingPaymentValueRule) }}</p>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-2">
            <button
              class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
              @click="openDetails(event)"
            >
              Detalhes
            </button>
            <div v-if="eventPermissions.canEdit" class="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                class="rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
                @click="startEdit(event)"
              >
                Editar
              </button>
              <button
                class="rounded-full border border-primary-200 px-4 py-2 text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
                @click="toggleActive(event)"
              >
                {{ event.isActive ? "Desativar" : "Ativar" }}
              </button>
            </div>
            <button
              v-if="eventPermissions.canDelete"
              class="rounded-full border border-red-200 px-4 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
              @click="openDelete(event)"
            >
              Excluir
            </button>
          </div>
        </div>
        <div v-if="!admin.events.length" class="rounded-3xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Nenhum evento cadastrado até o momento.
        </div>
      </div>
    </BaseCard>

    <ConfirmDialog
      :model-value="confirmDelete.open"
      title="Excluir evento"
      :description="confirmDeleteDescription"
      confirm-label="Excluir"
      cancel-label="Cancelar"
      type="danger"
      @update:modelValue="(value) => (confirmDelete.open = value)"
      @confirm="handleDelete"
      @cancel="closeDeleteDialog"
    />

    <Modal
      :model-value="createModalOpen"
      title="Criar novo evento"
      @update:modelValue="handleCreateModalToggle"
    >
      <form class="mt-2 grid gap-4 md:grid-cols-2" @submit.prevent="submitCreate">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            TÃ­tulo
          </label>
          <input
            v-model="createForm.title"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Slug (URL)
          </label>
          <div class="mt-1 flex gap-2">
            <input
              v-model="createForm.slug"
              type="text"
              class="w-full rounded-lg border border-neutral-300 px-4 py-2 lowercase dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="ex: encontro-2026"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              @click="applySlugSuggestion('create')"
            >
              Gerar
            </button>
          </div>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Este slug compõe o endereço do evento (ex.: /evento/{{ createForm.slug || 'meu-evento' }}).
          </p>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Descrição
          </label>
          <textarea
            v-model="createForm.description"
            rows="3"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Imagem do banner (arquivo)
          </label>
          <input
            v-model="createForm.bannerUrl"
            type="text"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="banner.jpg"
          />
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref="createBannerInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onBannerFileChange('create', $event)"
            />
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              @click="selectBannerFile('create')"
              :disabled="bannerUploading.create"
            >
              {{ bannerUploading.create ? "Enviando..." : "Selecionar nos arquivos" }}
            </button>
            <span
              v-if="createForm.bannerUrl"
              class="text-xs text-neutral-500 dark:text-neutral-400"
            >
              {{ createForm.bannerUrl }}
            </span>
          </div>
          <div v-if="resolveBannerUrl(createForm.bannerUrl)" class="mt-2">
            <img
              :src="resolveBannerUrl(createForm.bannerUrl)"
              alt="Preview do banner"
              class="max-h-32 w-full rounded object-cover border border-neutral-300 dark:border-neutral-700"
              @error="createForm.bannerUrl = ''"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Data de início
          </label>
          <input
            v-model="createForm.startDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Data de término
          </label>
          <input
            v-model="createForm.endDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Local
          </label>
          <input
            v-model="createForm.location"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Idade mínima
          </label>
          <input
            v-model="createForm.minAgeYears"
            type="number"
            min="0"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Distrito do evento
          </label>
          <select
            v-model="createForm.districtId"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Selecione...</option>
            <option
              v-for="district in districtOptions"
              :key="district.id"
              :value="district.id"
            >
              {{ district.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Todo evento precisa de um distrito para gerar relatórios e repasses.
          </p>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Formas de pagamento disponiveis
          </label>
          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              v-for="method in paymentMethodOptions"
              :key="method.value"
              class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700"
            >
              <input
                v-model="createForm.paymentMethods"
                type="checkbox"
                class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                :value="method.value"
              />
              <span>{{ method.label }}</span>
            </label>
          </div>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Regra de valor para pagamentos pendentes
          </label>
          <select
            v-model="createForm.pendingPaymentValueRule"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option
              v-for="option in pendingPaymentValueRuleOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {{ getPendingPaymentValueRuleDescription(createForm.pendingPaymentValueRule) }}
          </p>
        </div>
        <div class="md:col-span-2">
          <label class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            <input
              v-model="createForm.isFree"
              type="checkbox"
              class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Evento gratuíto
          </label>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Ministério responsavel
          </label>
          <select
            v-model="createForm.ministryId"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Selecione...</option>
            <option
              v-for="ministry in allMinistryOptions"
              :key="ministry.id"
              :value="ministry.id"
            >
              {{ ministry.name }} {{ !ministry.isActive ? "(Inativo)" : "" }}
            </option>
          </select>
        </div>
        <div class="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="handleCreateModalToggle(false)"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="resetCreateForm"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-70"
            :disabled="savingCreate"
          >
            {{ savingCreate ? "Criando..." : "Criar evento" }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal
      :model-value="editModalOpen"
      title="Editar evento"
      @update:modelValue="handleEditModalToggle"
    >
      <form class="mt-2 grid gap-4 md:grid-cols-2" @submit.prevent="submitEdit">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Título
          </label>
          <input
            v-model="editForm.title"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Slug (URL)
          </label>
          <div class="mt-1 flex gap-2">
            <input
              v-model="editForm.slug"
              type="text"
              class="w-full rounded-lg border border-neutral-300 px-4 py-2 lowercase dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              @click="applySlugSuggestion('edit')"
            >
              Gerar
            </button>
          </div>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Descrição
          </label>
          <textarea
            v-model="editForm.description"
            rows="3"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Imagem do banner (arquivo)
          </label>
          <input
            v-model="editForm.bannerUrl"
            type="text"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="banner.jpg"
          />
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref="editBannerInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onBannerFileChange('edit', $event)"
            />
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              @click="selectBannerFile('edit')"
              :disabled="bannerUploading.edit"
            >
              {{ bannerUploading.edit ? "Enviando..." : "Selecionar nos arquivos" }}
            </button>
            <span
              v-if="editForm.bannerUrl"
              class="text-xs text-neutral-500 dark:text-neutral-400"
            >
              {{ editForm.bannerUrl }}
            </span>
          </div>
          <div v-if="resolveBannerUrl(editForm.bannerUrl)" class="mt-2">
            <img
              :src="resolveBannerUrl(editForm.bannerUrl)"
              alt="Preview do banner"
              class="max-h-32 w-full rounded object-cover border border-neutral-300 dark:border-neutral-700"
              @error="editForm.bannerUrl = ''"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Data de início
          </label>
          <input
            v-model="editForm.startDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Data de término
          </label>
          <input
            v-model="editForm.endDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Local
          </label>
          <input
            v-model="editForm.location"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Idade mínima
          </label>
          <input
            v-model="editForm.minAgeYears"
            type="number"
            min="0"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Distrito do evento
          </label>
          <select
            v-model="editForm.districtId"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Selecione...</option>
            <option
              v-for="district in districtOptions"
              :key="district.id"
              :value="district.id"
            >
              {{ district.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Mantemos o distrito obrigatÃ³rio para garantir repasses corretos.
          </p>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Formas de pagamento disponíveis
          </label>
          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              v-for="method in paymentMethodOptions"
              :key="method.value"
              class="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700"
            >
              <input
                v-model="editForm.paymentMethods"
                type="checkbox"
                class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                :value="method.value"
              />
              <span>{{ method.label }}</span>
            </label>
          </div>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Regra de valor para pagamentos pendentes
          </label>
          <select
            v-model="editForm.pendingPaymentValueRule"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option
              v-for="option in pendingPaymentValueRuleOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {{ getPendingPaymentValueRuleDescription(editForm.pendingPaymentValueRule) }}
          </p>
        </div>
        <div class="md:col-span-2">
          <label class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            <input
              v-model="editForm.isFree"
              type="checkbox"
              class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Evento gratuíto
          </label>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Ministério responsável
          </label>
          <select
            v-model="editForm.ministryId"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">Selecione...</option>
            <option
              v-for="ministry in allMinistryOptions"
              :key="ministry.id"
              :value="ministry.id"
            >
              {{ ministry.name }} {{ !ministry.isActive ? "(Inativo)" : "" }}
            </option>
          </select>
        </div>
        <div class="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="cancelEdit"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-70"
            :disabled="savingEdit"
          >
            {{ savingEdit ? "Salvando..." : "Salvar alterações" }}
          </button>
        </div>
      </form>
    </Modal>

    <teleport to="body">
      <div
        v-if="details.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
        @click.self="closeDetails"
      >
        <div
          class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/15 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950/90 p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.6)] sm:p-8"
        >
          <header class="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.4em] text-primary-300">Evento selecionado</p>
              <h2 class="text-2xl font-semibold text-white">
                {{ details.event?.title }}
              </h2>
              <p class="text-sm text-white/70">
                Slug: {{ details.event?.slug }}
              </p>
            </div>
            <div class="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              <span
                class="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                :class="details.event?.isActive ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-100'"
              >
                {{ details.event?.isActive ? 'Ativo' : 'Inativo' }}
              </span>
              <RouterLink
                v-if="details.event?.id"
                :to="{ name: 'admin-event-financial', params: { eventId: details.event.id } }"
                class="inline-flex items-center justify-center rounded-full border border-primary-300/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-200 transition hover:bg-primary-500/20"
              >
                Financeiro
              </RouterLink>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                @click="closeDetails"
              >
                Fechar
              </button>
            </div>
          </header>

          <dl class="mt-6 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Período</dt>
              <dd class="mt-1 font-semibold text-white">
                {{ formatDate(details.event?.startDate ?? '') }} - {{ formatDate(details.event?.endDate ?? '') }}
              </dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Local</dt>
              <dd class="mt-1 font-semibold text-white">{{ details.event?.location }}</dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Ministerio</dt>
              <dd class="mt-1 font-semibold text-white">{{ details.event?.ministry?.name ?? 'Nao vinculado' }}</dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Distrito</dt>
              <dd class="mt-1 font-semibold text-white">{{ details.event?.district?.name ?? 'Nao informado' }}</dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Valor atual</dt>
              <dd class="mt-2 space-y-1 text-sm text-white">
                <div class="text-lg font-semibold">{{ currentPriceDisplay }}</div>
                <div class="text-xs text-white/70">Base: {{ basePriceDisplay }}</div>
                <div v-if="details.event?.currentLot?.name" class="text-xs text-white/70">
                  Lote vigente: {{ details.event?.currentLot?.name }}
                </div>
              </dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Regra de valor pendente</dt>
              <dd class="mt-2 text-sm">
                <p class="font-semibold text-white">{{ getPendingPaymentValueRuleLabel(details.event?.pendingPaymentValueRule) }}</p>
                <p class="text-white/70">
                  {{ getPendingPaymentValueRuleDescription(details.event?.pendingPaymentValueRule) }}
                </p>
              </dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Idade minima</dt>
              <dd class="mt-1 font-semibold text-white">{{ details.event?.minAgeYears ?? 'Nao informada' }}</dd>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
              <dt class="text-xs uppercase tracking-[0.3em] text-white/60">Descricao</dt>
              <dd class="mt-1 whitespace-pre-line text-white/80">
                {{ details.event?.description ?? 'Nenhuma descricao fornecida' }}
              </dd>
            </div>
          </dl>

          <div v-if="!details.event?.isFree" class="mt-8 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-white/60">Lotes de inscrição</p>
                <p class="text-sm text-white/70">
                  Valor vigente: <span class="font-semibold text-white">{{ currentPriceDisplay }}</span>
                  <span class="ml-1 text-white/60">(base: {{ basePriceDisplay }})</span>
                </p>
              </div>
              <button
                v-if="eventPermissions.canEdit"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                @click="openLotCreateModal"
              >
                <PlusIcon class="h-4 w-4" />
                Novo lote
              </button>
            </div>

            <div v-if="loadingLots" class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Carregando lotes...
            </div>

            <div v-else>
              <ul v-if="lotsForDetails.length" class="space-y-3 max-h-60 overflow-y-auto pr-2">
                <li
                  v-for="lot in lotsForDetails"
                  :key="lot.id"
                  class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-base font-semibold text-white">{{ lot.name }}</p>
                      <p class="text-xs text-white/70">
                        Valor: {{ formatCurrency(lot.priceCents) }} | Período:
                        {{ formatDateTimeBr(lot.startsAt) }}
                        <span v-if="lot.endsAt">- {{ formatDateTimeBr(lot.endsAt) }}</span>
                        <span v-else>- sem data final</span>
                      </p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                      <span
                        :class="[
                          'inline-flex rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                          lotBadgeClass(lot)
                        ]"
                      >
                        {{ lotStatusLabel(lot) }}
                      </span>
                      <span
                        v-if="isCurrentLot(lot)"
                        class="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary-200"
                      >
                        Lote vigente
                      </span>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-if="eventPermissions.canEdit"
                          type="button"
                          class="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed"
                          :disabled="lotDeletingId === lot.id || editingLotId === lot.id"
                          @click="startLotEdit(lot)"
                        >
                          <span v-if="editingLotId === lot.id">Editando...</span>
                          <span v-else>Editar</span>
                        </button>
                        <button
                          v-if="eventPermissions.canDelete"
                          type="button"
                          class="rounded-full border border-red-300/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed"
                          :disabled="lotDeletingId === lot.id || isLotActive(lot)"
                          @click="deleteLot(lot)"
                        >
                          <span v-if="lotDeletingId === lot.id">Removendo...</span>
                          <span v-else-if="isLotActive(lot)">Lote ativo</span>
                          <span v-else>Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
              <p v-else class="text-sm text-white/70">
                Nenhum lote cadastrado. O sistema utiliza o valor base do evento.
              </p>
            </div>
          </div>

          <div v-else class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Este evento é gratuíto. Não há lotes cadastrados e todas as inscrições são confirmadas automaticamente.
          </div>

          <div class="mt-8 flex flex-col gap-3 text-sm sm:flex-row sm:justify-between">
            <RouterLink
              v-if="details.event"
              :to="`/evento/${details.event.slug}`"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center rounded-full border border-primary-300/50 px-5 py-2 text-sm font-semibold text-primary-200 transition hover:bg-primary-500/20"
            >
              Ver página pública
            </RouterLink>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              @click="closeDetails"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </teleport>
    <!-- Modal para criar/editar lote -->
    <Modal
      :model-value="lotModalOpen"
      :title="editingLotId ? 'Editar lote' : 'Criar novo lote'"
      @update:modelValue="(v) => { lotModalOpen = v; if (!v) cancelLotEdit(); }"
    >
      <form class="space-y-3 text-sm" @submit.prevent="submitLot">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Nome do lote
            </label>
            <input
              v-model="lotForm.name"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Valor
            </label>
            <input
              v-model="lotForm.price"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="0,00"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Início
            </label>
            <input
              v-model="lotForm.startsAt"
              type="datetime-local"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Fim (opcional)
            </label>
            <input
              v-model="lotForm.endsAt"
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:bg-neutral-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="cancelLotEdit"
            :disabled="lotSaving"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:bg-neutral-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="resetLotForm"
            :disabled="lotSaving"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="lotSaving"
          >
            {{ lotSaving ? 'Salvando...' : editingLotId ? 'Salvar alteraÃ§Ãµes' : 'Adicionar lote' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
  <AccessDeniedNotice v-else module="events" action="view" />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { ArrowUturnLeftIcon, PlusIcon } from "@heroicons/vue/24/outline";

import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import Modal from "../../components/ui/Modal.vue";
import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
import { useCatalogStore } from "../../stores/catalog";
import { useApi } from "../../composables/useApi";
import type {
  District,
  Event as ApiEvent,
  EventLot,
  PaymentMethod,
  Ministry,
  Church
} from "../../types/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { PAYMENT_METHODS } from "../../config/paymentMethods";
import { API_BASE_URL } from "../../config/api";
import { useModulePermissions } from "../../composables/usePermissions";
import {
  DEFAULT_PENDING_PAYMENT_VALUE_RULE,
  PENDING_PAYMENT_VALUE_RULES,
  getPendingPaymentValueRuleDescription,
  getPendingPaymentValueRuleLabel,
  PendingPaymentValueRule
} from "../../config/pendingPaymentValueRules";

const admin = useAdminStore();
const auth = useAuthStore();
const catalog = useCatalogStore();
const currentUser = computed(() => auth.user);
const userDistrictId = computed(() => currentUser.value?.districtScopeId ?? "");
const userChurchId = computed(() => currentUser.value?.churchId ?? "");
const eventPermissions = useModulePermissions("events");
const { api } = useApi();
const paymentMethodOptions = PAYMENT_METHODS;

const pendingPaymentValueRuleOptions = PENDING_PAYMENT_VALUE_RULES;
const defaultPendingPaymentValueRule: PendingPaymentValueRule = DEFAULT_PENDING_PAYMENT_VALUE_RULE;

const defaultPaymentMethodValues = (): PaymentMethod[] =>
  PAYMENT_METHODS.map((option) => option.value);

const activeMinistries = computed<Ministry[]>(() =>
  catalog.ministries.filter((ministry) => ministry.isActive)
);
const allMinistryOptions = computed<Ministry[]>(() => catalog.ministries);
const pickDefaultMinistryId = () => activeMinistries.value[0]?.id ?? "";
const districtOptions = computed<District[]>(() => catalog.districts);
const churchesCache = reactive<Record<string, Church[]>>({});
const churchesLoading = reactive<Record<FormMode, boolean>>({
  create: false,
  edit: false
});

const toPriceCents = (input: unknown) => {
  if (input === null || input === undefined) return 0;
  const valueStr = String(input).trim();
  if (!valueStr) return 0;
  const normalized = valueStr.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};

const formatPriceDisplay = (valueInCents: number) =>
  (valueInCents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const churchOptionsForDistrict = (districtId: string) => churchesCache[districtId] ?? [];
const createChurchOptions = computed<Church[]>(() =>
  createForm.districtId ? churchOptionsForDistrict(createForm.districtId) : []
);
const editChurchOptions = computed<Church[]>(() =>
  editForm.districtId ? churchOptionsForDistrict(editForm.districtId) : []
);
const isOwnDistrictSelected = (districtId: string) =>
  Boolean(districtId && districtId === userDistrictId.value);

const applyChurchLock = (mode: FormMode, districtId?: string) => {
  const lockRef = mode === "create" ? createChurchLocked : editChurchLocked;
  const form = mode === "create" ? createForm : editForm;
  const locked = isOwnDistrictSelected(districtId ?? "");
  lockRef.value = locked;
  if (locked) {
    form.churchId = userChurchId.value || "";
  } else if (!districtId) {
    form.churchId = "";
  }
};

const loadChurchesForDistrict = async (districtId: string, mode: FormMode) => {
  if (!districtId) {
    return;
  }
  churchesLoading[mode] = true;
  try {
    await catalog.loadChurches(districtId);
    churchesCache[districtId] = [...catalog.churches];
  } catch (error) {
    showError("Falha ao carregar igrejas do distrito", error);
  } finally {
    churchesLoading[mode] = false;
  }
};

const handleDistrictChange = async (
  mode: FormMode,
  districtId: string,
  previousDistrictId?: string
) => {
  const form = mode === "create" ? createForm : editForm;
  if (previousDistrictId && previousDistrictId !== districtId) {
    form.churchId = "";
  }
  applyChurchLock(mode, districtId);
  if (!districtId) {
    return;
  }
  await loadChurchesForDistrict(districtId, mode);
  const locked = mode === "create" ? createChurchLocked.value : editChurchLocked.value;
  if (locked && userChurchId.value) {
    form.churchId = userChurchId.value;
  }
};

type FormMode = "create" | "edit";

type EventForm = {
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  bannerUrl: string;
  isFree: boolean;
  minAgeYears: string;
  paymentMethods: PaymentMethod[];
  pendingPaymentValueRule: PendingPaymentValueRule;
  ministryId: string;
  districtId: string;
  churchId: string;
};

const slugifyValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const sanitizeSlugInput = (value: string) => slugifyValue(value ?? "");

const suggestSlugFromForm = (form: typeof createForm | typeof editForm) => {
  const titleSlug = slugifyValue(form.title);
  if (!titleSlug) return "";
  if (form.startDate) {
    const year = new Date(form.startDate).getFullYear();
    if (!Number.isNaN(year)) {
      return slugifyValue(`${form.title}-${year}`);
    }
  }
  return titleSlug;
};

const applySlugSuggestion = (mode: FormMode) => {
  const form = mode === "create" ? createForm : editForm;
  form.slug = suggestSlugFromForm(form);
};

const createForm = reactive<EventForm>({
  title: "",
  slug: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  bannerUrl: "",
  isFree: false,
  minAgeYears: "",
  paymentMethods: defaultPaymentMethodValues(),
  pendingPaymentValueRule: defaultPendingPaymentValueRule,
  ministryId: "",
  districtId: "",
  churchId: ""
});

const editForm = reactive<EventForm>({
  title: "",
  slug: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  bannerUrl: "",
  isFree: false,
  minAgeYears: "",
  paymentMethods: defaultPaymentMethodValues(),
  pendingPaymentValueRule: defaultPendingPaymentValueRule,
  ministryId: "",
  districtId: "",
  churchId: ""
});

const editingEventId = ref<string | null>(null);
const loadingEvents = ref(true);
const savingCreate = ref(false);
const savingEdit = ref(false);
const createModalOpen = ref(false);
const editModalOpen = ref(false);
const createChurchLocked = ref(false);
const editChurchLocked = ref(false);

const confirmDelete = reactive({
  open: false,
  target: null as ApiEvent | null
});

const confirmDeleteDescription = computed(() => {
  if (!confirmDelete.target) {
    return "Confirme a exclusão do evento selecionado.";
  }
  return `Tem certeza que deseja excluir o evento "${confirmDelete.target.title}"? Esta ação não pode ser desfeita.`;
});

const details = reactive({
  open: false,
  event: null as ApiEvent | null
});

const lotForm = reactive({
  name: "",
  price: "",
  startsAt: "",
  endsAt: ""
});
const lotSaving = ref(false);
const lotDeletingId = ref<string | null>(null);
const editingLotId = ref<string | null>(null);
const loadingLots = ref(false);
const lotModalOpen = ref(false);

const lotsForDetails = computed<EventLot[]>(() => {
  if (!details.event) return [];
  const lots = admin.eventLots[details.event.id];
  return lots ?? [];
});

watch(
  activeMinistries,
  () => {
    if (
      !createForm.ministryId ||
      !activeMinistries.value.some((ministry) => ministry.id === createForm.ministryId)
    ) {
      createForm.ministryId = pickDefaultMinistryId();
    }
    if (
      editForm.ministryId &&
      !allMinistryOptions.value.some((ministry) => ministry.id === editForm.ministryId)
    ) {
      editForm.ministryId = "";
    }
  },
  { deep: true }
);

watch(
  () => createForm.districtId,
  (next, prev) => {
    handleDistrictChange("create", next, prev);
  }
);

watch(
  () => editForm.districtId,
  (next, prev) => {
    handleDistrictChange("edit", next, prev);
  }
);

watch(
  () => userDistrictId.value,
  async (next) => {
    if (next && !createForm.districtId) {
      createForm.districtId = next;
      applyChurchLock("create", next);
      await loadChurchesForDistrict(next, "create");
    } else if (next && createForm.districtId === next) {
      applyChurchLock("create", next);
    }
    if (next && editForm.districtId === next) {
      applyChurchLock("edit", next);
    }
  }
);

watch(
  () => userChurchId.value,
  (next) => {
    if (createChurchLocked.value) {
      createForm.churchId = next || "";
    }
    if (editChurchLocked.value) {
      editForm.churchId = next || "";
    }
  }
);

const formatDateTimeBr = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

const isLotActive = (lot: EventLot) => {
  const now = Date.now();
  const start = new Date(lot.startsAt).getTime();
  const end = lot.endsAt ? new Date(lot.endsAt).getTime() : null;
  if (Number.isNaN(start)) return false;
  if (end !== null && Number.isNaN(end)) return false;
  return start <= now && (end === null || end >= now);
};

const isLotFuture = (lot: EventLot) => {
  const start = new Date(lot.startsAt).getTime();
  if (Number.isNaN(start)) return false;
  return start > Date.now();
};

const lotStatusLabel = (lot: EventLot) => {
  if (isLotActive(lot)) return "Vigente";
  if (isLotFuture(lot)) return "Agendado";
  return "Encerrado";
};

const lotBadgeClass = (lot: EventLot) => {
  if (isLotActive(lot)) return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100";
  if (isLotFuture(lot)) return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100";
  return "bg-black/80 text-white dark:bg-neutral-900 dark:text-white";
};

const isCurrentLot = (lot: EventLot) => details.event?.currentLot?.id === lot.id;

const currentPriceDisplay = computed(() =>
  details.event?.isFree
    ? "Gratuíto"
    : formatCurrency(details.event?.currentPriceCents ?? details.event?.priceCents ?? 0)
);
const basePriceDisplay = computed(() =>
  details.event?.isFree ? "Gratuito" : formatCurrency(details.event?.priceCents ?? 0)
);

const errorDialog = reactive({
  open: false,
  title: "Ocorreu um erro",
  message: "",
  details: ""
});

const showError = (title: string, error: unknown) => {
  const anyError = error as {
    response?: { data?: { message?: string; details?: unknown } };
    message?: string;
  };
  const responseData = anyError?.response?.data ?? {};
  const message =
    (typeof responseData.message === "string" && responseData.message) ||
    anyError?.message ||
    "Não foi possível completar a operação.";
  const detailsValue =
    typeof responseData.details === "string"
      ? responseData.details
      : responseData.details
      ? JSON.stringify(responseData.details, null, 2)
      : "";
  errorDialog.title = title;
  errorDialog.message = message;
  errorDialog.details = detailsValue;
  errorDialog.open = true;
};

const assertPermission = (allowed: boolean, message: string) => {
  if (allowed) return true;
  showError("Acesso negado", { message });
  return false;
};

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
const uploadsBaseUrl = `${apiOrigin.replace(/\/$/, "")}/uploads`;
const createBannerInput = ref<HTMLInputElement | null>(null);
const editBannerInput = ref<HTMLInputElement | null>(null);
const bannerUploading = reactive<Record<FormMode, boolean>>({
  create: false,
  edit: false
});

const resolveBannerUrl = (value: string) => {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }
  const sanitized = value.replace(/^\/+/, "");
  if (!sanitized) return "";
  if (sanitized.startsWith("uploads/")) {
    return `${apiOrigin.replace(/\/$/, "")}/${sanitized}`;
  }
  return `${uploadsBaseUrl}/${sanitized}`;
};

const selectBannerFile = (mode: FormMode) => {
  if (mode === "create") {
    createBannerInput.value?.click();
    return;
  }
  editBannerInput.value?.click();
};

const performUpload = async (file: File) => {
  if (typeof admin.uploadAsset === "function") {
    return admin.uploadAsset(file);
  }
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/admin/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data as { fileName: string };
};

const handleBannerUpload = async (mode: FormMode, file: File) => {
  bannerUploading[mode] = true;
  try {
    const { fileName } = await performUpload(file);
    if (mode === "create") {
      createForm.bannerUrl = fileName;
    } else {
      editForm.bannerUrl = fileName;
    }
  } catch (error) {
    showError("Falha ao enviar imagem", error);
  } finally {
    bannerUploading[mode] = false;
  }
};

const onBannerFileChange = async (mode: FormMode, domEvent: Event) => {
  const input = domEvent.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  await handleBannerUpload(mode, file);
  if (input) {
    input.value = "";
  }
};

const toLocalInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (input: number) => input.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toLocalInputSafe = (value?: string) => {
  const base = value ?? new Date().toISOString();
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) {
    return toLocalInput(new Date().toISOString());
  }
  return toLocalInput(date.toISOString());
};

const resetLotForm = () => {
  const defaultPriceCents = details.event
    ? details.event.currentPriceCents ?? details.event.priceCents
    : 0;
  editingLotId.value = null;
  lotForm.name = "";
  lotForm.price = formatPriceDisplay(defaultPriceCents);
  const referenceStart =
    details.event?.currentLot?.startsAt ?? details.event?.startDate ?? new Date().toISOString();
  lotForm.startsAt = toLocalInputSafe(referenceStart);
  lotForm.endsAt = "";
};

const startLotEdit = (lot: EventLot) => {
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para editar lotes.")) {
    return;
  }
  editingLotId.value = lot.id;
  lotForm.name = lot.name;
  lotForm.price = formatPriceDisplay(lot.priceCents);
  lotForm.startsAt = toLocalInput(lot.startsAt);
  lotForm.endsAt = lot.endsAt ? toLocalInput(lot.endsAt) : "";
  lotModalOpen.value = true;
};

const cancelLotEdit = () => {
  resetLotForm();
  lotModalOpen.value = false;
};

const openLotCreateModal = () => {
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para editar lotes")) {
    return;
  }
  resetLotForm();
  lotModalOpen.value = true;
};

const refreshDetailsEvent = () => {
  if (!details.event) return;
  const updated = admin.events.find((event) => event.id === details.event?.id);
  if (updated) {
    details.event = updated;
    resetLotForm();
  }
};

const resetCreateForm = () => {
  createForm.title = "";
  createForm.slug = "";
  createForm.description = "";
  createForm.startDate = "";
  createForm.endDate = "";
  createForm.location = "";
  createForm.bannerUrl = "";
  createForm.isFree = false;
  createForm.minAgeYears = "";
  createForm.paymentMethods = defaultPaymentMethodValues();
  createForm.pendingPaymentValueRule = defaultPendingPaymentValueRule;
  createForm.ministryId = pickDefaultMinistryId();
  createForm.districtId = userDistrictId.value || "";
  createForm.churchId = userDistrictId.value ? userChurchId.value || "" : "";
  applyChurchLock("create", createForm.districtId);
  if (createForm.districtId) {
    loadChurchesForDistrict(createForm.districtId, "create");
  } else {
    createChurchLocked.value = false;
  }
};

const resetEditForm = () => {
  editForm.title = "";
  editForm.slug = "";
  editForm.description = "";
  editForm.startDate = "";
  editForm.endDate = "";
  editForm.location = "";
  editForm.bannerUrl = "";
  editForm.isFree = false;
  editForm.minAgeYears = "";
  editForm.paymentMethods = defaultPaymentMethodValues();
  editForm.pendingPaymentValueRule = defaultPendingPaymentValueRule;
  editForm.ministryId = pickDefaultMinistryId();
  editForm.districtId = "";
  editForm.churchId = "";
  editChurchLocked.value = false;
};

const openCreateModal = () => {
  if (!assertPermission(eventPermissions.canCreate.value, "Você não possui permissão para criar eventos.")) {
    return;
  }
  resetCreateForm();
  createModalOpen.value = true;
};

const handleCreateModalToggle = (value: boolean) => {
  createModalOpen.value = value;
  if (!value) {
    resetCreateForm();
  }
};

const handleEditModalToggle = (value: boolean) => {
  if (!value) {
    cancelEdit();
  } else {
    editModalOpen.value = true;
  }
};

const submitLot = async () => {
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para gerenciar lotes.")) {
    return;
  }
  if (!details.event) return;
  if (!lotForm.name.trim()) {
    showError("Falha ao salvar lote", { message: "Informe o nome do lote." });
    return;
  }
  if (!lotForm.startsAt) {
    showError("Falha ao salvar lote", { message: "Informe a data de início do lote." });
    return;
  }

  const priceCents = toPriceCents(lotForm.price);
  const startDate = new Date(lotForm.startsAt);
  if (Number.isNaN(startDate.getTime())) {
    showError("Falha ao salvar lote", { message: "Data inicial inválida." });
    return;
  }

  let endsAtIso: string | null = null;
  if (lotForm.endsAt) {
    const endDate = new Date(lotForm.endsAt);
    if (Number.isNaN(endDate.getTime())) {
      showError("Falha ao salvar lote", { message: "Data final inválida." });
      return;
    }
    if (endDate <= startDate) {
      showError("Falha ao salvar lote", { message: "A data final deve ser posterior a data inicial." });
      return;
    }
    endsAtIso = endDate.toISOString();
  }

  lotSaving.value = true;
  try {
    if (editingLotId.value) {
      // Editar lote existente
      await admin.updateEventLot(details.event.id, editingLotId.value, {
        name: lotForm.name.trim(),
        priceCents,
        startsAt: startDate.toISOString(),
        endsAt: endsAtIso
      });
    } else {
      // Criar novo lote
      await admin.createEventLot(details.event.id, {
        name: lotForm.name.trim(),
        priceCents,
        startsAt: startDate.toISOString(),
        endsAt: endsAtIso
      });
    }
    refreshDetailsEvent();
    resetLotForm();
    lotModalOpen.value = false;
  } catch (error) {
    showError("Falha ao salvar lote", error);
  } finally {
    lotSaving.value = false;
  }
};

const deleteLot = async (lot: EventLot) => {
  if (!assertPermission(eventPermissions.canDelete.value, "Você não possui permissão para excluir lotes.")) {
    return;
  }
  if (!details.event) return;
  if (!window.confirm(`Remover o lote "${lot.name}"?`)) {
    return;
  }
  lotDeletingId.value = lot.id;
  try {
    await admin.deleteEventLot(details.event.id, lot.id);
    refreshDetailsEvent();
  } catch (error) {
    showError("Falha ao remover lote", error);
  } finally {
    lotDeletingId.value = null;
  }
};

watch(
  () => details.event?.id,
  () => {
    if (details.open) {
      resetLotForm();
    }
  }
);

watch(
  () => admin.events,
  () => {
    if (details.open) {
      refreshDetailsEvent();
    }
  }
);

const submitCreate = async () => {
  if (!assertPermission(eventPermissions.canCreate.value, "Você não possui permissão para criar eventos.")) {
    return;
  }
  if (!createForm.paymentMethods.length) {
    showError("Falha ao criar evento", { message: "Selecione ao menos uma forma de pagamento." });
    return;
  }
  if (!createForm.ministryId) {
    showError("Falha ao criar evento", { message: "Selecione o ministerio responsavel pelo evento." });
    return;
  }
  if (!createForm.districtId) {
    showError("Falha ao criar evento", { message: "Selecione o distrito do evento." });
    return;
  }
  if (createChurchLocked.value && !userChurchId.value) {
    showError("Falha ao criar evento", {
      message:
        "Cadastre sua igreja no perfil para vincular eventos do proprio distrito automaticamente."
    });
    return;
  }
  const normalizedSlug = sanitizeSlugInput(createForm.slug);
  savingCreate.value = true;
  try {
    await admin.saveEvent({
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      startDate: new Date(createForm.startDate).toISOString(),
      endDate: new Date(createForm.endDate).toISOString(),
      location: createForm.location.trim(),
      bannerUrl: createForm.bannerUrl.trim() || undefined,
      slug: normalizedSlug || undefined,
      isFree: createForm.isFree,
      priceCents: 0,
      paymentMethods: [...createForm.paymentMethods],
      pendingPaymentValueRule: createForm.pendingPaymentValueRule,
      minAgeYears: createForm.minAgeYears ? Number(createForm.minAgeYears) : undefined,
      isActive: true,
      ministryId: createForm.ministryId,
      districtId: createForm.districtId
    } as Partial<ApiEvent>);
    resetCreateForm();
    createModalOpen.value = false;
  } catch (error) {
    showError("Falha ao criar evento", error);
  } finally {
    savingCreate.value = false;
  }
};

const submitEdit = async () => {
  if (!editingEventId.value) return;
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para editar eventos.")) {
    return;
  }
  if (!editForm.paymentMethods.length) {
    showError("Falha ao atualizar evento", { message: "Selecione ao menos uma forma de pagamento." });
    return;
  }
  if (!editForm.ministryId) {
    showError("Falha ao atualizar evento", { message: "Selecione o ministerio responsavel pelo evento." });
    return;
  }
  if (!editForm.districtId) {
    showError("Falha ao atualizar evento", { message: "Selecione o distrito do evento." });
    return;
  }
  if (editChurchLocked.value && !userChurchId.value) {
    showError("Falha ao atualizar evento", {
      message:
        "Cadastre sua igreja no perfil para vincular eventos do proprio distrito automaticamente."
    });
    return;
  }
  const normalizedSlug = sanitizeSlugInput(editForm.slug);
  savingEdit.value = true;
  try {
    await admin.saveEvent({
      id: editingEventId.value,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      startDate: new Date(editForm.startDate).toISOString(),
      endDate: new Date(editForm.endDate).toISOString(),
      location: editForm.location.trim(),
      bannerUrl: editForm.bannerUrl.trim() || undefined,
      slug: normalizedSlug || undefined,
      isFree: editForm.isFree,
      minAgeYears: editForm.minAgeYears ? Number(editForm.minAgeYears) : undefined,
      priceCents: 0,
      paymentMethods: [...editForm.paymentMethods],
      pendingPaymentValueRule: editForm.pendingPaymentValueRule,
      ministryId: editForm.ministryId,
      districtId: editForm.districtId
    } as Partial<ApiEvent>);
    cancelEdit();
  } catch (error) {
    showError("Falha ao atualizar evento", error);
  } finally {
    savingEdit.value = false;
  }
};

const startEdit = (event: ApiEvent) => {
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para editar eventos.")) {
    return;
  }
  editingEventId.value = event.id;
  editForm.title = event.title;
  editForm.slug = event.slug;
  editForm.description = event.description;
  editForm.startDate = toLocalInput(event.startDate);
  editForm.endDate = toLocalInput(event.endDate);
  editForm.location = event.location;
  editForm.bannerUrl = (event as any).bannerUrl || "";
  editForm.isFree = event.isFree;
  editForm.minAgeYears = event.minAgeYears != null ? String(event.minAgeYears) : "";
  editForm.paymentMethods =
    event.paymentMethods && event.paymentMethods.length
      ? [...event.paymentMethods]
      : defaultPaymentMethodValues();
  editForm.pendingPaymentValueRule =
    event.pendingPaymentValueRule ?? defaultPendingPaymentValueRule;
  editForm.ministryId = event.ministryId ?? "";
  editForm.districtId = event.districtId ?? "";
  editForm.churchId = event.churchId ?? "";
  applyChurchLock("edit", editForm.districtId);
  if (editForm.districtId) {
    handleDistrictChange("edit", editForm.districtId);
  }
  editModalOpen.value = true;
};

const cancelEdit = () => {
  editingEventId.value = null;
  resetEditForm();
  editModalOpen.value = false;
};

const toggleActive = async (event: ApiEvent) => {
  if (!assertPermission(eventPermissions.canEdit.value, "Você não possui permissão para editar eventos.")) {
    return;
  }
  try {
    await admin.saveEvent({
      id: event.id,
      isActive: !event.isActive
    });
  } catch (error) {
    showError("Falha ao atualizar status do evento", error);
  }
};

const openDelete = (event: ApiEvent) => {
  if (!assertPermission(eventPermissions.canDelete.value, "VocÃª não possui permissão para excluir eventos.")) {
    return;
  }
  confirmDelete.target = event;
  confirmDelete.open = true;
};

const closeDeleteDialog = () => {
  confirmDelete.open = false;
  confirmDelete.target = null;
};

const handleDelete = async () => {
  if (!confirmDelete.target) return;
  if (!assertPermission(eventPermissions.canDelete.value, "VocÃª não possui permissão para excluir eventos.")) {
    closeDeleteDialog();
    return;
  }
  try {
    await admin.deleteEvent(confirmDelete.target.id);
    closeDeleteDialog();
  } catch (error) {
    showError("NÃ£o foi possÃ­vel excluir o evento", error);
  }
};

const openDetails = async (event: ApiEvent) => {
  details.event = event;
  details.open = true;
  resetLotForm();
  loadingLots.value = true;
  try {
    await admin.loadEventLots(event.id);
    refreshDetailsEvent();
  } catch (error) {
    showError("Falha ao carregar lotes do evento", error);
  } finally {
    loadingLots.value = false;
  }
};

const closeDetails = () => {
  details.open = false;
  details.event = null;
  resetLotForm();
  lotDeletingId.value = null;
  loadingLots.value = false;
};

watch(
  () => admin.events,
  () => {
    if (details.event) {
      refreshDetailsEvent();
    }
  }
);

onMounted(async () => {
  if (!eventPermissions.canList.value) {
    loadingEvents.value = false;
    return;
  }
  try {
    const loaders = [
      admin.loadEvents(),
      catalog.loadMinistries(),
      catalog.loadDistricts()
    ];
    if (userDistrictId.value) {
      loaders.push(loadChurchesForDistrict(userDistrictId.value, "create"));
    }
    await Promise.all(loaders);
    if (!createForm.ministryId) {
      createForm.ministryId = pickDefaultMinistryId();
    }
    if (!createForm.districtId && userDistrictId.value) {
      createForm.districtId = userDistrictId.value;
      applyChurchLock("create", createForm.districtId);
    }
    if (!admin.events.length && eventPermissions.canCreate.value) {
      createModalOpen.value = true;
    }
  } catch (error) {
    showError("Falha ao carregar eventos ou catálogos", error);
  } finally {
    loadingEvents.value = false;
  }
});
</script>





