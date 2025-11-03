<template>
  <div class="mx-auto max-w-md">
    <BaseCard>
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Acesso administrativo
          </h1>
          <p class="text-sm text-neutral-500">
            Informe suas credenciais para acessar o painel.
          </p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              E-mail
            </label>
            <input
              v-model="email"
              type="email"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Senha
            </label>
            <input
              v-model="password"
              type="password"
              required
              class="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <button
          type="submit"
          class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
        >
          Entrar
        </button>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAuthStore } from "../../stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const errorMessage = ref("");

const redirectAuthenticated = () => {
  router.replace((route.query.redirect as string) ?? "/admin/dashboard");
};

onMounted(() => {
  if (auth.isAuthenticated) {
    redirectAuthenticated();
  }
});

watch(
  () => auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      redirectAuthenticated();
    }
  }
);

const handleSubmit = async () => {
  try {
    errorMessage.value = "";
    await auth.signIn(email.value, password.value);
    redirectAuthenticated();
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.message ?? "Nao foi possivel entrar. Verifique suas credenciais.";
  }
};
</script>
