<template>
  <div class="space-y-6">
    <BaseCard class="bg-gradient-to-br from-white via-primary-50/40 to-primary-100/30 dark:from-neutral-900 dark:via-neutral-900/80 dark:to-primary-950/30">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">Pagamentos</p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">Gateway PIX</h1>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Defina o provedor PIX ativo e suas credenciais. Apenas um provedor fica ativo por vez.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/40 transition hover:translate-y-0.5"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? "Salvando..." : "Salvar configuração" }}
        </button>
      </div>
    </BaseCard>

    <BaseCard class="border border-white/40 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
      <div class="grid gap-5 md:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Provedor ativo</label>
          <select
            v-model="form.provider"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          >
            <option v-for="option in providerOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Implementado: Mercado Pago. Outros estão prontos para receber credenciais (adapters pendentes).
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Webhook público</label>
          <input
            v-model="form.webhookUrl"
            type="url"
            placeholder="https://api.seusite.com/webhooks/pix"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
      </div>

      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Client ID</label>
          <input
            v-model="form.clientId"
            type="text"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Client Secret</label>
          <input
            v-model="form.clientSecret"
            type="text"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
      </div>

      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">API Key / Token</label>
          <input
            v-model="form.apiKey"
            type="text"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Caminho do certificado</label>
          <input
            v-model="form.certificatePath"
            type="text"
            placeholder="/etc/certs/pix.p12"
            class="w-full rounded-2xl border border-neutral-200/80 bg-white/80 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
          />
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-white/80 px-4 py-3 shadow-inner dark:border-white/10 dark:bg-white/5">
        <div>
          <p class="text-sm font-semibold text-neutral-800 dark:text-white">Ativar configuração</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">Ao salvar, outras configurações serão desativadas.</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input v-model="form.active" type="checkbox" class="peer sr-only" />
          <div
            class="h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-primary-500 dark:bg-neutral-700"
          ></div>
          <div
            class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"
          ></div>
        </label>
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-500 dark:text-red-400">{{ error }}</p>
      <p v-if="success" class="mt-2 text-sm text-green-600 dark:text-green-400">{{ success }}</p>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useApi } from "../../composables/useApi";
import type { PixGatewayConfig } from "../../types/api";

const { api } = useApi();

const providerOptions = [
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "openpix", label: "OpenPix / Asaas / Juno" },
  { value: "gerencianet", label: "Gerencianet / Itaú" },
  { value: "sicoob", label: "Sicoob" },
  { value: "itau", label: "Itaú" },
  { value: "bradesco", label: "Bradesco" },
  { value: "santander", label: "Santander" },
  { value: "sicredi", label: "Sicredi" },
  { value: "inter", label: "Banco Inter" },
  { value: "nubank", label: "Nubank" }
];

const form = reactive<Partial<PixGatewayConfig>>({
  provider: "mercadopago",
  clientId: "",
  clientSecret: "",
  apiKey: "",
  webhookUrl: "",
  certificatePath: "",
  active: true
});

const saving = ref(false);
const error = ref("");
const success = ref("");

const loadConfig = async () => {
  try {
    const response = await api.get("/admin/payments/pix-config");
    const data: PixGatewayConfig | null = response.data ?? null;
    if (data) {
      Object.assign(form, {
        id: data.id,
        provider: data.provider,
        clientId: data.clientId ?? "",
        clientSecret: data.clientSecret ?? "",
        apiKey: data.apiKey ?? "",
        webhookUrl: data.webhookUrl ?? "",
        certificatePath: data.certificatePath ?? "",
        active: data.active
      });
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? "Falha ao carregar configuração PIX.";
  }
};

const save = async () => {
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    const payload = { ...form, active: form.active ?? true };
    const response = await api.put("/admin/payments/pix-config", payload);
    const data: PixGatewayConfig = response.data;
    Object.assign(form, data);
    success.value = "Configuração salva com sucesso.";
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? "Não foi possível salvar.";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadConfig();
});
</script>
