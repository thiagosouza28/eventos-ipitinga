<template>
  <div v-if="reportsPermissions.canView" class="space-y-6" data-uppercase-scope>
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <BaseCard class="bg-gradient-to-br from-sky-50 via-blue-100/60 to-blue-200/40 shadow-lg shadow-sky-200/80 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/40">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700 dark:text-sky-300">Relatórios</p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Painel completo de inscrições</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Consulte rapidamente relatórios por evento, distrito/igreja e financeiro. O mesmo layout é utilizado nos PDFs oficiais.
          </p>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="border border-white/60 bg-white/90 shadow-lg shadow-neutral-200/70 dark:border-white/10 dark:bg-neutral-950/60 dark:shadow-black/30">
      <div class="flex flex-wrap gap-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="inline-flex flex-1 items-center justify-center rounded-sm border px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-6 sm:py-3"
          :class="activeTab === tab.key ? 'border-sky-600 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-400/50' : 'border-neutral-200/70 bg-white/70 text-neutral-700 hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70'"
          @click="setActiveTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </BaseCard>

    <!-- Relatório por evento -->
    <div v-show="activeTab === 'event'" class="space-y-5">
      <BaseCard class="border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70 dark:shadow-black/40">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex-1">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Evento</label>
            <select
              v-model="eventReport.eventId"
              class="mt-2 w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="" disabled>Selecione</option>
              <option v-for="event in accessibleEvents" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-sm border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              :disabled="eventReport.loading || !eventReport.eventId"
              @click="loadEventParticipants"
            >
              Atualizar
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-sm bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
              :disabled="!eventReport.eventId || eventDownloadState"
              @click="downloadEventReport"
            >
              <span v-if="eventDownloadState" class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent" />
              <span>{{ eventDownloadState ? "Gerando..." : "Baixar PDF" }}</span>
            </button>
          </div>
        </div>

        <div v-if="selectedEvent" class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-sm border border-neutral-200/90 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Evento selecionado</p>
            <p class="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">{{ selectedEvent.title }}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ formatEventPeriod(selectedEvent) }} · {{ selectedEvent.location }}</p>
          </div>
          <div
            v-for="card in eventSummaryCards"
            :key="card.label"
            class="rounded-sm border border-neutral-200/80 bg-white/80 p-4 text-neutral-800 shadow-inner shadow-sky-100/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
            <p class="mt-2 text-2xl font-bold" :class="card.accent">{{ card.value }}</p>
          </div>
        </div>
      </BaseCard>
            <BaseCard class="border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50">
        <TableSkeleton v-if="eventReport.loading" helperText="Carregando participantes do evento..." />
        <div v-else>
          <div v-if="!eventParticipants.length" class="p-6 text-sm text-neutral-500 dark:text-neutral-400">
            Selecione um evento para listar participantes.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full table-auto text-sm text-neutral-700 dark:text-neutral-200">
              <thead class="bg-neutral-900 text-[11px] uppercase tracking-[0.3em] text-white dark:bg-neutral-800">
                <tr>
                  <th class="px-4 py-3 text-left">Participante</th>
                  <th class="px-4 py-3 text-left">Igreja</th>
                  <th class="px-4 py-3 text-left">Distrito</th>
                  <th class="px-4 py-3 text-left">Nascimento</th>
                  <th class="px-4 py-3 text-left">Idade</th>
                  <th class="px-4 py-3 text-left">Status</th>
                  <th class="px-4 py-3 text-left">Evento</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="participant in eventParticipants"
                  :key="participant.id"
                  class="border-b border-neutral-100/80 bg-white/90 text-neutral-800 transition odd:bg-white even:bg-neutral-50 hover:bg-sky-50/70 dark:border-white/5 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <td class="px-4 py-3 font-semibold">{{ participant.fullName }}</td>
                  <td class="px-4 py-3 text-neutral-600 dark:text-neutral-300">{{ findChurchName(participant.churchId) }}</td>
                  <td class="px-4 py-3 text-neutral-600 dark:text-neutral-300">{{ findDistrictName(participant.districtId) }}</td>
                  <td class="px-4 py-3 text-neutral-600 dark:text-neutral-300">{{ formatBirthDate(participant.birthDate) }}</td>
                  <td class="px-4 py-3 text-neutral-600 dark:text-neutral-300">{{ participant.ageYears ?? '-' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]" :class="statusBadgeClass(participant.status)">
                      {{ translateStatus(participant.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-neutral-700 dark:text-neutral-200">{{ findEventTitle(participant.eventId) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Relatório por distrito/igreja -->
    <div v-show="activeTab === 'church'" class="space-y-5">
      <BaseCard class="border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70">
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Evento</label>
            <select
              v-model="churchReport.eventId"
              class="w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="">Todos</option>
              <option v-for="event in accessibleEvents" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Distrito</label>
            <select
              v-model="churchReport.districtId"
              :disabled="lockDistrictSelect"
              class="w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="">{{ lockDistrictSelect ? "Distrito vinculado" : "Todos" }}</option>
              <option v-for="district in accessibleDistricts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Igreja</label>
            <select
              v-model="churchReport.churchId"
              :disabled="lockChurchSelect || !churchReport.districtId"
              class="w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="">{{ lockChurchSelect ? "Igreja vinculada" : churchReport.districtId ? "Todas" : "Selecione o distrito" }}</option>
              <option v-for="church in churchesForSelectedDistrict" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Layout PDF</label>
            <select
              v-model="churchReport.layout"
              :disabled="churchReport.template !== 'event'"
              class="w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="single">1 por página</option>
              <option value="two">2 por página</option>
              <option value="four">4 por página</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Modelo</label>
            <select
              v-model="churchReport.template"
              class="w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="event">Com termo e assinatura</option>
              <option value="standard">Somente lista</option>
            </select>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-sm border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            :disabled="churchReport.loading"
            @click="loadChurchParticipants"
          >
            Atualizar
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-sm bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-400/50 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!churchReport.churchId || churchReportDownloadState"
            @click="downloadChurchReport"
          >
            <span v-if="churchReportDownloadState" class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent" />
            <span>{{ churchReportDownloadState ? "Gerando..." : "Gerar PDF" }}</span>
          </button>
        </div>
      </BaseCard>

      <BaseCard class="border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/40">
        <TableSkeleton v-if="churchReport.loading" helperText="Carregando participantes..." />
        <div v-else>
          <div v-if="!churchParticipants.length" class="p-6 text-sm text-neutral-500 dark:text-neutral-400">
            Selecione um evento e ao menos um distrito para listar participantes.
          </div>
          <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="participant in churchParticipants"
              :key="participant.id"
              class="flex flex-col gap-4 rounded-sm border border-neutral-100/80 bg-white/95 p-5 shadow-xl shadow-sky-50/70 transition hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/30"
            >
              <div class="flex items-start gap-4">
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-sm border border-white/80 bg-neutral-100 dark:border-white/20">
                  <img
                    :src="resolvePhotoUrl(participant.photoUrl)"
                    :alt="participant.fullName ? 'Foto de ' + participant.fullName : 'Foto do participante'"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div class="flex-1 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                  <p class="text-base font-semibold uppercase tracking-[0.18em] text-neutral-900 dark:text-white">
                    {{ participant.fullName }}
                  </p>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">
                    {{ formatBirthDate(participant.birthDate) }} · {{ participant.ageYears ?? '-' }} anos
                  </p>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">
                    Igreja:
                    <span class="font-semibold text-neutral-800 dark:text-white">{{ findChurchName(participant.churchId) }}</span>
                  </p>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">
                    Distrito:
                    <span class="font-semibold text-neutral-800 dark:text-white">{{ findDistrictName(participant.districtId) }}</span>
                  </p>
                  <p class="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
                    Evento: {{ findEventTitle(participant.eventId) }}
                  </p>
                </div>
              </div>
              <div class="rounded-sm border border-neutral-100 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-600 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                  Termo de participação
                </p>
                <p class="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                  Declaro estar de acordo com as normas do evento, cuidando da minha segurança e do grupo. Autorizo o uso da minha imagem em materiais institucionais.
                </p>
              </div>
            </article>
          </div>
        </div>
      </BaseCard>
    </div>
    <!-- Relatório financeiro -->
    <div v-show="activeTab === 'financial'" class="space-y-5">
      <BaseCard class="border border-white/60 bg-gradient-to-br from-white to-neutral-50 shadow-xl shadow-neutral-200/70 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-900/70">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex-1">
            <label class="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-neutral-400">Evento</label>
            <select
              v-model="selectedFinancialEventId"
              class="mt-2 w-full rounded-sm border border-neutral-200/70 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              <option value="">Selecione</option>
              <option v-for="event in accessibleEvents" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-sm border border-neutral-300/80 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              :disabled="financialDetailLoading || !selectedFinancialEventId"
              @click="refreshFinancialData"
            >
              Atualizar
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-sm bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
              :disabled="!selectedFinancialEventId || financialDownloadState"
              @click="downloadFinancialPdf"
            >
              <span v-if="financialDownloadState" class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent" />
              <span>{{ financialDownloadState ? "Gerando..." : "PDF do evento" }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-sm border border-sky-500 px-6 py-2.5 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-300 dark:text-sky-200 dark:hover:bg-sky-900/30"
              :disabled="!selectedFinancialEventId"
              @click="exportFinancialCsv"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="border border-white/60 bg-white/95 shadow-2xl shadow-neutral-200/80 dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50">
        <TableSkeleton v-if="financialLoading" helperText="Carregando resumo financeiro..." />
        <div v-else>
          <div v-if="!financialSummary" class="p-6 text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum dado financeiro consolidado disponível.
          </div>
          <div v-else class="space-y-6">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div v-for="card in generalFinancialCards" :key="card.label" class="rounded-sm border border-neutral-200/80 bg-white/90 p-4 shadow-inner shadow-sky-100/30 dark:border-white/10 dark:bg-white/5">
                <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
                <p class="mt-2 text-2xl font-bold" :class="card.accent">{{ card.value }}</p>
              </div>
            </div>
            <div v-if="financialSummary.events?.length" class="overflow-x-auto">
              <table class="min-w-full table-auto text-sm text-neutral-600 dark:text-neutral-300">
                <thead class="bg-neutral-900 text-[11px] uppercase tracking-[0.3em] text-white">
                  <tr>
                    <th class="px-4 py-3 text-left">Evento</th>
                    <th class="px-4 py-3 text-right">Receita bruta</th>
                    <th class="px-4 py-3 text-right">Taxas</th>
                    <th class="px-4 py-3 text-right">Receita líquida</th>
                    <th class="px-4 py-3 text-right">Pedidos pagos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in financialSummary.events"
                    :key="item.event.id"
                    class="border-b border-neutral-100/70 bg-white/90 dark:border-white/5 dark:bg-white/5"
                  >
                    <td class="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{{ item.event.title }}</td>
                    <td class="px-4 py-3 text-right text-neutral-700 dark:text-neutral-200">{{ formatCurrency(item.grossCents) }}</td>
                    <td class="px-4 py-3 text-right text-red-600 dark:text-red-400">-{{ formatCurrency(item.feesCents) }}</td>
                    <td class="px-4 py-3 text-right text-sky-700 dark:text-sky-300">{{ formatCurrency(item.netCents) }}</td>
                    <td class="px-4 py-3 text-right">{{ item.ordersCount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="selectedFinancialEventId" class="space-y-5 rounded-sm border border-neutral-100/80 bg-white/95 p-5 shadow-inner shadow-neutral-200/60 dark:border-white/10 dark:bg-neutral-900/50">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.35em] text-sky-700 dark:text-sky-300">Evento focado</p>
                  <h3 class="text-xl font-semibold text-neutral-900 dark:text-white">{{ findEventTitle(selectedFinancialEventId) }}</h3>
                </div>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  Atualizado em {{ financialGeneratedAt ? formatDateTime(financialGeneratedAt) : "—" }}
                </p>
              </div>

              <div v-if="financialDetailLoading" class="py-10">
                <TableSkeleton :rows="2" helperText="Sincronizando financeiro do evento..." />
              </div>
              <div v-else class="space-y-5">
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div
                    v-for="card in financialStatusCards"
                    :key="card.label"
                    class="rounded-sm border border-neutral-200/80 bg-white/90 p-4 shadow-inner shadow-neutral-100/40 dark:border-white/10 dark:bg-white/5"
                  >
                    <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
                    <p class="mt-2 text-2xl font-bold" :class="card.accent">{{ card.value }}</p>
                    <p class="text-xs text-neutral-500">{{ card.helper }}</p>
                  </div>
                </div>

                <div class="grid gap-5 md:grid-cols-2">
                  <div class="space-y-3">
                    <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Totais por distrito</p>
                    <div
                      v-for="district in financialByDistrict"
                      :key="district.id"
                      class="flex items-center justify-between rounded-sm border border-neutral-100/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <div>
                        <p class="font-semibold text-neutral-900 dark:text-white">{{ district.name }}</p>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ district.count }} participantes</p>
                      </div>
                      <p class="text-base font-bold text-sky-700 dark:text-sky-200">{{ formatCurrency(district.amountCents) }}</p>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Totais por igreja</p>
                    <div
                      v-for="church in financialByChurch"
                      :key="church.id"
                      class="flex items-center justify-between rounded-sm border border-neutral-100/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <div>
                        <p class="font-semibold text-neutral-900 dark:text-white">{{ church.name }}</p>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ church.count }} participantes</p>
                      </div>
                      <p class="text-base font-bold text-emerald-700 dark:text-emerald-200">{{ formatCurrency(church.amountCents) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
  <AccessDeniedNotice v-else module="Relatórios" />
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import AccessDeniedNotice from "../../components/admin/AccessDeniedNotice.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { useApi } from "../../composables/useApi";
import { useModulePermissions } from "../../composables/usePermissions";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
import { useCatalogStore } from "../../stores/catalog";
import type { Church, District, Event, Registration } from "../../types/api";
import { formatCurrency } from "../../utils/format";

const props = defineProps<{ tab?: string }>();

const router = useRouter();
const route = useRoute();

const admin = useAdminStore();
const catalog = useCatalogStore();
const auth = useAuthStore();
const { api } = useApi();

const reportsPermissions = useModulePermissions("reports");
const financialPermissions = useModulePermissions("financial");

const errorDialog = reactive({
  open: false,
  title: "Erro ao carregar dados",
  message: "",
  details: ""
});

const showError = (title: string, error: unknown) => {
  const details = (error as any)?.response?.data?.details;
  errorDialog.open = true;
  errorDialog.title = title;
  errorDialog.message =
    (error as any)?.response?.data?.message || (error as any)?.message || "Ocorreu um erro inesperado.";
  errorDialog.details = typeof details === "string" ? details : details ? JSON.stringify(details, null, 2) : "";
};

const tabs = computed(() => {
  const hasFinancialAccess = financialPermissions.canView.value || financialPermissions.canFinancial.value;
  return [
    { key: "event", label: "Eventos", visible: reportsPermissions.canView.value },
    { key: "church", label: "Distritos / Igrejas", visible: reportsPermissions.canView.value },
    { key: "financial", label: "Financeiro", visible: hasFinancialAccess }
  ].filter((tab) => tab.visible);
});

const activeTab = ref("event");
const setActiveTab = (tabKey?: string | null) => {
  if (!tabs.value.length) return;
  const fallback = tabs.value[0]?.key;
  const target = tabs.value.some((tab) => tab.key === tabKey) ? (tabKey as string) : fallback;
  if (!target) return;
  activeTab.value = target;
  if (route.params.tab !== target) {
    router.replace({ name: "admin-reports", params: { tab: target } });
  }
};

watch(
  () => props.tab,
  (next) => setActiveTab(next),
  { immediate: true }
);

watch(
  tabs,
  () => {
    if (!tabs.value.some((tab) => tab.key === activeTab.value)) {
      setActiveTab(tabs.value[0]?.key);
    }
  },
  { immediate: true }
);

const currentUser = computed(() => auth.user);
const userRole = computed(() => currentUser.value?.role ?? null);
const isGeneralAdmin = computed(() => userRole.value === "AdminGeral");
const isDirector = computed(() => userRole.value === "DiretorLocal");
const isDistrictAdmin = computed(() => userRole.value === "AdminDistrital");
const scopedDistrictId = computed(() => (isGeneralAdmin.value ? null : currentUser.value?.districtScopeId ?? null));
const scopedChurchId = computed(() => (isGeneralAdmin.value ? null : currentUser.value?.churchId ?? null));

const scopedMinistryIds = computed(() => {
  const ids = new Set<string>();
  if (currentUser.value?.ministryId) {
    ids.add(currentUser.value.ministryId);
  }
  (currentUser.value?.ministries ?? []).forEach((ministry) => {
    if (ministry.id) {
      ids.add(ministry.id);
    }
  });
  return Array.from(ids);
});

const accessibleEvents = computed(() => {
  if (isDirector.value && scopedMinistryIds.value.length) {
    return admin.events.filter((event) => event.ministryId && scopedMinistryIds.value.includes(event.ministryId));
  }
  return admin.events;
});

const accessibleDistricts = computed<District[]>(() => {
  if (isDirector.value || isDistrictAdmin.value) {
    return catalog.districts.filter((district) => district.id === scopedDistrictId.value);
  }
  return catalog.districts;
});

const lockDistrictSelect = computed(() => (isDirector.value || isDistrictAdmin.value) && Boolean(scopedDistrictId.value));
const lockChurchSelect = computed(() => isDirector.value && Boolean(scopedChurchId.value));

const participantCache = reactive<Record<string, Registration[]>>({});
const getCachedParticipants = (eventId: string) => participantCache[eventId];
const setCachedParticipants = (eventId: string, participants: Registration[]) => {
  participantCache[eventId] = participants;
};

const eventReport = reactive({
  eventId: "",
  loading: false,
  generatedAt: null as Date | null
});

const eventParticipants = ref<Registration[]>([]);
const selectedEvent = computed<Event | null>(() => accessibleEvents.value.find((event) => event.id === eventReport.eventId) ?? null);

const normalizeRegistrationStatus = (status?: string | null) => {
  if (!status) return "PENDING_PAYMENT";
  const map: Record<string, string> = {
    PENDING: "PENDING_PAYMENT",
    PENDING_PAYMENT: "PENDING_PAYMENT",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    CANCELED: "CANCELED",
    CANCELLED: "CANCELED",
    REFUNDED: "REFUNDED",
    DRAFT: "DRAFT"
  };
  return (map[status] ?? status) as Registration["status"];
};

const normalizeParticipants = (list: Registration[]) =>
  list.map((participant) => ({
    ...participant,
    status: normalizeRegistrationStatus(participant.status)
  })) as Registration[];

const fetchParticipantsForEvent = async (eventId: string) => {
  const params: Record<string, string> = { eventId };
  if (!isGeneralAdmin.value && scopedDistrictId.value) {
    params.districtId = scopedDistrictId.value;
  }
  if (!isGeneralAdmin.value && scopedChurchId.value) {
    params.churchId = scopedChurchId.value;
  }
  const response = await api.get<Registration[]>("/admin/registrations", { params });
  return response.data;
};
const loadEventParticipants = async () => {
  if (!eventReport.eventId) return;
  eventReport.loading = true;
  try {
    const data = await fetchParticipantsForEvent(eventReport.eventId);
    const normalized = normalizeParticipants(data);
    eventParticipants.value = normalized;
    setCachedParticipants(eventReport.eventId, normalized);
    eventReport.generatedAt = new Date();
  } catch (error) {
    showError("Erro ao carregar participantes do evento", error);
  } finally {
    eventReport.loading = false;
  }
};

const eventDownloadState = ref(false);
const downloadEventReport = async () => {
  if (!eventReport.eventId) return;
  eventDownloadState.value = true;
  try {
    const response = await admin.downloadRegistrationReport({ eventId: eventReport.eventId }, "event", "standard");
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = selectedEvent.value?.slug ?? selectedEvent.value?.title ?? "relatorio-evento";
    link.href = url;
    link.download = `relatorio-evento-${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("Erro ao gerar relatório do evento", error);
  } finally {
    eventDownloadState.value = false;
  }
};

const churchReport = reactive({
  eventId: "",
  districtId: "",
  churchId: "",
  layout: "single",
  template: "event" as "event" | "standard",
  loading: false
});

const churchParticipants = ref<Registration[]>([]);
const churchReportDownloadState = ref(false);

const churchesForSelectedDistrict = computed<Church[]>(() => {
  const districtId = churchReport.districtId || scopedDistrictId.value;
  if (!districtId) {
    return catalog.churches;
  }
  return catalog.churches.filter((church) => church.districtId === districtId);
});

const loadChurchParticipants = async () => {
  if (!churchReport.districtId) {
    showError("Selecione um distrito", new Error("É necessário informar o distrito para gerar o relatório."));
    return;
  }
  churchReport.loading = true;
  try {
    const params: Record<string, string> = {};
    if (churchReport.eventId) params.eventId = churchReport.eventId;
    params.districtId = churchReport.districtId;
    if (churchReport.churchId) params.churchId = churchReport.churchId;
    const response = await api.get<Registration[]>("/admin/registrations", { params });
    churchParticipants.value = normalizeParticipants(response.data);
  } catch (error) {
    showError("Erro ao carregar participantes da igreja", error);
  } finally {
    churchReport.loading = false;
  }
};

const downloadChurchReport = async () => {
  if (!churchReport.churchId) return;
  churchReportDownloadState.value = true;
  try {
    const baseFilters: Record<string, string | undefined> = {
      eventId: churchReport.eventId || undefined,
      districtId: churchReport.districtId,
      churchId: churchReport.churchId,
      template: churchReport.template
    };
    if (churchReport.template === "event") {
      baseFilters.layout = churchReport.layout;
    }
    const response = await admin.downloadRegistrationReport(
      baseFilters,
      "church",
      churchReport.template
    );
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `confirmacao-${findChurchName(churchReport.churchId)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("Erro ao gerar PDF da igreja", error);
  } finally {
    churchReportDownloadState.value = false;
  }
};

const financialSummary = ref<any | null>(null);
const financialLoading = ref(true);
const financialDetailLoading = ref(false);
const financialEventSummary = ref<any | null>(null);
const selectedFinancialEventId = ref("");
const financialGeneratedAt = ref<Date | null>(null);
const financialDownloadState = ref(false);

const ensureParticipantsForEvent = async (eventId: string) => {
  if (!eventId) return [];
  if (getCachedParticipants(eventId)) {
    return getCachedParticipants(eventId)!;
  }
  const data = await fetchParticipantsForEvent(eventId);
  setCachedParticipants(eventId, data);
  return data;
};

const refreshFinancialData = async () => {
  if (!selectedFinancialEventId.value) {
    financialEventSummary.value = null;
    return;
  }
  financialDetailLoading.value = true;
  try {
    const [summaryResponse] = await Promise.all([
      api.get(`/admin/financial/events/${selectedFinancialEventId.value}`),
      ensureParticipantsForEvent(selectedFinancialEventId.value)
    ]);
    financialEventSummary.value = summaryResponse.data;
    financialGeneratedAt.value = new Date();
  } catch (error) {
    showError("Erro ao carregar resumo financeiro do evento", error);
    financialEventSummary.value = null;
  } finally {
    financialDetailLoading.value = false;
  }
};

const downloadFinancialPdf = async () => {
  if (!selectedFinancialEventId.value) return;
  financialDownloadState.value = true;
  try {
    const response = await admin.downloadFinancialReport(selectedFinancialEventId.value);
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const eventSlug = findEventTitle(selectedFinancialEventId.value).replace(/\s+/g, "-").toLowerCase();
    link.href = url;
    link.download = `relatorio-financeiro-${eventSlug}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showError("Erro ao gerar PDF financeiro", error);
  } finally {
    financialDownloadState.value = false;
  }
};
const exportFinancialCsv = async () => {
  if (!selectedFinancialEventId.value) return;
  const participants = await ensureParticipantsForEvent(selectedFinancialEventId.value);
  if (!participants.length) {
    showError("Nada para exportar", new Error("Carregue os participantes do evento antes de exportar."));
    return;
  }
  const headers = ["Participante", "Status", "Valor", "Igreja", "Distrito"];
  const rows = participants.map((participant) => [
    `"${participant.fullName.replace(/"/g, '""')}"`,
    translateStatus(participant.status),
    (participant.priceCents / 100).toFixed(2).replace(".", ","),
    `"${findChurchName(participant.churchId).replace(/"/g, '""')}"`,
    `"${findDistrictName(participant.districtId).replace(/"/g, '""')}"`
  ]);
  const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${findEventTitle(selectedFinancialEventId.value)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const loadFinancialSummary = async () => {
  if (!financialPermissions.canView.value && !financialPermissions.canFinancial.value) {
    financialLoading.value = false;
    return;
  }
  financialLoading.value = true;
  try {
    const response = await api.get("/admin/financial/summary");
    financialSummary.value = response.data;
  } catch (error) {
    showError("Erro ao carregar resumo financeiro geral", error);
    financialSummary.value = null;
  } finally {
    financialLoading.value = false;
  }
};

const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const formatDateBr = (value: string | Date) => new Date(value).toLocaleDateString("pt-BR");

const formatEventPeriod = (event: Event) => {
  const start = formatDateBr(event.startDate);
  const end = formatDateBr(event.endDate);
  if (start === end) return start;
  return `${start} a ${end}`;
};

const formatBirthDate = (value?: string | Date | null) => {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleDateString("pt-BR");
};

const findEventTitle = (eventId: string) => admin.events.find((event) => event.id === eventId)?.title ?? "Evento";
const findDistrictName = (districtId: string) => catalog.districts.find((district) => district.id === districtId)?.name ?? "Não informado";
const findChurchName = (churchId: string) => catalog.churches.find((church) => church.id === churchId)?.name ?? "Não informado";

const resolvePhotoUrl = (photoUrl?: string | null) => {
  if (photoUrl && photoUrl.trim().length > 0) {
    return photoUrl;
  }
  return DEFAULT_PHOTO_DATA_URL;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_PAYMENT: "Pendente",
  PAID: "Pago",
  CHECKED_IN: "Check-in",
  CANCELED: "Cancelada",
  REFUNDED: "Estornada"
};

const translateStatus = (status: string) => statusLabels[status] ?? status;

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "PAID":
    case "CHECKED_IN":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "PENDING_PAYMENT":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100";
    case "REFUNDED":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200";
    case "CANCELED":
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";
  }
};

const eventSummaryCards = computed(() => {
  const participants = eventParticipants.value;
  const groups = new Set(participants.map((participant) => participant.orderId || participant.id));
  const paidCount = participants.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN").length;
  const pendingCount = participants.filter((participant) => participant.status === "PENDING_PAYMENT").length;
  return [
    { label: "Gerado em", value: eventReport.generatedAt ? formatDateTime(eventReport.generatedAt) : "—", accent: "text-neutral-900 dark:text-white" },
    { label: "Total de grupos", value: groups.size.toString().padStart(2, "0"), accent: "text-sky-700 dark:text-sky-300" },
    { label: "Participantes", value: participants.length.toString().padStart(2, "0"), accent: "text-neutral-900 dark:text-white" },
    { label: "Pagos", value: paidCount.toString().padStart(2, "0"), accent: "text-emerald-600 dark:text-emerald-300" },
    { label: "Pendentes", value: pendingCount.toString().padStart(2, "0"), accent: "text-amber-600 dark:text-amber-300" }
  ];
});

const financialParticipants = computed<Registration[]>(() => {
  if (!selectedFinancialEventId.value) return [];
  if (selectedFinancialEventId.value === eventReport.eventId) {
    return eventParticipants.value;
  }
  return getCachedParticipants(selectedFinancialEventId.value) ?? [];
});

const sumPrice = (items: Registration[]) => items.reduce((total, registration) => total + (registration.priceCents ?? 0), 0);

const financialStatusTotals = computed(() => {
  const paid = financialParticipants.value.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN");
  const pending = financialParticipants.value.filter((participant) => participant.status === "PENDING_PAYMENT");
  const refunded = financialParticipants.value.filter((participant) => participant.status === "REFUNDED");
  return {
    paid: { count: paid.length, amount: sumPrice(paid) },
    pending: { count: pending.length, amount: sumPrice(pending) },
    refunded: { count: refunded.length, amount: sumPrice(refunded) }
  };
});

const financialStatusCards = computed(() => [
  {
    label: "Pagos",
    value: formatCurrency(financialStatusTotals.value.paid.amount),
    helper: `${financialStatusTotals.value.paid.count} inscrições`,
    accent: "text-emerald-600 dark:text-emerald-300"
  },
  {
    label: "Pendentes",
    value: formatCurrency(financialStatusTotals.value.pending.amount),
    helper: `${financialStatusTotals.value.pending.count} aguardando`,
    accent: "text-amber-600 dark:text-amber-300"
  },
  {
    label: "Estornados",
    value: formatCurrency(financialStatusTotals.value.refunded.amount),
    helper: `${financialStatusTotals.value.refunded.count} registros`,
    accent: "text-neutral-600 dark:text-neutral-300"
  },
  {
    label: "Receita líquida do evento",
    value: financialEventSummary.value ? formatCurrency(financialEventSummary.value.totals?.netCents ?? 0) : "—",
    helper: financialEventSummary.value ? `${financialEventSummary.value.paidRegistrationsCount ?? 0} confirmados` : "Selecione um evento",
    accent: "text-sky-700 dark:text-sky-300"
  }
]);

const buildGrouping = (participants: Registration[], key: "districtId" | "churchId") => {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      count: number;
      amountCents: number;
    }
  >();
  const paidParticipants = participants.filter((participant) => participant.status === "PAID" || participant.status === "CHECKED_IN");
  paidParticipants.forEach((participant) => {
    const id = participant[key];
    if (!id) return;
    const name = key === "districtId" ? findDistrictName(id) : findChurchName(id);
    const group = groups.get(id) ?? { id, name, count: 0, amountCents: 0 };
    group.count += 1;
    group.amountCents += participant.priceCents ?? 0;
    groups.set(id, group);
  });
  return Array.from(groups.values()).sort((a, b) => b.amountCents - a.amountCents);
};

const financialByDistrict = computed(() => buildGrouping(financialParticipants.value, "districtId"));
const financialByChurch = computed(() => buildGrouping(financialParticipants.value, "churchId"));

const generalFinancialCards = computed(() => {
  if (!financialSummary.value) {
    return [];
  }
  const totals = financialSummary.value.totals ?? {};
  return [
    { label: "Receita bruta", value: formatCurrency(totals.grossCents ?? 0), accent: "text-neutral-900 dark:text-white" },
    { label: "Receita líquida", value: formatCurrency(totals.netCents ?? 0), accent: "text-sky-700 dark:text-sky-300" },
    { label: "Taxas", value: `-${formatCurrency(totals.feesCents ?? 0)}`, accent: "text-red-600 dark:text-red-400" },
    { label: "Saldo em caixa", value: formatCurrency(totals.cashBalanceCents ?? 0), accent: "text-emerald-600 dark:text-emerald-300" }
  ];
});
watch(
  () => eventReport.eventId,
  async (next, previous) => {
    if (next && next !== previous) {
      await loadEventParticipants();
      if (!churchReport.eventId) {
        churchReport.eventId = next;
      }
      if (!selectedFinancialEventId.value) {
        selectedFinancialEventId.value = next;
      }
    }
  }
);

watch(
  () => churchReport.districtId,
  async () => {
    try {
      await catalog.loadChurches(churchReport.districtId || scopedDistrictId.value || undefined);
    } catch (error) {
      showError("Erro ao carregar igrejas", error);
    }
    if (churchReport.churchId && !catalog.churches.some((church) => church.id === churchReport.churchId)) {
      churchReport.churchId = "";
    }
  }
);

watch(
  () => tabs.value.length,
  (count) => {
    if (!count) return;
    setActiveTab(route.params.tab?.toString() ?? tabs.value[0]?.key);
  }
);

watch(
  () => selectedFinancialEventId.value,
  async (value, previous) => {
    if (value && value !== previous) {
      await refreshFinancialData();
    }
  }
);

onMounted(async () => {
  try {
    await Promise.all([
      admin.loadEvents(),
      catalog.loadDistricts(),
      catalog.loadChurches(scopedDistrictId.value ?? undefined)
    ]);
    if (scopedDistrictId.value) {
      churchReport.districtId = scopedDistrictId.value;
    }
    if (scopedChurchId.value) {
      churchReport.churchId = scopedChurchId.value;
    }
    if (accessibleEvents.value.length) {
      eventReport.eventId = accessibleEvents.value[0].id;
      if (!churchReport.eventId) {
        churchReport.eventId = accessibleEvents.value[0].id;
      }
      if (!selectedFinancialEventId.value) {
        selectedFinancialEventId.value = accessibleEvents.value[0].id;
      }
    }
    if (reportsPermissions.canView.value && eventReport.eventId) {
      await loadEventParticipants();
    }
    await loadFinancialSummary();
    if (selectedFinancialEventId.value) {
      await refreshFinancialData();
    }
  } catch (error) {
    showError("Erro ao carregar dados iniciais", error);
  }
});
</script>









