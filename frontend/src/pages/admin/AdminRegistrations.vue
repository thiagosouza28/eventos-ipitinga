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
      class="hidden md:block bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30"
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
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-800 shadow-md shadow-neutral-200/60 dark:border-white/10 dark:bg-white/10 dark:text-white"
            aria-live="polite"
          >
            <span class="text-sm font-bold">{{ registrationCount.displayed }}</span>
            <span class="text-[11px] font-medium">carregada{{ registrationCount.displayed === 1 ? '' : 's' }}</span>
            <span
              v-if="registrationCount.hasDifference"
              class="text-[11px] font-medium text-neutral-600 dark:text-neutral-200"
            >
              de {{ registrationCount.total }}
            </span>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <RouterLink
              to="/admin/dashboard"
              class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Dashboard
            </RouterLink>
            <button
              v-if="canGenerateListPdf"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-full border border-primary-200/70 bg-white/90 px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-sm shadow-primary-200/40 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100"
              :disabled="listPdfState.loading || displayedRegistrations.length === 0"
              @click="generateRegistrationListPdf"
            >
              <span
                v-if="listPdfState.loading"
                class="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200"
              />
              Gerar PDF
            </button>
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
      </div>
    </BaseCard>
    <div class="md:hidden flex items-center justify-between gap-3 px-1">
      <span class="rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {{ registrationCount.displayed }} Carregada{{ registrationCount.displayed === 1 ? '' : 's' }}
      </span>
      <button
        v-if="registrationPermissions.canCreate"
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary-500/30 transition active:scale-95"
        @click="openAddDialog"
      >
        + Nova inscrição
      </button>
    </div>

    
    <div
      v-if="!hideFilters"
      class="md:hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden"
    >
      <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/30">
        <h2 class="text-sm font-semibold text-slate-800 dark:text-white">Filtros</h2>
        <span class="text-xs text-slate-500 dark:text-slate-400">Refine sua busca</span>
      </div>
      <form @submit.prevent="applyFilters" class="p-4 space-y-4">
        <div>
          <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Busca</label>
          <div class="relative">
            <span class="pointer-events-none absolute left-3 top-2.5 text-slate-400">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Nome ou CPF"
              autocomplete="off"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-600"
            />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Evento</label>
            <select
              v-model="filters.eventId"
              :disabled="isEventFilterLocked"
              class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{{ isEventFilterLocked ? 'Evento vinculado' : 'Todos os eventos' }}</option>
              <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lote</label>
            <select
              v-model="filters.lotId"
              :disabled="!filters.eventId || !lotsForSelectedEvent.length"
              class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{{ !filters.eventId ? 'Selecione o evento' : 'Todos os lotes' }}</option>
              <option v-for="lot in lotsForSelectedEvent" :key="lot.id" :value="lot.id">{{ lot.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Distrito</label>
            <select
              v-model="filters.districtId"
              :disabled="isDistrictFilterLocked"
              class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{{ isDistrictFilterLocked ? 'Distrito vinculado' : 'Todos' }}</option>
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Igreja</label>
            <select
              v-model="filters.churchId"
              :disabled="isChurchFilterLocked || !filters.districtId"
              class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">{{ isChurchFilterLocked ? 'Igreja vinculada' : (filters.districtId ? 'Todas' : 'Selecione o distrito') }}</option>
              <option v-for="church in churchesByDistrict(filters.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</label>
            <select
              v-model="filters.status"
              class="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option v-for="option in registrationStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            @click="resetFilters"
          >
            Limpar
          </button>
          <button
            type="submit"
            class="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isApplying"
          >
            {{ isApplying ? 'Aplicando...' : 'Aplicar filtro' }}
          </button>
        </div>
      </form>
    </div>

    <BaseCard
      class="hidden md:block border border-white/40 bg-gradient-to-br from-neutral-50/70 to-white/80 dark:border-white/10 dark:from-neutral-900/70 dark:to-neutral-900/40"
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
          <label class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Lote</label>
          <select
            v-model="filters.lotId"
            :disabled="!filters.eventId || !lotsForSelectedEvent.length"
            class="w-full rounded-sm border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option value="">{{ !filters.eventId ? 'Selecione o evento' : 'Todos os lotes' }}</option>
            <option v-for="lot in lotsForSelectedEvent" :key="lot.id" :value="lot.id">{{ lot.name }}</option>
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
        <div class="space-y-2 md:col-span-9">
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
      <div class="hidden md:flex md:flex-row md:items-center md:justify-between md:gap-4 px-5 py-4">
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          Selecione inscrições para gerar um novo pagamento ou confirmar manualmente.
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!registrationPermissions.canFinancial || selectedRegistrations.length === 0"
            @click="openPaymentDialog"
          >
            Gerar novo pagamento
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 px-6 py-2.5 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            :disabled="!registrationPermissions.canFinancial || selectedRegistrations.length === 0"
            @click="openManualConfirmDialog(selectedRegistrations)"
          >
            Confirmar manualmente
          </button>
        </div>
      </div>
      <TableSkeleton
        v-if="isApplying && admin.registrations.length === 0"
        helperText="?? Buscando inscrições..."
      />
      <div v-else-if="displayedRegistrations.length === 0" class="p-6 text-sm text-neutral-500 dark:text-neutral-400">
        Nenhuma inscrição encontrada.
      </div>
      <div
        v-else
        class="overflow-hidden rounded-sm border-0 bg-transparent shadow-none md:rounded-sm md:border md:border-white/40 md:bg-white/70 md:shadow-lg md:shadow-neutral-200/40 dark:md:border-white/10 dark:md:bg-neutral-950/40 dark:md:shadow-black/30"
      >
        <div class="hidden md:block overflow-x-auto">
        <table class="min-w-[900px] w-full table-auto text-sm text-neutral-700 dark:text-neutral-200">
          <thead
            class="bg-white/60 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400"
          >
            <tr>
              <th class="w-10 px-5 py-3 text-center whitespace-nowrap">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  :checked="allDisplayedSelected"
                  :indeterminate="someDisplayedSelected && !allDisplayedSelected"
                  @change="toggleSelectAllDisplayed(($event.target as HTMLInputElement)?.checked ?? false)"
                  aria-label="Selecionar todas as inscrições exibidas"
                />
              </th>
              <th class="w-20 min-w-[64px] px-4 py-3 whitespace-nowrap">Foto</th>
              <th class="min-w-[300px] px-4 py-3 whitespace-nowrap">Participante</th>
              <th class="min-w-[200px] px-4 py-3 whitespace-nowrap">Evento</th>
              <th class="min-w-[150px] px-4 py-3 whitespace-nowrap">Distrito / Igreja</th>
              <th class="min-w-[120px] px-4 py-3 whitespace-nowrap">Nascimento</th>
              <th class="min-w-[170px] px-4 py-3 whitespace-nowrap">Status</th>
              <th class="min-w-[75x] px-4 py-3 text-right whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-white/5">
            <tr
              v-for="registration in displayedRegistrations"
              :key="registration.id"
              class="transition hover:bg-white/80 dark:hover:bg-white/5"
            >
              <td class="px-5 py-2.5 align-top text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40"
                  :disabled="!isRegistrationSelectable(registration)"
                  :checked="isRegistrationSelected(registration.id)"
                  @change="toggleRegistrationSelection(registration, ($event.target as HTMLInputElement)?.checked ?? false)"
                  :aria-label="`Selecionar inscrição ${registration.fullName}`"
                />
                <div
                  v-if="selectionDisabledReason(registration)"
                  class="mt-1 text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
                >
                  {{ selectionDisabledReason(registration) }}
                </div>
              </td>
              <td class="px-5 py-2.5 align-top">
                <img
                  :src="resolvePhotoUrl(registration.photoUrl)"
                  class="h-12 w-12 rounded-full border border-white/70 object-cover dark:border-white/10"
                  :alt="`Foto de ${registration.fullName}`"
                  loading="lazy"
                  decoding="async"
                />
              </td>
              <td class="px-5 py-2.5 align-top">
                <div class="font-semibold text-neutral-900 dark:text-white leading-snug">{{ registration.fullName }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
                  <span>CPF: {{ formatCPF(registration.cpf) }}</span>
                  <span class="hidden sm:inline">•</span>
                  <span>ID: {{ registrationCode(registration) }}</span>
                </div>
                <div class="text-[11px] text-neutral-500 dark:text-neutral-500 leading-tight">
                  Criado em {{ formatDateTime(registration.createdAt) }}
                </div>
              </td>
              <td class="px-5 py-2.5 align-top">
                <div class="font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{{ findEventTitle(registration.eventId) }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
                  <span v-if="findRegistrationLotLabel(registration)">Lote: {{ findRegistrationLotLabel(registration) }}</span>
                  <span>{{ formatCurrency(registration.priceCents ?? findEventPriceCents(registration.eventId)) }}</span>
                  <span class="hidden sm:inline">•</span>
                  <span>Pagamento: {{ paymentMethodShort(registration.paymentMethod) }}</span>
                </div>
              </td>
              <td class="px-5 py-2.5 align-top">
                <div class="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                  {{ findDistrictName(registration.districtId) }}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
                  {{ findChurchName(registration.churchId) }}
                </div>
              </td>
              <td class="px-5 py-2.5 align-top">
                <div class="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{{ formatBirthDate(registration.birthDate) }}</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">
                  {{ calculateAge(registration.birthDate) }} anos
                </div>
              </td>
              <td class="px-5 py-3 align-top">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase"
                  :class="statusBadgeClass(registration.status)"
                >
                  {{ translateStatus(registration.status) }}
                </span>
                <div class="mt-1 text-[11px] text-neutral-500 dark:text-neutral-500 leading-tight space-y-0.5">
                  <div v-if="registration.paymentMethod || registration.paidAt" class="flex flex-wrap items-center gap-2">
                    <span v-if="registration.paymentMethod">Forma: {{ paymentMethodShort(registration.paymentMethod) }}</span>
                    <span v-if="registration.paymentMethod && registration.paidAt" class="hidden sm:inline">•</span>
                    <span v-if="registration.paidAt">Pago em {{ new Date(registration.paidAt).toLocaleString("pt-BR") }}</span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-2.5 align-top text-right">
                <div class="flex flex-nowrap items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
                  <button
                    v-if="registrationPermissions.canEdit"
                    class="action-btn"
                    @click="openEdit(registration)"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    v-if="canEmitReceipt(registration)"
                    class="action-btn"
                    @click="downloadReceipt(registration)"
                  >
                    📄 Comprovante
                  </button>
                  <div class="relative">
                    <button class="action-btn" @click="toggleActions(registration.id)">
                      ⋯ Mais
                    </button>
                    <div
                      v-if="openedActions === registration.id"
                      class="dropdown-panel"
                    >
                      <button
                      v-if="isPaymentLinkVisible(registration) && registrationPermissions.canEdit"
                      class="dropdown-item"
                      @click="openedActions = null; copyPaymentLink(registration)"
                    >
                      🔗 Link pagamento
                    </button>
                    <button
                      v-if="registration.status === 'PENDING_PAYMENT' && registrationPermissions.canFinancial"
                      class="dropdown-item"
                      @click="openedActions = null; openPaymentDialog([registration])"
                    >
                      💳 Alterar pagamento
                    </button>
                    <button
                      v-if="registration.status === 'PENDING_PAYMENT' && registrationPermissions.canFinancial"
                      class="dropdown-item"
                      @click="openedActions = null; openManualConfirmDialog([registration])"
                    >
                      ✅ Confirmar manual
                    </button>
                    <button
                      v-if="canConfirmManualPix(registration)"
                      class="dropdown-item"
                      @click="openedActions = null; openManualPaymentDialog(registration)"
                    >
                      ⚡ Confirmar PIX
                    </button>
                    <button
                      v-if="canViewManualProof(registration)"
                      class="dropdown-item"
                      @click="openedActions = null; viewManualProof(registration)"
                    >
                      🖼️ Ver anexo
                    </button>
                    <button
                      v-if="
                          canCancelRegistration(registration.status) &&
                          registration.status === 'PENDING_PAYMENT' &&
                        registrationPermissions.canDeactivate
                      "
                      class="dropdown-item text-red-600 hover:text-red-500 dark:text-red-400"
                      @click="openedActions = null; openConfirm('cancel', registration)"
                    >
                      ✖️ Cancelar
                    </button>
                    <button
                      v-if="registration.status === 'PAID' && registrationPermissions.canFinancial"
                      class="dropdown-item"
                      @click="openedActions = null; openConfirm('refund', registration)"
                    >
                      ↩️ Estornar
                    </button>
                    <button
                      v-if="registration.status === 'CANCELED' && registrationPermissions.canApprove"
                      class="dropdown-item"
                      @click="openedActions = null; openConfirm('reactivate', registration)"
                    >
                      ♻️ Reativar
                    </button>
                    <button
                      v-if="canDeleteRegistration(registration.status) && registrationPermissions.canDelete"
                      class="dropdown-item text-red-600 hover:text-red-500 dark:text-red-400"
                      @click="openedActions = null; openConfirm('delete', registration)"
                    >
                      🗑️ Excluir
                    </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <div class="md:hidden space-y-5 p-4">
          <div class="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600 dark:bg-primary-500/20 dark:text-primary-200">
                i
              </span>
              <span class="font-semibold">Selecione inscrições para ações em massa:</span>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>
                Selecionadas:
                <span class="font-bold text-slate-900 dark:text-white">{{ selectedRegistrations.length }}</span>
              </span>
              <span>
                Total:
                <span class="font-bold text-slate-900 dark:text-white">{{ formatCurrency(selectionTotalCents) }}</span>
              </span>
            </div>
            <div v-if="registrationPermissions.canFinancial" class="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-primary-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-blue-300"
                :disabled="selectedRegistrations.length === 0"
                @click="openPaymentDialog"
              >
                Gerar pagamento
              </button>
              <button
                type="button"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                :disabled="selectedRegistrations.length === 0"
                @click="openManualConfirmDialog(selectedRegistrations)"
              >
                Confirmar manualmente
              </button>
            </div>
            <button
              v-if="canGenerateListPdf"
              type="button"
              class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200/80 bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100"
              :disabled="listPdfState.loading || displayedRegistrations.length === 0"
              @click="generateRegistrationListPdf"
            >
              <span
                v-if="listPdfState.loading"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200"
              />
              Gerar PDF
            </button>
          </div>

          <div class="space-y-4">
            <article
              v-for="registration in displayedRegistrations"
              :key="registration.id"
              class="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <div class="absolute left-0 top-0 h-full w-1.5" :class="statusAccentClass(registration.status)"></div>
              <div class="p-4">
                <div class="mb-3 flex items-start gap-3">
                  <div class="pt-1 pl-1">
                    <input
                      type="checkbox"
                      class="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40 dark:border-slate-600"
                      :disabled="!isRegistrationSelectable(registration)"
                      :checked="isRegistrationSelected(registration.id)"
                      @change="toggleRegistrationSelection(registration, ($event.target as HTMLInputElement)?.checked ?? false)"
                      :aria-label="`Selecionar inscrição ${registration.fullName}`"
                    />
                  </div>
                  <div class="relative">
                    <img
                      :src="resolvePhotoUrl(registration.photoUrl)"
                      class="h-12 w-12 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                      :alt="`Foto de ${registration.fullName}`"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {{ registration.fullName }}
                    </h3>
                    <p class="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                      CPF: {{ formatCPF(registration.cpf) }}
                    </p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        :class="statusPillClass(registration.status)"
                      >
                        {{ translateStatus(registration.status) }}
                      </span>
                      <span class="text-[10px] text-slate-400 dark:text-slate-500">
                        {{ paymentMethodShort(registration.paymentMethod || registration.order?.paymentMethod || '') }} -
                        {{ formatDateShort(registration.paidAt || registration.createdAt) }}
                      </span>
                    </div>
                  </div>
                  <button
                    class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    :aria-expanded="openedActions === registration.id"
                    aria-label="Mais ações"
                    @click="toggleActions(registration.id)"
                  >
                    ...
                  </button>
                </div>

                <div class="ml-9 space-y-3 border-l-2 border-slate-100 pl-4 pt-1 dark:border-slate-700/50">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Evento</p>
                    <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {{ findEventTitle(registration.eventId) }}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      <span v-if="findRegistrationLotLabel(registration)">
                        Lote: {{ findRegistrationLotLabel(registration) }} -
                      </span>
                      {{ formatCurrency(registration.priceCents ?? findEventPriceCents(registration.eventId)) }}
                    </p>
                  </div>
                  <div class="flex items-end justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Igreja / Distrito</p>
                      <p class="text-xs text-slate-700 dark:text-slate-200">
                        {{ findChurchName(registration.churchId) }} - {{ findDistrictName(registration.districtId) }}
                      </p>
                    </div>
                    <div class="flex gap-1">
                      <button
                        v-if="registrationPermissions.canEdit"
                        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        @click="openEdit(registration)"
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button
                        class="rounded-lg p-2 text-primary-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        @click="toggleActions(registration.id)"
                        title="Ações"
                      >
                        Ações
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="openedActions === registration.id"
                  class="mt-3 rounded-xl border border-white/10 bg-neutral-900/95 p-2 text-[11px] dark:border-white/10"
                >
                  <button
                    v-if="canEmitReceipt(registration)"
                    class="dropdown-item w-full"
                    @click="openedActions = null; downloadReceipt(registration)"
                  >
                    Comprovante
                  </button>
                  <button
                    v-if="isPaymentLinkVisible(registration) && registrationPermissions.canEdit"
                    class="dropdown-item w-full"
                    @click="openedActions = null; copyPaymentLink(registration)"
                  >
                    Link pagamento
                  </button>
                  <button
                    v-if="registration.status === 'PENDING_PAYMENT' && registrationPermissions.canFinancial"
                    class="dropdown-item w-full"
                    @click="openedActions = null; openPaymentDialog([registration])"
                  >
                    Alterar pagamento
                  </button>
                  <button
                    v-if="registration.status === 'PENDING_PAYMENT' && registrationPermissions.canFinancial"
                    class="dropdown-item w-full"
                    @click="openedActions = null; openManualConfirmDialog([registration])"
                  >
                    Confirmar manual
                  </button>
                  <button
                    v-if="canConfirmManualPix(registration)"
                    class="dropdown-item w-full"
                    @click="openedActions = null; openManualPaymentDialog(registration)"
                  >
                    Confirmar PIX
                  </button>
                  <button
                    v-if="canViewManualProof(registration)"
                    class="dropdown-item w-full"
                    @click="openedActions = null; viewManualProof(registration)"
                  >
                    Ver anexo
                  </button>
                  <button
                    v-if="
                      canCancelRegistration(registration.status) &&
                      registration.status === 'PENDING_PAYMENT' &&
                      registrationPermissions.canDeactivate
                    "
                    class="dropdown-item w-full text-red-400 hover:text-red-300"
                    @click="openedActions = null; openConfirm('cancel', registration)"
                  >
                    Cancelar
                  </button>
                  <button
                    v-if="registration.status === 'PAID' && registrationPermissions.canFinancial"
                    class="dropdown-item w-full"
                    @click="openedActions = null; openConfirm('refund', registration)"
                  >
                    Estornar
                  </button>
                  <button
                    v-if="registration.status === 'CANCELED' && registrationPermissions.canApprove"
                    class="dropdown-item w-full"
                    @click="openedActions = null; openConfirm('reactivate', registration)"
                  >
                    Reativar
                  </button>
                  <button
                    v-if="canDeleteRegistration(registration.status) && registrationPermissions.canDelete"
                    class="dropdown-item w-full text-red-400 hover:text-red-300"
                    @click="openedActions = null; openConfirm('delete', registration)"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </BaseCard>

    <div v-if="manualConfirmDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Confirmar pagamento manual</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Selecione a forma de pagamento permitida pelo evento para concluir as inscrições.
            </p>
          </div>
          <button
            type="button"
            class="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
            @click="closeManualConfirmDialog"
            aria-label="Fechar confirmacao manual"
          >
            X
          </button>
        </div>

        <div class="mt-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            <span>Inscricoes selecionadas: <strong>{{ manualConfirmDialog.items.length }}</strong></span>
            <span>Evento: <strong>{{ findEventTitle(manualConfirmDialog.items[0]?.eventId ?? '') }}</strong></span>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Forma de pagamento</label>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="option in manualConfirmPaymentOptions"
                :key="option.value"
                class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:hover:border-primary-400"
              >
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    :value="option.value"
                    v-model="manualConfirmDialog.paymentMethod"
                  />
                  <div>
                    <div class="font-semibold text-neutral-800 dark:text-neutral-100">{{ paymentMethodLabel(option.value) }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ option.description ?? '' }}</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            class="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
            :disabled="manualConfirmDialog.loading"
            @click="closeManualConfirmDialog"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="manualConfirmDialog.loading || !manualConfirmDialog.paymentMethod"
            @click="confirmManualPayment"
          >
            {{ manualConfirmDialog.loading ? "Confirmando..." : "Confirmar pagamento" }}
          </button>
        </div>
        <p v-if="manualConfirmDialog.error" class="mt-2 text-sm text-red-600 dark:text-red-400">
          {{ manualConfirmDialog.error }}
        </p>
      </div>
    </div>

<div v-if="paymentDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-3xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Gerar pagamento</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Revise as inscrições selecionadas antes de confirmar o novo pedido.
            </p>
          </div>
          <button
            type="button"
            class="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
            @click="closePaymentDialog"
            aria-label="Fechar resumo de pagamento"
          >
            ×
          </button>
        </div>

        <div class="mt-4 max-h-[60vh] space-y-3 overflow-auto">
          <div
            v-for="item in paymentDialog.items"
            :key="item.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div>
              <div class="font-semibold text-neutral-900 dark:text-white">{{ item.fullName }}</div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                CPF: {{ formatCPF(item.cpf) }} · Valor:
                {{ formatCurrency(item.priceCents ?? findEventPriceCents(item.eventId)) }}
              </div>
            </div>
            <button
              type="button"
              class="text-xs font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
              :disabled="paymentDialog.loading"
              @click="removeFromPaymentDialog(item.id)"
            >
              Remover
            </button>
          </div>
          <p v-if="!paymentDialog.items.length" class="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma inscrição selecionada.
          </p>
        </div>
        <div class="mt-4 space-y-2" v-if="paymentDialogAllowedMethods.length">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Forma de pagamento</label>
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="option in paymentDialogAllowedMethods"
              :key="option.value"
              class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:hover:border-primary-400"
            >
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  :value="option.value"
                  v-model="paymentDialog.paymentMethod"
                />
                <div>
                  <div class="font-semibold text-neutral-800 dark:text-neutral-100">{{ paymentMethodLabel(option.value) }}</div>
                  <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ option.description ?? '' }}</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-neutral-600 dark:text-neutral-400">
            Total selecionado:
            <span class="font-semibold text-neutral-900 dark:text-white">{{ selectedRegistrations.length }}</span>
            · Valor total:
            <span class="font-semibold text-neutral-900 dark:text-white">{{ formatCurrency(selectionTotalCents) }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
              :disabled="paymentDialog.loading"
              @click="closePaymentDialog"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="paymentDialog.loading || !paymentDialog.items.length"
              @click="confirmPaymentGeneration"
            >
              {{ paymentDialog.loading ? "Gerando..." : "Confirmar pagamento" }}
            </button>
          </div>
        </div>
        <div
          v-if="paymentDialog.successOrderId"
          class="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100"
        >
          <div class="font-semibold">Pagamento gerado</div>
          <div class="mt-1 text-xs text-primary-800 dark:text-primary-100">
            Pedido: {{ paymentDialog.successOrderId }}
          </div>
          <div v-if="paymentDialog.successLink" class="mt-2 flex flex-wrap items-center gap-2">
            <code class="rounded bg-white/80 px-2 py-1 text-xs text-neutral-800 shadow-sm dark:bg-neutral-900 dark:text-neutral-100">
              {{ paymentDialog.successLink }}
            </code>
            <button
              type="button"
              class="rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500"
              @click="copyPaymentUrl(paymentDialog.successLink)"
            >
              Copiar link
            </button>
            <a
              :href="paymentDialog.successLink"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border border-primary-500 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-300 dark:text-primary-100 dark:hover:bg-primary-500/10"
            >
              Abrir
            </a>
          </div>
          <div v-else class="mt-1 text-xs text-primary-800 dark:text-primary-100">
            Pagamento manual criado. Nenhum link automático disponível.
          </div>
        </div>
        <p v-if="paymentDialog.error" class="mt-2 text-sm text-red-600 dark:text-red-400">
          {{ paymentDialog.error }}
        </p>
      </div>
    </div>

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
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{{ editDialog.original?.paidAt ? new Date(editDialog.original.paidAt).toLocaleString('pt-BR') : '--' }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-neutral-500">Data do estorno</label>
              <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{{ refundedAt ? new Date(refundedAt).toLocaleString('pt-BR') : '--' }}</p>
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
import { reactive, ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
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
import { paymentMethodLabel, PAYMENT_METHODS, ADMIN_ONLY_PAYMENT_METHODS } from '../../config/paymentMethods'
import { DEFAULT_PHOTO_DATA_URL } from '../../config/defaultPhoto'
import { useModulePermissions } from '../../composables/usePermissions'
import { createPreviewSession } from '../../utils/documentPreview'

const admin = useAdminStore()
const catalog = useCatalogStore()
const auth = useAuthStore()
const registrationPermissions = useModulePermissions('registrations')
const reportsPermissions = useModulePermissions('reports')
const canGenerateListPdf = computed(() => reportsPermissions.canReports.value)
const isAdminUser = computed(() => {
  const role = auth.user?.role
  return role === 'AdminGeral' || role === 'AdminDistrital'
})

const filters = reactive({
  eventId: '',
  lotId: '',
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

const lotsForSelectedEvent = computed(() => {
  if (!filters.eventId) return []
  const fromStore = admin.eventLots[filters.eventId]
  if (fromStore) return fromStore
  const event = admin.events.find((item) => item.id === filters.eventId)
  return event?.lots ?? []
})
const selectedLotName = computed(() => lotsForSelectedEvent.value.find((lot) => lot.id === filters.lotId)?.name ?? '')

const selectedRegistrationIds = ref<Set<string>>(new Set())
const paymentDialog = reactive<{
  open: boolean;
  loading: boolean;
  error: string;
  items: Registration[];
  successOrderId: string | null;
  successLink: string | null;
  paymentMethod: string;
}>({
  open: false,
  loading: false,
  error: '',
  items: [],
  successOrderId: null,
  successLink: null,
  paymentMethod: ''
})

const manualConfirmDialog = reactive<{
  open: boolean;
  loading: boolean;
  error: string;
  items: Registration[];
  paymentMethod: string;
}>({
  open: false,
  loading: false,
  error: '',
  items: [],
  paymentMethod: ''
})

const manualConfirmPaymentOptions = computed(() => {
  const first = manualConfirmDialog.items[0];
  if (!first) return [];
  return resolveAllowedPaymentMethods(first.eventId);
});

const paymentDialogAllowedMethods = computed(() => {
  const first = paymentDialog.items[0];
  if (!first) return [];
  return resolveAllowedPaymentMethods(first.eventId);
});

const genderOptions = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' }
]

const filtersReady = ref(false)
const isApplying = ref(false)
let applyDebounce: number | null = null
const pendingApply = ref(false)
let searchDebounce: number | null = null
const debouncedSearch = ref('')
const isMobile = ref(false)
const updateMobileState = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}
const shouldAutoApply = computed(() => hideFilters.value || !isMobile.value)
const listPdfState = reactive({ loading: false })

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
  const base = isLocalDirector.value
    ? {
        eventId: lockedEventId.value || undefined,
        districtId: lockedDistrictId.value || undefined,
        churchId: lockedChurchId.value || undefined,
        lotId: filters.lotId || undefined
      }
    : {
        eventId: filters.eventId || undefined,
        lotId: filters.lotId || undefined,
        districtId: filters.districtId || undefined,
        churchId: filters.churchId || undefined
      }
  return {
    ...base,
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
  if (!filtersReady.value) return
  if (!shouldAutoApply.value && !immediate) return
  if (immediate) { applyFilters(); return }
  if (applyDebounce) window.clearTimeout(applyDebounce)
  applyDebounce = window.setTimeout(applyFilters, 300)
}

const resetFilters = () => {
  Object.assign(filters, { eventId: '', lotId: '', districtId: '', churchId: '', status: '', search: '' })
  const changed = applyScopedFilters()
  if (filtersReady.value) {
    if (!shouldAutoApply.value) {
      scheduleApply(true)
      return
    }
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
  filters.lotId = ''
  const loadLots = async () => {
    if (!value) return
    if (!admin.eventLots[value]) {
      try { await admin.loadEventLots(value) } catch (e) { showError('Falha ao carregar lotes', e) }
    }
  }
  loadLots()
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
watch(() => filters.lotId, () => { if (filtersReady.value) scheduleApply() })
watch(
  () => filters.search,
  (value) => {
    if (searchDebounce) window.clearTimeout(searchDebounce)
    searchDebounce = window.setTimeout(() => {
      debouncedSearch.value = value
    }, 300)
  }
)

watch(
  [lockedEventId, lockedDistrictId, lockedChurchId],
  () => {
    const changed = applyScopedFilters()
    if (changed && filtersReady.value) {
      scheduleApply(true)
    }
  }
)

watch(
  () => admin.registrations,
  () => {
    const validIds = new Set(admin.registrations.map((reg) => reg.id))
    const next = new Set<string>()
    selectedRegistrationIds.value.forEach((id) => {
      const match = admin.registrations.find((reg) => reg.id === id)
      if (match && validIds.has(id) && isRegistrationSelectable(match)) {
        next.add(id)
      }
    })
    selectedRegistrationIds.value = next
    if (paymentDialog.open) {
      paymentDialog.items = paymentDialog.items.filter((item) => next.has(item.id))
      if (!paymentDialog.items.length) paymentDialog.open = false
    }
    openedActions.value = null
  },
  { deep: true }
)

watch(
  manualConfirmPaymentOptions,
  (options) => {
    if (!manualConfirmDialog.open) return
    if (!options.length) {
      manualConfirmDialog.paymentMethod = ''
      return
    }
    if (!options.some((option) => option.value === manualConfirmDialog.paymentMethod)) {
      manualConfirmDialog.paymentMethod = options[0].value
    }
  },
  { immediate: true }
)

watch(
  paymentDialogAllowedMethods,
  (options) => {
    if (!paymentDialog.open) return
    if (!options.length) {
      paymentDialog.paymentMethod = ''
      return
    }
    if (!options.some((option) => option.value === paymentDialog.paymentMethod)) {
      paymentDialog.paymentMethod = options[0].value
    }
  },
  { immediate: true }
)

onMounted(async () => {
  updateMobileState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateMobileState)
  }
  try {
    const tasks = [admin.loadEvents(), catalog.loadDistricts()]
    if (!isMobile.value) {
      tasks.push(catalog.loadChurches())
    }
    await Promise.all(tasks)
  } catch (error) {
    showError('Falha ao carregar dados iniciais', error)
  }
  applyScopedFilters()
  await applyFilters()
  filtersReady.value = true
  debouncedSearch.value = filters.search
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateMobileState)
  }
  if (applyDebounce) window.clearTimeout(applyDebounce)
  if (searchDebounce) window.clearTimeout(searchDebounce)
})

const churchesByDistrict = (districtId: string): Church[] => {
  if (!districtId) return catalog.churches
  return catalog.churches.filter((c) => c.districtId === districtId)
}

const eventMap = computed(() => new Map(admin.events.map((event) => [event.id, event])))
const districtMap = computed(() => new Map(catalog.districts.map((district) => [district.id, district])))
const churchMap = computed(() => new Map(catalog.churches.map((church) => [church.id, church])))
const registrationDistrictMap = computed(() => {
  const map = new Map<string, string>()
  admin.registrations.forEach((registration) => {
    const name = registration.district?.name
    if (name) map.set(registration.districtId, name)
  })
  return map
})
const registrationChurchMap = computed(() => {
  const map = new Map<string, string>()
  admin.registrations.forEach((registration) => {
    const name = registration.church?.name
    if (name) map.set(registration.churchId, name)
  })
  return map
})

const findEventTitle = (eventId: string) => eventMap.value.get(eventId)?.title ?? 'Evento'
const findEventPriceCents = (eventId: string) => {
  const event = eventMap.value.get(eventId)
  return event?.currentPriceCents ?? event?.priceCents ?? 0
}
const registrationLotId = (registration: Registration) =>
  (registration as any).lotId ||
  registration.order?.lotId ||
  (registration.order as any)?.pricingLotId ||
  (registration as any).lot?.id ||
  ''
const registrationLotName = (registration: Registration) =>
  (registration as any).lotName ||
  registration.order?.lotName ||
  (registration.order as any)?.pricingLot?.name ||
  (registration as any).lot?.name ||
  ''
const findRegistrationLotLabel = (registration: Registration) => {
  const name = registrationLotName(registration)
  if (name) return name
  const lotId = registrationLotId(registration)
  if (!lotId) return ''
  const lots = admin.eventLots[registration.eventId] || []
  const lot = lots.find((item) => item.id === lotId)
  return lot?.name || ''
}
const findDistrictName = (id: string) =>
  districtMap.value.get(id)?.name ?? registrationDistrictMap.value.get(id) ?? 'Nao informado'
const findChurchName = (id: string) =>
  churchMap.value.get(id)?.name ?? registrationChurchMap.value.get(id) ?? 'Nao informado'

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

function formatDateShort(value?: string | Date | null) {
  if (!value) return '-'
  const source = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(source.getTime())) return '-'
  return source.toLocaleDateString('pt-BR', { dateStyle: 'short' })
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

const statusPillClass = (s: string) => {
  switch (s) {
    case "PAID":
    case "CHECKED_IN":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "PENDING_PAYMENT":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400";
    case "REFUNDED":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300";
    case "CANCELED":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case "DRAFT":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
};

const statusAccentClass = (s: string) => {
  switch (s) {
    case "PAID":
    case "CHECKED_IN":
      return "bg-emerald-500";
    case "PENDING_PAYMENT":
      return "bg-amber-500";
    case "CANCELED":
    case "REFUNDED":
      return "bg-slate-400";
    case "DRAFT":
      return "bg-slate-300";
    default:
      return "bg-slate-400";
  }
};

// Busca local por nome/CPF
const displayedRegistrations = computed(() => {
  const q = (debouncedSearch.value || '').trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return admin.registrations.filter((r) => {
    if (filters.eventId && r.eventId !== filters.eventId) return false
    if (filters.lotId) {
      const lotId = registrationLotId(r)
      const lotName = registrationLotName(r).toLowerCase()
      const targetName = selectedLotName.value.toLowerCase()
      const lotMatch = lotId ? lotId === filters.lotId : (lotName && targetName ? lotName === targetName : false)
      if (!lotMatch) return false
    }
    if (!q) return true
    const nameMatch = (r.fullName || '').toLowerCase().includes(q)
    const cpfMatch = digits ? String(r.cpf || '').includes(digits) : false
    return nameMatch || cpfMatch
  })
})

const isFilterActive = computed(() => {
  if (hideFilters.value) return true
  return Boolean(
    filters.eventId ||
    filters.lotId ||
    filters.districtId ||
    filters.churchId ||
    filters.status ||
    filters.search
  )
})

const registrationCount = computed(() => {
  const displayed = displayedRegistrations.value.length
  const total = admin.registrations.length
  return {
    displayed,
    total,
    filterActive: isFilterActive.value,
    hasDifference: total !== displayed
  }
})

const isRegistrationSelectable = (registration: Registration) => {
  const blockedStatuses = new Set(['PAID', 'CHECKED_IN', 'REFUNDED'])
  if (blockedStatuses.has(registration.status)) return false
  return true
}

const openedActions = ref<string | null>(null)
const toggleActions = (id: string) => {
  openedActions.value = openedActions.value === id ? null : id
}

const selectionDisabledReason = (registration: Registration) => {
  if (registration.status === 'PAID' || registration.status === 'CHECKED_IN' || registration.status === 'REFUNDED') {
    return 'Pago'
  }
  return ''
}

const isRegistrationSelected = (id: string) => selectedRegistrationIds.value.has(id)

const selectedRegistrations = computed(() =>
  admin.registrations.filter((registration) => selectedRegistrationIds.value.has(registration.id))
)

const selectionTotalCents = computed(() =>
  selectedRegistrations.value.reduce(
    (acc, registration) =>
      acc + (registration.priceCents ?? findEventPriceCents(registration.eventId) ?? 0),
    0
  )
)

const normalizePaymentMethods = (input: unknown) => {
  if (Array.isArray(input)) {
    return input.filter((value): value is string => typeof value === 'string' && value.length > 0)
  }
  if (typeof input === 'string') {
    return input.split(',').map((value) => value.trim()).filter(Boolean)
  }
  return []
}

const resolveAllowedPaymentMethods = (eventId: string, eventPaymentMethods?: string[]) => {
  const eventFromStore = admin.events.find((e) => e.id === eventId);
  const allowed = normalizePaymentMethods(eventPaymentMethods ?? eventFromStore?.paymentMethods);
  return PAYMENT_METHODS.filter((option) => {
    if (!allowed.includes(option.value)) return false;
    if (ADMIN_ONLY_PAYMENT_METHODS.includes(option.value) && !isAdminUser.value) return false;
    return true;
  });
};

const allDisplayedSelected = computed(() => {
  const selectable = displayedRegistrations.value.filter(isRegistrationSelectable)
  if (!selectable.length) return false
  return selectable.every((registration) => selectedRegistrationIds.value.has(registration.id))
})

const someDisplayedSelected = computed(() =>
  displayedRegistrations.value.some(
    (registration) => isRegistrationSelectable(registration) && selectedRegistrationIds.value.has(registration.id)
  )
)

const toggleRegistrationSelection = (registration: Registration, checked?: boolean) => {
  if (!isRegistrationSelectable(registration)) return
  const next = new Set(selectedRegistrationIds.value)
  const shouldSelect = typeof checked === 'boolean' ? checked : !next.has(registration.id)
  if (shouldSelect) {
    next.add(registration.id)
    if (paymentDialog.open && !paymentDialog.items.some((item) => item.id === registration.id)) {
      paymentDialog.items = [...paymentDialog.items, registration]
    }
  } else {
    next.delete(registration.id)
    if (paymentDialog.open) {
      paymentDialog.items = paymentDialog.items.filter((item) => item.id !== registration.id)
      if (!paymentDialog.items.length) paymentDialog.open = false
    }
  }
  selectedRegistrationIds.value = next
}

const toggleSelectAllDisplayed = (checked: boolean) => {
  const next = new Set(selectedRegistrationIds.value)
  displayedRegistrations.value.forEach((registration) => {
    if (!isRegistrationSelectable(registration)) return
    if (checked) {
      next.add(registration.id)
    } else {
      next.delete(registration.id)
    }
  })
  selectedRegistrationIds.value = next
  if (paymentDialog.open) {
    paymentDialog.items = paymentDialog.items.filter((item) => next.has(item.id))
    if (!paymentDialog.items.length) paymentDialog.open = false
  }
}

const closePaymentDialog = () => {
  paymentDialog.open = false
  paymentDialog.error = ''
  paymentDialog.successOrderId = null
  paymentDialog.successLink = null
  paymentDialog.paymentMethod = ''
}

const openPaymentDialog = (itemsInput?: Registration[] | Event) => {
  const items = (Array.isArray(itemsInput) && itemsInput.length ? itemsInput : selectedRegistrations.value).filter(isRegistrationSelectable)
  if (!items.length) {
    showError('Selecione ao menos uma inscricao', new Error('Selecione ao menos uma inscricao para gerar o pagamento.'))
    return
  }
  const uniqueEvents = new Set(items.map((item) => item.eventId))
  if (uniqueEvents.size > 1) {
    showError('Selecione apenas inscricoes do mesmo evento', new Error('Selecione inscricoes de um unico evento para gerar o pagamento.'))
    return
  }
  const allowed = resolveAllowedPaymentMethods(items[0].eventId)
  if (!allowed.length) {
    showError('Evento sem formas de pagamento', new Error('Nenhuma forma de pagamento disponivel para este evento.'))
    return
  }
  paymentDialog.items = items
  paymentDialog.error = ''
  paymentDialog.successOrderId = null
  paymentDialog.successLink = null
  paymentDialog.paymentMethod = allowed[0].value
  paymentDialog.open = true
}
const removeFromPaymentDialog = (registrationId: string) => {
  paymentDialog.items = paymentDialog.items.filter((item) => item.id !== registrationId)
  const next = new Set(selectedRegistrationIds.value)
  next.delete(registrationId)
  selectedRegistrationIds.value = next
  if (!paymentDialog.items.length) {
    paymentDialog.open = false
  }
}

const confirmPaymentGeneration = async () => {
  if (!paymentDialog.items.length) {
    paymentDialog.error = 'Selecione ao menos uma inscricao para continuar.'
    return
  }
  if (!paymentDialog.paymentMethod) {
    paymentDialog.error = 'Selecione a forma de pagamento.'
    return
  }
  const allowed = paymentDialogAllowedMethods.value
  if (allowed.length && !allowed.some((option) => option.value === paymentDialog.paymentMethod)) {
    paymentDialog.error = 'Forma de pagamento indisponivel para o evento.'
    return
  }
  paymentDialog.loading = true
  paymentDialog.error = ''
  try {
    const result = await admin.createPaymentOrderForRegistrations({
      registrationIds: paymentDialog.items.map((item) => item.id),
      paymentMethod: paymentDialog.paymentMethod
    })
    const mpLink =
      result?.payment?.initPoint ??
      result?.payment?.init_point ??
      result?.payment?.sandboxInitPoint ??
      ''
    const fallbackSlug = paymentDialog.items[0] ? findEventSlug(paymentDialog.items[0].eventId) : ''
    const fallbackLink =
      fallbackSlug && result?.orderId
        ? `${window.location.origin}/evento/${fallbackSlug}/pagamento/${result.orderId}`
        : ''
    paymentDialog.successLink = mpLink || fallbackLink || null
    paymentDialog.successOrderId = result?.orderId ?? null
    selectedRegistrationIds.value = new Set()
    if (!paymentDialog.successLink) {
      paymentDialog.error = 'Pagamento criado. Nao foi possivel gerar link automatico (pagamento manual).'
    }
  } catch (error: any) {
    const message = error?.response?.data?.message ?? error?.message ?? 'Erro ao gerar pagamento'
    paymentDialog.error = message
    showError('Erro ao gerar pagamento', error)
  } finally {
    paymentDialog.loading = false
  }
}
const copyPaymentUrl = async (url: string) => {
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
  } catch (e) {
    console.warn('Clipboard copy failed', e)
  }
}

const openManualConfirmDialog = (registrations: Registration[]) => {
  if (!registrations.length) {
    showError('Selecione ao menos uma inscrição', new Error('Selecione ao menos uma inscrição.'))
    return
  }
  const uniqueEvents = new Set(registrations.map((r) => r.eventId));
  if (uniqueEvents.size > 1) {
    showError('Selecione apenas inscrições do mesmo evento', new Error('Selecione apenas inscrições do mesmo evento para confirmar manualmente.'));
    return;
  }
  const allowed = resolveAllowedPaymentMethods(registrations[0].eventId);
  if (!allowed.length) {
    showError('Evento sem formas de pagamento', new Error('Nenhuma forma de pagamento disponível para este evento.'));
    return;
  }
  manualConfirmDialog.items = registrations;
  manualConfirmDialog.paymentMethod = allowed[0].value;
  manualConfirmDialog.error = '';
  manualConfirmDialog.open = true;
};

const closeManualConfirmDialog = () => {
  manualConfirmDialog.open = false;
  manualConfirmDialog.error = '';
  manualConfirmDialog.paymentMethod = '';
  manualConfirmDialog.items = [];
};

const confirmManualPayment = async () => {
  if (!manualConfirmDialog.items.length) {
    manualConfirmDialog.error = 'Selecione ao menos uma inscricao.';
    return;
  }
  const allowedOptions = manualConfirmPaymentOptions.value;
  if (!manualConfirmDialog.paymentMethod) {
    manualConfirmDialog.error = 'Selecione a forma de pagamento do evento.';
    return;
  }
  if (allowedOptions.length && !allowedOptions.some((opt) => opt.value === manualConfirmDialog.paymentMethod)) {
    manualConfirmDialog.error = 'Forma de pagamento nao disponivel para este evento.';
    return;
  }
  manualConfirmDialog.loading = true;
  manualConfirmDialog.error = '';
  try {
    await admin.markRegistrationsPaid(
      manualConfirmDialog.items.map((item) => item.id),
      { paymentMethod: manualConfirmDialog.paymentMethod, paidAt: new Date().toISOString() }
    );
    selectedRegistrationIds.value = new Set();
    closeManualConfirmDialog();
  } catch (error: any) {
    manualConfirmDialog.error = error?.response?.data?.message ?? error?.message ?? 'Erro ao confirmar pagamento';
    showError('Erro ao confirmar pagamento', error);
  } finally {
    manualConfirmDialog.loading = false;
  }
};
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

const openAddDialog = async () => {
  if (!registrationPermissions.canCreate.value) {
    showError('Acesso negado', new Error('Você não possui permissão para criar inscrições.'))
    return
  }
  if (!catalog.churches.length) {
    const preferredDistrictId = lockedDistrictId.value || filters.districtId || catalog.districts[0]?.id || ''
    try {
      await catalog.loadChurches(preferredDistrictId || undefined)
    } catch (error) {
      showError('Falha ao carregar igrejas', error)
    }
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
  if (!method) return '--'
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
    PAYMENT_REFUNDED: `Estorno realizado${e.details?.reason ? ' - ' + e.details.reason : ''}`,
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
  openedActions.value = null
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

const sanitizeFilePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40)

const generateRegistrationListPdf = async () => {
  if (!canGenerateListPdf.value || listPdfState.loading) return
  listPdfState.loading = true
  try {
    const params = buildFilterParams()
    const response = await admin.downloadRegistrationListPdf(params)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const eventLabel = filters.eventId ? findEventTitle(filters.eventId) : 'inscricoes'
    const churchLabel = filters.churchId ? findChurchName(filters.churchId) : ''
    const lotLabel = filters.lotId ? selectedLotName.value : ''
    const parts = ['lista', eventLabel, churchLabel, lotLabel].filter(Boolean).map(sanitizeFilePart)
    const fileName = `${parts.filter(Boolean).join('-') || 'lista-inscricoes'}.pdf`
    await createPreviewSession(
      [
        {
          title: 'Lista de inscricoes',
          fileName,
          blob,
          mimeType: 'application/pdf'
        }
      ],
      { context: 'Lista de inscricoes' }
    )
  } catch (error) {
    showError('Falha ao gerar lista em PDF', error)
  } finally {
    listPdfState.loading = false
  }
}

</script>

<style scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0.35rem 0.6rem;
  width: auto;
  height: auto;
  min-width: 0;
  min-height: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #1d4ed8;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: none;
  transition: all 150ms ease;
}
.action-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dropdown-panel {
  position: absolute;
  right: 0;
  z-index: 20;
  margin-top: 0.35rem;
  width: 12rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 24, 40, 0.98);
  box-shadow: 0 12px 30px -12px rgba(15, 23, 42, 0.65);
  padding: 0.3rem;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e5e7eb;
  text-align: left;
  transition: background 120ms ease;
}
.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>

