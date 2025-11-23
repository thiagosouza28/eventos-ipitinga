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
          <div>
            <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Senha
            </label>
            <div class="relative mt-1">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                :disabled="loading"
                class="w-full rounded-lg border border-neutral-300 px-4 py-2 pr-10 dark:border-neutral-700 dark:bg-neutral-800 disabled:opacity-50"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                tabindex="-1"
              >
                <IconEye v-if="!showPassword" class="h-5 w-5" />
                <IconEyeSlash v-else class="h-5 w-5" />
              </button>
            </div>
          </div>
          <div class="flex items-center">
            <input
              id="remember-me"
              v-model="rememberMe"
              type="checkbox"
              :disabled="loading"
              class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
            />
            <label for="remember-me" class="ml-2 block text-sm text-neutral-600 dark:text-neutral-300">
              Salvar Senha / Lembrar-me
            </label>
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
          <span>{{ loading ? "Entrando..." : "Entrar" }}</span>
        </button>
        <div class="flex flex-col items-center gap-2 text-sm text-neutral-500">
          <RouterLink
            class="text-primary-600 transition hover:text-primary-500"
            :to="{ name: 'admin-forgot-password' }"
          >
            Esqueci minha senha
          </RouterLink>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
      </form>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
import IconEye from "../../components/ui/IconEye.vue";
import IconEyeSlash from "../../components/ui/IconEyeSlash.vue";
import { useAuthStore } from "../../stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const identifier = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const errorMessage = ref("");

const REMEMBER_ME_KEY = "catre-remember-me";

// Carregar credenciais salvas se "Lembrar-me" estava marcado
onMounted(() => {
  const remembered = localStorage.getItem(REMEMBER_ME_KEY);
  if (remembered) {
    try {
      const data = JSON.parse(remembered);
      identifier.value = data.identifier || data.email || "";
      password.value = data.password || "";
      rememberMe.value = true;
    } catch (e) {
      // Ignorar erro ao parsear
    }
  }
  
  if (auth.isAuthenticated) {
    redirectAuthenticated();
  }
});

const redirectAuthenticated = () => {
  if (auth.user?.mustChangePassword) {
    router.replace({ name: "admin-force-password" });
    return;
  }
  router.replace((route.query.redirect as string) ?? "/admin/dashboard");
};

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
    loading.value = true;
    
    await auth.signIn(identifier.value, password.value);
    
    // Salvar credenciais se "Lembrar-me" estiver marcado
    if (rememberMe.value) {
      localStorage.setItem(
        REMEMBER_ME_KEY,
        JSON.stringify({ identifier: identifier.value, password: password.value })
      );
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
    
    redirectAuthenticated();
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.message ?? "Não foi possível entrar. Verifique suas credenciais.";
  } finally {
    loading.value = false;
  }
};
</script>
