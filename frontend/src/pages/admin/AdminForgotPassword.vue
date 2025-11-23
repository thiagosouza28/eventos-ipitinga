<template>
  <div class="mx-auto max-w-md">
    <BaseCard>
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Recuperar senha
          </h1>
          <p class="text-sm text-neutral-500">
            Informe seu CPF ou e-mail cadastrado e enviaremos uma senha temporária para o seu e-mail.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
            CPF ou e-mail
          </label>
          <input
            v-model="identifier"
            type="text"
            required
            :disabled="loading"
            class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
            placeholder="000.000.000-00 ou email@dominio.com"
          />
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            v-if="loading"
            class="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ loading ? "Enviando..." : "Enviar senha temporária" }}</span>
        </button>
        <RouterLink
          class="block text-center text-sm text-primary-600 transition hover:text-primary-500"
          :to="{ name: 'admin-login' }"
        >
          Voltar para o login
        </RouterLink>
        <p v-if="successMessage" class="text-sm text-green-500">{{ successMessage }}</p>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const identifier = ref("");
const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const handleSubmit = async () => {
  try {
    errorMessage.value = "";
    successMessage.value = "";
    loading.value = true;
    await auth.requestPasswordReset(identifier.value);
    successMessage.value =
      "Se o usuário existir receberá um e-mail com a nova senha temporária. Verifique sua caixa de entrada e spam.";
    identifier.value = "";
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.message ??
      "Não foi possível enviar a senha temporária. Tente novamente em instantes.";
  } finally {
    loading.value = false;
  }
};
</script>

