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
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Eventos
          </h1>
          <p class="text-sm text-neutral-500">
            Cadastre novos eventos, edite os existentes e controle o status publico.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            @click="toggleCreateForm"
          >
            {{ showCreateForm ? "Fechar novo evento" : "Novo evento" }}
          </button>
          <RouterLink
            to="/admin/dashboard"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Voltar
          </RouterLink>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Eventos cadastrados
        </h2>
        <p class="text-xs text-neutral-500">
          Clique em editar para ajustar dados ou em excluir para remover um evento sem inscricoes.
        </p>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full table-auto text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th class="pb-2">Titulo</th>
              <th class="pb-2">Periodo</th>
              <th class="pb-2">Valor vigente</th>
              <th class="pb-2">Lote atual</th>
              <th class="pb-2">Status</th>
              <th class="pb-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr v-for="event in admin.events" :key="event.id">
              <td class="py-3">
                <div class="font-medium text-neutral-800 dark:text-neutral-100">
                  {{ event.title }}
                </div>
                <div class="text-xs text-neutral-500">Slug: {{ event.slug }}</div>
              </td>
              <td class="py-3 text-sm">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </td>
              <td class="py-3">
                {{ event.isFree ? "Gratuito" : formatCurrency(event.currentPriceCents ?? event.priceCents) }}
              </td>
              <td class="py-3 text-sm text-neutral-600 dark:text-neutral-300">
                {{ event.currentLot?.name ?? "--" }}
              </td>
              <td class="py-3">
                <span
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                    event.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
                  ]"
                >
                  {{ event.isActive ? "Ativo" : "Inativo" }}
                </span>
              </td>
              <td class="py-3 text-right">
                <div class="inline-flex items-center gap-3">
                  <button
                    class="text-sm text-neutral-600 hover:underline dark:text-neutral-300"
                    @click="openDetails(event)"
                  >
                    Detalhes
                  </button>
                  <button class="text-sm text-primary-600 hover:underline" @click="startEdit(event)">
                    Editar
                  </button>
                  <button
                    class="text-sm text-amber-600 hover:underline"
                    @click="toggleActive(event)"
                  >
                    {{ event.isActive ? "Desativar" : "Ativar" }}
                  </button>
                  <button
                    class="text-sm text-red-600 hover:underline"
                    @click="openDelete(event)"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!admin.events.length">
              <td class="py-3 text-sm text-neutral-500" colspan="6">
                Nenhum evento cadastrado ate o momento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <BaseCard v-if="showCreateForm">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Criar novo evento
      </h2>
      <form
        ref="createCardRef"
        @submit.prevent="submitCreate"
        class="mt-4 grid gap-4 md:grid-cols-2"
      >
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Titulo
          </label>
          <input
            v-model="createForm.title"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Descricao
          </label>
          <textarea
            v-model="createForm.description"
            rows="3"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Inicio
          </label>
          <input
            v-model="createForm.startDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Fim
          </label>
          <input
            v-model="createForm.endDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Tipo de inscricao
          </label>
          <div class="mt-2 flex items-center gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="radio"
                :value="false"
                v-model="createForm.isFree"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span>Pago</span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="radio"
                :value="true"
                v-model="createForm.isFree"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span>Gratuito</span>
            </label>
          </div>
        </div>
        <div class="md:col-span-2">
          <div
            v-if="!createForm.isFree"
            class="rounded-lg border border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-sm text-primary-700 dark:border-primary-400/60 dark:bg-primary-500/10 dark:text-primary-200"
          >
            Crie lotes apos o cadastro para liberar inscricoes. Enquanto nao houver um lote ativo, as inscricoes ficarao bloqueadas.
          </div>
          <div
            v-else
            class="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            Eventos gratuitos nao geram pagamentos e nao permitem cadastro de lotes. As inscricoes sao confirmadas automaticamente.
          </div>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Formas de pagamento disponiveis
          </label>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <label
              v-for="option in paymentMethodOptions"
              :key="option.value"
              class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <input
                v-model="createForm.paymentMethods"
                type="checkbox"
                :value="option.value"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span class="flex flex-col">
                <span class="font-medium text-neutral-700 dark:text-neutral-100">{{ option.label }}</span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ option.description }}</span>
              </span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Idade minima
          </label>
          <input
            v-model="createForm.minAgeYears"
            type="number"
            min="0"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="md:col-span-2 flex justify-end">
          <button
            type="submit"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-70"
            :disabled="savingCreate"
          >
            {{ savingCreate ? "Salvando..." : "Criar evento" }}
          </button>
        </div>
      </form>
    </BaseCard>

    <BaseCard v-if="editingEventId">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Editar evento
      </h2>
      <form
        ref="editCardRef"
        @submit.prevent="submitEdit"
        class="mt-4 grid gap-4 md:grid-cols-2"
      >
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Titulo
          </label>
          <input
            v-model="editForm.title"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Descricao
          </label>
          <textarea
            v-model="editForm.description"
            rows="3"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Inicio
          </label>
          <input
            v-model="editForm.startDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Fim
          </label>
          <input
            v-model="editForm.endDate"
            type="datetime-local"
            required
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Tipo de inscricao
          </label>
          <div class="mt-2 flex items-center gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="radio"
                :value="false"
                v-model="editForm.isFree"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span>Pago</span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="radio"
                :value="true"
                v-model="editForm.isFree"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span>Gratuito</span>
            </label>
          </div>
        </div>
        <div class="md:col-span-2">
          <div
            v-if="!editForm.isFree"
            class="rounded-lg border border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-sm text-primary-700 dark:border-primary-400/60 dark:bg-primary-500/10 dark:text-primary-200"
          >
            Utilize os lotes para controlar valores e liberar inscricoes apenas nos periodos desejados.
          </div>
          <div
            v-else
            class="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            Eventos gratuitos nao geram pagamentos e nao permitem cadastro de lotes. Qualquer inscricao sera confirmada automaticamente.
          </div>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Formas de pagamento disponiveis
          </label>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <label
              v-for="option in paymentMethodOptions"
              :key="option.value"
              class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <input
                v-model="editForm.paymentMethods"
                type="checkbox"
                :value="option.value"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span class="flex flex-col">
                <span class="font-medium text-neutral-700 dark:text-neutral-100">{{ option.label }}</span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ option.description }}</span>
              </span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Idade minima
          </label>
          <input
            v-model="editForm.minAgeYears"
            type="number"
            min="0"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
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
            {{ savingEdit ? "Salvando..." : "Salvar alteracoes" }}
          </button>
        </div>
      </form>
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

    <teleport to="body">
      <div
        v-if="details.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        @click.self="closeDetails"
      >
        <div class="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          <header class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                {{ details.event?.title }}
              </h2>
              <p class="text-xs text-neutral-500">
                Slug: {{ details.event?.slug }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-md border border-neutral-200 px-3 py-1 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="closeDetails"
            >
              Fechar
            </button>
          </header>

          <dl class="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
            <div class="flex justify-between gap-4">
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Periodo</dt>
              <dd>{{ formatDate(details.event?.startDate ?? "") }} - {{ formatDate(details.event?.endDate ?? "") }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Local</dt>
              <dd>{{ details.event?.location }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Status</dt>
              <dd>{{ details.event?.isActive ? "Ativo" : "Inativo" }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Valor atual</dt>
              <dd class="text-right">
                <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                  {{ currentPriceDisplay }}
                </div>
                <div class="text-xs text-neutral-400">
                  Base: {{ basePriceDisplay }}
                </div>
                <div v-if="details.event?.currentLot?.name" class="text-xs text-neutral-400">
                  Lote vigente: {{ details.event?.currentLot?.name }}
                </div>
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Idade minima</dt>
              <dd>{{ details.event?.minAgeYears ?? "Nao informada" }}</dd>
            </div>
            <div>
              <dt class="font-medium text-neutral-500 dark:text-neutral-400">Descricao</dt>
              <dd class="mt-1 whitespace-pre-line">
                {{ details.event?.description }}
              </dd>
            </div>
          </dl>

          <div v-if="!details.event?.isFree" class="mt-6 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-neutral-700 dark:text-neutral-100">
                Lotes de inscricao
              </h3>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                Valor vigente: <span class="font-semibold text-neutral-700 dark:text-neutral-100">{{ currentPriceDisplay }}</span>
                <span class="ml-1">(base: {{ basePriceDisplay }})</span>
              </div>
            </div>

            <div v-if="loadingLots" class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              Carregando lotes...
            </div>

            <div v-else>
              <ul v-if="lotsForDetails.length" class="space-y-3 max-h-48 overflow-y-auto pr-2">
                <li
                  v-for="lot in lotsForDetails"
                  :key="lot.id"
                  class="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900/60"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                        {{ lot.name }}
                      </p>
                      <p class="text-xs text-neutral-500 dark:text-neutral-400">
                        Valor: {{ formatCurrency(lot.priceCents) }} | Periodo:
                        {{ formatDateTimeBr(lot.startsAt) }}
                        <span v-if="lot.endsAt">
                          - {{ formatDateTimeBr(lot.endsAt) }}
                        </span>
                        <span v-else>
                          - sem data final
                        </span>
                      </p>
                    </div>
                    <div class="flex flex-col items-end gap-2 sm:items-end">
                      <span
                        :class="['inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', lotBadgeClass(lot)]"
                      >
                        {{ lotStatusLabel(lot) }}
                      </span>
                      <span
                        v-if="isCurrentLot(lot)"
                        class="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300"
                      >
                        Lote vigente
                      </span>
                      <button
                        type="button"
                        class="text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:text-red-500 disabled:cursor-not-allowed disabled:text-neutral-400"
                        :disabled="lotDeletingId === lot.id || isLotActive(lot)"
                        @click="deleteLot(lot)"
                      >
                        <span v-if="lotDeletingId === lot.id">Removendo...</span>
                        <span v-else-if="isLotActive(lot)">Lote ativo</span>
                        <span v-else>Remover</span>
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
              <p v-else class="text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum lote cadastrado. O sistema utiliza o valor base do evento.
              </p>
            </div>

            <form
              class="space-y-3 rounded-lg border border-dashed border-neutral-300 p-4 text-sm dark:border-neutral-700"
              @submit.prevent="submitLot"
            >
              <h4 class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                Criar novo lote
              </h4>
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
                    Inicio
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
                  {{ lotSaving ? "Salvando..." : "Adicionar lote" }}
                </button>
              </div>
            </form>
          </div>
          <div v-else class="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Este evento e gratuito. Nao ha lotes cadastrados e todas as inscricoes sao confirmadas automaticamente.
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-3 text-sm">
            <RouterLink
              v-if="details.event"
              :to="`/evento/${details.event.slug}`"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-primary-500 px-4 py-2 text-primary-600 transition hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200 dark:hover:bg-primary-500/20"
            >
              Ver pagina publica
            </RouterLink>
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2 transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="closeDetails"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import ConfirmDialog from "../../components/ui/ConfirmDialog.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import ErrorDialog from "../../components/ui/ErrorDialog.vue";
import { useAdminStore } from "../../stores/admin";
import type { Event, EventLot, PaymentMethod } from "../../types/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { PAYMENT_METHODS } from "../../config/paymentMethods";

const admin = useAdminStore();
const paymentMethodOptions = PAYMENT_METHODS;

const defaultPaymentMethodValues = (): PaymentMethod[] =>
  PAYMENT_METHODS.map((option) => option.value);

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

const createForm = reactive({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  isFree: false,
  minAgeYears: "",
  paymentMethods: defaultPaymentMethodValues()
});

const editForm = reactive({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  isFree: false,
  minAgeYears: "",
  paymentMethods: defaultPaymentMethodValues()
});

const editingEventId = ref<string | null>(null);
const savingCreate = ref(false);
const savingEdit = ref(false);
const showCreateForm = ref(false);
const createCardRef = ref<HTMLFormElement | null>(null);
const editCardRef = ref<HTMLFormElement | null>(null);

const confirmDelete = reactive({
  open: false,
  target: null as Event | null
});

const confirmDeleteDescription = computed(() => {
  if (!confirmDelete.target) {
    return "Confirme a exclusao do evento selecionado.";
  }
  return `Tem certeza que deseja excluir o evento "${confirmDelete.target.title}"? Esta acao nao pode ser desfeita.`;
});

const details = reactive({
  open: false,
  event: null as Event | null
});

const lotForm = reactive({
  name: "",
  price: "",
  startsAt: "",
  endsAt: ""
});
const lotSaving = ref(false);
const lotDeletingId = ref<string | null>(null);
const loadingLots = ref(false);

const lotsForDetails = computed<EventLot[]>(() => {
  if (!details.event) return [];
  const lots = admin.eventLots[details.event.id];
  return lots ?? [];
});

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
  if (isLotActive(lot)) return "bg-emerald-100 text-emerald-700";
  if (isLotFuture(lot)) return "bg-blue-100 text-blue-700";
  return "bg-neutral-200 text-neutral-600";
};

const isCurrentLot = (lot: EventLot) => details.event?.currentLot?.id === lot.id;

const currentPriceDisplay = computed(() =>
  details.event?.isFree
    ? "Gratuito"
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
    "Nao foi possivel completar a operacao.";
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
  lotForm.name = "";
  lotForm.price = formatPriceDisplay(defaultPriceCents);
  const referenceStart =
    details.event?.currentLot?.startsAt ?? details.event?.startDate ?? new Date().toISOString();
  lotForm.startsAt = toLocalInputSafe(referenceStart);
  lotForm.endsAt = "";
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
  createForm.description = "";
  createForm.startDate = "";
  createForm.endDate = "";
  createForm.location = "";
  createForm.isFree = false;
  createForm.minAgeYears = "";
  createForm.paymentMethods = defaultPaymentMethodValues();
};

const resetEditForm = () => {
  editForm.title = "";
  editForm.description = "";
  editForm.startDate = "";
  editForm.endDate = "";
  editForm.location = "";
  editForm.isFree = false;
  editForm.minAgeYears = "";
  editForm.paymentMethods = defaultPaymentMethodValues();
};

const submitLot = async () => {
  if (!details.event) return;
  if (!lotForm.name.trim()) {
    showError("Falha ao salvar lote", { message: "Informe o nome do lote." });
    return;
  }
  if (!lotForm.startsAt) {
    showError("Falha ao salvar lote", { message: "Informe a data de inicio do lote." });
    return;
  }

  const priceCents = toPriceCents(lotForm.price);
  const startDate = new Date(lotForm.startsAt);
  if (Number.isNaN(startDate.getTime())) {
    showError("Falha ao salvar lote", { message: "Data inicial invalida." });
    return;
  }

  let endsAtIso: string | null = null;
  if (lotForm.endsAt) {
    const endDate = new Date(lotForm.endsAt);
    if (Number.isNaN(endDate.getTime())) {
      showError("Falha ao salvar lote", { message: "Data final invalida." });
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
    await admin.createEventLot(details.event.id, {
      name: lotForm.name.trim(),
      priceCents,
      startsAt: startDate.toISOString(),
      endsAt: endsAtIso
    });
    refreshDetailsEvent();
    resetLotForm();
  } catch (error) {
    showError("Falha ao salvar lote", error);
  } finally {
    lotSaving.value = false;
  }
};

const deleteLot = async (lot: EventLot) => {
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
  if (!createForm.paymentMethods.length) {
    showError("Falha ao criar evento", { message: "Selecione ao menos uma forma de pagamento." });
    return;
  }
  savingCreate.value = true;
  try {
    await admin.saveEvent({
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      startDate: new Date(createForm.startDate).toISOString(),
      endDate: new Date(createForm.endDate).toISOString(),
      location: createForm.location.trim(),
      isFree: createForm.isFree,
      priceCents: 0,
      paymentMethods: [...createForm.paymentMethods],
      minAgeYears: createForm.minAgeYears ? Number(createForm.minAgeYears) : undefined,
      isActive: true
    } as Partial<Event>);
    resetCreateForm();
    showCreateForm.value = false;
  } catch (error) {
    showError("Falha ao criar evento", error);
  } finally {
    savingCreate.value = false;
  }
};

const submitEdit = async () => {
  if (!editingEventId.value) return;
  if (!editForm.paymentMethods.length) {
    showError("Falha ao atualizar evento", { message: "Selecione ao menos uma forma de pagamento." });
    return;
  }
  savingEdit.value = true;
  try {
    await admin.saveEvent({
      id: editingEventId.value,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      startDate: new Date(editForm.startDate).toISOString(),
      endDate: new Date(editForm.endDate).toISOString(),
      location: editForm.location.trim(),
      isFree: editForm.isFree,
      minAgeYears: editForm.minAgeYears ? Number(editForm.minAgeYears) : undefined,
      priceCents: 0,
      paymentMethods: [...editForm.paymentMethods]
    } as Partial<Event>);
    cancelEdit();
  } catch (error) {
    showError("Falha ao atualizar evento", error);
  } finally {
    savingEdit.value = false;
  }
};

const startEdit = (event: Event) => {
  editingEventId.value = event.id;
  editForm.title = event.title;
  editForm.description = event.description;
  editForm.startDate = toLocalInput(event.startDate);
  editForm.endDate = toLocalInput(event.endDate);
  editForm.location = event.location;
  editForm.isFree = event.isFree;
  editForm.minAgeYears = event.minAgeYears != null ? String(event.minAgeYears) : "";
  editForm.paymentMethods =
    event.paymentMethods && event.paymentMethods.length
      ? [...event.paymentMethods]
      : defaultPaymentMethodValues();
  nextTick(() => {
    editCardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

const cancelEdit = () => {
  editingEventId.value = null;
  resetEditForm();
};

const toggleCreateForm = () => {
  showCreateForm.value = !showCreateForm.value;
  if (showCreateForm.value) {
    nextTick(() => {
      createCardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
};

const toggleActive = async (event: Event) => {
  try {
    await admin.saveEvent({
      id: event.id,
      isActive: !event.isActive
    });
  } catch (error) {
    showError("Falha ao atualizar status do evento", error);
  }
};

const openDelete = (event: Event) => {
  confirmDelete.target = event;
  confirmDelete.open = true;
};

const closeDeleteDialog = () => {
  confirmDelete.open = false;
  confirmDelete.target = null;
};

const handleDelete = async () => {
  if (!confirmDelete.target) return;
  try {
    await admin.deleteEvent(confirmDelete.target.id);
    closeDeleteDialog();
  } catch (error) {
    showError("Nao foi possivel excluir o evento", error);
  }
};

const openDetails = async (event: Event) => {
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
  await admin.loadEvents();
  if (!admin.events.length) {
    showCreateForm.value = true;
  }
});
</script>

