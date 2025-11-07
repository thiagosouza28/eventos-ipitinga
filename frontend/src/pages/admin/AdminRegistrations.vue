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
            Inscrições
          </h1>
          <p class="text-sm text-neutral-500">
            Filtre e gerencie inscrições por evento, distrito, igreja ou status.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Dashboard
        </RouterLink>
      </div>
    </BaseCard>

    <BaseCard>
      <form @submit.prevent="applyFilters" class="grid gap-4 md:grid-cols-6">
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Evento</label>
          <select v-model="filters.eventId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito</label>
          <select v-model="filters.districtId" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja</label>
          <select
            v-model="filters.churchId"
            :disabled="!filters.districtId"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
          >
            <option value="">{{ filters.districtId ? 'Todas' : 'Selecione o distrito' }}</option>
            <option v-for="church in churchesByDistrict(filters.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-neutral-500">Status</label>
          <select v-model="filters.status" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">Todos</option>
            <option v-for="option in registrationStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold uppercase text-neutral-500">Busca (nome ou CPF)</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Digite nome ou CPF"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            autocomplete="off"
          />
        </div>
        <div class="md:col-span-6 xl:col-span-51 flex items-end justify-end gap-2 flex-nowrap overflow-x-auto">
          <button type="button" class="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="resetFilters">
            Limpar
          </button>
          <button type="submit" class="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70" :disabled="isApplying">
            {{ isApplying ? 'Aplicando...' : 'Aplicar' }}
          </button>
          <button type="button" class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500" @click="openAddPaid">
            + Nova inscrição
          </button>
          <button type="button" class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500" @click="openAddFree">
            + Nova inscrição (Gratuita)
          </button>
        </div>
      </form>
    
    </BaseCard>

    <!-- Relatório em PDF -->
    <BaseCard>
      <div class="flex flex-col gap-3 text-sm md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Tipo de relatório</label>
            <select v-model="reportType" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
              <option value="event">Por evento</option>
              <option value="church">Por igreja</option>
            </select>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Modelo</label>
            <select v-model="reportTemplate" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
              <option value="standard">Gerencial (detalhado)</option>
              <option value="event">Para evento (assinatura)</option>
            </select>
          </div>
          <div v-if="reportTemplate === 'event'" class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Densidade</label>
            <select v-model="reportLayout" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
              <option value="single">1 por página</option>
              <option value="two">2 por página</option>
            </select>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Modelo</label>
            <select v-model="reportTemplate" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
              <option value="standard">Gerencial (detalhado)</option>
              <option value="event">Para evento (assinatura)</option>
            </select>
          </div>
          <div v-if="reportType === 'event'" class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Evento</label>
            <select v-model="reportFilters.eventId" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
              <option disabled value="">Selecione</option>
              <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>
          <template v-else>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Distrito</label>
              <select v-model="reportFilters.districtId" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:w-auto">
                <option disabled value="">Selecione</option>
                <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Igreja</label>
              <select v-model="reportFilters.churchId" :disabled="!reportFilters.districtId" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60 md:w-auto">
                <option :value="''">{{ reportFilters.districtId ? 'Selecione' : 'Selecione o distrito' }}</option>
                <option v-for="church in churchesByDistrict(reportFilters.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
              </select>
            </div>
          </template>
        </div>
        <div class="flex items-center gap-2">
          <button @click="downloadReportPdf" :disabled="!canDownloadReport" type="button" class="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white">
            Baixar PDF
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Lista de inscrições -->
    <BaseCard>
      <div v-if="displayedRegistrations.length === 0" class="p-4 text-sm text-neutral-500">
        Nenhuma inscrição encontrada.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full table-auto text-sm">
          <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <tr>
              <th class="px-4 py-3">Participante</th>
              <th class="px-4 py-3">Evento</th>
              <th class="px-4 py-3">Distrito / Igreja</th>
              <th class="px-4 py-3">Nascimento</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="registration in displayedRegistrations" :key="registration.id" class="border-t border-neutral-200 dark:border-neutral-800">
              <td class="px-4 py-3 align-top">
                <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ registration.fullName }}</div>
                <div class="text-xs text-neutral-500">CPF: {{ formatCPF(registration.cpf) }}</div>
              </td>
              <td class="px-4 py-3 align-top">
                <div>{{ findEventTitle(registration.eventId) }}</div>
                <div class="text-xs text-neutral-500">{{ formatCurrency((registration.priceCents ?? 0)) }}</div>
              </td>
              <td class="px-4 py-3 align-top">
                <div>{{ findDistrictName(registration.districtId) }}</div>
                <div class="text-xs text-neutral-500">{{ findChurchName(registration.churchId) }}</div>
              </td>
              <td class="px-4 py-3 align-top">
                <div>{{ formatBirthDate(registration.birthDate) }}</div>
                <div v-if="registration.ageYears" class="text-xs text-neutral-500">{{ registration.ageYears }} anos</div>
              </td>
              <td class="px-4 py-3 align-top">
                <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold" :class="statusBadgeClass(registration.status)">{{ translateStatus(registration.status) }}</span>
                <div class="mt-1 text-xs text-neutral-500">
                  <span v-if="registration.paymentMethod">Forma: {{ paymentMethodShort(registration.paymentMethod) }}</span>
                </div>
                <div v-if="registration.paidAt" class="mt-1 text-xs text-neutral-500">Pago em {{ new Date(registration.paidAt).toLocaleString('pt-BR') }}</div>
              </td>
              <td class="px-4 py-3 align-top text-right">
                <div class="flex flex-wrap justify-end gap-3 text-xs font-semibold uppercase tracking-wide">
                  <button class="text-primary-600 hover:text-primary-500" @click="openEdit(registration)">Editar</button>
                  <button v-if="isPaymentLinkVisible(registration)" class="text-primary-600 hover:text-primary-500" @click="copyPaymentLink(registration)">Link pagamento</button>
                  <button v-if="registration.paymentMethod === 'CASH' && registration.status === 'PENDING_PAYMENT' && registration.orderId" class="text-primary-600 hover:text-primary-500" @click="openConfirm('confirm-cash', registration)">Confirmar pagamento</button>
                  <button v-if="canCancelRegistration(registration.status) && registration.status === 'PENDING_PAYMENT'" class="text-red-600 hover:text-red-500" @click="openConfirm('cancel', registration)">Cancelar</button>
                  <button v-if="registration.status === 'PAID'" class="text-amber-600 hover:text-amber-500" @click="openConfirm('refund', registration)">Estornar</button>
                  <button v-if="canDeleteRegistration(registration.status)" class="text-red-600 hover:text-red-500" @click="openConfirm('delete', registration)">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Modal de adição -->
    <div v-if="addDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div class="w-full max-w-3xl rounded-lg bg-white p-5 shadow-lg dark:bg-neutral-900">
        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Nova inscrição</h3>
        <form @submit.prevent="saveNewRegistration" class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Evento</label>
            <select v-model="addForm.eventId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="event in admin.events" :key="event.id" :value="event.id">{{ event.title }}</option>
            </select>
          </div>

          <div v-if="addDialog.paymentMethod !== 'FREE_PREVIOUS_YEAR'" class="md:col-span-1">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Forma de pagamento</label>
            <div class="mt-2 flex gap-4 text-sm">
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="PIX_MP" v-model="addDialog.paymentMethod" />
                PIX
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="radio" value="CASH" v-model="addDialog.paymentMethod" />
                Dinheiro
              </label>
            </div>
          </div>

          <div v-if="addDialog.paymentMethod === 'PIX_MP'" class="md:col-span-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Será gerado um link de pagamento PIX após salvar. O link será aberto e copiado automaticamente.
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nome</label>
            <input v-model="addForm.fullName" type="text" required minlength="3" class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Nascimento</label>
            <input v-model="addForm.birthDate" type="date" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">CPF</label>
            <input :value="addForm.cpf" @input="onAddCpfInput" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Distrito</label>
            <select v-model="addForm.districtId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="district in catalog.districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-neutral-500">Igreja</label>
            <select v-model="addForm.churchId" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option v-for="church in churchesByDistrict(addForm.districtId)" :key="church.id" :value="church.id">{{ church.name }}</option>
            </select>
          </div>
          <div class="md:col-span-2 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="closeAdd">Fechar</button>
            <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">Salvar</button>
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
            <input v-model="editForm.birthDate" type="date" required class="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
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
            <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500">Salvar alteracoes</button>
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
    <div v-if="processing.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div class="rounded-lg bg-white px-6 py-4 text-sm shadow dark:bg-neutral-900">
        <div class="flex items-center gap-3">
          <svg class="h-5 w-5 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
          <span class="text-neutral-700 dark:text-neutral-100">{{ processing.message }}</span>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'

import BaseCard from '../../components/ui/BaseCard.vue'
import ErrorDialog from '../../components/ui/ErrorDialog.vue'
import { useAdminStore } from '../../stores/admin'
import { useCatalogStore } from '../../stores/catalog'
import { useAuthStore } from '../../stores/auth'
import type { Church, Registration } from '../../types/api'
import { maskCpf, formatCurrency } from '../../utils/format'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { validateCPF, normalizeCPF, formatCPF } from '../../utils/cpf'
import { paymentMethodLabel } from '../../config/paymentMethods'

const admin = useAdminStore()
const catalog = useCatalogStore()
const auth = useAuthStore()

const filters = reactive({
  eventId: '',
  districtId: '',
  churchId: '',
  status: '',
  search: ''
})

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

const buildFilterParams = () => ({
  eventId: filters.eventId || undefined,
  districtId: filters.districtId || undefined,
  churchId: filters.churchId || undefined,
  status: filters.status || undefined
})

const applyFilters = async () => {
  if (isApplying.value) { pendingApply.value = true; return }
  if (applyDebounce) { window.clearTimeout(applyDebounce); applyDebounce = null }
  isApplying.value = true
  try {
    await admin.loadRegistrations(buildFilterParams())
  } catch (error) {
    showError('Falha ao carregar inscricoes', error)
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
}

watch(() => filters.districtId, async (value) => {
  if (!filtersReady.value) return
  try { await catalog.loadChurches(value || undefined) } catch (e) { showError('Falha ao carregar igrejas', e) }
  if (filters.churchId && !catalog.churches.some(c => c.id === filters.churchId)) filters.churchId = ''
  scheduleApply()
})
watch(() => filters.eventId, () => { if (filtersReady.value) scheduleApply() })
watch(() => filters.churchId, () => { if (filtersReady.value) scheduleApply() })
watch(() => filters.status, () => { if (filtersReady.value) scheduleApply() })

// Relatório PDF
const reportType = ref<'event' | 'church'>('event')
const reportTemplate = ref<'standard' | 'event'>('standard')
const reportLayout = ref<'single' | 'two'>('single')
const reportFilters = reactive({ eventId: '', districtId: '', churchId: '' })
const canDownloadReport = computed(() => {
  if (reportType.value === 'event') return !!reportFilters.eventId
  return !!reportFilters.districtId && !!reportFilters.churchId
})
watch(reportType, () => { reportFilters.eventId = ''; reportFilters.districtId = ''; reportFilters.churchId = '' })
watch(() => reportFilters.districtId, async (value) => {
  try { await catalog.loadChurches(value || undefined) } catch (e) { /* noop */ }
  if (reportFilters.churchId && !catalog.churches.some(c => c.id === reportFilters.churchId)) reportFilters.churchId = ''
})
const downloadReportPdf = async () => {
  try {
    // Montar filtros específicos do relatório
    const params: Record<string, string> = {}
    if (reportType.value === 'event') {
      if (!reportFilters.eventId) { showError('Selecione o evento', new Error('Evento obrigatório')); return }
      params.eventId = reportFilters.eventId
    } else {
      if (!reportFilters.districtId || !reportFilters.churchId) { showError('Selecione distrito e igreja', new Error('Campos obrigatórios')); return }
      params.districtId = reportFilters.districtId
      params.churchId = reportFilters.churchId
    }
    const resp = await admin.downloadRegistrationReport({ ...params, layout: reportLayout.value }, reportType.value, reportTemplate.value)
    const blob = new Blob([resp.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-inscricoes-${reportType.value}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    showError('Falha ao gerar relatório', e)
  }
}

onMounted(async () => {
  try {
    await Promise.all([admin.loadEvents(), catalog.loadDistricts(), catalog.loadChurches()])
  } catch (error) {
    showError('Falha ao carregar dados iniciais', error)
  }
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
const findDistrictName = (id: string) => catalog.districts.find((d) => d.id === id)?.name ?? 'Nao informado'
const findChurchName = (id: string) => catalog.churches.find((c) => c.id === id)?.name ?? 'Nao informado'

const brDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
const formatBirthDate = (value: string | Date | null | undefined) => {
  if (!value) return 'Nao informado'
  const src = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(src.getTime())) return 'Nao informado'
  const d = new Date(src.getUTCFullYear(), src.getUTCMonth(), src.getUTCDate())
  return brDateFormatter.format(d)
}

const translateStatus = (s: string) => statusLabels[s] ?? s
const statusBadgeClass = (s: string) => {
  switch (s) {
    case 'PENDING_PAYMENT': return 'bg-amber-100 text-amber-700'
    case 'PAID': return 'bg-emerald-100 text-emerald-700'
    case 'CHECKED_IN': return 'bg-blue-100 text-blue-700'
    case 'REFUNDED': return 'bg-sky-100 text-sky-700'
    case 'CANCELED': return 'bg-red-100 text-red-700'
    case 'DRAFT': return 'bg-neutral-200 text-neutral-600'
    default: return 'bg-neutral-200 text-neutral-600'
  }
}

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

// Nova inscrição (PIX, Dinheiro ou Gratuita)
const addDialog = reactive({ open: false, paymentMethod: 'PIX_MP' as 'PIX_MP' | 'CASH' | 'FREE_PREVIOUS_YEAR' })
const addForm = reactive({ eventId: '', fullName: '', birthDate: '', cpf: '', districtId: '', churchId: '' })

const openAddPaid = () => {
  addDialog.paymentMethod = 'PIX_MP'
  addForm.eventId = filters.eventId || (admin.events[0]?.id ?? '')
  addForm.fullName = ''
  addForm.birthDate = ''
  addForm.cpf = ''
  addForm.districtId = filters.districtId || (catalog.districts[0]?.id ?? '')
  addForm.churchId = filters.churchId || (churchesByDistrict(addForm.districtId)[0]?.id ?? '')
  addDialog.open = true
}

const openAddFree = () => {
  addDialog.paymentMethod = 'FREE_PREVIOUS_YEAR'
  addForm.eventId = filters.eventId || (admin.events[0]?.id ?? '')
  addForm.fullName = ''
  addForm.birthDate = ''
  addForm.cpf = ''
  addForm.districtId = filters.districtId || (catalog.districts[0]?.id ?? '')
  addForm.churchId = filters.churchId || (churchesByDistrict(addForm.districtId)[0]?.id ?? '')
  addDialog.open = true
}

const closeAdd = () => { addDialog.open = false }

const onAddCpfInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 11)
  let masked = digits
  if (digits.length > 9) masked = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_: any, a: string, b: string, c: string, d: string) => `${a}.${b}.${c}${d ? '-' + d : ''}`)
  else if (digits.length > 6) masked = digits.replace(/(\d{3})(\d{3})(\d{0,3})/, (_: any, a: string, b: string, c: string) => `${a}.${b}.${c}`)
  else if (digits.length > 3) masked = digits.replace(/(\d{3})(\d{0,3})/, (_: any, a: string, b: string) => `${a}.${b}`)
  addForm.cpf = masked
}

const saveNewRegistration = async () => {
  try {
    if (!addForm.eventId) { showError('Evento obrigatório', new Error('Selecione o evento')); return }
    if (!addForm.fullName || addForm.fullName.trim().length < 3) { showError('Nome inválido', new Error('Informe o nome completo')); return }
    if (!addForm.birthDate) { showError('Nascimento inválido', new Error('Informe a data')); return }
    if (!validateCPF(addForm.cpf)) { showError('CPF inválido', new Error('Informe um CPF válido')); return }
    if (!addForm.districtId || !addForm.churchId) { showError('Local inválido', new Error('Selecione distrito e igreja')); return }

    const result = await admin.createAdminRegistration({
      eventId: addForm.eventId,
      buyerCpf: normalizeCPF(addForm.cpf),
      paymentMethod: addDialog.paymentMethod,
      person: {
        fullName: addForm.fullName.trim(),
        cpf: normalizeCPF(addForm.cpf),
        birthDate: addForm.birthDate,
        gender: 'OTHER',
        districtId: addForm.districtId,
        churchId: addForm.churchId,
        photoUrl: null
      }
    })

    if (addDialog.paymentMethod === 'PIX_MP' && result?.orderId) {
      const slug = findEventSlug(addForm.eventId)
      if (slug) {
        const link = `${window.location.origin}/evento/${slug}/pagamento/${result.orderId}`
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

// Acoes e helpers adicionais
const findEventSlug = (eventId: string) => admin.events.find((e) => e.id === eventId)?.slug ?? ''

const paymentMethodShort = (method?: string | null) => {
  if (!method) return '—'
  if (method === 'PIX_MP') return 'Pix'
  if (method === 'CASH') return 'Dinheiro'
  if (method === 'CARD_FULL') return 'Cartão (à vista)'
  if (method === 'CARD_INSTALLMENTS') return 'Cartão (parcelado)'
  return paymentMethodLabel(method)
}

// Confirmar pagamento em dinheiro para inscrições já criadas
const confirmCash = async (registration: Registration) => {
  try {
    if (!registration.orderId) { showError('Não foi possível confirmar pagamento', new Error('Inscrição sem pedido associado.')); return }
    await admin.confirmOrderPayment(registration.orderId, { manualReference: 'CASH-ADMIN', paidAt: new Date().toISOString() })
  } catch (e) {
    showError('Falha ao confirmar pagamento', e)
  }
}

const selected = ref<Registration | null>(null)
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
  editDialog.original = { ...registration }
  editForm.fullName = registration.fullName
  editForm.birthDate = new Date(registration.birthDate).toISOString().slice(0,10)
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
  const original = editDialog.original
  const payload: Record<string, unknown> = {}
  try {
    if (!validateCPF(editForm.cpf)) { showError('CPF invalido', new Error('Informe um CPF valido')); return }
    if (editForm.fullName.trim() && editForm.fullName.trim() !== original.fullName) payload.fullName = editForm.fullName.trim()
    const currentBirth = new Date(original.birthDate).toISOString().slice(0,10)
    if (editForm.birthDate && editForm.birthDate !== currentBirth) payload.birthDate = editForm.birthDate
    const sanitized = normalizeCPF(editForm.cpf)
    if (sanitized && sanitized !== original.cpf) payload.cpf = sanitized
    if (editForm.districtId && editForm.districtId !== original.districtId) payload.districtId = editForm.districtId
    if (editForm.churchId && editForm.churchId !== original.churchId) payload.churchId = editForm.churchId
    if (editForm.photoUrl !== undefined && editForm.photoUrl !== (original.photoUrl || '')) payload.photoUrl = editForm.photoUrl || null
    await admin.updateRegistration(original.id, payload)
    closeEdit()
  } catch (e) { showError('Falha ao atualizar inscricao', e) }
}

const isPaymentLinkVisible = (registration: Registration) =>
  registration.status === 'PENDING_PAYMENT' && registration.paymentMethod !== 'CASH'

const copyPaymentLink = async (registration: Registration) => {
  if (!isPaymentLinkVisible(registration)) return
  const slug = findEventSlug(registration.eventId)
  if (!slug) { showError('Nao foi possivel gerar link', new Error('Evento sem slug disponivel.')); return }
  try {
    // Solicitar ao backend um link exclusivo (pode dividir o pedido, se necessário)
    const result = await admin.regenerateRegistrationPaymentLink(registration.id)
    const orderId = result?.orderId ?? registration.orderId
    if (!orderId) { showError('Nao foi possivel gerar link', new Error('Pedido indisponivel.')); return }
    const link = `${window.location.origin}/evento/${slug}/pagamento/${orderId}`
    try { await navigator.clipboard.writeText(link) } catch {}
    window.open(link, '_blank')
  } catch (e) {
    showError('Nao foi possivel gerar link', e)
  }
}

const deletableStatuses = new Set<Registration['status']>(['PENDING_PAYMENT','PAID','CHECKED_IN','CANCELED','REFUNDED'])
const cancellableStatuses = new Set<Registration['status']>(['PENDING_PAYMENT','PAID'])
const canCancelRegistration = (s: Registration['status']) => cancellableStatuses.has(s)
const canDeleteRegistration = (s: Registration['status']) => deletableStatuses.has(s)

type ConfirmAction = 'cancel' | 'refund' | 'delete' | 'confirm-cash'
const confirmState = reactive({ open: false, action: null as ConfirmAction | null, registration: null as Registration | null, title: '', description: '', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', type: 'default' as 'default' | 'danger' })

const resetConfirmState = () => { confirmState.open = false; confirmState.action = null; confirmState.registration = null; confirmState.title = ''; confirmState.description = ''; confirmState.confirmLabel = 'Confirmar'; confirmState.cancelLabel = 'Cancelar'; confirmState.type = 'default' }
const handleDialogVisibility = (v: boolean) => { if (v) { confirmState.open = true; return } resetConfirmState() }

const openConfirm = (action: ConfirmAction, registration: Registration) => {
  confirmState.action = action
  confirmState.registration = registration
  confirmState.open = true
  confirmState.cancelLabel = 'Voltar'
  if (action === 'cancel') { confirmState.title = 'Cancelar inscricao'; confirmState.description = 'Cancelar a inscricao de ' + registration.fullName + '? Esta acao nao pode ser desfeita.'; confirmState.confirmLabel = 'Cancelar'; confirmState.type = 'danger' }
  else if (action === 'refund') { confirmState.title = 'Estornar inscricao'; confirmState.description = 'Confirmar estorno da inscricao de ' + registration.fullName + '?'; confirmState.confirmLabel = 'Confirmar estorno'; confirmState.type = 'default' }
  else if (action === 'confirm-cash') { confirmState.title = 'Confirmar pagamento em dinheiro'; confirmState.description = 'Confirmar recebimento manual em dinheiro para ' + registration.fullName + '?'; confirmState.confirmLabel = 'Confirmar pagamento'; confirmState.type = 'default' }
  else { confirmState.title = 'Excluir inscricao'; confirmState.description = 'Excluir a inscricao de ' + registration.fullName + '? O registro sera removido permanentemente.'; confirmState.confirmLabel = 'Excluir'; confirmState.type = 'danger' }
}

const processing = reactive({ open: false, message: 'Processando pagamento...' })
const ensureMinDelay = async (promise: Promise<any>, ms = 2000) => {
  const start = Date.now()
  const result = await promise
  const elapsed = Date.now() - start
  if (elapsed < ms) await new Promise((r) => setTimeout(r, ms - elapsed))
  return result
}

const executeConfirmAction = async () => {
  if (!confirmState.registration || !confirmState.action) { resetConfirmState(); return }
  const registration = confirmState.registration
  const action = confirmState.action
  resetConfirmState()
  try {
    if (action === 'cancel') await admin.cancelRegistration(registration.id)
    else if (action === 'refund') await admin.refundRegistration(registration.id, {})
    else if (action === 'delete') await admin.deleteRegistration(registration.id)
    else if (action === 'confirm-cash') {
      if (!registration.orderId) { showError('Nao foi possivel confirmar pagamento', new Error('Inscricao sem pedido associado.')); return }
      processing.open = true
      await ensureMinDelay(admin.confirmOrderPayment(registration.orderId, { manualReference: 'CASH-ADMIN', paidAt: new Date().toISOString() }), 2000)
      processing.open = false
    }
  } catch (e) {
    const titles: Record<ConfirmAction,string> = {
      cancel: 'Falha ao cancelar inscricao',
      refund: 'Falha ao estornar inscricao',
      delete: 'Falha ao excluir inscricao',
      'confirm-cash': 'Falha ao confirmar pagamento'
    }
    if (action === 'confirm-cash') { showError('Falha ao confirmar pagamento', e); return }
    showError(titles[action], e)
  }
}
</script>

