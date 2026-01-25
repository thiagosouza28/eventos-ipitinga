<template>
  <div class="space-y-6">
    <TableSkeleton v-if="loadingDashboard" helperText="📡 Carregando painel administrativo..." />
    <template v-else>
    <BaseCard
      class="bg-gradient-to-r from-white via-[#f7f9ff] to-[#e7ecff] dark:from-[#131a2f] dark:via-[#0f162a] dark:to-[#0b1223]"
    >
      <div class="flex flex-col gap-6">
        <div class="max-w-4xl">
          <p class="text-xs uppercase tracking-[0.35em] text-[#6f7cff] dark:text-[#b7c8ff]">Visão geral</p>
          <h1 class="mt-1 text-3xl font-semibold text-[color:var(--text)]">Dashboard administrativo</h1>
          <p class="mt-2 text-sm text-[color:var(--text-muted)]">
            Gerencie eventos, pedidos, lotes e inscrições com atalhos rápidos.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            class="flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]">Eventos ativos</span>
              <CalendarDaysIcon class="h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ activeEvents }}</p>
          </div>
          <div
            class="flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f5f7ff] to-[#eaf1ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161d36] dark:via-[#111a2d] dark:to-[#0d1426] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]">Pedidos carregados</span>
              <ClipboardDocumentListIcon class="h-10 w-10 text-[#4b61ff] dark:text-[#9eb5ff]" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ admin.orders.length }}</p>
          </div>
          <div
            class="flex flex-col gap-3 rounded-lg bg-gradient-to-br from-white via-[#f2f7ff] to-[#fef2ff] p-5 text-[#111827] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:from-[#161c33] dark:via-[#121a2f] dark:to-[#0e1527] dark:text-[color:var(--text)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] dark:border dark:border-[rgba(255,255,255,0.06)]"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-[0.3em] text-[#94a3b8] dark:text-[color:var(--text-muted)]">Inscrições carregadas</span>
              <UsersIcon class="h-10 w-10 text-[#4b61ff] dark:text-[#b8a2ff]" aria-hidden="true" />
            </div>
            <p class="text-4xl font-semibold">{{ admin.registrationsTotal ?? admin.registrations.length }}</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">Métricas</p>
            <h2 class="text-xl font-semibold text-[color:var(--text)]">Inscrições por distrito, igreja e lote</h2>
            <p class="mt-1 text-sm text-[color:var(--text-muted)]">
              Acompanhe o volume de inscrições com filtros por evento e período.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Evento</label>
              <select
                v-model="dashboardFilters.eventId"
                class="w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5"
              >
                <option value="">Todos</option>
                <option v-for="event in metricsEvents" :key="event.id" :value="event.id">{{ event.title }}</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Data inicial</label>
              <input
                v-model="dashboardFilters.startDate"
                type="date"
                class="w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Data final</label>
              <input
                v-model="dashboardFilters.endDate"
                type="date"
                class="w-full rounded-xl border border-[color:var(--border-card)] bg-white/80 px-4 py-2.5 text-sm text-[color:var(--text)] shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-[#1f4fff] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#9eb5ff] dark:text-[#10162a]"
              :disabled="metricsLoading"
              @click="loadRegistrationsMetrics"
            >
              <span v-if="metricsLoading" class="mr-2 h-4 w-4 animate-spin rounded-sm border-2 border-white border-b-transparent dark:border-[#10162a] dark:border-b-transparent" />
              Atualizar
            </button>
          </div>
        </div>
        <p v-if="registrationsMetrics.generatedAt" class="text-xs text-[color:var(--text-muted)]">
          Atualizado em {{ registrationsMetrics.generatedAt.toLocaleString('pt-BR') }}
        </p>
      </div>

      <div class="mt-6">
        <TableSkeleton v-if="metricsLoading" helperText="Carregando métricas de inscrições..." />
        <div v-else class="space-y-6">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5">
              <p class="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Total de inscrições</p>
              <p class="mt-2 text-3xl font-semibold text-[color:var(--text)]">{{ formatCount(registrationsMetrics.summary.totalRegistrations) }}</p>
            </div>
            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5">
              <p class="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Distritos com inscrições</p>
              <p class="mt-2 text-3xl font-semibold text-[color:var(--text)]">{{ formatCount(registrationsMetrics.summary.districtsCount) }}</p>
            </div>
            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 shadow-inner shadow-blue-100/25 dark:border-white/10 dark:bg-white/5">
              <p class="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Igrejas com inscrições</p>
              <p class="mt-2 text-3xl font-semibold text-[color:var(--text)]">{{ formatCount(registrationsMetrics.summary.churchesCount) }}</p>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-3">
            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-[color:var(--text)]">Inscrições por distrito</p>
                <span class="text-xs text-[color:var(--text-muted)]">Top {{ districtChartRows.length }}</span>
              </div>
              <div v-if="!districtChartRows.length" class="mt-4 text-sm text-[color:var(--text-muted)]">
                Nenhum distrito com inscrições no período.
              </div>
              <div v-else class="mt-4 space-y-3">
                <div v-for="district in districtChartRows" :key="district.districtId" class="space-y-1">
                  <div class="flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                    <span class="font-semibold text-[color:var(--text)]">{{ district.districtName }}</span>
                    <div class="flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap">
                      <span class="text-[color:var(--text)]">
                        {{ formatCount(district.registrationsCount) }} no total
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span
                          v-if="district.confirmedCount"
                          class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                        >
                          {{ formatCount(district.confirmedCount) }}
                          ({{ formatPercent(district.confirmedCount, district.registrationsCount) }}) confirmadas
                        </span>
                        <span
                          v-if="district.pendingCount"
                          class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200"
                        >
                          {{ formatCount(district.pendingCount) }}
                          ({{ formatPercent(district.pendingCount, district.registrationsCount) }}) pendentes
                        </span>
                        <span
                          v-if="district.canceledCount"
                          class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200"
                        >
                          {{ formatCount(district.canceledCount) }}
                          ({{ formatPercent(district.canceledCount, district.registrationsCount) }}) canceladas
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10">
                    <div
                      class="flex h-2 overflow-hidden rounded-full"
                      :style="{ width: resolveBarWidth(district.registrationsCount, districtMax) }"
                    >
                      <span
                        v-if="district.confirmedCount"
                        class="h-2 basis-0 bg-emerald-500 dark:bg-emerald-400"
                        :style="{ flexGrow: district.confirmedCount }"
                      ></span>
                      <span
                        v-if="district.pendingCount"
                        class="h-2 basis-0 bg-red-500 dark:bg-red-400"
                        :style="{ flexGrow: district.pendingCount }"
                      ></span>
                      <span
                        v-if="district.canceledCount"
                        class="h-2 basis-0 bg-blue-500 dark:bg-blue-400"
                        :style="{ flexGrow: district.canceledCount }"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-[color:var(--text)]">Inscrições por igreja</p>
                <span class="text-xs text-[color:var(--text-muted)]">Top {{ churchChartRows.length }}</span>
              </div>
              <div v-if="!churchChartRows.length" class="mt-4 text-sm text-[color:var(--text-muted)]">
                Nenhuma igreja com inscrições no período.
              </div>
              <div v-else class="mt-4 space-y-3">
                <div v-for="church in churchChartRows" :key="church.churchId" class="space-y-1">
                  <div class="flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                    <span class="font-semibold text-[color:var(--text)]">{{ church.churchName }}</span>
                    <div class="flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap">
                      <span class="text-[color:var(--text)]">
                        {{ formatCount(church.registrationsCount) }} no total
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span
                          v-if="church.confirmedCount"
                          class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                        >
                          {{ formatCount(church.confirmedCount) }}
                          ({{ formatPercent(church.confirmedCount, church.registrationsCount) }}) confirmadas
                        </span>
                        <span
                          v-if="church.pendingCount"
                          class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200"
                        >
                          {{ formatCount(church.pendingCount) }}
                          ({{ formatPercent(church.pendingCount, church.registrationsCount) }}) pendentes
                        </span>
                        <span
                          v-if="church.canceledCount"
                          class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200"
                        >
                          {{ formatCount(church.canceledCount) }}
                          ({{ formatPercent(church.canceledCount, church.registrationsCount) }}) canceladas
                        </span>
                      </div>
                    </div>
                  </div>
                  <p class="text-[11px] text-[color:var(--text-muted)]">{{ church.districtName }}</p>
                  <div class="h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10">
                    <div
                      class="flex h-2 overflow-hidden rounded-full"
                      :style="{ width: resolveBarWidth(church.registrationsCount, churchMax) }"
                    >
                      <span
                        v-if="church.confirmedCount"
                        class="h-2 basis-0 bg-emerald-500 dark:bg-emerald-400"
                        :style="{ flexGrow: church.confirmedCount }"
                      ></span>
                      <span
                        v-if="church.pendingCount"
                        class="h-2 basis-0 bg-red-500 dark:bg-red-400"
                        :style="{ flexGrow: church.pendingCount }"
                      ></span>
                      <span
                        v-if="church.canceledCount"
                        class="h-2 basis-0 bg-blue-500 dark:bg-blue-400"
                        :style="{ flexGrow: church.canceledCount }"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-[color:var(--border-card)] bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-[color:var(--text)]">Inscrições por lote</p>
                <span class="text-xs text-[color:var(--text-muted)]">Top {{ lotChartRows.length }}</span>
              </div>
              <div v-if="!lotChartRows.length" class="mt-4 text-sm text-[color:var(--text-muted)]">
                Nenhum lote com inscrições no período.
              </div>
              <div v-else class="mt-4 space-y-3">
                <div v-for="lot in lotChartRows" :key="`${lot.eventId}-${lot.lotId}`" class="space-y-1">
                  <div class="flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                    <span class="font-semibold text-[color:var(--text)]">{{ lot.lotName }}</span>
                    <div class="flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap">
                      <span class="text-[color:var(--text)]">
                        {{ formatCount(lot.registrationsCount) }} no total
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span
                          v-if="lot.confirmedCount"
                          class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                        >
                          {{ formatCount(lot.confirmedCount) }}
                          ({{ formatPercent(lot.confirmedCount, lot.registrationsCount) }}) confirmadas
                        </span>
                        <span
                          v-if="lot.pendingCount"
                          class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-400/15 dark:text-red-200"
                        >
                          {{ formatCount(lot.pendingCount) }}
                          ({{ formatPercent(lot.pendingCount, lot.registrationsCount) }}) pendentes
                        </span>
                        <span
                          v-if="lot.canceledCount"
                          class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-200"
                        >
                          {{ formatCount(lot.canceledCount) }}
                          ({{ formatPercent(lot.canceledCount, lot.registrationsCount) }}) canceladas
                        </span>
                      </div>
                    </div>
                  </div>
                  <p class="text-[11px] text-[color:var(--text-muted)]">{{ lot.eventTitle }}</p>
                  <div class="h-2 rounded-full bg-[#e5e7ff] dark:bg-white/10">
                    <div
                      class="flex h-2 overflow-hidden rounded-full"
                      :style="{ width: resolveBarWidth(lot.registrationsCount, lotMax) }"
                    >
                      <span
                        v-if="lot.confirmedCount"
                        class="h-2 basis-0 bg-emerald-500 dark:bg-emerald-400"
                        :style="{ flexGrow: lot.confirmedCount }"
                      ></span>
                      <span
                        v-if="lot.pendingCount"
                        class="h-2 basis-0 bg-red-500 dark:bg-red-400"
                        :style="{ flexGrow: lot.pendingCount }"
                      ></span>
                      <span
                        v-if="lot.canceledCount"
                        class="h-2 basis-0 bg-blue-500 dark:bg-blue-400"
                        :style="{ flexGrow: lot.canceledCount }"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      class="bg-[color:var(--surface-card)]/95 border-[color:var(--border-card)] dark:bg-[color:var(--surface-card)]/92 dark:border-[rgba(255,255,255,0.12)]"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">Eventos cadastrados</p>
          <h2 class="text-xl font-semibold text-[color:var(--text)]">Resumo dos eventos</h2>
        </div>
      </div>
      <div class="mt-6 hidden overflow-x-auto md:block">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            <tr>
              <th class="pb-4 font-semibold">Evento</th>
              <th class="pb-4 font-semibold">Período</th>
              <th class="pb-4 font-semibold">Status</th>
              <th class="pb-4 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eaecf5] dark:divide-[rgba(255,255,255,0.08)]">
            <tr v-for="event in admin.events" :key="event.id" class="text-[color:var(--text)]">
              <td class="py-4">
                <div class="font-semibold text-[color:var(--text)]">
                  {{ event.title }}
                </div>
                <div class="text-xs text-[color:var(--text-muted)]">Slug: {{ event.slug }}</div>
              </td>
              <td class="py-4 text-sm text-[color:var(--text-muted)]">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </td>
              <td class="py-4">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                    event.isActive
                      ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--text-muted)]'
                  ]"
                >
                  {{ event.isActive ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="py-4 text-right">
                <div class="flex items-center justify-end gap-3 text-sm">
                  <RouterLink
                    :to="`/evento/${event.slug}`"
                    target="_blank"
                    class="text-[#1f4fff] hover:underline dark:text-[#a8c4ff]"
                  >
                    Ver público
                  </RouterLink>
                  <RouterLink :to="`/admin/checkin/${event.id}`" class="text-[#1f4fff] hover:underline dark:text-[#a8c4ff]">
                    Check-in
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleEvents.length">
              <td class="py-4 text-center text-sm text-[color:var(--text-muted)]" colspan="4">
                Nenhum evento cadastrado até o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>      <div class="mt-6 flex flex-col gap-4 md:hidden">
        <div
          v-for="event in visibleEvents"
          :key="event.id"
          class="rounded-lg border border-white/15 bg-white/90 p-4 text-sm shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] dark:border-white/5 dark:bg-[color:var(--surface-card)] dark:text-[color:var(--text)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <p class="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">Evento</p>
              <p class="text-base font-semibold text-[color:var(--text)]">{{ event.title }}</p>
              <p class="text-xs text-[color:var(--text-muted)]">Slug: {{ event.slug }}</p>
            </div>
            <span
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                event.isActive
                  ? 'bg-[#e4ecff] text-[#1f4fff] dark:bg-[rgba(86,129,255,0.35)] dark:text-[#f6f8ff]'
                  : 'bg-neutral-200 text-neutral-600 dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--text-muted)]'
              ]"
            >
              {{ event.isActive ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-[color:var(--text-muted)]">
            <div>
              <p class="font-semibold text-[color:var(--text)]">Início</p>
              <p>{{ formatDate(event.startDate) }}</p>
            </div>
            <div>
              <p class="font-semibold text-[color:var(--text)]">Fim</p>
              <p>{{ formatDate(event.endDate) }}</p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[#1f4fff] dark:text-[#a8c4ff]">
            <RouterLink
              :to="`/evento/${event.slug}`"
              target="_blank"
              class="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5"
            >
              Ver público
            </RouterLink>
            <RouterLink
              :to="`/admin/checkin/${event.id}`"
              class="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-current px-4 py-1.5"
            >
              Check-in
            </RouterLink>
          </div>
        </div>
        <div v-if="!visibleEvents.length" class="rounded-lg border border-dashed border-[color:var(--border-card)] p-4 text-center text-sm text-[color:var(--text-muted)]">
          Nenhum evento cadastrado até o momento.
        </div>
      </div>
    </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { CalendarDaysIcon, ClipboardDocumentListIcon, UsersIcon } from "@heroicons/vue/24/outline";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";
import TableSkeleton from "../../components/ui/TableSkeleton.vue";
import type {
  RegistrationsDashboardDistrict,
  RegistrationsDashboardChurch,
  RegistrationsDashboardLot
} from "../../types/api";

const admin = useAdminStore();
const auth = useAuthStore();
const loadingDashboard = ref(true);
const hasRequested = ref(false);

const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));

const currentUser = computed(() => auth.user);
const isLocalDirector = computed(() => currentUser.value?.role === "DiretorLocal");
const scopedChurchId = computed(() => currentUser.value?.churchId ?? null);
const scopedDistrictId = computed(() => currentUser.value?.districtScopeId ?? null);
const userMinistryIds = computed(() => {
  const ids = new Set<string>();
  if (currentUser.value?.ministryId) ids.add(currentUser.value.ministryId);
  (currentUser.value?.ministries ?? []).forEach((ministry) => {
    if (ministry.id) ids.add(ministry.id);
  });
  return ids;
});
const hasMinistryScope = computed(() => isLocalDirector.value && userMinistryIds.value.size > 0);
const localDirectorFilters = computed(() => {
  if (isLocalDirector.value) {
    const filters: Record<string, string> = {};
    if (scopedChurchId.value) filters.churchId = scopedChurchId.value;
    if (scopedDistrictId.value) filters.districtId = scopedDistrictId.value;
    return filters;
  }
  return {};
});
const visibleEvents = computed(() => {
  if (hasMinistryScope.value) {
    return admin.events.filter(
      (event) => event.ministryId && userMinistryIds.value.has(event.ministryId)
    );
  }
  return admin.events;
});

const dashboardFilters = reactive({
  eventId: "",
  startDate: "",
  endDate: ""
});

const metricsLoading = ref(false);
const registrationsMetrics = reactive({
  summary: {
    totalRegistrations: 0,
    districtsCount: 0,
    churchesCount: 0,
    lotsCount: 0
  },
  byDistrict: [] as RegistrationsDashboardDistrict[],
  byChurch: [] as RegistrationsDashboardChurch[],
  byLot: [] as RegistrationsDashboardLot[],
  generatedAt: null as Date | null
});

const metricsEvents = computed(() => visibleEvents.value);
const districtMax = computed(() =>
  Math.max(0, ...registrationsMetrics.byDistrict.map((item) => item.registrationsCount))
);
const churchMax = computed(() =>
  Math.max(0, ...registrationsMetrics.byChurch.map((item) => item.registrationsCount))
);
const lotMax = computed(() =>
  Math.max(0, ...registrationsMetrics.byLot.map((item) => item.registrationsCount))
);

const chartLimit = 12;
const districtChartRows = computed(() => registrationsMetrics.byDistrict.slice(0, chartLimit));
const churchChartRows = computed(() => registrationsMetrics.byChurch.slice(0, chartLimit));
const lotChartRows = computed(() => registrationsMetrics.byLot.slice(0, chartLimit));

const buildDashboardParams = () => ({
  eventId: dashboardFilters.eventId || undefined,
  startDate: dashboardFilters.startDate || undefined,
  endDate: dashboardFilters.endDate || undefined
});

const loadRegistrationsMetrics = async () => {
  metricsLoading.value = true;
  try {
    const data = await admin.getRegistrationsDashboard(buildDashboardParams());
    registrationsMetrics.summary = data.summary ?? registrationsMetrics.summary;
    registrationsMetrics.byDistrict = data.byDistrict ?? [];
    registrationsMetrics.byChurch = data.byChurch ?? [];
    registrationsMetrics.byLot = data.byLot ?? [];
    registrationsMetrics.generatedAt = data.generatedAt ? new Date(data.generatedAt) : new Date();
  } catch (error) {
    console.error("Falha ao carregar metricas de inscricoes", error);
  } finally {
    metricsLoading.value = false;
  }
};

let metricsTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleMetricsLoad = () => {
  if (metricsTimer) clearTimeout(metricsTimer);
  metricsTimer = setTimeout(() => {
    void loadRegistrationsMetrics();
  }, 400);
};

const resolveBarWidth = (value: number, max: number) =>
  `${max > 0 ? Math.round((value / max) * 100) : 0}%`;

const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const formatPercent = (value: number, total: number) =>
  `${total > 0 ? Math.round((value / total) * 100) : 0}%`;

const loadDashboardData = async () => {
  if (hasRequested.value) return;
  if (!auth.ensureValidSession()) {
    console.warn("[dashboard] Session invalid. Skipping dashboard load.");
    loadingDashboard.value = false;
    return;
  }
  const tasks: Promise<unknown>[] = [];
  if (canViewEvents.value) tasks.push(admin.loadEvents());
  if (canViewOrders.value) tasks.push(admin.loadOrders(localDirectorFilters.value));
  if (canViewRegistrations.value) tasks.push(admin.loadRegistrations(localDirectorFilters.value));
  hasRequested.value = true;
  loadingDashboard.value = true;
  try {
    console.info("[dashboard] Loading admin dashboard data");
    await Promise.all(tasks);
    await loadRegistrationsMetrics();
  } catch (error) {
    console.error("Falha ao carregar dados iniciais do dashboard", error);
  } finally {
    loadingDashboard.value = false;
  }
};

watch(
  () => [dashboardFilters.eventId, dashboardFilters.startDate, dashboardFilters.endDate],
  () => {
    if (loadingDashboard.value) return;
    scheduleMetricsLoad();
  }
);

watch(
  () => auth.isReady && auth.isAuthenticated && auth.hasValidSession,
  (ready) => {
    if (!ready) {
      hasRequested.value = false;
      loadingDashboard.value = false;
      return;
    }
    loadDashboardData();
  },
  { immediate: true }
);

const activeEvents = computed(() => visibleEvents.value.filter((event) => event.isActive).length);
</script>
