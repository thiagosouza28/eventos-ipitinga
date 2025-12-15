<template>
  <div v-if="registrationPermissions.canList" class="space-y-6" data-uppercase-scope>
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <BaseCard
      class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
    >
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Gestão de inscritos
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Inscrições</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {{ hideFilters ? 'Visualize apenas as inscrições da sua igreja.' : 'Filtre e gerencie inscrições por evento, distrito, igreja ou status.' }}
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink
            to="/admin/dashboard"
            class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Dashboard
          </RouterLink>
          <button
            v-if="registrationPermissions.canCreate"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition hover:translate-y-0.5"
            @click="openAddDialog"
          >
            + Nova inscrição
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
      v-if="!hideFilters"
    >
      <form @submit.prevent="applyFilters" class="grid gap-5 md:grid-cols-12">
        <div class="space-y-2 md:col-span-3">
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Evento</label>
          <select
            v-model="filters.eventId"
            :disabled="isEventFilterLocked"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">{{ isEventFilterLocked ? 'Evento vinculado' : 'Todos' }}</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
          </select>
        </div>
        <div class="space-y-2 md:col-span-3">
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Distrito</label>
          <select
            v-model="filters.districtId"
            :disabled="isDistrictFilterLocked"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">{{ isDistrictFilterLocked ? 'Distrito vinculado' : 'Todos' }}</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
          </select>
        </div>
        <div class="space-y-2 md:col-span-3">
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Igreja</label>
          <select
            v-model="filters.churchId"
            :disabled="isChurchFilterLocked || !filters.districtId"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">{{ isChurchFilterLocked ? 'Igreja vinculada' : (filters.districtId ? 'Todas' : 'Selecione o distrito') }}</option>
            <option v-for="church in churchesByDistrict(filters.districtId)" :key="church.id" :value="church.id">
              {{ church.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2 md:col-span-3">
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Status</label>
          <select
            v-model="filters.status"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">Todos</option>
            <option v-for="option in registrationStatusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="space-y-2 md:col-span-6">
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Busca (nome ou CPF)
          </label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Digite nome ou CPF"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
            autocomplete="off"
          />
        </div>
        <div class="md:col-span-12 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            @click="resetFilters"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isApplying"
          >
            <span
              v-if="isApplying"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
            />
            <span>{{ isApplying ? "Aplicando..." : "Aplicar filtro" }}</span>
          </button>
        </div>
      </form>
    </BaseCard>

    <!-- Lista de inscrições -->
    <BaseCard
      class="border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
    >
      <TableSkeleton
        v-if="isApplying && admin.registrations.length === 0"
        helperText="?? Buscando inscrições..."
      />
      <div v-else-if="displayedRegistrations.length === 0" class="p-6 text-sm text-neutral-500 dark:text-neutral-400">
        Nenhuma inscrição encontrada.
      </div>
      <div
        v-else
        class="overflow-hidden rounded-sm border border-white/40 bg-white/70 shadow-lg shadow-neutral-200/40 dark:border-white/10 dark:bg-neutral-950/40 dark:shadow-black/30"
      >
        <table class="min-w-full table-auto text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="w-20 px-5 py-3">Foto</th>
              <th class="px-5 py-3">Participante</th>
              <th class="px-5 py-3">Evento</th>
              <th class="px-5 py-3">Distrito / Igreja</th>
              <th class="px-5 py-3">Nascimento</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="registration in displayedRegistrations"
              :key="registration.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-4 align-top">
                <img
                  :src="resolvePhotoUrl(registration.photoUrl)"
                  class="h-12 w-12 rounded-full border border-white/70 object-cover dark:border-white/10"
                  :alt="`Foto de ${registration.fullName}`"
                />
              </td>
              <td class="px-5 py-4 align-top">
                <div class="font-semibold text-neutral-900 dark:text-white">{{ registration.fullName }}</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">CPF: {{ formatCPF(registration.cpf) }}</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  Inscrição: {{ registrationCode(registration) }}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  Criado em: {{ formatDateTime(registration.createdAt) }}
                </div>
              </td>
              <td class="px-5 py-4 align-top">
                <div class="font-medium text-neutral-800 dark:text-neutral-200">{{ findEventTitle(registration.eventId) }}</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ formatCurrency(registration.priceCents ?? findEventPriceCents(registration.eventId)) }}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  Pagamento: {{ paymentMethodLabel(registration.paymentMethod) }}
                </div>
              </td>
              <td class="px-5 py-4 align-top">
                <div class="text-sm text-neutral-700 dark:text-neutral-300">
                  {{ findDistrictName(registration.districtId) }}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ findChurchName(registration.churchId) }}
                </div>
              </td>
              <td class="px-5 py-4 align-top">
                <div class="text-sm text-neutral-700 dark:text-neutral-300">{{ formatBirthDate(registration.birthDate) }}</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ calculateAge(registration.birthDate) }} anos
                </div>
              </td>
              <td class="px-5 py-4 align-top">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase"
                  :class="statusBadgeClass(registration.status)"
                >
                  {{ translateStatus(registration.status) }}
                </span>
                <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <span v-if="registration.paymentMethod">
                    Forma: {{ paymentMethodShort(registration.paymentMethod) }}
                  </span>
                </div>
                <div v-if="registration.paidAt" class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Pago em {{ new Date(registration.paidAt).toLocaleString("pt-BR") }}
                </div>
              </td>
              <td class="px-5 py-4 align-top text-right">
                <div class="inline-flex flex-wrap justify-end gap-2 text-xs font-semibold uppercase tracking-wide">
                  <button
                    v-if="registrationPermissions.canEdit"
                    class="text-primary-600 hover:text-primary-500"
                    @click="openEdit(registration)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="isPaymentLinkVisible(registration) && registrationPermissions.canEdit"
                    class="text-primary-600 hover:text-primary-500"
                    @click="copyPaymentLink(registration)"
                  >
                    Link pagamento
                  </button>
                  <button
                    v-if="canEmitReceipt(registration)"
                    class="text-primary-600 hover:text-primary-500"
                    @click="downloadReceipt(registration)"
                  >
                    <span
                      v-if="receiptDownloadState.downloadingId === registration.id"
                      class="mr-1 inline-block h-3 w-3 animate-spin rounded-full border border-current border-b-transparent"
                    />
                    Comprovante
                  </button>
                  <button
                    v-if="
                      registration.paymentMethod === 'CASH' &&
                      registration.status === 'PENDING_PAYMENT' &&
                      registration.orderId &&
                      registrationPermissions.canFinancial
                    "
                    class="text-primary-600 hover:text-primary-500"
                    @click="openConfirm('confirm-cash', registration)"
                  >
                    Confirmar pagamento
                  </button>
                  <button
                    v-if="canConfirmManualPix(registration)"
                    class="text-primary-600 hover:text-primary-500"
                    @click="openManualPaymentDialog(registration)"
                  >
                    Confirmar PIX manual
                  </button>
                  <button
                    v-if="canViewManualProof(registration)"
                    class="text-primary-600 hover:text-primary-500"
                    @click="viewManualProof(registration)"
                  >
                    Ver anexo
                  </button>
                  <button
                    v-if="
                      canCancelRegistration(registration.status) &&
                      registration.status === 'PENDING_PAYMENT' &&
                      registrationPermissions.canDeactivate
                    "
                    class="text-red-600 hover:text-red-500"
                    @click="openConfirm('cancel', registration)"
                  >
                    Cancelar
                  </button>
                  <button
                    v-if="registration.status === 'PAID' && registrationPermissions.canFinancial"
                    class="text-neutral-900 transition hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-200"
                    @click="openConfirm('refund', registration)"
                  >
                    Estornar
                  </button>
                  <button
                    v-if="registration.status === 'CANCELED' && registrationPermissions.canApprove"
                    class="text-primary-600 hover:text-primary-500"
                    @click="openConfirm('reactivate', registration)"
                  >
                    Reativar
                  </button>
                  <button
                    v-if="canDeleteRegistration(registration.status) && registrationPermissions.canDelete"
                    class="text-red-600 hover:text-red-500"
                    @click="openConfirm('delete', registration)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Modal de adição -->
    <div v-if="addDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-4xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Nova inscrição</h3>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Informe os dados do responsável e do participante para gerar a inscrição.
        </p>
        <form @submit.prevent="saveNewRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <p class="text-xs font-semibold uppercase text-neutral-500">responsável</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF do responsável</label>
            <input
              :value="addForm.responsibleCpf"
              @input="onResponsibleCpfInput"
              @blur="handleResponsibleCpfLookup"
              inputmode="numeric"
              autocomplete="off"
              maxlength="14"
              placeholder="000.000.000-00"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <p
              v-if="responsibleLookup.message"
              :class="['mt-2 text-xs', responsibleLookup.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-300']"
            >
              {{ responsibleLookup.message }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Telefone do responsável</label>
            <input
              :value="addForm.responsiblePhone"
              @input="onResponsiblePhoneInput"
              inputmode="numeric"
              placeholder="(91) 99999-9999"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Evento</label>
            <select v-model="addForm.eventId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Forma de pagamento</label>
            <div class="mt-2 flex flex-wrap gap-4 text-sm">
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="PIX_MP" v-model="addDialog.paymentMethod" />
                PIX
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="CASH" v-model="addDialog.paymentMethod" />
                Dinheiro
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="FREE_PREVIOUS_YEAR" v-model="addDialog.paymentMethod" />
                Gratuita
              </label>
            </div>
          </div>
          <div
            v-if="addDialog.paymentMethod === 'PIX_MP'"
            class="md:col-span-2 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-200"
          >
            Será gerado um link de pagamento PIX após salvar. O link Será aberto e copiado automaticamente.
          </div>
          <div class="md:col-span-2 mt-4">
            <p class="text-xs font-semibold uppercase text-neutral-500">Participante</p>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nome completo</label>
            <input v-model="addForm.fullName" type="text" required minlength="3" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nascimento</label>
            <DateField v-model="addForm.birthDate" required class="mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">CPF do participante</label>
            <input
              :value="addForm.cpf"
              @input="onAddCpfInput"
              inputmode="numeric"
              autocomplete="off"
              maxlength="14"
              placeholder="000.000.000-00"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Gênero</label>
            <select v-model="addForm.gender" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="" disabled>Selecione</option>
              <option v-for="option in genderOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Distrito</label>
            <select v-model="addForm.districtId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="" disabled>Selecione</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Igreja</label>
            <select v-model="addForm.churchId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="" disabled>Selecione</option>
              <option v-for="church in churchesByDistrict(addForm.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Foto (opcional)</label>
            <div class="mt-1 flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept="image/*"
                class="block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100"
                @change="handleAddPhotoChange"
              />
              <div class="flex items-center gap-2">
                <img :src="addPhotoPreview || DEFAULT_PHOTO_DATA_URL" alt="Pré-visualização" class="h-20 w-20 rounded-lg object-cover" />
                <button
                  v-if="addPhotoPreview"
                  type="button"
                  class="text-xs font-medium text-red-600 hover:text-red-500"
                  @click="clearAddPhoto"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
          <div class="md:col-span-2 flex flex-col gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span v-if="responsibleLookup.status === 'success'">
              Igreja identificada automaticamente pelo CPF do responsável. Ajuste se necessário.
            </span>
            <span v-else>
              Informe o CPF do responsável da igreja selecionada para validação.
            </span>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="closeAdd">
              Cancelar
            </button>
            <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">
              Salvar inscrição
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de edição -->
    <div v-if="editDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Editar inscrição</h3>
        <form @submit.prevent="saveRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nome</label>
            <input v-model="editForm.fullName" type="text" required minlength="3" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div class="md:col-span-2 grid gap-2 md:grid-cols-3">
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">Forma de pagamento</label>
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{{ paymentMethodShort(editDialog.original?.paymentMethod || '') }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">Data do pagamento</label>
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{{ editDialog.original?.paidAt ? new Date(editDialog.original.paidAt).toLocaleString('pt-BR') : '—' }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">Data do estorno</label>
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{{ refundedAt ? new Date(refundedAt).toLocaleString('pt-BR') : '—' }}</p>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Foto do participante</label>
            <div class="mt-2 flex items-center gap-4">
              <img v-if="previewPhotoUrl" :src="previewPhotoUrl" alt="Foto do participante" class="h-16 w-16 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700" />
              <div v-else class="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                Sem foto
              </div>
              <div class="flex-1">
                <input type="file" accept="image/*" class="block w-full text-sm" @change="onEditPhotoChange" />
                <div class="mt-2 flex items-center gap-3">
                  <button type="button" class="text-xs text-neutral-600 underline dark:text-neutral-400" @click="clearEditPhoto" v-if="previewPhotoUrl">Remover foto</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nascimento</label>
            <DateField v-model="editForm.birthDate" required class="mt-1" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">CPF</label>
            <input :value="editForm.cpf" @input="onCpfInput" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito</label>
            <select v-model="editForm.districtId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja</label>
            <select v-model="editForm.churchId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="church in churchesByDistrict(editForm.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="closeEdit">Fechar</button>
            <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">Salvar alterações</button>
          </div>
        </form>
        <div class="mt-4">
          <h4 class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-100">Histórico da Inscrição</h4>
          <div v-if="historyLoading" class="py-2 text-sm text-neutral-500">Carregando histórico...</div>
          <ul v-else class="max-h-60 space-y-2 overflow-y-auto pr-2 text-sm">
            <li v-for="(e,idx) in registrationHistory" :key="idx" class="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
              <div class="flex items-center justify-between">
                <div class="font-medium text-neutral-700 dark:text-neutral-100">{{ humanEvent(e) }}</div>
                <div class="text-xs text-neutral-500">{{ new Date(e.at).toLocaleString('pt-BR') }}</div>
              </div>
              <div v-if="e.actor && (e.actor.name || e.actor.id)" class="mt-1 text-xs text-neutral-500">Por: {{ e.actor.name || e.actor.id }}</div>
              <pre v-if="e.details && showDetails(e.type)" class="mt-2 overflow-x-auto text-xs text-neutral-500">{{ formatDetails(e.details) }}</pre>
            </li>
            <li v-if="registrationHistory.length === 0" class="rounded-md border border-neutral-200 p-3 text-sm text-neutral-500 dark:border-neutral-800">Nenhum evento registrado.</li>
          </ul>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :model-value="confirmState.open"
      :title="confirmState.title"
      :description="confirmState.description"
      :confirm-label="confirmState.confirmLabel"
      :cancel-label="confirmState.cancelLabel"
      :type="confirmState.type"
      @update:modelValue="handleDialogVisibility"
      @confirm="executeConfirmAction"
      @cancel="resetConfirmState"
    />
    <div v-if="manualPayment.open" class="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">Confirmar pagamento manual</h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-300">
            Registre o recebimento manual do PIX e envie o comprovante para anexarmos à inscrição.
          </p>
        </div>
        <div class="mt-4 space-y-4">
          <div>
            <label class="text-xs font-semibold uppercase text-neutral-500">Referência interna</label>
            <input
              v-model="manualPayment.reference"
              type="text"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="PIX-MANUAL-..."
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase text-neutral-500">Data do pagamento</label>
            <input
              v-model="manualPayment.paidAt"
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase text-neutral-500">Comprovante</label>
            <input
              :key="manualPayment.fileInputKey"
              type="file"
              accept="image/*,application/pdf"
              class="mt-2 block w-full text-sm text-neutral-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100 dark:text-neutral-300"
              @change="handleManualProofChange"
            />
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Formatos aceitos: JPG, PNG ou PDF (até 5 MB).
            </p>
            <div
              v-if="manualPayment.filePreview"
              class="mt-3 overflow-hidden rounded-xl border border-neutral-200 shadow-inner dark:border-neutral-700"
            >
              <img
                :src="manualPayment.filePreview"
                alt="Pré-visualização do comprovante"
                class="max-h-52 w-full bg-neutral-50 object-contain dark:bg-neutral-900"
              />
              <div class="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                {{ manualPayment.fileName }}
              </div>
            </div>
            <div
              v-else-if="manualPayment.fileName"
              class="mt-3 rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              {{ manualPayment.fileName }} ({{ manualPayment.fileType || 'arquivo' }})
            </div>
            <button
              v-if="manualPayment.existingProofUrl"
              type="button"
              class="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-500"
              @click="openExistingManualProof"
            >
              Abrir comprovante já anexado
            </button>
          </div>
          <p v-if="manualPayment.error" class="text-sm text-red-500">
            {{ manualPayment.error }}
          </p>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
            :disabled="manualPayment.submitting"
            @click="closeManualPaymentDialog"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
            :disabled="manualPayment.submitting"
            @click="submitManualPayment"
          >
            <span
              v-if="manualPayment.submitting"
              class="mr-2 h-4 w-4 animate-spin rounded-full border border-white border-b-transparent"
            />
            Confirmar pagamento
          </button>
        </div>
      </div>
    </div>
    <div v-if="processing.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div class="rounded-lg bg-white px-6 py-4 text-sm shadow dark:bg-neutral-900">
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
          <span class="text-neutral-700 dark:text-neutral-100">{{ processing.message }}</span>
        </div>
      </div>
    </div>
  </div>
  <AccessDeniedNotice v-else module="registrations" action="view" />
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'

import DateField from '../../components/forms/DateField.vue'
import BaseCard from '../../components/ui/BaseCard.vue'
import ErrorDialog from '../../components/ui/ErrorDialog.vue'
import AccessDeniedNotice from '../../components/admin/AccessDeniedNotice.vue'
import TableSkeleton from '../../components/ui/TableSkeleton.vue'
import { useAdminStore } from '../../stores/admin'
import { useCatalogStore } from '../../stores/catalog'
import { useAuthStore } from '../../stores/auth'
import type { Church, Registration } from '../../types/api'
import { formatCurrency } from '../../utils/format'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { validateCPF, normalizeCPF, formatCPF } from '../../utils/cpf'
import { paymentMethodLabel } from '../../config/paymentMethods'
import { DEFAULT_PHOTO_DATA_URL } from '../../config/defaultPhoto'
import { useModulePermissions } from '../../composables/usePermissions'
import { createPreviewSession } from '../../utils/documentPreview'

const admin = useAdminStore()
const catalog = useCatalogStore()
const auth = useAuthStore()
const registrationPermissions = useModulePermissions('registrations')

const filters = reactive({
  eventId: '',
  districtId: '',
  churchId: '',
  status: '',
  search: ''
})

const currentUser = computed(() => auth.user)
const userRole = computed(() => currentUser.value?.role ?? null)
const isLocalDirector = computed(() => userRole.value === 'DiretorLocal')
const hideFilters = computed(() => isLocalDirector.value)
const lockedDistrictId = computed(() => (isLocalDirector.value ? currentUser.value?.districtScopeId ?? '' : ''))
const lockedChurchId = computed(() => (isLocalDirector.value ? currentUser.value?.churchId ?? '' : ''))
const activeEventId = computed(() => admin.events.find((event) => event.isActive)?.id ?? admin.events[0]?.id ?? '')
const lockedEventId = computed(() => (isLocalDirector.value ? activeEventId.value : ''))
const isDistrictFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedDistrictId.value))
const isChurchFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedChurchId.value))
const isEventFilterLocked = computed(() => isLocalDirector.value && Boolean(lockedEventId.value))

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_PAYMENT: 'Pendente',
  PAID: 'Pago',
  CANCELED: 'Cancelada',
  REFUNDED: 'Estornada',
  CHECKED_IN: 'Check-in realizado'
}

const registrationStatusOptions = [
  { value: 'DRAFT', label: statusLabels.DRAFT },
  { value: 'PENDING_PAYMENT', label: statusLabels.PENDING_PAYMENT },
  { value: 'PAID', label: statusLabels.PAID },
  { value: 'CHECKED_IN', label: statusLabels.CHECKED_IN },
  { value: 'CANCELED', label: statusLabels.CANCELED },
  { value: 'REFUNDED', label: statusLabels.REFUNDED }
]

const genderOptions = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' }
]

const filtersReady = ref(false)
const isApplying = ref(false)
let applyDebounce: number | null = null
const pendingApply = ref(false)

const errorDialog = reactive({ open: false, title: 'Ocorreu um erro', message: '', details: '' })

const extractErrorInfo = (error: unknown) => {
  const anyError = error as { response?: { data?: { message?: string; details?: unknown } }; message?: string }
  const responseData = anyError?.response?.data ?? {}
  const message = (typeof responseData.message === 'string' && responseData.message) || anyError?.message || 'Ocorreu um erro inesperado.'
  let details = ''
  const raw = responseData?.details
  if (raw) details = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
  return { message, details }
}

const showError = (title: string, error: unknown) => {
  const { message, details } = extractErrorInfo(error)
  errorDialog.title = title
  errorDialog.message = message
  errorDialog.details = details
  errorDialog.open = true
}

const applyScopedFilters = () => {
  if (!isLocalDirector.value) {
    return false
  }
  let hasChanged = false
  if (lockedEventId.value && filters.eventId !== lockedEventId.value) {
    filters.eventId = lockedEventId.value
    hasChanged = true
  }
  if (lockedDistrictId.value && filters.districtId !== lockedDistrictId.value) {
    filters.districtId = lockedDistrictId.value
    hasChanged = true
  }
  if (lockedChurchId.value && filters.churchId !== lockedChurchId.value) {
    filters.churchId = lockedChurchId.value
    hasChanged = true
  }
  return hasChanged
}

const buildFilterParams = () => {
  if (isLocalDirector.value) {
    return {
      eventId: lockedEventId.value || undefined,
      districtId: lockedDistrictId.value || undefined,
      churchId: lockedChurchId.value || undefined
    }
  }
  return {
    eventId: filters.eventId || undefined,
    districtId: filters.districtId || undefined,
    churchId: filters.churchId || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined
  }
}

const applyFilters = async () => {
  if (!registrationPermissions.canList.value) { return }
  if (isApplying.value) { pendingApply.value = true; return }
  if (applyDebounce) { window.clearTimeout(applyDebounce); applyDebounce = null }
  isApplying.value = true
  try {
    await admin.loadRegistrations(buildFilterParams())
  } catch (error) {
    showError('Falha ao carregar inscrições', error)
  } finally {
    isApplying.value = false
    if (pendingApply.value) { pendingApply.value = false; scheduleApply(true) }
  }
}

const scheduleApply = (immediate = false) => {
  if (immediate) { applyFilters(); return }
  if (!filtersReady.value) return
  if (applyDebounce) window.clearTimeout(applyDebounce)
  applyDebounce = window.setTimeout(applyFilters, 300)
}

const resetFilters = () => {
  Object.assign(filters, { eventId: '', districtId: '', churchId: '', status: '', search: '' })
  const changed = applyScopedFilters()
  if (filtersReady.value) {
    if (changed) {
      scheduleApply(true)
    } else {
      scheduleApply()
    }
  }
}

watch(() => filters.districtId, async (value) => {
  if (isDistrictFilterLocked.value && lockedDistrictId.value && value !== lockedDistrictId.value) {
    filters.districtId = lockedDistrictId.value || ''
    return
  }
  if (!filtersReady.value) return
  try { await catalog.loadChurches(value || undefined) } catch (e) { showError('Falha ao carregar igrejas', e) }
  if (filters.churchId && !catalog.churches.some(c => c.id === filters.churchId)) filters.churchId = ''
  scheduleApply()
})
watch(() => filters.eventId, (value) => {
  if (isEventFilterLocked.value && lockedEventId.value && value !== lockedEventId.value) {
    filters.eventId = lockedEventId.value || ''
    return
  }
  if (filtersReady.value) scheduleApply()
})
watch(() => filters.churchId, (value) => {
  if (isChurchFilterLocked.value && lockedChurchId.value && value !== lockedChurchId.value) {
    filters.churchId = lockedChurchId.value || ''
    return
  }
  if (filtersReady.value) scheduleApply()
})
watch(() => filters.status, () => { if (filtersReady.value) scheduleApply() })

watch(
  [lockedEventId, lockedDistrictId, lockedChurchId],
  () => {
    const changed = applyScopedFilters()
    if (changed && filtersReady.value) {
      scheduleApply(true)
    }
  }
)

onMounted(async () => {
  try {
    await Promise.all([admin.loadEvents(), catalog.loadDistricts(), catalog.loadChurches()])
  } catch (error) {
    showError('Falha ao carregar dados iniciais', error)
  }
  applyScopedFilters()
  await applyFilters()
  filtersReady.value = true
})

const churchesByDistrict = (districtId: string): Church[] => {
  if (!districtId) return catalog.churches
  return catalog.churches.filter((c) => c.districtId === districtId)
}

const findEventTitle = (eventId: string) => admin.events.find((e) => e.id === eventId)?.title ?? 'Evento'
const findEventPriceCents = (eventId: string) => {
  const event = admin.events.find((e) => e.id === eventId)
  return event?.currentPriceCents ?? event?.priceCents ?? 0
}
const findDistrictName = (id: string) => catalog.districts.find((d) => d.id === id)?.name ?? 'Não informado'
const findChurchName = (id: string) => catalog.churches.find((c) => c.id === id)?.name ?? 'Não informado'

type DateParts = { year: number; month: number; day: number }
const parseDateParts = (value: string | Date | null | undefined): DateParts | null => {
  if (!value) return null
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        return { year, month, day }
      }
    }
  }
  const source = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(source.getTime())) return null
  return {
    year: source.getUTCFullYear(),
    month: source.getUTCMonth() + 1,
    day: source.getUTCDate()
  }
}
const formatDateDisplay = (parts: DateParts) => {
  const day = String(parts.day).padStart(2, '0')
  const month = String(parts.month).padStart(2, '0')
  return `${day}/${month}/${parts.year}`
}
const formatDateInputValue = (value: string | Date | null | undefined) => {
  const parts = parseDateParts(value)
  if (!parts) return ''
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}
function formatBirthDate(value: string | Date | null | undefined) {
  const parts = parseDateParts(value)
  if (!parts) return 'Não informado'
  return formatDateDisplay(parts)
}

function calculateAge(value?: string | Date | null) {
  const parts = parseDateParts(value ?? null)
  if (!parts) return '--'
  const today = new Date()
  let age = today.getFullYear() - parts.year
  const monthDiff = today.getMonth() + 1 - parts.month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parts.day)) {
    age -= 1
  }
  return age >= 0 ? String(age) : '--'
}
function formatDateTime(value?: string | Date | null) {
  if (!value) return '-'
  const source = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(source.getTime())) return '-'
  return source.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const translateStatus = (s: string) => statusLabels[s] ?? s
const statusBadgeClass = (s: string) => {
  switch (s) {
    case "PENDING_PAYMENT":
      return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100";
    case "PAID":
      return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100";
    case "CHECKED_IN":
      return "bg-primary-200 text-primary-800 dark:bg-primary-500/30 dark:text-primary-50";
    case "REFUNDED":
      return "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white";
    case "CANCELED":
      return "bg-black text-white dark:bg-neutral-900 dark:text-white";
    case "DRAFT":
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
  }
};

// Busca local por nome/CPF
const displayedRegistrations = computed(() => {
  const q = (filters.search || '').trim().toLowerCase()
  if (!q) return admin.registrations
  const digits = q.replace(/\D/g, '')
  return admin.registrations.filter((r) => {
    const nameMatch = (r.fullName || '').toLowerCase().includes(q)
    const cpfMatch = digits ? String(r.cpf || '').includes(digits) : false
    return nameMatch || cpfMatch
  })
})

function registrationCode(registration: Registration | null | undefined) {
  if (!registration) return ''
  if (registration.orderId) return registration.orderId
  if (registration.id) {
    const suffix = registration.id.slice(-8)
    return suffix.toUpperCase()
  }
  return ''
}

// Nova inscrição (PIX, Dinheiro ou Gratuita)
const addDialog = reactive({ open: false, paymentMethod: 'PIX_MP' as 'PIX_MP' | 'CASH' | 'FREE_PREVIOUS_YEAR' })
const addForm = reactive({
  eventId: '',
  fullName: '',
  birthDate: '',
  cpf: '',
  gender: '',
  districtId: '',
  churchId: '',
  responsibleCpf: '',
  responsiblePhone: '',
  photoUrl: null as string | null
})
const addPhotoPreview = ref<string | null>(null)
const defaultResponsibleMessage = 'Informe o CPF do responsável para validar a igreja.'
const responsibleLookup = reactive<{ status: 'idle' | 'success' | 'error'; message: string }>({
  status: 'idle',
  message: defaultResponsibleMessage
})

const resetAddForm = (paymentMethod: 'PIX_MP' | 'CASH' | 'FREE_PREVIOUS_YEAR' = 'PIX_MP') => {
  addDialog.paymentMethod = paymentMethod
  addForm.eventId = filters.eventId || (admin.events[0]?.id ?? '')
  addForm.fullName = ''
  addForm.birthDate = ''
  addForm.cpf = ''
  addForm.gender = ''
  addForm.districtId = filters.districtId || (catalog.districts[0]?.id ?? '')
  addForm.churchId = filters.churchId || (churchesByDistrict(addForm.districtId)[0]?.id ?? '')
  addForm.responsibleCpf = ''
  addForm.responsiblePhone = ''
  addForm.photoUrl = null
  addPhotoPreview.value = null
  responsibleLookup.status = 'idle'
  responsibleLookup.message = defaultResponsibleMessage
}

const openAddDialog = () => {
  if (!registrationPermissions.canCreate.value) {
    showError('Acesso negado', new Error('Você não possui permissão para criar inscrições.'))
    return
  }
  resetAddForm()
  addDialog.open = true
}

const closeAdd = () => {
  addDialog.open = false
  resetAddForm(addDialog.paymentMethod)
}

const formatCpfInputValue = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length > 9) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => `${a}.${b}.${c}${d ? '-' + d : ''}`)
  if (digits.length > 6) return digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) => `${a}.${b}.${c}`)
  if (digits.length > 3) return digits.replace(/(\d{3})(\d{0,3})/, (_, a, b) => `${a}.${b}`)
  return digits
}

const onAddCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  addForm.cpf = formatCpfInputValue(el.value)
}

const onResponsibleCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  addForm.responsibleCpf = formatCpfInputValue(el.value)
  responsibleLookup.status = 'idle'
  responsibleLookup.message = defaultResponsibleMessage
}

const formatPhoneInputValue = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const onResponsiblePhoneInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  addForm.responsiblePhone = formatPhoneInputValue(el.value)
}

const handleResponsibleCpfLookup = async () => {
  const digits = normalizeCPF(addForm.responsibleCpf)
  if (!digits || digits.length !== 11) {
    responsibleLookup.status = 'error'
    responsibleLookup.message = 'Informe um CPF do responsável válido.'
    return
  }

  try {
    responsibleLookup.status = 'idle'
    responsibleLookup.message = 'Buscando igreja vinculada...'
    const match = await catalog.findChurchByDirectorCpf(digits)
    if (!match) {
      responsibleLookup.status = 'error'
      responsibleLookup.message = 'Nenhuma igreja encontrada para este CPF.'
      return
    }
    responsibleLookup.status = 'success'
    responsibleLookup.message = `Responsável identificado: ${match.directorName ?? 'Diretor'} - ${match.churchName}`
    addForm.districtId = match.districtId
    addForm.churchId = match.churchId
  } catch (error: any) {
    responsibleLookup.status = 'error'
    responsibleLookup.message = error?.response?.data?.message ?? 'Falha ao buscar igreja para este CPF.'
  }
}

watch(
  () => addForm.districtId,
  (value) => {
    if (!value) {
      addForm.churchId = ''
      return
    }
    const options = churchesByDistrict(value)
    if (!options.length) {
      addForm.churchId = ''
      return
    }
    if (!options.some((church) => church.id === addForm.churchId)) {
      addForm.churchId = options[0].id
    }
  }
)

const handleAddPhotoChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    addPhotoPreview.value = result
    addForm.photoUrl = result
  }
  reader.readAsDataURL(file)
}

const clearAddPhoto = () => {
  addPhotoPreview.value = null
  addForm.photoUrl = null
}

const saveNewRegistration = async () => {
  if (!registrationPermissions.canCreate.value) {
    showError('Acesso negado', new Error('Você não possui permissão para criar inscrições.'))
    return
  }
  try {
    if (!addForm.eventId) { showError('Evento obrigatório', new Error('Selecione o evento')); return }
    if (!addForm.fullName || addForm.fullName.trim().length < 3) { showError('Nome inválido', new Error('Informe o nome completo')); return }
    if (!addForm.birthDate) { showError('Nascimento inválido', new Error('Informe a data')); return }
    if (!addForm.gender) { showError('Dados incompletos', new Error('Selecione o gênero do participante')); return }
    if (!validateCPF(addForm.cpf)) { showError('CPF inválido', new Error('Informe um CPF válido para o participante')); return }
    if (!validateCPF(addForm.responsibleCpf)) { showError('CPF do responsável inválido', new Error('Informe um CPF válido do responsável')); return }
    if (!addForm.districtId || !addForm.churchId) { showError('Local inválido', new Error('Selecione distrito e igreja')); return }
    const phoneDigits = addForm.responsiblePhone.replace(/\\D/g, '')
    if (phoneDigits.length < 10) { showError('Telefone inválido', new Error('Informe o telefone do responsável')); return }

    const result = await admin.createAdminRegistration({
      eventId: addForm.eventId,
      buyerCpf: normalizeCPF(addForm.responsibleCpf),
      paymentMethod: addDialog.paymentMethod,
      person: {
        fullName: addForm.fullName.trim(),
        cpf: normalizeCPF(addForm.cpf),
        birthDate: addForm.birthDate,
        gender: addForm.gender || 'OTHER',
        districtId: addForm.districtId,
        churchId: addForm.churchId,
        photoUrl: addForm.photoUrl || null
      }
    })

    if (addDialog.paymentMethod === 'PIX_MP' && result?.orderId) {
      const slug = findEventSlug(addForm.eventId)
      if (slug) {
        const link = window.location.origin + '/evento/' + slug + '/pagamento/' + result.orderId
        try { await navigator.clipboard.writeText(link) } catch {}
        window.open(link, '_blank')
      }
    }
    closeAdd()
    scheduleApply(true)
  } catch (error) {
    showError('Falha ao criar inscrição', error)
  }
}

// Ações e helpers adicionais
const findEventSlug = (eventId: string) => admin.events.find((e) => e.id === eventId)?.slug ?? ''

const resolvePhotoUrl = (photoUrl?: string | null) => {
  if (typeof photoUrl === 'string' && photoUrl.trim().length > 0) {
    return photoUrl
  }
  return DEFAULT_PHOTO_DATA_URL
}

const paymentMethodShort = (method?: string | null) => {
  if (!method) return '—'
  if (method === 'PIX_MP') return 'Pix'
  if (method === 'CASH') return 'Dinheiro'
  if (method === 'CARD_FULL') return 'Cartão (à vista)'
  if (method === 'CARD_INSTALLMENTS') return 'Cartão (parcelado)'
  return paymentMethodLabel(method)
}

const editDialog = reactive({ open: false, original: null as Registration | null })
const editForm = reactive({ fullName: '', birthDate: '', cpf: '', districtId: '', churchId: '', photoUrl: '' as string | null | '' })
const historyLoading = ref(false)
const registrationHistory = ref<Array<{ type: string; at: string; actor?: { id: string; name?: string } | null; details?: any }>>([])
const refundedAt = computed(() => {
  const events = registrationHistory.value.filter((e) => e.type === 'PAYMENT_REFUNDED')
  return events.length ? events[events.length - 1].at : null
})

const humanEvent = (e: {type: string; label?: string; details?: any}) => {
  if (e && typeof e.label === 'string' && e.label) return e.label
  const map: Record<string,string> = {
    REGISTRATION_CREATED: 'Inscrição criada',
    PAYMENT_METHOD_SELECTED: `Forma de pagamento escolhida (${paymentMethodShort(e.details?.paymentMethod)})`,
    PAYMENT_CONFIRMED: `Pagamento confirmado (${paymentMethodShort(e.details?.paymentMethod)})`,
    ORDER_PAID: 'Pedido pago',
    REGISTRATION_UPDATED: 'Inscrição atualizada',
    REGISTRATION_CANCELED: 'Inscrição cancelada',
    REGISTRATION_DELETED: 'Inscrição excluída',
    PAYMENT_REFUNDED: `Estorno realizado${e.details?.reason ? ' — ' + e.details.reason : ''}`,
    CHECKIN_COMPLETED: 'Check-in realizado'
  }
  return map[e.type] || e.type
}

const formatDetails = (d: any) => {
  try { return JSON.stringify(d, null, 2) } catch { return String(d) }
}

const showDetails = (type: string) => ['REGISTRATION_UPDATED','PAYMENT_REFUNDED'].includes(type)

const onCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 11)
  let masked = digits
  if (digits.length > 9) {
    masked = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_: any, a: string, b: string, c: string, d: string) => `${a}.${b}.${c}${d ? '-' + d : ''}`)
  } else if (digits.length > 6) {
    masked = digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (_: any, a: string, b: string, c: string) => `${a}.${b}.${c}`)
  } else if (digits.length > 3) {
    masked = digits.replace(/(\d{3})(\d{0,3})/, (_: any, a: string, b: string) => `${a}.${b}`)
  }
  editForm.cpf = masked
}

const openEdit = (registration: Registration) => {
  if (!registrationPermissions.canEdit.value) {
    showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'))
    return
  }
  editDialog.original = { ...registration }
  editForm.fullName = registration.fullName
  editForm.birthDate = formatDateInputValue(registration.birthDate)
  editForm.cpf = formatCPF(registration.cpf)
  editForm.districtId = registration.districtId
  editForm.churchId = registration.churchId
  editForm.photoUrl = registration.photoUrl || ''
  editDialog.open = true
  historyLoading.value = true
  registrationHistory.value = []
  admin.getRegistrationHistory(registration.id).then((res: any) => {
    registrationHistory.value = (res?.events || []).map((x: any) => ({ ...x, at: x.at }))
  }).catch(() => {}).finally(() => { historyLoading.value = false })
}

const closeEdit = () => { editDialog.open = false; editDialog.original = null }

const onEditPhotoChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    editForm.photoUrl = result
  }
  reader.readAsDataURL(file)
}

const previewPhotoUrl = computed(() => {
  return (editForm.photoUrl && editForm.photoUrl.length > 0)
    ? editForm.photoUrl
    : (editDialog.original?.photoUrl || '')
})

const clearEditPhoto = () => {
  editForm.photoUrl = ''
}

const saveRegistration = async () => {
  if (!editDialog.original) return
  if (!registrationPermissions.canEdit.value) {
    showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'))
    return
  }
  const original = editDialog.original
  const payload: Record<string, unknown> = {}
  try {
    if (!validateCPF(editForm.cpf)) { showError('CPF invalido', new Error('Informe um CPF valido')); return }
    if (editForm.fullName.trim() && editForm.fullName.trim() !== original.fullName) payload.fullName = editForm.fullName.trim()
    const currentBirth = formatDateInputValue(original.birthDate)
    if (editForm.birthDate && editForm.birthDate !== currentBirth) payload.birthDate = editForm.birthDate
    const sanitized = normalizeCPF(editForm.cpf)
    if (sanitized && sanitized !== original.cpf) payload.cpf = sanitized
    if (editForm.districtId && editForm.districtId !== original.districtId) payload.districtId = editForm.districtId
    if (editForm.churchId && editForm.churchId !== original.churchId) payload.churchId = editForm.churchId
    if (editForm.photoUrl !== undefined && editForm.photoUrl !== (original.photoUrl || '')) payload.photoUrl = editForm.photoUrl || null
    await admin.updateRegistration(original.id, payload)
    closeEdit()
  } catch (e) { showError('Falha ao atualizar inscrição', e) }
}

const isPaymentLinkVisible = (registration: Registration) =>
  registration.status === 'PENDING_PAYMENT' && registration.paymentMethod !== 'CASH'

const copyPaymentLink = async (registration: Registration) => {
  if (!isPaymentLinkVisible(registration)) return
  if (!registrationPermissions.canEdit.value) {
    showError('Acesso negado', new Error('Você não possui permissão para editar inscrições.'))
    return
  }
  const slug = findEventSlug(registration.eventId)
  if (!slug) { showError('Não foi possível gerar link', new Error('Evento sem slug disponível.')); return }
  try {
    // Solicitar ao backend um link exclusivo (pode dividir o pedido, se necessário)
    const result = await admin.regenerateRegistrationPaymentLink(registration.id)
    const orderId = result?.orderId ?? registration.orderId
    if (!orderId) { showError('Não foi possível gerar link', new Error('Pedido indisponível.')); return }
    const link = `${window.location.origin}/evento/${slug}/pagamento/${orderId}`
    try { await navigator.clipboard.writeText(link) } catch {}
    window.open(link, '_blank')
  } catch (e) {
    showError('Não foi possível gerar link', e)
  }
}

const deletableStatuses = new Set<Registration['status']>(['PENDING_PAYMENT','PAID','CHECKED_IN','CANCELED','REFUNDED'])
const cancellableStatuses = new Set<Registration['status']>(['PENDING_PAYMENT','PAID'])
const canCancelRegistration = (s: Registration['status']) => cancellableStatuses.has(s)
const canDeleteRegistration = (s: Registration['status']) => deletableStatuses.has(s)

type ConfirmAction = 'cancel' | 'refund' | 'delete' | 'confirm-cash' | 'reactivate'
const confirmState = reactive({ open: false, action: null as ConfirmAction | null, registration: null as Registration | null, title: '', description: '', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', type: 'default' as 'default' | 'danger' })

const resetConfirmState = () => { confirmState.open = false; confirmState.action = null; confirmState.registration = null; confirmState.title = ''; confirmState.description = ''; confirmState.confirmLabel = 'Confirmar'; confirmState.cancelLabel = 'Cancelar'; confirmState.type = 'default' }
const handleDialogVisibility = (v: boolean) => { if (v) { confirmState.open = true; return } resetConfirmState() }

const canExecuteAction = (action: ConfirmAction) => {
  if (action === 'delete') return registrationPermissions.canDelete.value
  if (action === 'cancel') return registrationPermissions.canDeactivate.value
  if (action === 'refund' || action === 'confirm-cash') return registrationPermissions.canFinancial.value
  if (action === 'reactivate') return registrationPermissions.canApprove.value
  return true
}

const openConfirm = (action: ConfirmAction, registration: Registration) => {
  if (!canExecuteAction(action)) {
    showError('Acesso negado', new Error('Você não possui permissão para essa ação.'))
    return
  }
  confirmState.action = action
  confirmState.registration = registration
  confirmState.open = true
  confirmState.cancelLabel = 'Voltar'
  if (action === 'cancel') { confirmState.title = 'Cancelar inscrição'; confirmState.description = 'Cancelar a inscrição de ' + registration.fullName + '? Esta ação não pode ser desfeita.'; confirmState.confirmLabel = 'Cancelar'; confirmState.type = 'danger' }
  else if (action === 'refund') { confirmState.title = 'Estornar inscrição'; confirmState.description = 'Confirmar estorno da inscrição de ' + registration.fullName + '?'; confirmState.confirmLabel = 'Confirmar estorno'; confirmState.type = 'default' }
  else if (action === 'confirm-cash') { confirmState.title = 'Confirmar pagamento em dinheiro'; confirmState.description = 'Confirmar recebimento manual em dinheiro para ' + registration.fullName + '?'; confirmState.confirmLabel = 'Confirmar pagamento'; confirmState.type = 'default' }
  else if (action === 'reactivate') { confirmState.title = 'Reativar inscrição'; confirmState.description = 'Reativar a inscrição de ' + registration.fullName + ' e gerar um novo link de pagamento?'; confirmState.confirmLabel = 'Reativar'; confirmState.type = 'default' }
  else { confirmState.title = 'Excluir inscrição'; confirmState.description = 'Excluir a inscrição de ' + registration.fullName + '? O registro será removido permanentemente.'; confirmState.confirmLabel = 'Excluir'; confirmState.type = 'danger' }
}

const processing = reactive({ open: false, message: 'Processando pagamento...' })
const ensureMinDelay = async (promise: Promise<any>, ms = 2000) => {
  const start = Date.now()
  const result = await promise
  const elapsed = Date.now() - start
  if (elapsed < ms) await new Promise((r) => setTimeout(r, ms - elapsed))
  return result
}

const formatDateTimeLocalInput = (value?: Date | string) => {
  const source = value ? new Date(value) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${source.getFullYear()}-${pad(source.getMonth() + 1)}-${pad(source.getDate())}T${pad(source.getHours())}:${pad(source.getMinutes())}`
}

const generateManualReference = () => `PIX-MANUAL-${Date.now()}`
const MANUAL_PROOF_MAX_SIZE = 5 * 1024 * 1024

const manualPayment = reactive({
  open: false,
  registration: null as Registration | null,
  reference: '',
  paidAt: '',
  fileName: '',
  fileType: '',
  filePreview: '',
  fileDataUrl: '',
  submitting: false,
  error: '',
  existingProofUrl: '',
  fileInputKey: 0
})

const executeConfirmAction = async () => {
  if (!confirmState.registration || !confirmState.action) { resetConfirmState(); return }
  const registration = confirmState.registration
  const action = confirmState.action
  if (!canExecuteAction(action)) {
    showError('Acesso negado', new Error('Você não possui permissão para essa ação.'))
    resetConfirmState()
    return
  }
  resetConfirmState()
  try {
    if (action === 'cancel') await admin.cancelRegistration(registration.id)
    else if (action === 'refund') await admin.refundRegistration(registration.id, {})
    else if (action === 'delete') await admin.deleteRegistration(registration.id)
    else if (action === 'reactivate') {
      processing.message = 'Gerando novo pagamento...'
      processing.open = true
      try {
        const result = await admin.reactivateRegistration(registration.id)
        const slug = findEventSlug(registration.eventId)
        const orderId = result?.orderId ?? registration.orderId
        if (slug && orderId) {
          const link = `${window.location.origin}/evento/${slug}/pagamento/${orderId}`
          try { await navigator.clipboard.writeText(link) } catch {}
          window.open(link, '_blank')
        } else {
          showError('Não foi possível gerar link', new Error('Dados insuficientes para gerar pagamento.'))
        }
      } finally {
        processing.open = false
      }
    } else if (action === 'confirm-cash') {
      if (!registration.orderId) { showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.')); return }
      processing.message = 'Confirmando pagamento...'
      processing.open = true
      await ensureMinDelay(admin.confirmOrderPayment(registration.orderId, { manualReference: 'CASH-ADMIN', paidAt: new Date().toISOString() }), 2000)
      processing.open = false
    }
  } catch (e) {
    const titles: Record<ConfirmAction,string> = {
      cancel: 'Falha ao cancelar inscrição',
      refund: 'Falha ao estornar inscrição',
      delete: 'Falha ao excluir inscrição',
      'confirm-cash': 'Falha ao confirmar pagamento',
      reactivate: 'Falha ao reativar inscrição'
    }
    if (action === 'confirm-cash') { showError('Falha ao confirmar pagamento', e); return }
    showError(titles[action], e)
  }
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })

const resetManualPaymentState = (options?: { preserveInput?: boolean }) => {
  manualPayment.fileDataUrl = ''
  manualPayment.filePreview = ''
  manualPayment.fileName = ''
  manualPayment.fileType = ''
  manualPayment.error = ''
  manualPayment.submitting = false
  if (!options?.preserveInput) {
    manualPayment.fileInputKey += 1
  }
}

const openManualPaymentDialog = (registration: Registration) => {
  if (!registration.orderId) {
    showError('Pedido indisponível', new Error('Inscrição sem pedido associado.'))
    return
  }
  manualPayment.registration = registration
  manualPayment.open = true
  manualPayment.reference = registration.order?.manualPaymentReference || generateManualReference()
  manualPayment.paidAt = formatDateTimeLocalInput(new Date())
  manualPayment.existingProofUrl = registration.order?.manualPaymentProofUrl || ''
  resetManualPaymentState()
}

const closeManualPaymentDialog = () => {
  manualPayment.open = false
  manualPayment.registration = null
  manualPayment.existingProofUrl = ''
  resetManualPaymentState()
}

const handleManualProofChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  resetManualPaymentState({ preserveInput: true })
  if (!file) return
  if (file.size > MANUAL_PROOF_MAX_SIZE) {
    manualPayment.error = 'O comprovante deve ter no máximo 5 MB.'
    return
  }
  if (!file.type || (!file.type.startsWith('image/') && file.type !== 'application/pdf')) {
    manualPayment.error = 'Envie um arquivo de imagem ou PDF.'
    return
  }
  try {
    const dataUrl = await readFileAsDataUrl(file)
    manualPayment.fileDataUrl = dataUrl
    manualPayment.fileName = file.name
    manualPayment.fileType = file.type
    manualPayment.filePreview = file.type.startsWith('image/') ? dataUrl : ''
  } catch (error) {
    manualPayment.error = 'Não foi possível processar o arquivo selecionado.'
  }
}

const submitManualPayment = async () => {
  if (!manualPayment.registration?.orderId) {
    showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.'))
    return
  }
  if (!manualPayment.fileDataUrl) {
    manualPayment.error = 'Anexe o comprovante antes de confirmar.'
    return
  }
  manualPayment.submitting = true
  try {
    await ensureMinDelay(
      admin.confirmOrderPayment(manualPayment.registration.orderId, {
        manualReference: manualPayment.reference?.trim() || undefined,
        paidAt: manualPayment.paidAt ? new Date(manualPayment.paidAt).toISOString() : undefined,
        proofFile: manualPayment.fileDataUrl
      }),
      1000
    )
    closeManualPaymentDialog()
  } catch (error) {
    manualPayment.error = extractErrorInfo(error).message
  } finally {
    manualPayment.submitting = false
  }
}

const canConfirmManualPix = (registration: Registration) =>
  registration.status === 'PENDING_PAYMENT' &&
  registration.paymentMethod === 'PIX_MP' &&
  Boolean(registration.orderId) &&
  registrationPermissions.canFinancial.value

const canViewManualProof = (registration: Registration) =>
  Boolean(registration.order?.manualPaymentProofUrl) && registrationPermissions.canFinancial.value

const viewManualProof = (registration: Registration) => {
  const url = registration.order?.manualPaymentProofUrl
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

const openExistingManualProof = () => {
  if (manualPayment.existingProofUrl) {
    window.open(manualPayment.existingProofUrl, '_blank', 'noopener,noreferrer')
  }
}

const receiptDownloadState = reactive({ downloadingId: '' })
const receivableStatuses = new Set<Registration['status']>(['PAID', 'CHECKED_IN', 'REFUNDED'])
const canEmitReceipt = (registration: Registration) =>
  receivableStatuses.has(registration.status) && registrationPermissions.canReports.value

const downloadReceipt = async (registration: Registration) => {
  if (!canEmitReceipt(registration)) return
  receiptDownloadState.downloadingId = registration.id
  try {
    const response = await admin.getRegistrationReceiptLink(registration.id)
    const url = response?.url
    if (!url) {
      showError('Comprovante indisponivel', new Error('Nao foi possivel gerar o link do comprovante.'))
      return
    }
    await createPreviewSession(
      [
        {
          id: registration.id,
          title: registration.fullName || "Inscricao " + registration.id,
          fileName: "comprovante-" + registration.id + ".pdf",
          sourceUrl: url,
          mimeType: 'application/pdf'
        }
      ],
      { context: 'Comprovante de inscricao' }
    )
  } catch (error) {
    showError('Falha ao gerar comprovante', error)
  } finally {
    receiptDownloadState.downloadingId = ''
  }
}

</script>






