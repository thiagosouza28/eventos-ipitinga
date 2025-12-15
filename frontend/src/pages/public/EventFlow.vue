<template>
  <div v-if="eventStore.loading">
    <LoadingSpinner />
  </div>
  <div v-else-if="!eventStore.event">
    <BaseCard>
      <p class="text-neutral-500">Evento não encontrado.</p>
    </BaseCard>
  </div>
  <div v-else class="space-y-6" data-uppercase-scope>
    <BaseCard>
      <div class="space-y-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex-1">
            <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
              {{ eventStore.event.title }}
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400">
              {{ eventStore.event.description }}
            </p>
          </div>
          <div class="self-start w-full lg:w-auto">
            <div class="overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700">
              <img
                v-if="hasBannerImage"
                :src="resolvedBannerUrl"
                alt="Banner do evento"
                class="w-full max-h-60 object-contain"
                loading="lazy"
                @error="eventBannerError = true"
              />
              <div
                v-else
                class="flex h-40 w-full items-center justify-center border border-dashed border-neutral-300 px-6 py-4 text-xs text-neutral-400 sm:h-40 sm:w-72 dark:border-neutral-600 dark:text-neutral-500"
              >
                Imagem indisponível
              </div>
            </div>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-sm text-neutral-500">
              {{ priceInfo.title }}
            </p>
            <p
              :class="[
                'text-xl font-semibold',
                priceInfo.pending ? 'text-neutral-500 dark:text-neutral-400' : 'text-primary-600 dark:text-primary-400'
              ]"
            >
              {{ priceInfo.value }}
            </p>
            <p
              v-if="priceInfo.helper"
              class="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
            >
              {{ priceInfo.helper }}
            </p>
            <div class="mt-3 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              <p v-if="nextLotCountdownText">
                Próximo lote em
                <span class="font-semibold text-neutral-800 dark:text-white">
                  {{ nextLotCountdownText }}
                </span>
              </p>
              <p v-else>Nenhum próximo lote programado.</p>
              <p v-if="daysToLastLotEnd !== null">
                Todos os lotes encerram em
                <span class="font-semibold text-neutral-800 dark:text-white">
                  {{ formatDayCount(daysToLastLotEnd) }}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <span>Local: {{ eventStore.event.location }}</span>
          <span class="hidden sm:inline">|</span>
          <span>
            {{ formatDate(eventStore.event.startDate) }} - {{ formatDate(eventStore.event.endDate) }}
          </span>
          <span v-if="eventStore.event.minAgeYears">
            Idade minima: {{ eventStore.event.minAgeYears }}+ anos
          </span>
        </div>
      </div>
    </BaseCard>

    <div v-if="registrationOpen" class="space-y-6">
      <StepWizard :steps="steps" :current-step="currentStep" />

      <BaseCard v-if="currentStep === 0">
        <ResponsibleCpfForm
          ref="inscricaoFormRef"
          v-model="responsibleProfile"
          :loading="checkingCpf"
          :error="errorMessage"
          @update:cpf="buyerCpf = $event"
          @submit="handleCpfSubmit"
        />
      </BaseCard>

      <BaseCard v-if="currentStep === 1">
        <div
          v-if="false"
          class="rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100"
        >
          <p class="font-semibold">{{ pendingOrders.length }} pagamento(s) pendente(s) encontrado(s).</p>
          <p>Você pode ver e pagar as pendências existentes ou seguir com uma nova inscrição.</p>
          <div class="mt-3 space-y-2">
            <div
              v-for="order in pendingOrders"
              :key="order.orderId"
              class="rounded-md border border-primary-100 bg-white/80 p-2 dark:border-primary-500/30 dark:bg-neutral-900/40"
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
                  class="inline-flex shrink-0 items-center justify-center rounded-md border border-primary-500 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-500/10 dark:border-primary-400 dark:text-primary-100"
                >
                  Pagar
                </RouterLink>
              </div>
            </div>
            <RouterLink
              :to="{ name: 'admin-pending-orders', params: { cpf: buyerCpf } }"
              class="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-600 dark:text-primary-100 dark:hover:text-primary-50"
            >
              Ver todas as pend�fªncias
              <IconArrowRight class="ml-1 h-3 w-3" />
            </RouterLink>
          </div>
        </div>
        <form @submit.prevent="handleGeneralStep" class="space-y-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Distrito
              </label>
              <select
                v-model="selectedDistrictId"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
                :aria-invalid="generalErrors.district ? 'true' : 'false'"
                aria-describedby="district-error"
                required
              >
                <option value="" disabled>Selecione</option>
                <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                  {{ district.name }}
                </option>
              </select>
              <p
                v-if="generalErrors.district"
                id="district-error"
                role="alert"
                class="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {{ generalErrors.district }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Igreja
              </label>
              <select
                v-model="selectedChurchId"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
              <p
                v-if="generalErrors.church"
                id="church-error"
                role="alert"
                class="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {{ generalErrors.church }}
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Quantidade de participantes
            </label>
            <div
              class="mt-1 flex w-full items-center rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800 sm:w-56"
              :aria-invalid="generalErrors.quantity ? 'true' : 'false'"
              aria-describedby="quantity-error"
            >
              <button
                type="button"
                class="h-10 w-10 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-neutral-900"
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
                max="10"
                data-quantity-input
                class="h-10 w-full border-0 bg-transparent text-center text-lg font-semibold outline-none"
                required
              />
              <button
                type="button"
                class="h-10 w-10 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-neutral-900"
                :disabled="!canIncreaseQuantity"
                @click="increaseQuantity"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
            <p
              v-if="generalErrors.quantity"
              id="quantity-error"
              role="alert"
              class="mt-2 text-sm text-red-600 dark:text-red-400"
            >
              {{ generalErrors.quantity }}
            </p>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <button
              type="button"
              class="w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto"
              @click="currentStep--"
            >
              Voltar
            </button>
            <button
              type="submit"
              class="w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 sm:w-auto"
            >
              Avançar
            </button>
          </div>
        </form>
      </BaseCard>

      <div v-if="currentStep === 2" class="space-y-6">
        <BaseCard>
          <div class="grid gap-2 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">CPF responsável:</span>
              {{ buyerCpf }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Distrito:</span>
              {{ selectedDistrict?.name ?? "Não selecionado" }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Igreja:</span>
              {{ selectedChurch?.name ?? "Não selecionada" }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Participantes:</span>
              {{ people.length }}
            </p>
          </div>
        </BaseCard>

        <BaseCard
          v-for="(person, index) in people"
          :key="index"
          class="rounded-2xl border border-neutral-200/80 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Participante {{ index + 1 }}
            </h2>
            <span class="text-sm text-neutral-400">Preencha todos os campos obrigatórios</span>
          </div>
          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                CPF
              </label>
              <input
                :ref="(el) => setParticipantCpfRef(el as HTMLInputElement | null, index)"
                v-model="person.cpf"
                type="text"
                placeholder="000.000.000-00"
                inputmode="numeric"
                autocomplete="off"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
                class="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {{ participantCpfErrors[index] }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Nome completo
              </label>
              <input
                v-model="person.fullName"
                type="text"
                required
                :disabled="isPersonLocked(index)"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Data de nascimento
              </label>
              <div class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <DateField
                  v-model="person.birthDate"
                  required
                  :disabled="isPersonLocked(index)"
                  class="w-full"
                />
                <span
                  v-if="calculateAgeYears(person.birthDate) !== null"
                  class="text-xs text-neutral-500 dark:text-neutral-400"
                >
                  {{ calculateAgeYears(person.birthDate) }} anos
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Genero
              </label>
              <select
                v-model="person.gender"
                :disabled="isPersonLocked(index)"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
                required
              >
                <option value="" disabled>Selecione</option>
                <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Distrito
              </label>
              <select
                v-model="person.districtId"
                :disabled="isPersonLocked(index)"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
                @change="onPersonDistrictChange(index)"
              >
                <option value="" disabled>Selecione</option>
                <option v-for="district in catalog.districts" :key="district.id" :value="district.id">
                  {{ district.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Igreja
              </label>
              <select
                v-model="person.churchId"
                :disabled="isPersonLocked(index)"
                class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
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
            </div>
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Foto (opcional)
              </label>
              <div class="mt-1 flex flex-wrap items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  :disabled="isPersonLocked(index)"
                  class="block w-full max-w-xs text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-60"
                  @change="handlePhotoUpload($event, index)"
                />
                <img
                  :src="person.photoUrl || DEFAULT_PHOTO_DATA_URL"
                  alt="Pre-visualizacao"
                  class="h-24 w-24 rounded-lg object-cover"
                />
              </div>
            </div>
          </div>
        </BaseCard>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <button
            type="button"
            class="w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto"
            @click="currentStep--"
          >
            Voltar
          </button>
          <button
            type="button"
            class="w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 sm:w-auto"
            @click="goToReview"
          >
            Revisar inscrições
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </div>

      <BaseCard v-if="currentStep === 3">
        <div class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              Revisão dos dados
            </h2>
            <p class="text-sm text-neutral-500">
              {{
                isFreeEvent
                  ? "Confira as informações antes de confirmar as inscrições."
                  : "Confira as informações antes de prosseguir com o pagamento."
              }}
            </p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            <p>CPF responsavel: {{ buyerCpf }}</p>
            <p>Distrito: {{ selectedDistrict?.name ?? "Não selecionado" }}</p>
            <p>Igreja: {{ selectedChurch?.name ?? "Não selecionada" }}</p>
          </div>
          <div
            v-if="!isFreeEvent"
            class="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60"
          >
            <label class="block text-sm font-semibold text-neutral-700 dark:text-neutral-100">
              Forma de pagamento
            </label>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="option in paymentOptions"
                :key="option.value"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-primary-400 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <input
                  v-model="selectedPaymentMethod"
                  type="radio"
                  :value="option.value"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span class="flex flex-col">
                  <span class="font-medium text-neutral-700 dark:text-neutral-100">{{ option.label }}</span>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ option.description }}</span>
                </span>
              </label>
            </div>
            <p class="text-xs text-neutral-400 dark:text-neutral-500">
              Pagamento selecionado: {{ selectedPaymentLabel }}.
            </p>
            <p
              v-if="isManualPaymentSelected"
              class="text-xs text-primary-600 dark:text-primary-200"
            >
              Pagamentos manuais serão confirmados pela tesouraria. Guarde o comprovante para quitar a pendência.
            </p>
            <p
              v-if="isFreePaymentSelected"
              class="text-xs text-primary-500 dark:text-primary-200"
            >
              Esta inscrição será marcada como paga automaticamente, sem gerar cobrança.
            </p>
          </div>
          <div class="grid gap-4">
            <div
              v-for="(person, index) in people"
              :key="index"
              class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex items-center gap-3">
                  <img
                    :src="person.photoUrl || DEFAULT_PHOTO_DATA_URL"
                    alt="Foto do participante"
                    class="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                      {{ person.fullName }}
                    </p>
                    <p class="text-xs text-neutral-500">
                      CPF: {{ person.cpf }}
                    </p>
                  </div>
                </div>
                <button class="text-sm text-primary-600 hover:underline" @click="currentStep = 2">
                  Editar
                </button>
              </div>
              <div class="mt-3 grid gap-1 text-sm text-neutral-500 sm:grid-cols-2">
                <p>
                  Nascimento: {{ formatBirthDateLabel(person.birthDate) }}
                  <span v-if="calculateAgeYears(person.birthDate) !== null">
                    ({{ calculateAgeYears(person.birthDate) }} anos)
                  </span>
                </p>
                <p>Genero: {{ getGenderLabel(person.gender) }}</p>
                <p>Distrito: {{ getDistrictName(person.districtId) }}</p>
                <p>Igreja: {{ getChurchName(person.churchId) }}</p>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2 text-left sm:text-right">
            <p v-if="!isFreeEvent" class="text-sm text-neutral-500">
              Forma de pagamento: {{ selectedPaymentLabel }}
            </p>
            <p class="text-sm text-neutral-500">Total</p>
            <p class="text-2xl font-semibold text-primary-600 dark:text-primary-400">
              {{ isFreeEvent ? "Gratuito" : formatCurrency(ticketPriceCents * people.length) }}
            </p>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <button
              type="button"
              class="w-full rounded-xl border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto"
              @click="currentStep--"
            >
              Voltar
            </button>
            <button
              type="button"
              class="w-full rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 disabled:opacity-70 sm:w-auto"
              :disabled="submitting"
              @click="submitBatch"
            >
              <span v-if="submitting" class="flex items-center justify-center gap-2">
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
                ></span>
                Processando...
              </span>
              <span v-else>{{ isFreeEvent ? "Confirmar inscrições" : "Gerar pagamento" }}</span>
            </button>
          </div>
          <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        </div>
      </BaseCard>
      <!-- Etapa 4: Pagamento inline com Pix (QR + copia e cola) -->
      <BaseCard v-if="currentStep === 4 && inlinePayment">
        <div class="flex flex-col gap-6 md:flex-row md:items-start">
          <div class="flex-1 space-y-4">
            <div class="flex items-start gap-3 rounded-xl border px-4 py-3" :class="inlineStatusStyles.container">
              <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-white" :class="inlineStatusStyles.badge">
                {{ inlineStatusIcon }}
              </span>
              <div>
                <h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{{ inlineStatusTitle }}</h2>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  {{ inlineStatusMessage }}
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900/60">
              <div class="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
                <span>ID do pedido</span>
                <code class="rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">{{ createdOrderId }}</code>
              </div>
              <div class="mt-4 grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
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
                  <span>{{ formatCurrency(inlinePayment?.totalCents ?? ticketPriceCents * (inlinePayment?.participantCount ?? people.length)) }}</span>
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
            </div>
          </div>

          <div class="flex-1 space-y-6">
            <section v-if="inlineIsPixMethod" class="space-y-3">
              <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Pague com Pix</h2>
                <button
                  type="button"
                  class="text-sm text-primary-600 hover:text-primary-500 disabled:text-neutral-400"
                  :disabled="!inlinePayment?.pixQrData"
                  @click="copyInlinePixCode"
                >
                  Copiar código
                </button>
              </header>

              <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/80">
                <img
                  v-if="inlinePayment?.pixQrData?.qr_code_base64"
                  :src="`data:image/png;base64,${inlinePayment.pixQrData.qr_code_base64}`"
                  alt="QR Code Pix"
                  class="h-48 w-48 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700"
                />
                <div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-neutral-500">
                  <svg class="h-6 w-6 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  <span class="text-sm">Gerando QR Code do Pix...</span>
                </div>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  Escaneie com o aplicativo do seu banco ou cole o código Pix abaixo.
                </p>
                <textarea
                  v-if="inlinePayment?.pixQrData?.qr_code"
                  class="w-full rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  rows="3"
                  readonly
                  :value="inlinePayment.pixQrData.qr_code"
                />
                <p v-else class="text-sm text-neutral-400">
                  O QR Code será exibido assim que a preferência de pagamento for criada.
                </p>
              </div>
            </section>

            <section v-if="!inlineIsPixMethod && !inlineIsManual" class="space-y-3">
              <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">Checkout Mercado Pago</h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Prefere cartão? Abra o checkout seguro do Mercado Pago em uma nova aba.
              </p>
              <button
                v-if="inlinePayment?.initPoint"
                type="button"
                @click="handleInlineOpenCheckout"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                Abrir checkout
              </button>
              <p v-if="inlinePayment?.status !== 'PAID'" class="text-xs text-neutral-400">
                Assim que o pagamento for aprovado, o status muda automaticamente. Se já pagou, aguarde alguns segundos.
              </p>
            </section>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseCard v-else>
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
</template>
<script setup lang="ts">
    import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
  import { useRouter } from "vue-router";

  import DateField from "../../components/forms/DateField.vue";
  import ResponsibleCpfForm from "../../components/forms/ResponsibleCpfForm.vue";
  import BaseCard from "../../components/ui/BaseCard.vue";
  import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
  import StepWizard from "../../components/ui/StepWizard.vue";
  import IconArrowRight from "../../components/ui/IconArrowRight.vue";
import { useCatalogStore } from "../../stores/catalog";
import { useEventStore } from "../../stores/event";
import { useApi } from "../../composables/useApi";
import { API_BASE_URL } from "../../config/api";
import type { Church, EventLot, RegistrationProfile } from "../../types/api";
import { formatCurrency, formatDate } from "../../utils/format";
import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { REGISTRATION_STORAGE_KEY } from "../../config/storageKeys";
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
  };

  const props = defineProps<{ slug: string }>();
  const router = useRouter();
  const eventStore = useEventStore();
  const catalog = useCatalogStore();
  const { api } = useApi();
  const auth = useAuthStore();

  const isFreeEvent = computed(() => Boolean(eventStore.event?.isFree));
const ticketPriceCents = computed(
  () => (isFreeEvent.value ? 0 : eventStore.event?.currentPriceCents ?? eventStore.event?.priceCents ?? 0)
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
          photoUrl: person.photoUrl || null
        }))
      );
      resetParticipantCpfState(people.length);
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
  const submitting = ref(false);
  const checkingCpf = ref(false);
  const errorMessage = ref("");
  const inscricaoFormRef = ref<{ focusCpf: () => void } | null>(null);
  type CpfCheckResult = { existsInEvent: boolean; profile: RegistrationProfile | null };
  const cpfAvailabilityCache = new Map<string, CpfCheckResult>();

  const DUPLICATE_ERROR = "CPF duplicado entre os participantes";
  const REGISTERED_ERROR = "CPF já possui inscricão confirmada para este evento";
  const DUPLICATE_GLOBAL_ERROR =
    "Existem CPFs duplicados entre os participantes. Ajuste antes de prosseguir.";
  const REGISTERED_GLOBAL_ERROR =
    "Um ou mais CPFs já possuem inscricão confirmada neste evento.";
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
      { title: "CPF", description: "Informe o CPF do responsável" },
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
    // Filtrar m�f©todos exclusivos de admin se n�f£o for admin
    const isAdmin = auth.user?.role === "AdminGeral" || auth.user?.role === "AdminDistrital";
    return PAYMENT_METHODS.filter((option) => {
      if (!allowed.includes(option.value)) return false;
      // Se for m�f©todo exclusivo de admin e usu�f¡rio n�f£o for admin, n�f£o mostrar
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

  const formatBirthDateLabel = (birthDate?: string | null): string => {
    if (!birthDate) return "--";
    const match = birthDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("pt-BR");
  };

  const calculateAgeYears = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const parts = birthDate.split("-");
    if (parts.length !== 3) return null;
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  };

  const createEmptyPerson = (): PersonForm => ({
    fullName: "",
    cpf: "",
    birthDate: "",
    gender: "",
    districtId: selectedDistrictId.value || "",
    churchId: selectedChurchId.value || "",
    photoUrl: null
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

    const hasMissing = people.some(
      (person) =>
        !person.fullName.trim() ||
        !person.birthDate ||
        !person.gender ||
        !person.districtId ||
        !person.churchId
    );
    if (hasMissing) {
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

      const hasMissing = people.some(
        (person) =>
          !person.fullName.trim() ||
          !person.birthDate ||
          !person.gender ||
          !person.districtId ||
          !person.churchId
      );
      if (hasMissing) {
        errorMessage.value = "Preencha todos os dados obrigatórios dos participantes.";
        currentStep.value = 2;
        return;
      }
    } catch (error: any) {
      if (error?.response?.data?.message?.includes("CPF já registrado")) {
        errorMessage.value = "CPF já possui inscrição confirmada para este evento";
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
        photoUrl: person.photoUrl
      }));
      const response = await eventStore.createBatchOrder(
        normalizeCPF(buyerCpf.value),
        selectedPaymentMethod.value,
        payload
      );
      disableStatePersistence();
      // Se for m�f©todo gratuito, n�f£o redirecionar para p�f¡gina de pagamento
      if (isFreePaymentSelected.value && response.payment?.isFree) {
        // Redirecionar para p�f¡gina de evento com mensagem de sucesso
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
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Erro ao criar inscrições.";
      errorMessage.value = message;
      if (error.response?.status === 409) {
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
        container: "border-primary-200 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10",
        badge: "bg-primary-600"
      };
    }
    if (inlineIsManual.value) {
      return {
        container: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/60",
        badge: "bg-neutral-900"
      };
    }
    if (inlinePayment.value?.status === "CANCELED") {
      return {
        container: "border-black/60 bg-black text-white dark:border-white/20 dark:bg-black",
        badge: "bg-black"
      };
    }
    return {
      container: "border-primary-100 bg-white dark:border-primary-900/40 dark:bg-neutral-950/60",
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
</style>


