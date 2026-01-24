<template>
  <div v-if="eventStore.loading">
    <LoadingSpinner />
  </div>
  <div v-else-if="!eventStore.event">
    <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
      <p class="text-neutral-500">Evento não encontrado.</p>
    </BaseCard>
  </div>
  <div v-else class="event-flow min-h-screen bg-[#EEF1F5] pb-16" data-uppercase-scope>
    <EventNoticeModal
      v-if="noticeEnabled && resolvedNotice"
      :slug="noticeSlug"
      :open="noticeOpen"
      :title="resolvedNotice.title"
      :bullets="resolvedNotice.bullets"
      :footer-text="resolvedNotice.footerText"
      :show-once="resolvedNotice.showOnce"
      @accept="handleNoticeAccept"
      @cancel="handleNoticeCancel"
    />
    <teleport to="body">
      <div
        v-if="minorConfirmationOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        tabindex="-1"
        @keydown.esc="handleMinorConfirmationClose"
        @click.self="handleMinorConfirmationClose"
        ref="minorDialogRef"
      >
        <div
          class="w-full max-w-sm rounded border border-emerald-200 bg-white p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="minor-confirmation-title"
        >
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-emerald-500">Inscrição concluída</p>
              <h2 id="minor-confirmation-title" class="text-lg font-semibold text-neutral-900">
                Inscrição registrada
              </h2>
            </div>
          </div>
          <p class="mt-4 text-sm text-neutral-600">
            {{ minorConfirmationMessage }}
          </p>
          <div class="mt-6 flex justify-end">
            <button
              type="button"
              class="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              @click="handleMinorConfirmationClose"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </teleport>
    <div class="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6">
      <div class="sticky top-20 z-40 flex justify-end lg:hidden">
        <!-- <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#5a6bff] shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white"
          :aria-pressed="isDark"
          @click="toggleTheme"
        >
          <SunIcon v-if="isDark" class="h-5 w-5" aria-hidden="true" />
          <MoonIcon v-else class="h-5 w-5" aria-hidden="true" />
          <span class="sr-only">Alternar tema</span>
        </button> -->
      </div>
      <div
        v-if="route.query.success === '1'"
        class="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
      >
        <div class="flex items-start gap-3">
          <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <p class="text-sm font-semibold">Inscrição confirmada</p>
            <p class="text-xs text-emerald-700">Sua inscrição foi registrada com sucesso.</p>
            <p v-if="route.query.orderId" class="text-xs text-emerald-700">
              Pedido: {{ route.query.orderId }}
            </p>
          </div>
        </div>
      </div>
      <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
        <div class="space-y-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div v-if="hasBannerImage" class="w-full shrink-0 sm:mt-1 sm:w-auto">
              <div class="overflow-hidden rounded-none border border-neutral-200 bg-white p-1.5">
                <img
                  :src="resolvedBannerUrl"
                  alt="Banner do evento"
                  class="h-28 w-full object-contain sm:h-20 sm:w-36"
                  loading="lazy"
                  @error="eventBannerError = true"
                />
              </div>
            </div>
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="currentLotName"
                  class="inline-flex items-center rounded-full bg-primary-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-700"
                >
                  {{ currentLotName }}
                </span>
                <span
                  v-if="isPromoLotActive"
                  class="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700"
                >
                Promoção
                </span>
              </div>
              <h1 class="text-2xl font-semibold text-neutral-900">
                {{ eventStore.event.title }}
              </h1>
              <p class="max-w-full text-sm text-neutral-500 break-all sm:break-words">
                {{ eventStore.event.description }}
              </p>
              <button
                v-if="noticeEnabled"
                type="button"
                class="inline-flex text-xs font-semibold text-primary-600 hover:text-primary-500"
                @click="openNotice"
              >
                Ver aviso
              </button>
            </div>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Valor da inscrição
            </p>
            <p :class="['text-2xl font-semibold', priceValueClass]">
              {{ priceInfo.value }}
            </p>
            <p v-if="priceInfo.helper" class="text-xs text-neutral-400">
              {{ priceInfo.helper }}
            </p>
          </div>
        </div>
        <div class="space-y-2 text-sm text-neutral-600">
          <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>{{ eventStore.event.location }}</span>
          </div>
          <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 11h18" />
            </svg>
            <span>{{ formatDate(eventStore.event.startDate) }} - {{ formatDate(eventStore.event.endDate) }}</span>
          </div>
          <div v-if="eventStore.event.minAgeYears" class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="7" r="3" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
            <span>Idade mínima: {{ eventStore.event.minAgeYears }}+ anos</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <p v-if="nextLotCountdownText">
            Próximo lote em <span class="font-semibold text-neutral-600">{{ nextLotCountdownText }}</span>
          </p>
          <p v-if="daysToLastLotEnd !== null">
            Encerramento em <span class="font-semibold text-neutral-600">{{ formatDayCount(daysToLastLotEnd) }}</span>
          </p>
        </div>
        <p v-if="promoCountdownText" class="text-xs font-semibold text-rose-600">
          Promoção termina em <span class="font-semibold">{{ promoCountdownText }}</span>
        </p>
      </div>
    </BaseCard>

    <div v-if="registrationOpen && canStartWizard" class="space-y-6">
      <div v-if="currentStep < 4" class="rounded border border-neutral-200 bg-white px-4 py-5">
        <div class="flex items-center justify-between text-xs font-semibold text-neutral-400">
          <span>Passo {{ currentStep + 1 }} de 4</span>
          <span class="uppercase tracking-wide text-neutral-300">Inscrição</span>
        </div>
        <div class="relative mt-4">
          <div class="absolute left-6 right-6 top-4 h-px bg-neutral-200"></div>
          <div class="relative grid grid-cols-4 gap-2 text-center">
            <div v-for="(step, index) in steps.slice(0, 4)" :key="step.title" class="flex flex-col items-center gap-2">
              <div
                :class="[
                  'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition',
                  index < currentStep
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : index === currentStep
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-neutral-200 bg-white text-neutral-400'
                ]"
              >
                <svg
                  v-if="index < currentStep"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="text-xs font-semibold text-neutral-700">{{ step.title }}</div>
              <div class="text-[10px] text-neutral-400">{{ step.description }}</div>
            </div>
          </div>
        </div>
      </div>

            <BaseCard v-if="currentStep === 0" class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
        <div class="space-y-4">
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-neutral-900">Identificação</h2>
            <p class="text-sm text-neutral-500">
              Informe o CPF do responsável financeiro pela inscrição.
            </p>
          </div>
          <ResponsibleCpfForm
            ref="inscricaoFormRef"
            v-model="responsibleProfile"
            :loading="checkingCpf"
            :error="errorMessage"
            @update:cpf="buyerCpf = $event"
            @submit="handleCpfSubmit"
          />
        </div>
      </BaseCard>

            <BaseCard v-if="currentStep === 1" class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
        <div class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-neutral-900">Selecione sua Unidade</h2>
            <p class="text-sm text-neutral-500">Escolha o distrito e a igreja.</p>
          </div>
          <div
            v-if="false"
            class="rounded border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900"
          >
            <p class="font-semibold">{{ pendingOrders.length }} pagamento(s) pendente(s) encontrado(s).</p>
            <p>Você pode ver e pagar as pendências existentes ou seguir com uma nova inscrição.</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="order in pendingOrders"
                :key="order.orderId"
                class="rounded border border-primary-100 bg-white/80 p-2"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex-1">
                    <p class="font-medium">{{ formatCurrency(order.totalCents) }}</p>
                    <p class="text-xs">
                      {{ order.registrations.length }} participante(s):
                      {{ order.registrations.map(r => r.fullName).join(", ") }}
                    </p>
                  </div>
                  <RouterLink
                    :to="{ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }"
                    class="inline-flex shrink-0 items-center justify-center rounded border border-primary-500 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-500/10"
                  >
                    Pagar
                  </RouterLink>
                </div>
              </div>
              <RouterLink
                :to="{ name: 'admin-pending-orders', params: { cpf: buyerCpf } }"
                class="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-600"
              >
                Ver todas as pendências
                <IconArrowRight class="ml-1 h-3 w-3" />
              </RouterLink>
            </div>
          </div>
          <form @submit.prevent="handleGeneralStep" class="space-y-6">
            <div class="grid gap-4">
              <div>
                <label class="block text-sm font-medium text-neutral-600">
                  Distrito
                </label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
                      <path d="M9 3v15M15 6v15" />
                    </svg>
                  </span>
                  <select
                    v-model="selectedDistrictId"
                    class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 pl-10 text-sm text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    :aria-invalid="generalErrors.district ? 'true' : 'false'"
                    aria-describedby="district-error"
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                      {{ district.name }}
                    </option>
                  </select>
                </div>
                <p
                  v-if="generalErrors.district"
                  id="district-error"
                  role="alert"
                  class="mt-2 text-sm text-red-600"
                >
                  {{ generalErrors.district }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-600">
                  Igreja
                </label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2l4 4v4h4v12H4V10h4V6l4-4z" />
                      <path d="M9 22v-6h6v6" />
                    </svg>
                  </span>
                  <select
                    v-model="selectedChurchId"
                    class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 pl-10 text-sm text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    :aria-invalid="generalErrors.church ? 'true' : 'false'"
                    aria-describedby="church-error"
                    :disabled="!selectedDistrictId"
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    <option v-for="church in churchOptions" :key="church.id" :value="church.id">
                      {{ church.name }}
                    </option>
                  </select>
                </div>
                <p
                  v-if="generalErrors.church"
                  id="church-error"
                  role="alert"
                  class="mt-2 text-sm text-red-600"
                >
                  {{ generalErrors.church }}
                </p>
              </div>
            </div>
            <div
              class="rounded border border-neutral-200 bg-neutral-50 p-4"
              :aria-invalid="generalErrors.quantity ? 'true' : 'false'"
              aria-describedby="quantity-error"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-neutral-800">Participantes</p>
                  <p class="text-xs text-neutral-500">Número de participantes para esta inscrição.</p>
                  
                </div>
                <div class="flex items-center rounded border border-neutral-200 bg-white px-2 py-1">
                  <button
                    type="button"
                    class="h-9 w-9 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                    :disabled="!canDecreaseQuantity"
                    @click="decreaseQuantity"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>
                  <input
                    v-model.number="quantity"
                    type="number"
                    min="1"
                    max="5"
                    data-quantity-input
                    class="h-9 w-12 border-0 bg-transparent text-center text-base font-semibold outline-none"
                    required
                  />
                  <button
                    type="button"
                    class="h-9 w-9 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                    :disabled="!canIncreaseQuantity"
                    @click="increaseQuantity"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </div>
              <p
                v-if="generalErrors.quantity"
                id="quantity-error"
                role="alert"
                class="mt-2 text-sm text-red-600"
              >
                {{ generalErrors.quantity }}
              </p>
            </div>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
              <button
                type="button"
                class="w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 sm:w-auto"
                @click="currentStep--"
              >
                Voltar
              </button>
              <button
                type="submit"
                class="w-full rounded bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-500 sm:w-auto"
              >
                Avançar
              </button>
            </div>
          </form>
        </div>
      </BaseCard>

            <div v-if="currentStep === 2" class="space-y-6">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-neutral-900">Detalhes dos Participantes</h2>
          <p class="text-sm text-neutral-500">Preencha as informações de quem irá ao evento.</p>
        </div>

        <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
          <div class="grid gap-3 text-xs text-neutral-500 sm:grid-cols-2">
            <div>
              <p class="text-[10px] font-semibold uppercase text-neutral-400">CPF responsável</p>
              <p class="text-sm font-semibold text-neutral-700">{{ buyerCpf }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase text-neutral-400">Distrito</p>
              <p class="text-sm font-semibold text-neutral-700">{{ selectedDistrict?.name ?? "Não selecionado" }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase text-neutral-400">Igreja</p>
              <p class="text-sm font-semibold text-neutral-700">{{ selectedChurch?.name ?? "Não selecionada" }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase text-neutral-400">Participantes</p>
              <p class="text-sm font-semibold text-neutral-700">{{ people.length }}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard
          v-for="(person, index) in people"
          :key="index"
          class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase text-neutral-400">Participante {{ index + 1 }}</p>
                <p class="text-sm font-semibold text-neutral-800">Dados individuais</p>
              </div>
            </div>
            <span
              v-if="index === 0"
              class="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase text-primary-700"
            >
              Principal
            </span>
          </div>
          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <template v-for="field in formFields" :key="`${index}-${field.id}`">
              <div v-if="field.id === 'cpf'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <input
                  :ref="(el) => setParticipantCpfRef(el as HTMLInputElement | null, index)"
                  v-model="person.cpf"
                  type="text"
                  :placeholder="field.placeholder || '000.000.000-00'"
                  inputmode="numeric"
                  autocomplete="off"
                  class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  :aria-invalid="participantCpfErrors[index] ? 'true' : 'false'"
                  :aria-describedby="`participant-cpf-error-${index}`"
                  required
                  @input="onParticipantCpfInput(index, $event)"
                  @blur="onParticipantCpfBlur(index)"
                />
                <p
                  v-if="participantCpfErrors[index]"
                  :id="`participant-cpf-error-${index}`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ participantCpfErrors[index] }}
                </p>
              </div>
              <div v-else-if="field.id === 'fullName'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <input
                  :value="person.fullName"
                  type="text"
                  :required="isFieldRequired(field)"
                  :disabled="isPersonLocked(index)"
                  class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                  :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                  :aria-describedby="`participant-field-${index}-${field.id}-error`"
                  @input="updateFieldValue(person, field, ($event.target as HTMLInputElement).value, index)"
                />
                <p
                  v-if="getFieldError(index, field.id)"
                  :id="`participant-field-${index}-${field.id}-error`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError(index, field.id) }}
                </p>
              </div>
              <div v-else-if="field.id === 'birthDate'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <div class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <DateField
                    :modelValue="person.birthDate"
                    :disabled="isPersonLocked(index)"
                    :required="isFieldRequired(field)"
                    :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                    :aria-describedby="`participant-field-${index}-${field.id}-error`"
                    inputClass="w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    class="w-full"
                    :placeholder="field.placeholder"
                    @update:modelValue="(value) => updateFieldValue(person, field, value, index)"
                  />
                  <span
                    v-if="calculateAgeYears(person.birthDate) !== null"
                    class="text-xs text-neutral-500"
                  >
                    {{ calculateAgeYears(person.birthDate) }} anos
                  </span>
                </div>
                <p
                  v-if="getFieldError(index, field.id)"
                  :id="`participant-field-${index}-${field.id}-error`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError(index, field.id) }}
                </p>
              </div>
              <div v-else-if="field.id === 'gender'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <select
                  :value="person.gender"
                  :disabled="isPersonLocked(index)"
                  class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                  :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                  :aria-describedby="`participant-field-${index}-${field.id}-error`"
                  @change="updateFieldValue(person, field, ($event.target as HTMLSelectElement).value, index)"
                >
                  <option value="" disabled>Selecione</option>
                  <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <p
                  v-if="getFieldError(index, field.id)"
                  :id="`participant-field-${index}-${field.id}-error`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError(index, field.id) }}
                </p>
              </div>
              <div v-else-if="field.id === 'districtId'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <select
                  :value="person.districtId"
                  :disabled="isPersonLocked(index)"
                  class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                  :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                  :aria-describedby="`participant-field-${index}-${field.id}-error`"
                  @change="(event) => { updateFieldValue(person, field, (event.target as HTMLSelectElement).value, index); onPersonDistrictChange(index); }"
                >
                  <option value="" disabled>Selecione</option>
                  <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                    {{ district.name }}
                  </option>
                </select>
                <p
                  v-if="getFieldError(index, field.id)"
                  :id="`participant-field-${index}-${field.id}-error`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError(index, field.id) }}
                </p>
              </div>
              <div v-else-if="field.id === 'churchId'">
                <label class="block text-sm font-medium text-neutral-600">
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                </label>
                <select
                  :value="person.churchId"
                  :disabled="isPersonLocked(index)"
                  class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                  :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                  :aria-describedby="`participant-field-${index}-${field.id}-error`"
                  @change="updateFieldValue(person, field, ($event.target as HTMLSelectElement).value, index)"
                >
                  <option value="" disabled>Selecione</option>
                  <option
                    v-for="church in getPersonChurchOptions(person.districtId)"
                    :key="church.id"
                    :value="church.id"
                  >
                    {{ church.name }}
                  </option>
                </select>
                <p
                  v-if="getFieldError(index, field.id)"
                  :id="`participant-field-${index}-${field.id}-error`"
                  role="alert"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError(index, field.id) }}
                </p>
              </div>
              <div v-else :class="field.tipo === 'textarea' || field.tipo === 'checkbox' ? 'lg:col-span-2' : ''">
                <template v-if="field.tipo === 'checkbox'">
                  <label class="flex items-center gap-2 text-sm font-medium text-neutral-600">
                    <input
                      type="checkbox"
                      :checked="Boolean(getFieldValue(person, field))"
                      :disabled="isPersonLocked(index)"
                      class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                      :aria-describedby="`participant-field-${index}-${field.id}-error`"
                      @change="updateFieldValue(person, field, ($event.target as HTMLInputElement).checked, index)"
                    />
                    <span>
                      {{ field.label }}
                      <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                    </span>
                  </label>
                  <p
                    v-if="getFieldError(index, field.id)"
                    :id="`participant-field-${index}-${field.id}-error`"
                    role="alert"
                    class="mt-1 text-sm text-red-600"
                  >
                    {{ getFieldError(index, field.id) }}
                  </p>
                </template>
                <template v-else>
                  <label class="block text-sm font-medium text-neutral-600">
                    {{ field.label }}
                    <span v-if="isFieldRequired(field)" class="text-red-500">*</span>
                  </label>
                  <select
                    v-if="field.tipo === 'select'"
                    :value="(getFieldValue(person, field) as string) || ''"
                    :disabled="isPersonLocked(index)"
                    class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                    :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                    :aria-describedby="`participant-field-${index}-${field.id}-error`"
                    @change="updateFieldValue(person, field, ($event.target as HTMLSelectElement).value, index)"
                  >
                    <option value="" disabled>Selecione</option>
                    <option v-for="option in field.opcoes ?? []" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="field.tipo === 'textarea'"
                    :value="(getFieldValue(person, field) as string) || ''"
                    rows="3"
                    :disabled="isPersonLocked(index)"
                    class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                    :placeholder="field.placeholder"
                    :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                    :aria-describedby="`participant-field-${index}-${field.id}-error`"
                    @input="updateFieldValue(person, field, ($event.target as HTMLTextAreaElement).value, index)"
                  ></textarea>
                  <input
                    v-else
                    :value="(getFieldValue(person, field) as string) || ''"
                    :type="field.tipo === 'number' ? 'number' : field.tipo === 'email' ? 'email' : 'text'"
                    :disabled="isPersonLocked(index)"
                    class="mt-1 w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm disabled:opacity-60"
                    :placeholder="field.placeholder"
                    :min="field.tipo === 'number' ? field.min : undefined"
                    :max="field.tipo === 'number' ? field.max : undefined"
                    :aria-invalid="getFieldError(index, field.id) ? 'true' : 'false'"
                    :aria-describedby="`participant-field-${index}-${field.id}-error`"
                    @input="updateFieldValue(person, field, ($event.target as HTMLInputElement).value, index)"
                  />
                  <p
                    v-if="getFieldError(index, field.id)"
                    :id="`participant-field-${index}-${field.id}-error`"
                    role="alert"
                    class="mt-1 text-sm text-red-600"
                  >
                    {{ getFieldError(index, field.id) }}
                  </p>
                </template>
              </div>
            </template>
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-neutral-600">Foto do participante</label>
              <div class="mt-2 flex flex-col gap-3 rounded border border-dashed border-neutral-200 bg-neutral-50 p-4">
                <div class="flex items-center gap-3 text-xs text-neutral-500">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5a4 4 0 0 1 4 4v2h2a4 4 0 0 1 4 4v4H2v-4a4 4 0 0 1 4-4h2V9a4 4 0 0 1 4-4Z" />
                      <path d="M12 9v6M9 12h6" />
                    </svg>
                  </div>
                  JPG ou PNG (Max 5mb)
                </div>
                <div class="flex flex-wrap items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    :disabled="isPersonLocked(index)"
                    class="block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-60"
                    @change="handlePhotoUpload($event, index)"
                  />
                  <img
                    :src="person.photoUrl || DEFAULT_PHOTO_DATA_URL"
                    alt="Pre-visualizacao"
                    class="h-20 w-20 rounded object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <button
            type="button"
            class="w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 sm:w-auto"
            @click="currentStep--"
          >
            Voltar
          </button>
          <button
            type="button"
            class="w-full rounded bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-500 sm:w-auto"
            @click="goToReview"
          >
            Revisar inscrições
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </div>
      <div v-if="currentStep === 3" class="space-y-6">
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Revisao</p>
          <h2 class="text-xl font-semibold text-neutral-900">Revisao dos dados</h2>
          <p class="text-sm text-neutral-500">
            {{
              shouldSkipPayment
                ? "Confira as informações antes de confirmar as inscrições."
                : "Confira as informações antes de prosseguir com o pagamento."
            }}
          </p>
        </div>

        <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase text-neutral-400">Responsável</p>
              <p class="text-base font-semibold text-neutral-900">
                {{ responsibleProfile?.fullName || "Responsável financeiro" }}
              </p>
              <p class="text-sm text-neutral-500">CPF: {{ buyerCpf }}</p>
            </div>
            <button
              type="button"
              class="text-xs font-semibold text-primary-600 hover:text-primary-500"
              @click="currentStep = 0"
            >
              Editar
            </button>
          </div>
          <div class="mt-4 grid gap-3 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase text-neutral-400">Distrito</p>
              <p class="text-sm font-semibold text-neutral-800">{{ selectedDistrict?.name ?? "Não selecionado" }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-neutral-400">Igreja</p>
              <p class="text-sm font-semibold text-neutral-800">{{ selectedChurch?.name ?? "Não selecionada" }}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard
          v-if="!shouldSkipPayment"
          class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none"
        >
          <div class="space-y-3">
            <h3 class="text-base font-semibold text-neutral-900">Forma de pagamento</h3>
            <div class="grid gap-3">
              <label
                v-for="option in paymentOptions"
                :key="option.value"
                class="flex cursor-pointer items-center gap-3 rounded border border-neutral-200 bg-white px-4 py-3 text-sm transition hover:border-primary-400"
              >
                <div class="flex h-10 w-10 items-center justify-center rounded bg-primary-50 text-primary-600">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M7 8h10M7 12h4" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-neutral-800">{{ option.label }}</p>
                  <p class="text-xs text-neutral-500">{{ option.description }}</p>
                </div>
                <input
                  v-model="selectedPaymentMethod"
                  type="radio"
                  :value="option.value"
                  class="h-5 w-5 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
            <p class="text-xs text-neutral-400">Pagamento selecionado: {{ selectedPaymentLabel }}.</p>
            <p v-if="isManualPaymentSelected" class="text-xs text-primary-600">
              Pagamentos manuais serao confirmados pela tesouraria. Guarde o comprovante para quitar a pendencia.
            </p>
            <p v-if="isFreePaymentSelected" class="text-xs text-primary-500">
              Esta inscrição será marcada como paga automaticamente, sem gerar cobrança.
            </p>
          </div>
        </BaseCard>

        <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-base font-semibold text-neutral-900">Participantes ({{ people.length }})</h3>
            <span v-if="!shouldSkipPayment" class="text-sm font-semibold text-primary-600">
              {{ formatCurrency(ticketPriceCents) }} cada
            </span>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="(person, index) in people"
              :key="index"
              class="flex flex-col gap-3 rounded border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="person.photoUrl || DEFAULT_PHOTO_DATA_URL"
                  alt="Foto do participante"
                  class="h-12 w-12 rounded object-cover"
                />
                <div>
                  <p class="text-sm font-semibold text-neutral-900">{{ person.fullName }}</p>
                  <p class="text-xs text-neutral-500">
                    {{ getGenderLabel(person.gender) }}
                    <span v-if="calculateAgeYears(person.birthDate) !== null">
                      • {{ calculateAgeYears(person.birthDate) }} anos
                    </span>
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
                <div>
                  <p
                    v-if="isAgeExempt(person) && !isFreeEvent"
                    class="text-xs font-semibold text-emerald-600"
                  >
                    Isento (idade <= mínima)
                  </p>
                  <p class="text-sm font-semibold text-neutral-700">
                    {{ formatCurrency(getParticipantPriceCents(person)) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="text-xs font-semibold text-primary-600 hover:text-primary-500"
                  @click="currentStep = 2"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
          <div class="space-y-2 text-sm text-neutral-600">
            <div class="flex items-center justify-between">
              <span>Inscrições ({{ people.length }}x)</span>
              <span>{{ shouldSkipPayment ? "Gratuito" : formatCurrency(totalPayableCents) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Taxas de processamento</span>
              <span class="text-emerald-600">Gratis</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
            <span class="text-sm font-semibold text-neutral-600">Total a pagar</span>
            <span class="text-2xl font-semibold text-primary-600">
              {{ shouldSkipPayment ? "Gratuito" : formatCurrency(totalPayableCents) }}
            </span>
          </div>
        </BaseCard>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <button
            type="button"
            class="w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 sm:w-auto"
            @click="currentStep--"
          >
            Voltar
          </button>
          <button
            type="button"
            class="w-full rounded bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-70 sm:w-auto"
            :disabled="submitting"
            @click="submitBatch"
          >
            <span v-if="submitting" class="flex items-center justify-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></span>
              Processando...
            </span>
            <span v-else>{{ shouldSkipPayment ? "Confirmar inscrições" : "Gerar pagamento" }}</span>
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </div>
      <div v-if="currentStep === 4 && inlinePayment" class="space-y-6">
        <div class="rounded border border-neutral-200 bg-white p-6 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">{{ inlineStatusTitle }}</p>
          <h2 class="mt-2 text-2xl font-semibold text-neutral-900">Pedido Gerado!</h2>
          <p class="mt-2 text-sm text-neutral-500">{{ inlineStatusMessage }}</p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
            <div class="space-y-4 text-center">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Valor a pagar</p>
                <p class="text-3xl font-semibold text-primary-600">
                  {{
                    formatCurrency(
                      inlinePayment?.totalCents ?? totalPayableCents
                    )
                  }}
                </p>
              </div>
              <div class="flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 p-4">
                <img
                  v-if="inlinePayment?.pixQrData?.qr_code_base64"
                  :src="`data:image/png;base64,${inlinePayment.pixQrData.qr_code_base64}`"
                  alt="QR Code Pix"
                  class="h-48 w-48 rounded border border-neutral-200 bg-white p-2"
                />
                <div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-neutral-500">
                  <svg class="h-6 w-6 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span class="text-sm">Gerando QR Code do Pix...</span>
                </div>
              </div>
              <p v-if="inlineIsPixMethod" class="text-sm text-neutral-500">
                Escaneie com o app do seu banco ou copie o codigo Pix abaixo.
              </p>
              <button
                type="button"
                class="w-full rounded border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 disabled:opacity-50"
                :disabled="!canCopyInlinePix"
                @click="copyInlinePixCode"
              >
                Copiar Codigo PIX
              </button>
              <textarea
                v-if="inlinePayment?.pixQrData?.qr_code"
                class="w-full rounded border border-neutral-200 bg-white p-3 text-xs text-neutral-600"
                rows="3"
                readonly
                :value="inlinePixCode"
              />
              <p v-if="inlinePixError" class="text-sm font-semibold text-red-600">
                {{ inlinePixError }}
              </p>
            </div>
          </BaseCard>

          <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
            <div class="space-y-4 text-sm text-neutral-600">
              <div class="flex items-center justify-between">
                <span>ID do pedido</span>
                <code class="rounded bg-neutral-100 px-2 py-1 text-xs">{{ createdOrderId }}</code>
              </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Evento</span>
                <span>{{ eventStore.event?.title ?? "Carregando..." }}</span>
              </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Valor por inscrição</span>
                <span>{{ isFreeEvent ? "Gratuito" : formatCurrency(ticketPriceCents) }}</span>
              </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Total</span>
                <span>
                  {{
                    formatCurrency(
                      inlinePayment?.totalCents ?? totalPayableCents
                    )
                  }}
                </span>
              </div>
              <div v-if="currentLotName">
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Lote vigente</span>
                <span>{{ currentLotName }}</span>
              </div>
              <div>
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Forma de pagamento</span>
                <span>{{ paymentMethodLabel(inlinePayment?.paymentMethod ?? selectedPaymentMethod) }}</span>
              </div>
              <div v-if="inlinePayment?.paidAt">
                <span class="block text-xs uppercase tracking-wide text-neutral-400">Pagamento registrado em</span>
                <span>{{ formatDate(inlinePayment?.paidAt as any) }}</span>
              </div>
            </div>
            <div v-if="!inlineIsPixMethod && !inlineIsManual" class="mt-5 space-y-2">
              <p class="text-sm text-neutral-500">
                Prefere cartao? Abra o checkout seguro do Mercado Pago em uma nova aba.
              </p>
              <button
                v-if="inlinePayment?.initPoint"
                type="button"
                @click="handleInlineOpenCheckout"
                class="inline-flex items-center justify-center gap-2 rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                Abrir checkout
              </button>
              <p v-if="inlinePayment?.status !== 'PAID'" class="text-xs text-neutral-400">
                Assim que o pagamento for aprovado, o status muda automaticamente.
              </p>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
    <div v-else-if="registrationOpen" class="space-y-4">
      <BaseCard class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
        <p class="text-sm text-neutral-600">Leia o aviso para continuar.</p>
        <button
          v-if="noticeEnabled"
          type="button"
          class="mt-3 inline-flex text-xs font-semibold text-primary-600 hover:text-primary-500"
          @click="openNotice"
        >
          Ver aviso
        </button>
      </BaseCard>
    </div>
    <BaseCard v-else class="!rounded !border-neutral-200 !bg-[#F7F8FA] !shadow-none !backdrop-blur-none">
      <p class="text-neutral-500">
        As inscrições deste evento estão liberadas pelo sistema, mas dependem da abertura do próximo lote.
        <span v-if="nextLotInfo">
          O lote <strong>{{ nextLotInfo.name }}</strong> com valor de
          <strong>{{ nextLotInfo.price }}</strong> inicia em {{ nextLotInfo.startsAt }}.
        </span>
        <span v-else>
          Aguarde a liberação do próximo lote para prosseguir.
        </span>
      </p>
    </BaseCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { MoonIcon, SunIcon } from "@heroicons/vue/24/outline";

import DateField from "../../components/forms/DateField.vue";
import ResponsibleCpfForm from "../../components/forms/ResponsibleCpfForm.vue";
import EventNoticeModal from "../../components/forms/EventNoticeModal.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
import IconArrowRight from "../../components/ui/IconArrowRight.vue";
import { useCatalogStore } from "../../stores/catalog";
import { useEventStore } from "../../stores/event";
import { useApi } from "../../composables/useApi";
import { useTheme } from "../../composables/useTheme";
import { API_BASE_URL } from "../../config/api";
import type { Church, EventLot, RegistrationProfile, EventNotice, EventFormField } from "../../types/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { buildNoticeFingerprint, hasSeenNotice, setSeenNotice } from "../../utils/eventNotice";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { REGISTRATION_STORAGE_KEY } from "../../config/storageKeys";
import { normalizePixCode, hashPixCode } from "../../utils/pix";
import { normalizeFormConfig, SYSTEM_FIELD_IDS } from "../../utils/formConfig";
import {
  paymentMethodLabel,
  PAYMENT_METHODS,
  MANUAL_PAYMENT_METHODS,
  ADMIN_ONLY_PAYMENT_METHODS,
  FREE_PAYMENT_METHODS
} from "../../config/paymentMethods";
import type { PaymentMethod } from "../../config/paymentMethods";
import { useAuthStore } from "../../stores/auth";
import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";

  type PendingRegistration = {
    id: string;
    fullName: string;
    cpf: string;
  };

  type PendingOrder = {
    orderId: string;
    expiresAt: string;
    totalCents: number;
    registrations: PendingRegistration[];
    payment: {
      status?: string;
      paymentMethod?: string;
      initPoint?: string;
    } | null;
  };

  type PersonForm = {
    fullName: string;
    cpf: string;
    birthDate: string;
    gender: string;
    districtId: string;
    churchId: string;
    photoUrl: string | null;
    formResponses: Record<string, unknown>;
  };

  const props = defineProps<{ slug: string }>();
  const router = useRouter();
  const route = useRoute();
  const eventStore = useEventStore();
  const catalog = useCatalogStore();
  const { api } = useApi();
  const auth = useAuthStore();
  const { isDark, toggleTheme } = useTheme();

  const noticeOpen = ref(false);
  const noticeAccepted = ref(true);
  const resolvedNotice = computed<EventNotice | null>(() => {
    const notice = eventStore.event?.notice ?? null;
    if (!notice || !notice.enabled) {
      return null;
    }
    return {
      ...notice,
      showOnce: notice.showOnce ?? true
    };
  });
  const noticeEnabled = computed(() => Boolean(resolvedNotice.value));
  const noticeSlug = computed(() => props.slug ?? "");
  const noticeFingerprint = computed(() =>
    resolvedNotice.value ? buildNoticeFingerprint(resolvedNotice.value) : ""
  );
  const canStartWizard = computed(() => !noticeEnabled.value || noticeAccepted.value);

  const eventFormConfig = computed(() => normalizeFormConfig(eventStore.event?.formConfig ?? null));
  const formFields = computed(() => eventFormConfig.value.campos);
  const isFieldRequired = (field: EventFormField) =>
    Boolean(field.obrigatorio) || SYSTEM_FIELD_IDS.has(field.id);

  const evaluateNotice = () => {
    if (!noticeEnabled.value) {
      noticeOpen.value = false;
      noticeAccepted.value = true;
      return;
    }
    if (resolvedNotice.value?.showOnce === false) {
      noticeOpen.value = true;
      noticeAccepted.value = false;
      return;
    }
    const seen = hasSeenNotice(noticeSlug.value, noticeFingerprint.value);
    noticeOpen.value = !seen;
    noticeAccepted.value = seen;
  };

  const openNotice = () => {
    noticeOpen.value = true;
  };

  const handleNoticeAccept = (remember: boolean) => {
    noticeAccepted.value = true;
    noticeOpen.value = false;
    if (resolvedNotice.value?.showOnce !== false && remember) {
      setSeenNotice(noticeSlug.value, noticeFingerprint.value);
    }
  };

  const handleNoticeCancel = () => {
    noticeAccepted.value = false;
    noticeOpen.value = false;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push({ name: "home" });
  };

  const isFreeEvent = computed(() => Boolean(eventStore.event?.isFree));
const ticketPriceCents = computed(
  () => (isFreeEvent.value ? 0 : eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0)
);
const minAgeYears = computed(() => {
  const value = eventStore.event?.minAgeYears;
  return typeof value === "number" ? value : null;
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
    minute: "2-digit"
  });
};
const nextLot = computed<EventLot | null>(() => {
  if (isFreeEvent.value) return null;
  const lots = eventStore.event?.lots ?? [];
  const now = Date.now();
  return (
    lots
      .filter((lot) => new Date(lot.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
});
const priceInfo = computed(() => {
  if (isFreeEvent.value) {
    return { title: "Evento gratuito", value: "Gratuito", helper: null, pending: false };
  }
  if (eventStore.event?.currentLot) {
    const lot = eventStore.event.currentLot;
    return {
      title: "Valor por inscrição",
      value: formatCurrency(lot.priceCents ?? ticketPriceCents.value),
      helper: lot.name ? `Lote vigente: ${lot.name}` : null,
      pending: false
    };
  }
  if (nextLot.value) {
    return {
      title: "Próximo lote",
      value: formatCurrency(nextLot.value.priceCents),
      helper: `Inicia em ${formatDateTimeBr(nextLot.value.startsAt)}`,
      pending: true
    };
  }
  return {
    title: "Valor por inscrição",
    value: "Aguardando liberação do lote",
    helper: null,
    pending: true
  };
});
const isPromoLotActive = computed(() => {
  if (isFreeEvent.value) return false;
  const lotType = eventStore.event?.currentLot?.type;
  return typeof lotType === "string" && lotType.toLowerCase() === "promocional";
});
const priceValueClass = computed(() => {
  if (priceInfo.value.pending) {
    return "text-neutral-500";
  }
  if (isPromoLotActive.value) {
    return "text-rose-600";
  }
  return "text-primary-600";
});
const currentLotName = computed(() =>
  isFreeEvent.value ? null : eventStore.event?.currentLot?.name ?? null
);
const nextLotInfo = computed(() => {
  if (!nextLot.value) return null;
  return {
    name: nextLot.value.name,
    startsAt: formatDateTimeBr(nextLot.value.startsAt),
    price: formatCurrency(nextLot.value.priceCents)
  };
});
const nowMs = ref(Date.now());
const countdownInterval = ref<number | null>(null);
onMounted(() => {
  countdownInterval.value = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
    countdownInterval.value = null;
  }
});

const MS_PER_MIN = 1000 * 60;
const MS_PER_HOUR = MS_PER_MIN * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const diffInMsFromNow = (value?: string | null) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return target - nowMs.value;
};
const diffInDaysFromNow = (value?: string | null) => {
  const diffMs = diffInMsFromNow(value);
  if (diffMs === null) return null;
  const diff = Math.ceil(diffMs / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
};
const promoCountdownText = computed(() => {
  if (!isPromoLotActive.value) return "";
  const endsAt = eventStore.event?.currentLot?.endsAt ?? null;
  const diffMs = diffInMsFromNow(endsAt);
  if (diffMs === null || diffMs <= 0) return "";

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.max(1, Math.ceil(diffMs / MS_PER_MIN));
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  }

  if (diffMs < MS_PER_DAY) {
    const hours = Math.max(1, Math.ceil(diffMs / MS_PER_HOUR));
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }

  const days = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
  return days === 1 ? "1 dia" : `${days} dias`;
});
const sortedLots = computed(() => {
  const lots = eventStore.event?.lots ?? [];
  return lots
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
});
const nextLotCountdownTarget = computed(() => {
  const now = Date.now();
  const currentEnds = eventStore.event?.currentLot?.endsAt ?? null;
  const hasCurrentEnd = currentEnds && new Date(currentEnds).getTime() > now;
  if (hasCurrentEnd) return currentEnds;
  return nextLot.value?.startsAt ?? null;
});
const lastLotEndDate = computed(() => {
  if (!sortedLots.value.length) {
    return eventStore.event?.startDate ?? null;
  }
  return sortedLots.value.reduce((latest: string | null, lot) => {
    const candidate = lot.endsAt ?? lot.startsAt;
    if (!latest) {
      return candidate;
    }
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, sortedLots.value[0].endsAt ?? sortedLots.value[0].startsAt);
});
const msToNextLot = computed(() => diffInMsFromNow(nextLotCountdownTarget.value));
const daysToLastLotEnd = computed(() => diffInDaysFromNow(lastLotEndDate.value));
const nextLotCountdownText = computed(() => {
  const diff = msToNextLot.value;
  if (diff === null) return "";
  if (diff <= 0) return "menos de 1 minuto";

  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MIN);
  const seconds = Math.floor((diff % MS_PER_MIN) / 1000);

  if (days >= 1) {
    // Exibe dias e, se houver, horas restantes
    return `${formatDayCount(days)}${hours > 0 ? ` ${hours}h` : ""}`;
  }

  if (hours >= 1) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }

  const clampedMinutes = Math.max(minutes, 0);
  return `${clampedMinutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
});
const formatDayCount = (value: number | null) => {
  if (value === null) return "";
  if (value <= 0) return "menos de 1 dia";
  return value === 1 ? "1 dia" : `${value} dias`;
};
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const uploadsBaseUrl = `${apiOrigin.replace(/\/$/, "")}/uploads`;
  const eventBannerError = ref(false);
  const resolveBannerUrl = (value?: string | null) => {
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
  const resolvedBannerUrl = computed(() => {
    if (eventBannerError.value) {
      return "";
    }
    return resolveBannerUrl(eventStore.event?.bannerUrl);
  });
  const hasBannerImage = computed(() => Boolean(resolvedBannerUrl.value));

  const registrationOpen = computed(() => {
    if (!eventStore.event) return false;
    if (isFreeEvent.value) return true;
    return Boolean(eventStore.event.currentLot);
  });

const currentStep = ref(0);
const buyerCpf = ref("");
const responsibleProfile = ref<RegistrationProfile | null>(null);
const quantity = ref(1);
const shouldPersistState = ref(true);
const STORAGE_KEY = REGISTRATION_STORAGE_KEY;
const canUseStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const loadPersistedState = () => {
  if (!canUseStorage) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.buyerCpf === "string") buyerCpf.value = saved.buyerCpf;
    if (typeof saved.selectedDistrictId === "string") selectedDistrictId.value = saved.selectedDistrictId;
    if (typeof saved.selectedChurchId === "string") selectedChurchId.value = saved.selectedChurchId;
    if (typeof saved.quantity === "number") quantity.value = saved.quantity;
    if (Array.isArray(saved.people) && saved.people.length) {
      people.splice(
        0,
        people.length,
        ...saved.people.map((person: PersonForm) => ({
          fullName: person.fullName || "",
          cpf: person.cpf || "",
          birthDate: person.birthDate || "",
          gender: person.gender || "",
          districtId: person.districtId || "",
          churchId: person.churchId || "",
          photoUrl: person.photoUrl || null,
          formResponses: person.formResponses ?? {}
        }))
      );
      resetParticipantCpfState(people.length);
      resetParticipantFieldErrors(people.length);
    }
    if (typeof saved.currentStep === "number") currentStep.value = saved.currentStep;
  } catch (error) {
    console.warn("Não foi possível carregar o estado salvo do formulário", error);
  }
};
const persistState = () => {
  if (!canUseStorage) return;
  if (!shouldPersistState.value) {
    clearPersistedState();
    return;
  }
  try {
    const payload = {
      buyerCpf: buyerCpf.value,
      selectedDistrictId: selectedDistrictId.value,
      selectedChurchId: selectedChurchId.value,
      quantity: quantity.value,
      people: people.map((person) => ({ ...person })),
      currentStep: currentStep.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Não foi possível salvar o estado local do formulário", error);
  }
};
const clearPersistedState = () => {
  if (!canUseStorage) return;
  localStorage.removeItem(STORAGE_KEY);
};

const disableStatePersistence = () => {
  shouldPersistState.value = false;
  clearPersistedState();
};
  const MIN_PARTICIPANTS = 1;
  const MAX_PARTICIPANTS = 10;
  const canDecreaseQuantity = computed(() => quantity.value > MIN_PARTICIPANTS);
  const canIncreaseQuantity = computed(() => quantity.value < MAX_PARTICIPANTS);
  const decreaseQuantity = () => {
    if (canDecreaseQuantity.value) {
      quantity.value -= 1;
    }
  };
  const increaseQuantity = () => {
    if (canIncreaseQuantity.value) {
      quantity.value += 1;
    }
  };
  const pendingOrders = ref<PendingOrder[]>([]);
  const selectedDistrictId = ref("");
  const selectedChurchId = ref("");
  const selectedPaymentMethod = ref<PaymentMethod>("PIX_MP");
  const people = reactive<PersonForm[]>([]);
  const participantCpfErrors = reactive<string[]>([]);
  const participantCpfRefs = ref<(HTMLInputElement | null)[]>([]);
  const participantFieldErrors = reactive<Record<number, Record<string, string>>>({});
  const submitting = ref(false);
  const checkingCpf = ref(false);
  const errorMessage = ref("");
  const inscricaoFormRef = ref<{ focusCpf: () => void } | null>(null);
  type CpfCheckResult = { existsInEvent: boolean; profile: RegistrationProfile | null };
  const cpfAvailabilityCache = new Map<string, CpfCheckResult>();

  const DUPLICATE_ERROR = "CPF duplicado entre os participantes";
  const REGISTERED_ERROR = "CPF já possui inscricão para este evento, verifique se já foi confirmado o pagamento.";
  const DUPLICATE_GLOBAL_ERROR =
    "Existem CPFs duplicados entre os participantes. Ajuste antes de prosseguir.";
  const REGISTERED_GLOBAL_ERROR =
    "Um ou mais CPFs já possuem inscricão neste evento, verifique se já foi confirmado o pagamento.";
  const REMOTE_ERROR_MESSAGE = "Não foi possível verificar CPF agora. Tente novamente.";
  const CPF_GLOBAL_MESSAGES = [
    DUPLICATE_GLOBAL_ERROR,
    REGISTERED_GLOBAL_ERROR,
    REMOTE_ERROR_MESSAGE
  ];

  const generalErrors = reactive({
    district: "",
    church: "",
    quantity: ""
  });

  const steps = computed(() => {
    const base = [
      { title: "CPF", description: "Informe o CPF do pagador" },
      { title: "Unidade", description: "Escolha distrito e igreja" },
      { title: "Participantes", description: "Dados individuais" },
      { title: "Revisão", description: isFreeEvent.value ? "Revise os dados e confirme" : "Revise os dados" }
    ];
    if (!isFreeEvent.value) {
      base.push({ title: "Pagamento", description: "Pix com QR Code" });
    }
    return base;
  });
  const genderOptions = [
    { value: "MALE", label: "Masculino" },
    { value: "FEMALE", label: "Feminino" },
    { value: "OTHER", label: "Outro" }
  ];
  const paymentOptions = computed(() => {
    const allowed =
      eventStore.event?.paymentMethods && eventStore.event.paymentMethods.length > 0
        ? eventStore.event.paymentMethods
        : PAYMENT_METHODS.map((option) => option.value);
    // Filtrar metodos exclusivos de admin se nao for admin
    const isAdmin = auth.user?.role === "AdminGeral" || auth.user?.role === "AdminDistrital";
    return PAYMENT_METHODS.filter((option) => {
      if (!allowed.includes(option.value)) return false;
      // Se for metodo exclusivo de admin e usuario nao for admin, nao mostrar
      if (ADMIN_ONLY_PAYMENT_METHODS.includes(option.value) && !isAdmin) {
        return false;
      }
      return true;
    });
  });
  const isManualPaymentSelected = computed(() =>
    MANUAL_PAYMENT_METHODS.includes(selectedPaymentMethod.value)
  );
  const isFreePaymentSelected = computed(() =>
    FREE_PAYMENT_METHODS.includes(selectedPaymentMethod.value)
  );
  const selectedPaymentLabel = computed(() => paymentMethodLabel(selectedPaymentMethod.value));

  const selectedDistrict = computed(() =>
    catalog.districts.find((district) => district.id === selectedDistrictId.value)
  );
  const churchOptions = computed<Church[]>(() =>
    catalog.churches.filter((church) =>
      selectedDistrictId.value ? church.districtId === selectedDistrictId.value : true
    )
  );
  const selectedChurch = computed(() =>
    churchOptions.value.find((church) => church.id === selectedChurchId.value)
  );
  const churchesByDistrict = computed(() => {
    const map = new Map<string, Church[]>();
    catalog.churches.forEach((church) => {
      const list = map.get(church.districtId) ?? [];
      list.push(church);
      map.set(church.districtId, list);
    });
    return map;
  });
  const getPersonChurchOptions = (districtId: string) =>
    churchesByDistrict.value.get(districtId) ?? [];
  const getDistrictName = (id: string) =>
    catalog.districts.find((district) => district.id === id)?.name ?? "Não informado";
  const getChurchName = (id: string) =>
    catalog.churches.find((church) => church.id === id)?.name ?? "Não informado";
  const getGenderLabel = (value: string) =>
    genderOptions.find((option) => option.value === value)?.label ?? value;

  const getFieldValue = (person: PersonForm, field: EventFormField) => {
    switch (field.id) {
      case "fullName":
        return person.fullName;
      case "cpf":
        return person.cpf;
      case "birthDate":
        return person.birthDate;
      case "gender":
        return person.gender;
      case "districtId":
        return person.districtId;
      case "churchId":
        return person.churchId;
      default:
        return person.formResponses?.[field.id];
    }
  };

  const setFieldValue = (person: PersonForm, field: EventFormField, value: unknown) => {
    switch (field.id) {
      case "fullName":
        person.fullName = String(value ?? "");
        break;
      case "cpf":
        person.cpf = String(value ?? "");
        break;
      case "birthDate":
        person.birthDate = String(value ?? "");
        break;
      case "gender":
        person.gender = String(value ?? "");
        break;
      case "districtId":
        person.districtId = String(value ?? "");
        break;
      case "churchId":
        person.churchId = String(value ?? "");
        break;
      default:
        if (!person.formResponses) {
          person.formResponses = {};
        }
        person.formResponses[field.id] = value;
    }
  };

  const updateFieldValue = (
    person: PersonForm,
    field: EventFormField,
    value: unknown,
    index: number
  ) => {
    let normalized = value;
    if (field.tipo === "number") {
      const raw = String(value ?? "");
      if (!raw.trim()) {
        normalized = "";
      } else {
        const parsed = Number(raw);
        normalized = Number.isFinite(parsed) ? parsed : raw;
      }
    }
    setFieldValue(person, field, normalized);
    clearParticipantFieldError(index, field.id);
  };

  const getFieldError = (index: number, fieldId: string) =>
    getParticipantFieldError(index, fieldId);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateFieldValue = (field: EventFormField, value: unknown, person?: PersonForm): string => {
    const required = isFieldRequired(field);
    const isEmpty = value === undefined || value === null || value === "";
    if (required && isEmpty) {
      return "Campo obrigatório.";
    }
    if (isEmpty) {
      return "";
    }

    if (field.id === "districtId") {
      const exists = catalog.districts.some((district) => district.id === value);
      return exists ? "" : "Distrito inválido.";
    }
    if (field.id === "churchId") {
      const districtId = person?.districtId ?? "";
      const churches = getPersonChurchOptions(districtId);
      const exists = churches.some((church) => church.id === value);
      return exists ? "" : "Igreja inválida.";
    }
    if (field.id === "gender") {
      const exists = genderOptions.some((option) => option.value === value);
      return exists ? "" : "Selecione um gênero válido.";
    }

    switch (field.tipo) {
      case "email": {
        if (typeof value !== "string" || !emailPattern.test(value)) {
          return "E-mail inválido.";
        }
        return "";
      }
      case "number": {
        const numeric = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(numeric)) {
          return "Número inválido.";
        }
        if (typeof field.min === "number" && numeric < field.min) {
          return `Valor mínimo é ${field.min}.`;
        }
        if (typeof field.max === "number" && numeric > field.max) {
          return `Valor máximo é ${field.max}.`;
        }
        return "";
      }
      case "select": {
        if (!field.opcoes || !field.opcoes.length) {
          return "";
        }
        if (typeof value !== "string" || !field.opcoes.includes(value)) {
          return "Seleção inválida.";
        }
        return "";
      }
      case "checkbox": {
        if (required && value !== true) {
          return "Este campo é obrigatório.";
        }
        if (typeof value !== "boolean") {
          return "Valor inválido.";
        }
        return "";
      }
      default:
        return "";
    }
  };

  const validateParticipantsFields = () => {
    let allValid = true;
    people.forEach((person, index) => {
      const errors: Record<string, string> = {};
      formFields.value.forEach((field) => {
        if (field.id === "cpf") {
          return;
        }
        const value = getFieldValue(person, field);
        const error = validateFieldValue(field, value, person);
        if (error) {
          errors[field.id] = error;
          allValid = false;
        }
      });
      participantFieldErrors[index] = errors;
    });
    return allValid;
  };

  const applyParticipantFieldErrors = (errorsByIndex: Record<string, Record<string, string>>) => {
    Object.entries(errorsByIndex).forEach(([indexKey, errors]) => {
      const index = Number(indexKey);
      if (!participantFieldErrors[index]) {
        participantFieldErrors[index] = {};
      }
      Object.assign(participantFieldErrors[index], errors);
    });
  };

  const buildFormResponsesPayload = (person: PersonForm) => {
    const responses = person.formResponses ?? {};
    const allowed = new Set(
      formFields.value
        .map((field) => field.id)
        .filter((id) => !SYSTEM_FIELD_IDS.has(id))
    );
    const cleaned: Record<string, unknown> = {};
    Object.entries(responses).forEach(([key, value]) => {
      if (!allowed.has(key)) return;
      if (value !== undefined) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  };

  const parseDateParts = (value?: string | null) => {
    if (!value) return null;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return { year, month, day };
  };

  const eventStartDateParts = computed(() => parseDateParts(eventStore.event?.startDate ?? ""));

  const formatBirthDateLabel = (birthDate?: string | null): string => {
    if (!birthDate) return "--";
    const match = birthDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return "--";
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getUTCFullYear()}`;
  };

  const calculateAgeYears = (birthDate: string): number | null => {
    const birthParts = parseDateParts(birthDate);
    const eventParts = eventStartDateParts.value;
    if (!birthParts || !eventParts) return null;
    let age = eventParts.year - birthParts.year;
    if (
      eventParts.month < birthParts.month ||
      (eventParts.month === birthParts.month && eventParts.day < birthParts.day)
    ) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  };

  const isAgeExempt = (person: PersonForm) => {
    const minAge = minAgeYears.value;
    if (minAge === null) return false;
    const age = calculateAgeYears(person.birthDate);
    if (age === null) return false;
    return age <= minAge;
  };

  const minorParticipantsCount = computed(() => {
    const minAge = minAgeYears.value;
    if (minAge === null) return 0;
    return people.filter((person) => {
      const age = calculateAgeYears(person.birthDate);
      return age !== null && age <= minAge;
    }).length;
  });

  const hasMinorParticipants = computed(() => minorParticipantsCount.value > 0);

  const minorConfirmationMessage = computed(() => {
    const count = minorParticipantsCount.value;
    const minAge = minAgeYears.value;
    if (!count || minAge === null) return "";
    const countLabel = count === 1 ? "1 participante" : `${count} participantes`;
    const ageLabel = minAge === 1 ? "1 ano" : `${minAge} anos`;
    const targetLabel = count === 1 ? "este participante" : "esses participantes";
    return `Identificamos ${countLabel} com idade abaixo ou igual à idade mínima do evento (${ageLabel}). A inscrição foi registrada como menor de idade e isenta de cobrança para ${targetLabel}.`;
  });

  const minorConfirmationOpen = ref(false);
  const minorConfirmationNextAction = ref<(() => void) | null>(null);
  const minorDialogRef = ref<HTMLDivElement | null>(null);

  const openMinorConfirmation = (nextAction: () => void) => {
    minorConfirmationNextAction.value = nextAction;
    minorConfirmationOpen.value = true;
  };

  const handleMinorConfirmationClose = () => {
    minorConfirmationOpen.value = false;
    const nextAction = minorConfirmationNextAction.value;
    minorConfirmationNextAction.value = null;
    if (nextAction) {
      nextAction();
    }
  };

  const getParticipantPriceCents = (person: PersonForm) => {
    if (isFreeEvent.value) return 0;
    if (isAgeExempt(person)) return 0;
    return ticketPriceCents.value;
  };

  const totalPayableCents = computed(() =>
    people.reduce((acc, person) => acc + getParticipantPriceCents(person), 0)
  );

  const shouldSkipPayment = computed(
    () => isFreeEvent.value || (people.length > 0 && totalPayableCents.value === 0)
  );

  const createEmptyPerson = (): PersonForm => ({
    fullName: "",
    cpf: "",
    birthDate: "",
    gender: "",
    districtId: selectedDistrictId.value || "",
    churchId: selectedChurchId.value || "",
    photoUrl: null,
    formResponses: {}
  });

  const ensurePersonChurch = (index: number) => {
    const person = people[index];
    if (!person) return;

    if (!person.districtId && selectedDistrictId.value) {
      person.districtId = selectedDistrictId.value;
    }

    if (!person.districtId) {
      person.churchId = "";
      return;
    }

    const availableChurches = getPersonChurchOptions(person.districtId);
    if (!availableChurches.length) {
      person.churchId = "";
      return;
    }

    if (person.churchId && availableChurches.some((church) => church.id === person.churchId)) {
      return;
    }

    const preferredChurch =
      selectedChurchId.value &&
      availableChurches.some((church) => church.id === selectedChurchId.value)
        ? selectedChurchId.value
        : availableChurches[0].id;

    person.churchId = preferredChurch;
  };

  const applyProfileToPerson = (index: number, profile: RegistrationProfile) => {
    const person = people[index];
    if (!person) return;

    person.fullName = profile.fullName;
    person.birthDate = profile.birthDate;
    if (profile.gender && genderOptions.some((option) => option.value === profile.gender)) {
      person.gender = profile.gender;
    }
    if (
      profile.districtId &&
      catalog.districts.some((district) => district.id === profile.districtId)
    ) {
      person.districtId = profile.districtId;
    }
    if (
      profile.churchId &&
      catalog.churches.some((church) => church.id === profile.churchId)
    ) {
      person.churchId = profile.churchId;
    }
    if (profile.photoUrl) {
      person.photoUrl = profile.photoUrl;
    }

    ensurePersonChurch(index);
  };

  const applyCpfCheckResult = (index: number, result: CpfCheckResult) => {
    if (result.existsInEvent) {
      // Se já existe inscrição, exibir o nome do cadastro quando disponível
      if (result.profile?.fullName) {
        participantCpfErrors[index] = `${REGISTERED_ERROR} (${result.profile.fullName})`;
      } else {
        participantCpfErrors[index] = REGISTERED_ERROR;
      }
    } else if (
      participantCpfErrors[index] === REGISTERED_ERROR ||
      participantCpfErrors[index] === REMOTE_ERROR_MESSAGE
    ) {
      participantCpfErrors[index] = "";
    }

    if (!result.existsInEvent && result.profile) {
      applyProfileToPerson(index, result.profile);
    }

    updateParticipantGlobalError();
  };

  const getCpfError = (value: string) => {
    const digits = normalizeCPF(value);
    if (!digits.length) return "";
    return validateCPF(value) ? "" : "CPF inválido";
  };

  const updateParticipantGlobalError = () => {
    if (currentStep.value !== 2) return;

    let nextMessage: string | null = null;

    if (participantCpfErrors.some((error) => error === DUPLICATE_ERROR)) {
      nextMessage = DUPLICATE_GLOBAL_ERROR;
    } else if (participantCpfErrors.some((error) => error === REGISTERED_ERROR)) {
      nextMessage = REGISTERED_GLOBAL_ERROR;
    } else if (participantCpfErrors.some((error) => error === REMOTE_ERROR_MESSAGE)) {
      nextMessage = REMOTE_ERROR_MESSAGE;
    }

    if (nextMessage) {
      if (!errorMessage.value || CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
        errorMessage.value = nextMessage;
      }
      return;
    }

    if (CPF_GLOBAL_MESSAGES.includes(errorMessage.value)) {
      errorMessage.value = "";
    }
  };

  const updateDuplicateErrors = () => {
    const duplicates = new Set<number>();
    const occurrences = new Map<string, number[]>();

    people.forEach((person, index) => {
      const digits = normalizeCPF(person.cpf);
      if (digits.length === 11) {
        const list = occurrences.get(digits) ?? [];
        list.push(index);
        occurrences.set(digits, list);
      }
    });

    occurrences.forEach((indexes) => {
      if (indexes.length > 1) {
        indexes.forEach((index) => duplicates.add(index));
      }
    });

    for (let index = 0; index < participantCpfErrors.length; index += 1) {
      if (duplicates.has(index)) {
        participantCpfErrors[index] = DUPLICATE_ERROR;
      } else if (participantCpfErrors[index] === DUPLICATE_ERROR) {
        participantCpfErrors[index] = "";
      }
    }

    updateParticipantGlobalError();
    return duplicates;
  };

  const setParticipantCpfRef = (element: HTMLInputElement | null, index: number) => {
    participantCpfRefs.value[index] = element;
  };

  const onPersonDistrictChange = (index: number) => {
    ensurePersonChurch(index);
  };

  const checkParticipantCpfRemote = async (index: number) => {
    if (!eventStore.event) return;
    const digits = normalizeCPF(people[index].cpf);
    if (digits.length !== 11) return;

    const cacheKey = `${eventStore.event.id}:${digits}`;
    const cached = cpfAvailabilityCache.get(cacheKey);

    if (cached) {
      applyCpfCheckResult(index, cached);
      return;
    }

    try {
      const response = await api.post("/inscriptions/check", {
        eventId: eventStore.event.id,
        cpf: digits
      });
      const result: CpfCheckResult = {
        existsInEvent: Boolean(response.data.existsInEvent ?? response.data.exists),
        profile: response.data.profile ?? null
      };
      cpfAvailabilityCache.set(cacheKey, result);
      applyCpfCheckResult(index, result);
    } catch (error) {
      console.error("Falha ao verificar CPF remoto", error);
      participantCpfErrors[index] = REMOTE_ERROR_MESSAGE;
      updateParticipantGlobalError();
    }
  };

  const handleConflictError = async (message: string) => {
    currentStep.value = 2;
    const digitsInMessage = message.replace(/\D/g, "");
    if (digitsInMessage.length < 11) return;
    const targetDigits = digitsInMessage.slice(-11);

    if (eventStore.event) {
      cpfAvailabilityCache.set(`${eventStore.event.id}:${targetDigits}`, {
        existsInEvent: true,
        profile: null
      });
    }

    const index = people.findIndex((person) => normalizeCPF(person.cpf) === targetDigits);
    if (index >= 0) {
      participantCpfErrors[index] = REGISTERED_ERROR;
      await nextTick();
      participantCpfRefs.value[index]?.focus();
    }

    updateDuplicateErrors();
  };

  const onParticipantCpfInput = (index: number, event: Event) => {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const previousDigits = normalizeCPF(people[index].cpf);
    const formatted = formatCPF(input.value);
    people[index].cpf = formatted;
    const digits = normalizeCPF(formatted);

    if (eventStore.event) {
      if (previousDigits.length === 11) {
        cpfAvailabilityCache.delete(`${eventStore.event.id}:${previousDigits}`);
      }
      if (digits.length === 11) {
        cpfAvailabilityCache.delete(`${eventStore.event.id}:${digits}`);
      }
    }

    participantCpfErrors[index] = getCpfError(formatted);
    updateDuplicateErrors();
  };

  const onParticipantCpfBlur = async (index: number) => {
    participantCpfErrors[index] = getCpfError(people[index].cpf);
    if (participantCpfErrors[index]) return;
    const duplicates = updateDuplicateErrors();
    if (duplicates.has(index)) return;
    await checkParticipantCpfRemote(index);
  };

  const resetParticipantCpfState = (count: number) => {
    participantCpfErrors.splice(0, participantCpfErrors.length);
    for (let index = 0; index < count; index += 1) {
      participantCpfErrors.push("");
    }
    participantCpfRefs.value = new Array(count).fill(null);
  };

  const resetParticipantFieldErrors = (count: number) => {
    Object.keys(participantFieldErrors).forEach((key) => {
      delete participantFieldErrors[Number(key)];
    });
    for (let index = 0; index < count; index += 1) {
      participantFieldErrors[index] = {};
    }
  };

  const setParticipantFieldError = (index: number, fieldId: string, message: string) => {
    if (!participantFieldErrors[index]) {
      participantFieldErrors[index] = {};
    }
    participantFieldErrors[index][fieldId] = message;
  };

  const clearParticipantFieldError = (index: number, fieldId: string) => {
    if (!participantFieldErrors[index]) return;
    if (participantFieldErrors[index][fieldId]) {
      delete participantFieldErrors[index][fieldId];
    }
  };

  const getParticipantFieldError = (index: number, fieldId: string) =>
    participantFieldErrors[index]?.[fieldId] ?? "";

  const ensureParticipantCpfsValid = async () => {
    let firstInvalidIndex = -1;

    people.forEach((person, index) => {
      const error = getCpfError(person.cpf);
      participantCpfErrors[index] = error;
      if (error && firstInvalidIndex === -1) {
        firstInvalidIndex = index;
      }
    });

    const duplicates = updateDuplicateErrors();
    if (duplicates.size > 0 && firstInvalidIndex === -1) {
      firstInvalidIndex = duplicates.values().next().value ?? -1;
    }

    if (firstInvalidIndex === -1) {
      for (let index = 0; index < people.length; index += 1) {
        if (duplicates.has(index)) continue;
        await checkParticipantCpfRemote(index);
        if (
          [REGISTERED_ERROR, REMOTE_ERROR_MESSAGE].includes(participantCpfErrors[index]) &&
          firstInvalidIndex === -1
        ) {
          firstInvalidIndex = index;
        }
      }
    }

    if (firstInvalidIndex === -1) {
      return true;
    }

    currentStep.value = 2;
    await nextTick();
    participantCpfRefs.value[firstInvalidIndex]?.focus();
    return false;
  };

  // Bloqueia edição dos campos até CPF estar válido e disponível
  const isPersonLocked = (index: number) => {
    const cpf = people[index]?.cpf ?? "";
    const digits = normalizeCPF(cpf);
    if (digits.length < 11) return true;
    // Se houver erro (inválido/duplicado/registrado/erro remoto), mantém bloqueado
    return Boolean(participantCpfErrors[index]);
  };

  onMounted(async () => {
    await eventStore.fetchEvent(props.slug);
    await catalog.loadDistricts();
    await catalog.loadChurches();
    loadPersistedState();
  });

  watch(
    () => [noticeSlug.value, noticeEnabled.value, noticeFingerprint.value, resolvedNotice.value?.showOnce],
    () => {
      evaluateNotice();
    },
    { immediate: true }
  );

  watch(
    () => minorConfirmationOpen.value,
    (open) => {
      if (open) {
        nextTick(() => minorDialogRef.value?.focus());
      }
    }
  );

  watch(
    () => eventStore.event?.bannerUrl,
    () => {
      eventBannerError.value = false;
    }
  );

  watch(currentStep, (step) => {
    if (
      step !== 2 &&
      CPF_GLOBAL_MESSAGES.includes(errorMessage.value)
    ) {
      errorMessage.value = "";
    }
    persistState();
  });

  watch(buyerCpf, () => {
    if (currentStep.value === 0 && errorMessage.value) {
      errorMessage.value = "";
    }
    persistState();
  });

  watch(selectedDistrictId, (districtId) => {
    generalErrors.district = "";
    if (
      selectedChurchId.value &&
      !catalog.churches.some(
        (church) => church.id === selectedChurchId.value && church.districtId === districtId
      )
    ) {
      selectedChurchId.value = "";
    }
    if (currentStep.value >= 2) {
      people.forEach((person, index) => {
        if (!person.districtId && districtId) {
          person.districtId = districtId;
        }
        ensurePersonChurch(index);
      });
    }
    persistState();
  });

  watch(selectedChurchId, (churchId) => {
    generalErrors.church = "";
    if (!churchId || currentStep.value < 2) return;
    people.forEach((person, index) => {
      if (
        !person.churchId &&
        person.districtId &&
        catalog.churches.some(
          (church) => church.id === churchId && church.districtId === person.districtId
        )
      ) {
        person.churchId = churchId;
      }
      ensurePersonChurch(index);
    });
  });

  watch(quantity, () => {
    generalErrors.quantity = "";
  });

  watch(
    () => eventStore.event?.paymentMethods,
    (methods) => {
      if (methods && methods.length > 0) {
        selectedPaymentMethod.value = methods[0];
      } else {
        selectedPaymentMethod.value = "PIX_MP";
      }
    },
    { immediate: true }
  );

  watch(
    paymentOptions,
    (options) => {
      if (!options.length) return;
      if (!options.some((option) => option.value === selectedPaymentMethod.value)) {
        selectedPaymentMethod.value = options[0].value;
      }
    },
    { immediate: true }
  );

  const handleCpfSubmit = async (cpfDigits: string) => {
    checkingCpf.value = true;
    errorMessage.value = "";

    if (!cpfDigits || !validateCPF(cpfDigits)) {
      errorMessage.value = "CPF inválido";
      checkingCpf.value = false;
      return;
    }

    try {
      const response = await eventStore.checkPendingOrder(cpfDigits);
      pendingOrders.value = [];

      const suggestion = response?.suggestedChurch;
      if (suggestion) {
        if (!catalog.districts.some((district) => district.id === suggestion.districtId)) {
          await catalog.loadDistricts();
        }
        if (!catalog.churches.some((church) => church.id === suggestion.churchId)) {
          await catalog.loadChurches();
        }
        selectedDistrictId.value = suggestion.districtId;
        if (catalog.churches.some((church) => church.id === suggestion.churchId)) {
          selectedChurchId.value = suggestion.churchId;
        }
      }
      currentStep.value = 1;
    } catch (error: any) {
      errorMessage.value = error.response?.data?.message ?? "Não foi possível verificar.";
    } finally {
      checkingCpf.value = false;
    }
  };

  const handleGeneralStep = () => {
    generalErrors.district = selectedDistrictId.value ? "" : "Selecione um distrito.";
    generalErrors.church = selectedChurchId.value ? "" : "Selecione uma igreja.";
    generalErrors.quantity =
      quantity.value && quantity.value > 0 ? "" : "Informe ao menos um participante.";

    if (generalErrors.district || generalErrors.church || generalErrors.quantity) {
      return;
    }

    const size = Math.min(Math.max(Math.floor(quantity.value), 1), 10);
    quantity.value = size;

    people.splice(0, people.length);
    for (let index = 0; index < size; index += 1) {
      people.push(createEmptyPerson());
      ensurePersonChurch(index);
    }
    resetParticipantCpfState(size);
    resetParticipantFieldErrors(size);
    errorMessage.value = "";
    currentStep.value = 2;
  };

  const handlePhotoUpload = (event: Event, index: number) => {
    const input = event.target as HTMLInputElement | null;
    if (!input?.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      people[index].photoUrl = String(loadEvent.target?.result ?? "");
    };
    reader.readAsDataURL(file);
  };
  const goToReview = async () => {
    errorMessage.value = "";
    const cpfsValid = await ensureParticipantCpfsValid();
    if (!cpfsValid) return;

    people.forEach((person, index) => {
      if (!person.districtId && selectedDistrictId.value) {
        person.districtId = selectedDistrictId.value;
      }
      if (!person.churchId && selectedChurchId.value) {
        person.churchId = selectedChurchId.value;
      }
      ensurePersonChurch(index);
    });
    const fieldsValid = validateParticipantsFields();
    if (!fieldsValid) {
      errorMessage.value = "Preencha todos os dados obrigatórios dos participantes.";
      return;
    }

    currentStep.value = 3;
  };
  const submitBatch = async () => {
    errorMessage.value = "";

    if (!validateCPF(buyerCpf.value)) {
      currentStep.value = 0;
      await nextTick();
      inscricaoFormRef.value?.focusCpf();
      return;
    }

    if (!selectedDistrictId.value || !selectedChurchId.value) {
      currentStep.value = 1;
      generalErrors.district = selectedDistrictId.value ? "" : "Selecione um distrito.";
      generalErrors.church = selectedChurchId.value ? "" : "Selecione uma igreja.";
      return;
    }

    try {
      const cpfsValid = await ensureParticipantCpfsValid();
      if (!cpfsValid) return;

      people.forEach((person, index) => {
        if (!person.districtId && selectedDistrictId.value) {
          person.districtId = selectedDistrictId.value;
        }
        if (!person.churchId && selectedChurchId.value) {
          person.churchId = selectedChurchId.value;
        }
        ensurePersonChurch(index);
      });
      const fieldsValid = validateParticipantsFields();
      if (!fieldsValid) {
        errorMessage.value = "Preencha todos os dados obrigat�rios dos participantes.";
        currentStep.value = 2;
        return;
      }
    } catch (error: any) {
      if (error?.response?.data?.message?.includes("CPF j� registrado")) {
        errorMessage.value = "CPF j� possui inscri��o confirmada para este evento";
        currentStep.value = 2;
        return;
      }
      throw error;
    }

    try {
      submitting.value = true;
      const payload = people.map((person) => ({
        fullName: person.fullName,
        cpf: normalizeCPF(person.cpf),
        birthDate: person.birthDate,
        gender: person.gender,
        districtId: person.districtId,
        churchId: person.churchId,
        photoUrl: person.photoUrl,
        formResponses: buildFormResponsesPayload(person)
      }));
      const response = await eventStore.createBatchOrder(
        normalizeCPF(buyerCpf.value),
        selectedPaymentMethod.value,
        payload
      );
      disableStatePersistence();
      const handleSuccess = () => {
        // Se for isento/gratuito, nao redirecionar para pagina de pagamento
        if (response.payment?.isFree || response.payment?.totalCents === 0) {
          // Redirecionar para pagina de evento com mensagem de sucesso
          router.push({
            name: "event",
            params: { slug: props.slug },
            query: { success: "1", orderId: response.orderId }
          });
        } else {
          createdOrderId.value = response.orderId;
          inlinePayment.value = response.payment ?? null;
          currentStep.value = 4;
          startInlinePolling();
        }
      };

      if (hasMinorParticipants.value) {
        openMinorConfirmation(handleSuccess);
      } else {
        handleSuccess();
      }
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Erro ao criar inscri��es.";
      const status = error.response?.status;
      const fieldErrors = error.response?.data?.details?.fieldErrors;
      if (status === 422 && fieldErrors) {
        resetParticipantFieldErrors(people.length);
        applyParticipantFieldErrors(fieldErrors);
        errorMessage.value = message || "Revise os campos destacados.";
        currentStep.value = 2;
        return;
      }
      errorMessage.value = message;
      if (status === 409) {
        await handleConflictError(message);
      }
    } finally {
      submitting.value = false;
    }
  };



  // Pagamento inline (etapa 4)
  type InlinePayment = {
    preferenceId?: string;
    initPoint?: string;
    pixQrData?: { qr_code: string; qr_code_base64: string };
    pixQrHash?: string;
    pixQrLength?: number;
    pixQrBase64Length?: number;
    status?: string;
    statusDetail?: string;
    participantCount?: number;
    totalCents?: number;
    paymentMethod?: string;
    paidAt?: string | null;
    isManual?: boolean;
  } | null;
  const createdOrderId = ref<string>("");
  const inlinePayment = ref<InlinePayment>(null);
  const inlinePollHandle = ref<number | null>(null);
  const inlinePixHash = ref("");
  const inlinePixError = ref("");

  const inlinePixCode = computed(() =>
    normalizePixCode(inlinePayment.value?.pixQrData?.qr_code ?? "")
  );
  const canCopyInlinePix = computed(() => Boolean(inlinePixCode.value) && !inlinePixError.value);

  watch(
    [inlinePixCode, () => inlinePayment.value?.pixQrHash],
    async ([code, serverHash]) => {
      if (!code) {
        inlinePixHash.value = "";
        inlinePixError.value = "";
        return;
      }
      const hash = await hashPixCode(code);
      inlinePixHash.value = hash;
      if (serverHash && hash && serverHash !== hash) {
        inlinePixError.value =
          "Codigo Pix inconsistente. Gere um novo Pix para continuar.";
        if (createdOrderId.value) {
          api.post("/payments/pix/integrity", {
            orderId: createdOrderId.value,
            qrHashClient: hash,
            qrHashServer: serverHash,
            qrLength: code.length,
            source: "event_flow"
          }).catch(() => undefined);
        }
      } else {
        inlinePixError.value = "";
      }
    }
  );

  const inlineIsPixMethod = computed(() => (inlinePayment.value?.paymentMethod ?? selectedPaymentMethod.value) === "PIX_MP");
  const inlineIsPaid = computed(() => inlinePayment.value?.status === "PAID");
  const inlineIsManual = computed(() => Boolean(inlinePayment.value?.isManual));
  const inlineStatusTitle = computed(() => {
    if (inlineIsManual.value) return inlinePayment.value?.status === "PAID" ? "Pagamento registrado" : "Pagamento pendente de confirmação";
    if (inlineIsPaid.value) return "Pagamento aprovado";
    if (inlinePayment.value?.status === "CANCELED") return "Pagamento cancelado";
    return "Aguardando confirmação";
  });
  const inlineStatusMessage = computed(() => {
    if (inlineIsManual.value) {
      return inlinePayment.value?.status === "PAID"
        ? "Pagamento registrado pela tesouraria. As inscrições estão confirmadas."
        : "Apresente este comprovante na tesouraria para concluir o pagamento.";
    }
    if (inlineIsPaid.value) return "Tudo certo! Vamos liberar os recibos em instantes.";
    if (inlinePayment.value?.status === "CANCELED") return "Pagamento cancelado. Gere um novo checkout para tentar novamente.";
    return "Estamos monitorando o Mercado Pago. Assim que o pagamento for aprovado, atualizamos automaticamente.";
  });
  const inlineStatusIcon = computed(() => {
    if (inlineIsPaid.value) return "OK";
    if (inlineIsManual.value) return "..";
    if (inlinePayment.value?.status === "CANCELED") return "X";
    return "..";
  });
  const inlineStatusStyles = computed(() => {
    if (inlineIsPaid.value) {
      return {
        container: "border-primary-200 bg-primary-50",
        badge: "bg-primary-600"
      };
    }
    if (inlineIsManual.value) {
      return {
        container: "border-neutral-200 bg-white",
        badge: "bg-neutral-900"
      };
    }
    if (inlinePayment.value?.status === "CANCELED") {
      return {
        container: "border-black/60 bg-black text-white",
        badge: "bg-black"
      };
    }
    return {
      container: "border-primary-100 bg-white",
      badge: "bg-primary-500"
    };
  });

  watch(
    quantity,
    (value) => {
      const normalized = Math.min(
        MAX_PARTICIPANTS,
        Math.max(MIN_PARTICIPANTS, Number.isFinite(value) ? value : MIN_PARTICIPANTS)
      );
      if (normalized !== value) {
        quantity.value = normalized;
      }
      persistState();
    }
  );

  watch(
    people,
    () => {
      persistState();
    },
    { deep: true }
  );

  const copyInlinePixCode = async () => {
    const code = inlinePayment.value?.pixQrData?.qr_code;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    alert("Código Pix copiado!");
  };

  const handleInlineOpenCheckout = () => {
    const link = inlinePayment.value?.initPoint;
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const startInlinePolling = () => {
    if (inlinePollHandle.value) { clearInterval(inlinePollHandle.value); inlinePollHandle.value = null; }
    inlinePollHandle.value = window.setInterval(async () => {
      if (!createdOrderId.value) return;
      try {
        const data = await eventStore.getPaymentData(createdOrderId.value);
        inlinePayment.value = data;
        if (data?.status === "PAID" || data?.status === "CANCELED") {
          clearInterval(inlinePollHandle.value!);
          inlinePollHandle.value = null;
        }
      } catch {}
    }, 5000);
  };
</script>

<style scoped>
input[data-quantity-input]::-webkit-outer-spin-button,
input[data-quantity-input]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[data-quantity-input] {
  -moz-appearance: textfield;
}

.event-flow :deep(input),
.event-flow :deep(select),
.event-flow :deep(textarea) {
  color: #111827 !important;
}

.event-flow :deep(input::placeholder),
.event-flow :deep(textarea::placeholder) {
  color: #4b5563;
}

.event-flow :deep(input[type="date"]) {
  color: #111827;
}

.event-flow :deep(input[type="date"]::-webkit-datetime-edit) {
  color: #111827;
}
</style>






