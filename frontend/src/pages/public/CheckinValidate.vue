<template>
  <div class="flex flex-1 flex-col items-center">
    <div class="w-full max-w-xl space-y-6 py-8 lg:py-12">
      <BaseCard class="w-full">
        <div class="space-y-5 text-center">
          <div>
            <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
              Confirmacao de presenca
            </h1>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Validamos o link gerado no comprovante para registrar a sua chegada ao evento.
            </p>
          </div>
          <div v-if="loading" class="py-8 text-sm text-neutral-500 dark:text-neutral-400">
            Validando link de check-in...
          </div>
          <div
            v-else-if="errorMessage"
            class="rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          >
            {{ errorMessage }}
          </div>
          <div v-else-if="result" class="space-y-6">
            <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" :class="statusBadge.class">
              <span>{{ statusBadge.text }}</span>
            </div>
            <div class="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <p class="text-base font-semibold text-neutral-800 dark:text-neutral-50">
                {{ result.registration.fullName }}
              </p>
              <p>
                Evento:
                <span class="font-medium text-neutral-800 dark:text-neutral-100">
                  {{ result.registration.eventTitle }}
                </span>
              </p>
              <p>Local: {{ result.registration.eventLocation }}</p>
              <p>Periodo: {{ result.registration.eventPeriod }}</p>
              <p>
                Igreja/Distrito:
                {{ result.registration.churchName }} - {{ result.registration.districtName }}
              </p>
              <p v-if="result.registration.checkinAt">
                Check-in registrado em: {{ formatCheckin(result.registration.checkinAt) }}
              </p>
            </div>
            <div v-if="result.status === 'READY'" class="space-y-3 text-left">
              <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Informe a senha da equipe
              </label>
              <input
                v-model="password"
                type="password"
                class="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="Senha do check-in"
              />
              <p v-if="confirmError" class="text-sm text-red-500 dark:text-red-300">{{ confirmError }}</p>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:opacity-60"
                :disabled="confirming || !password.trim()"
                @click="confirmPresence"
              >
                {{ confirming ? "Confirmando..." : "Confirmar presenca" }}
              </button>
            </div>
            <button
              v-if="result.status !== 'READY'"
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
              @click="goToHome"
            >
              Ir para pagina inicial
            </button>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="w-full text-sm text-neutral-500 dark:text-neutral-400">
        <p>
          Este link funciona apenas uma vez e deve ser apresentado pela equipe de recepcao. Se houver
          qualquer divergencia, procure imediatamente a equipe de organizacao do evento.
        </p>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useApi } from "../../composables/useApi";

type CheckinStatus = "READY" | "CONFIRMED" | "ALREADY_CONFIRMED";

type CheckinRegistration = {
  id: string;
  fullName: string;
  eventTitle: string;
  eventLocation: string;
  eventPeriod: string;
  districtName: string;
  churchName: string;
  checkinAt: string | null;
};

type CheckinResponse = {
  status: CheckinStatus;
  registration: CheckinRegistration;
};

const route = useRoute();
const router = useRouter();
const { api } = useApi();

const loading = ref(true);
const errorMessage = ref("");
const result = ref<CheckinResponse | null>(null);
const ridParam = ref("");
const sigParam = ref("");
const password = ref("");
const confirming = ref(false);
const confirmError = ref("");

const statusBadge = computed(() => {
  if (!result.value) {
    return { text: "", class: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" };
  }
  if (result.value.status === "CONFIRMED") {
    return {
      text: "Presenca confirmada!",
      class: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-100"
    };
  }
  if (result.value.status === "READY") {
    return {
      text: "Pagamento confirmado. Solicite a senha para registrar presenca.",
      class: "bg-primary-200 text-primary-900 dark:bg-primary-500/30 dark:text-primary-50"
    };
  }
  return {
    text: "Presenca ja havia sido confirmada",
    class: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
  };
});

const formatCheckin = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

const goToHome = () => {
  router.push({ name: "home" });
};

const extractQueryParam = (value: unknown) => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return typeof value === "string" ? value : null;
};

const validateLink = async () => {
  loading.value = true;
  errorMessage.value = "";
  result.value = null;
  const rid = extractQueryParam(route.query.rid);
  const sig = extractQueryParam(route.query.sig);

  if (!rid || !sig) {
    errorMessage.value = "Link de check-in invalido. Escaneie novamente o QR Code do comprovante.";
    loading.value = false;
    return;
  }

  try {
    ridParam.value = rid;
    sigParam.value = sig;
    const response = await api.get<CheckinResponse>("/checkin/validate", {
      params: { rid, sig }
    });
    result.value = response.data;
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message ??
      "Nao foi possivel validar o check-in. Procure a equipe de recepcao.";
  } finally {
    loading.value = false;
  }
};
const confirmPresence = async () => {
  if (!result.value || result.value.status !== "READY") return;
  confirmError.value = "";
  confirming.value = true;
  try {
    const response = await api.post<CheckinResponse>("/checkin/confirm", {
      rid: ridParam.value,
      sig: sigParam.value,
      password: password.value
    });
    result.value = response.data;
    password.value = "";
  } catch (error: any) {
    confirmError.value =
      error?.response?.data?.message ?? "Nao foi possivel confirmar o check-in. Verifique a senha.";
  } finally {
    confirming.value = false;
  }
};

onMounted(async () => {
  await validateLink();
});
</script>
