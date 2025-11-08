<template>
  <div class="space-y-6">
    <ErrorDialog
      :model-value="errorDialog.open"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :details="errorDialog.details"
      @update:modelValue="errorDialog.open = $event"
    />

    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Financeiro — {{ eventSummary?.event?.title || 'Evento' }}
          </h1>
          <p class="text-sm text-neutral-500">Resumo financeiro e inscrições do evento.</p>
        </div>
        <RouterLink
          to="/admin/events"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Voltar para eventos
        </RouterLink>
      </div>
    </BaseCard>

    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Resumo do Evento -->
    <BaseCard v-if="!loading && eventSummary">
      <h2 class="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Resumo do Evento
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Bruto Total</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">{{ formatCurrency(eventSummary.totals.grossCents) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Taxa total</p>
          <p class="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(eventSummary.totals.feesCents) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Líquido total</p>
          <p class="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-300">
            {{ formatCurrency(eventSummary.totals.netCents) }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Recebido em dinheiro</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">{{ formatCurrency(eventSummary.totals.cashCents || 0) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">PIX Líquido</p>
          <p class="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-50">{{ formatCurrency(eventSummary.totals.pix?.netCents || 0) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p class="text-xs font-medium uppercase text-neutral-500">Taxas PIX</p>
          <p class="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(eventSummary.totals.pix?.feesCents || 0) }}</p>
        </div>
        <div class="rounded-lg border-2 border-primary-500 bg-primary-50 p-4 dark:bg-primary-900/20">
          <p class="text-xs font-medium uppercase text-primary-600 dark:text-primary-400">Total geral (líquido)</p>
          <p class="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(eventSummary.totals.generalNetCents || eventSummary.totals.netCents) }}</p>
        </div>
      </div>
    </BaseCard>

    <!-- Filtros e Exportação -->
    <BaseCard>
      <form class="grid gap-4 md:grid-cols-5">
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Status</label>
          <select v-model="filters.status" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option value="PENDING_PAYMENT">Pendente</option>
            <option value="PAID">Pago</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Pagamento</label>
          <select v-model="filters.method" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option value="PIX_MP">Pix</option>
            <option value="CASH">Dinheiro</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold uppercase text-neutral-500">Busca (nome ou CPF)</label>
          <input v-model="filters.search" type="text" placeholder="Digite nome ou CPF" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
        </div>
        <div class="flex items-end gap-2">
          <button type="button" @click="doExportPdf" class="shrink-0 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white">Baixar PDF</button>
          <button type="button" @click="doExportCsv" class="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">Exportar CSV</button>
        </div>
      </form>
      <p class="mt-3 text-xs text-neutral-500">Total de inscritos: {{ admin.registrations.length }} | Exibindo: {{ displayedRegistrations.length }}</p>
    </BaseCard>

    <!-- Lista de inscrições do evento -->
    <BaseCard>
      <div v-if="displayedRegistrations.length === 0" class="p-4 text-sm text-neutral-500">Nenhuma inscrição encontrada.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full table-auto text-sm">
          <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <tr>
              <th class="px-4 py-3">Participante</th>
              <th class="px-4 py-3">Pagamento</th>
              <th class="px-4 py-3 text-right">Valor</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in displayedRegistrations" :key="r.id" class="border-t border-neutral-200 dark:border-neutral-800">
              <td class="px-4 py-3 align-top">
                <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ r.fullName }}</div>
                <div class="text-xs text-neutral-500">CPF: {{ formatCPF(r.cpf) }}</div>
              </td>
              <td class="px-4 py-3 align-top">
                <div>{{ r.paymentMethod === 'CASH' ? 'Dinheiro' : 'Pix' }}</div>
                <div v-if="r.paidAt" class="text-xs text-neutral-500">Pago em {{ new Date(r.paidAt).toLocaleString('pt-BR') }}</div>
              </td>
              <td class="px-4 py-3 align-top text-right">{{ formatCurrency(r.priceCents || 0) }}</td>
              <td class="px-4 py-3 align-top">
                <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold" :class="statusBadgeClass(r.status)">{{ statusLabel(r.status) }}</span>
              </td>
              <td class="px-4 py-3 align-top text-right">
                <div class="flex flex-wrap justify-end gap-3 text-xs font-semibold uppercase tracking-wide">
                  <RouterLink :to="{ name: 'admin-registrations', query: { eventId, search: r.cpf } }" class="text-primary-600 hover:text-primary-500">Editar</RouterLink>
                  <button v-if="r.paymentMethod === 'CASH' && r.status === 'PENDING_PAYMENT' && r.orderId" class="text-primary-600 hover:text-primary-500" @click="confirmCash(r)">Confirmar pagamento</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import BaseCard from '../../components/ui/BaseCard.vue'
import ErrorDialog from '../../components/ui/ErrorDialog.vue'
import LoadingSpinner from '../../components/ui/LoadingSpinner.vue'
import { useAdminStore } from '../../stores/admin'
import { useApi } from '../../composables/useApi'
import type { Registration } from '../../types/api'
import { formatCurrency } from '../../utils/format'
import { formatCPF } from '../../utils/cpf'

const route = useRoute()
const eventId = String(route.params.eventId || '')
const admin = useAdminStore()
const { api } = useApi()

const loading = ref(true)
const eventSummary = ref<any>(null)

const errorDialog = reactive({ open: false, title: 'Erro', message: '', details: '' })
const showError = (title: string, error: any) => {
  errorDialog.title = title
  errorDialog.message = error?.response?.data?.message || error?.message || 'Erro desconhecido'
  errorDialog.details = error?.response?.data?.details || ''
  errorDialog.open = true
}

const filters = reactive({ status: '', method: '', search: '' })

const statusLabel = (s: string) => ({
  DRAFT: 'Rascunho',
  PENDING_PAYMENT: 'Pendente',
  PAID: 'Pago',
  CANCELED: 'Cancelada',
  REFUNDED: 'Estornada',
  CHECKED_IN: 'Check-in'
}[s] || s)

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

const loadSummary = async () => {
  const resp = await api.get(`/admin/financial/events/${eventId}`)
  eventSummary.value = resp.data
}

const loadRegistrations = async () => {
  await admin.loadRegistrations({ eventId })
}

const displayedRegistrations = computed(() => {
  const q = (filters.search || '').trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return admin.registrations.filter((r) => {
    if (filters.status && r.status !== filters.status) return false
    if (filters.method && (r.paymentMethod || '') !== filters.method) return false
    if (!q) return true
    const nameMatch = (r.fullName || '').toLowerCase().includes(q)
    const cpfMatch = digits ? String(r.cpf || '').includes(digits) : false
    return nameMatch || cpfMatch
  })
})

const doExportPdf = async () => {
  try {
    const resp = await admin.downloadRegistrationReport({ eventId }, 'event')
    const blob = new Blob([resp.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-inscricoes-evento-${eventId}.pdf`
    document.body.appendChild(a)
    a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch (e) { showError('Falha ao gerar PDF', e) }
}

const doExportCsv = () => {
  const rows = [
    ['Nome', 'CPF', 'Status', 'Pagamento', 'Valor (centavos)', 'Pago em'] as string[]
  ]
  displayedRegistrations.value.forEach((r) => {
    rows.push([
      r.fullName,
      formatCPF(r.cpf),
      statusLabel(r.status),
      r.paymentMethod === 'CASH' ? 'Dinheiro' : 'Pix',
      String(r.priceCents ?? 0),
      r.paidAt ? new Date(r.paidAt).toLocaleString('pt-BR') : ''
    ])
  })
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inscricoes-evento-${eventId}.csv`
  document.body.appendChild(a)
  a.click(); a.remove(); URL.revokeObjectURL(url)
}

const confirmCash = async (registration: Registration) => {
  try {
    if (!registration.orderId) { showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.')); return }
    await admin.confirmOrderPayment(registration.orderId, { manualReference: 'CASH-ADMIN', paidAt: new Date().toISOString() })
  } catch (e) { showError('Falha ao confirmar pagamento', e) }
}

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([loadSummary(), loadRegistrations()])
  } catch (e) { showError('Falha ao carregar dados', e) }
  finally { loading.value = false }
})
</script>
