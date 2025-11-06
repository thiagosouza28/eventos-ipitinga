<template>
  <div v-if="eventStore.loading">
    <LoadingSpinner />
  </div>
  <div v-else-if="!eventStore.event">
    <BaseCard>
      <p class="text-neutral-500">Evento nao encontrado.</p>
    </BaseCard>
  </div>
  <div v-else class="space-y-6">
    <BaseCard>
      <div class="space-y-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
              {{ eventStore.event.title }}
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400">
              {{ eventStore.event.description }}
            </p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-sm text-neutral-500">
              {{ isFreeEvent ? "Evento gratuito" : "Valor por inscricao" }}
            </p>
            <p class="text-xl font-semibold text-primary-600 dark:text-primary-400">
              {{ priceLabel }}
            </p>
            <p
              v-if="currentLotName"
              class="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
            >
              Lote vigente: {{ currentLotName }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <span>Local: {{ eventStore.event.location }}</span>
          <span>|</span>
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
          v-if="pendingOrders.length > 0"
          class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <p class="font-semibold">{{ pendingOrders.length }} pagamento(s) pendente(s) encontrado(s).</p>
          <p>VocÃª pode ver e pagar as pendÃªncias existentes ou seguir com uma nova inscriÃ§Ã£o.</p>
          <div class="mt-3 space-y-2">
            <div
              v-for="order in pendingOrders"
              :key="order.orderId"
              class="rounded-md bg-amber-100/50 p-2 dark:bg-amber-500/5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                  <p class="font-medium">{{ formatCurrency(order.totalCents) }}</p>
                  <p class="text-xs">
                    {{ order.registrations.length }} participante(s):
                    {{ order.registrations.map(r => r.fullName).join(", ") }}
                  </p>
                </div>
                <RouterLink
                  :to="{ name: 'payment', params: { slug: props.slug, orderId: order.orderId } }"
                  class="shrink-0 rounded-md border border-amber-500 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-200"
                >
                  Pagar
                </RouterLink>
              </div>
            </div>
            <RouterLink
              :to="{ name: 'pending-orders', params: { cpf: buyerCpf } }"
              class="inline-flex items-center text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
            >
              Ver todas as pendÃªncias
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
            <input
              v-model.number="quantity"
              type="number"
              min="1"
              max="10"
              class="mt-1 w-32 rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg font-semibold dark:border-neutral-700 dark:bg-neutral-800"
              :aria-invalid="generalErrors.quantity ? 'true' : 'false'"
              aria-describedby="quantity-error"
              required
            />
            <p
              v-if="generalErrors.quantity"
              id="quantity-error"
              role="alert"
              class="mt-2 text-sm text-red-600 dark:text-red-400"
            >
              {{ generalErrors.quantity }}
            </p>
          </div>
          <div class="flex justify-between">
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="currentStep--"
            >
              Voltar
            </button>
            <button
              type="submit"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            >
              Avancar
            </button>
          </div>
        </form>
      </BaseCard>

      <div v-if="currentStep === 2" class="space-y-6">
        <BaseCard>
          <div class="grid gap-2 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">CPF responsavel:</span>
              {{ buyerCpf }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Distrito:</span>
              {{ selectedDistrict?.name ?? "Nao selecionado" }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Igreja:</span>
              {{ selectedChurch?.name ?? "Nao selecionada" }}
            </p>
            <p>
              <span class="font-semibold text-neutral-700 dark:text-neutral-100">Participantes:</span>
              {{ people.length }}
            </p>
          </div>
        </BaseCard>

        <BaseCard v-for="(person, index) in people" :key="index">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Participante {{ index + 1 }}
            </h2>
            <span class="text-sm text-neutral-400">Preencha todos os campos obrigatorios</span>
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
              <div class="mt-1 flex items-center gap-3">
                <input
                  v-model="person.birthDate"
                  type="date"
                  required
                  :disabled="isPersonLocked(index)"
                  class="w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-60"
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

        <div class="flex justify-between">
          <button
            type="button"
            class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
            @click="currentStep--"
          >
            Voltar
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
            @click="goToReview"
          >
            Revisar inscricoes
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </div>

      <BaseCard v-if="currentStep === 3">
        <div class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              Revisao dos dados
            </h2>
            <p class="text-sm text-neutral-500">
              {{
                isFreeEvent
                  ? "Confira as informacoes antes de confirmar as inscricoes."
                  : "Confira as informacoes antes de prosseguir com o pagamento."
              }}
            </p>
          </div>
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            <p>CPF responsavel: {{ buyerCpf }}</p>
            <p>Distrito: {{ selectedDistrict?.name ?? "Nao selecionado" }}</p>
            <p>Igreja: {{ selectedChurch?.name ?? "Nao selecionada" }}</p>
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
              class="text-xs text-amber-600 dark:text-amber-300"
            >
              Pagamentos manuais serao confirmados pela tesouraria. Guarde o comprovante para quitar a pendencia.
            </p>
            <p
              v-if="isFreePaymentSelected"
              class="text-xs text-green-600 dark:text-green-300"
            >
              âœ“ Esta inscriÃ§Ã£o serÃ¡ marcada como paga automaticamente, sem gerar cobranÃ§a.
            </p>
          </div>
          <div class="grid gap-4">
            <div
              v-for="(person, index) in people"
              :key="index"
              class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60"
            >
              <div class="flex items-start justify-between gap-3">
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
                  Nascimento: {{ formatDate(person.birthDate) }}
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
          <div class="flex flex-col gap-2 text-right">
            <p v-if="!isFreeEvent" class="text-sm text-neutral-500">
              Forma de pagamento: {{ selectedPaymentLabel }}
            </p>
            <p class="text-sm text-neutral-500">Total</p>
            <p class="text-2xl font-semibold text-primary-600 dark:text-primary-400">
              {{ isFreeEvent ? "Gratuito" : formatCurrency(ticketPriceCents * people.length) }}
            </p>
          </div>
          <div class="flex justify-between">
            <button
              type="button"
              class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
              @click="currentStep--"
            >
              Voltar
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
              :disabled="submitting"
              @click="submitBatch"
            >
              <span v-if="submitting" class="flex items-center gap-2">
                <span
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
                ></span>
                Processando...
              </span>
              <span v-else>{{ isFreeEvent ? "Confirmar inscricoes" : "Gerar pagamento" }}</span>
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
              <div class="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
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
                  <span>{{ formatCurrency(ticketPriceCents * (inlinePayment?.participantCount ?? people.length)) }}</span>
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
            <section class="space-y-3">
              <header class="flex items-center justify-between">
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

            <section v-if="!inlineIsPixMethod" class="space-y-3">
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
        As inscricoes ainda nao estao abertas. Aguarde o inicio do proximo lote.
      </p>
    </BaseCard>
  </div>
</template>
<script setup lang="ts">
  import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
  import { useRouter } from "vue-router";

  import ResponsibleCpfForm from "../../components/forms/ResponsibleCpfForm.vue";
  import BaseCard from "../../components/ui/BaseCard.vue";
  import LoadingSpinner from "../../components/ui/LoadingSpinner.vue";
  import StepWizard from "../../components/ui/StepWizard.vue";
  import IconArrowRight from "../../components/ui/IconArrowRight.vue";
  import { useCatalogStore } from "../../stores/catalog";
  import { useEventStore } from "../../stores/event";
  import { useApi } from "../../composables/useApi";
  import type { Church, RegistrationProfile } from "../../types/api";
  import { formatCurrency, formatDate } from "../../utils/format";
  import { DEFAULT_PHOTO_DATA_URL } from "../../config/defaultPhoto";
import { paymentMethodLabel, PAYMENT_METHODS, MANUAL_PAYMENT_METHODS, ADMIN_ONLY_PAYMENT_METHODS, FREE_PAYMENT_METHODS } from "../../config/paymentMethods";
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
  const priceLabel = computed(() =>
    isFreeEvent.value ? "Gratuito" : formatCurrency(ticketPriceCents.value)
  );
  const currentLotName = computed(() =>
    isFreeEvent.value ? null : eventStore.event?.currentLot?.name ?? null
  );
  const registrationOpen = computed(() => {
    if (!eventStore.event) return false;
    if (isFreeEvent.value) return true;
    return Boolean(eventStore.event.currentLot);
  });

  const currentStep = ref(0);
  const buyerCpf = ref("");
  const responsibleProfile = ref<RegistrationProfile | null>(null);
  const quantity = ref(1);
  const pendingOrders = ref<PendingOrder[]>([]);
  const selectedDistrictId = ref("");
  const selectedChurchId = ref("");
  const selectedPaymentMethod = ref<PaymentMethod>("PIX_MP");
  const pendingOrder = ref<PendingOrder | null>(null);
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
  const REGISTERED_ERROR = "CPF ja possui inscricao confirmada para este evento";
  const DUPLICATE_GLOBAL_ERROR =
    "Existem CPFs duplicados entre os participantes. Ajuste antes de prosseguir.";
  const REGISTERED_GLOBAL_ERROR =
    "Um ou mais CPFs ja possuem inscricao confirmada neste evento.";
  const REMOTE_ERROR_MESSAGE = "Nao foi possivel verificar CPF agora. Tente novamente.";
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
      { title: "CPF", description: "Verifique pedidos pendentes" },
      { title: "Unidade", description: "Escolha distrito e igreja" },
      { title: "Participantes", description: "Dados individuais" },
      { title: "Revisao", description: isFreeEvent.value ? "Revise os dados e confirme" : "Revise os dados" }
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
    // Filtrar mÃ©todos exclusivos de admin se nÃ£o for admin
    const isAdmin = auth.user?.role === "AdminGeral" || auth.user?.role === "AdminDistrital";
    return PAYMENT_METHODS.filter((option) => {
      if (!allowed.includes(option.value)) return false;
      // Se for mÃ©todo exclusivo de admin e usuÃ¡rio nÃ£o for admin, nÃ£o mostrar
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
    catalog.districts.find((district) => district.id === id)?.name ?? "Nao informado";
  const getChurchName = (id: string) =>
    catalog.churches.find((church) => church.id === id)?.name ?? "Nao informado";
  const getGenderLabel = (value: string) =>
    genderOptions.find((option) => option.value === value)?.label ?? value;

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
    return validateCPF(value) ? "" : "CPF invalido";
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
  });

  watch(currentStep, (step) => {
    if (
      step !== 2 &&
      CPF_GLOBAL_MESSAGES.includes(errorMessage.value)
    ) {
      errorMessage.value = "";
    }
  });

  watch(buyerCpf, () => {
    if (currentStep.value === 0 && errorMessage.value) {
      errorMessage.value = "";
    }
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
      errorMessage.value = "CPF invÃ¡lido";
      checkingCpf.value = false;
      return;
    }

    try {
      const response = await eventStore.checkPendingOrder(cpfDigits);
      pendingOrders.value = response?.pendingOrders ?? [];
      currentStep.value = 1;
    } catch (error: any) {
      errorMessage.value = error.response?.data?.message ?? "NÃ£o foi possÃ­vel verificar.";
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
      errorMessage.value = "Preencha todos os dados obrigatorios dos participantes.";
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
        errorMessage.value = "Preencha todos os dados obrigatorios dos participantes.";
        currentStep.value = 2;
        return;
      }
    } catch (error: any) {
      if (error?.response?.data?.message?.includes("CPF jÃ¡ registrado")) {
        errorMessage.value = "CPF ja possui inscricao confirmada para este evento";
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
      
      // Se for mÃ©todo gratuito, nÃ£o redirecionar para pÃ¡gina de pagamento
      if (isFreePaymentSelected.value && response.payment?.isFree) {
        // Redirecionar para pÃ¡gina de evento com mensagem de sucesso
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
      const message = error.response?.data?.message ?? "Erro ao criar inscricoes.";
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
      return { container: "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10", badge: "bg-green-500" };
    }
    if (inlineIsManual.value) {
      return { container: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10", badge: "bg-amber-500" };
    }
    if (inlinePayment.value?.status === "CANCELED") {
      return { container: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10", badge: "bg-red-500" };
    }
    return { container: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10", badge: "bg-amber-500" };
  });

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

  const stopInlinePolling = () => {
    if (inlinePollHandle.value) { clearInterval(inlinePollHandle.value); inlinePollHandle.value = null; }
  };</script>






















