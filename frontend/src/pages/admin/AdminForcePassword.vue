<template>
  <div class="mx-auto max-w-md">
    <BaseCard>
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.35em] text-primary-500">Segurança</p>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Defina uma nova senha
          </h1>
          <p class="text-sm text-neutral-500">
            Você acessou com uma senha temporária. Crie uma nova senha para continuar usando o sistema.
          </p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Senha temporária
            </label>
            <input
              v-model="currentPassword"
              type="password"
              required
              :disabled="loading"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
              placeholder="Digite a senha recebida por e-mail"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Nova senha
            </label>
            <input
              v-model="newPassword"
              type="password"
              minlength="8"
              required
              :disabled="loading"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Confirmar nova senha
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              minlength="8"
              required
              :disabled="loading"
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
            />
          </div>
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
          <span>{{ loading ? "Atualizando..." : "Atualizar senha" }}</span>
        </button>
        <p v-if="successMessage" class="text-sm text-green-500">{{ successMessage }}</p>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(() => {
  if (!auth.isAuthenticated) {
    router.replace({ name: "admin-login", query: { redirect: route.fullPath } });
  } else if (!auth.user?.mustChangePassword) {
    router.replace((route.query.redirect as string) ?? "/admin/dashboard");
  }
});

const handleSubmit = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "A confirmação da senha não confere.";
    return;
  }

  try {
    errorMessage.value = "";
    successMessage.value = "";
    loading.value = true;
    await auth.changePassword(currentPassword.value, newPassword.value);
    successMessage.value = "Senha atualizada com sucesso! Você será redirecionado.";
    setTimeout(() => {
      router.replace((route.query.redirect as string) ?? "/admin/dashboard");
    }, 1500);
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.message ??
      "Não foi possível atualizar a senha. Verifique os dados informados.";
  } finally {
    loading.value = false;
  }
};
</script>

