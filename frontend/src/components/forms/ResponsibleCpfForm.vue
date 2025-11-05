<template>
  <form @submit.prevent="onSubmit" class="space-y-4">
    <div class="flex flex-col gap-2">
      <label for="responsibleCpf" class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        CPF do Responsável
      </label>
      <div class="relative">
        <input
          ref="inputRef"
          type="text"
          id="responsibleCpf"
          :value="cpfValue"
          @input="updateValue"
          class="block w-full rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          :class="{ 'border-red-500': error }"
          :disabled="loading"
          placeholder="000.000.000-00"
        />
        <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-b-primary-500"></div>
        </div>
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </div>

    <button
      type="submit"
      class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="loading || !isValid"
    >
      Verificar CPF
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { formatCPF, validateCPF, normalizeCPF } from "@/utils/cpf";
import type { RegistrationProfile } from "@/types/api";

const props = defineProps<{
  modelValue: RegistrationProfile | null;
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: RegistrationProfile | null): void;
  (e: "update:cpf", value: string): void;
  (e: "submit", value: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const cpfValue = ref("");
const error = computed(() => props.error ?? null);
const isValid = computed(() => {
  const digits = normalizeCPF(cpfValue.value);
  return digits.length === 11 && validateCPF(digits);
});

const updateValue = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value.replace(/\D/g, "");
  const formattedValue = formatCPF(rawValue);
  cpfValue.value = formattedValue;
  emit("update:cpf", formattedValue);
};

const onSubmit = (event?: Event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Validação rigorosa antes de emitir
  const digits = normalizeCPF(cpfValue.value);
  
  if (!digits || typeof digits !== "string" || digits.length !== 11 || !validateCPF(digits)) {
    // Não faz nada se não for válido - o botão já está desabilitado
    return;
  }
  
  // Garante que está emitindo uma string válida com exatamente 11 dígitos
  emit("submit", digits);
};

const focusCpf = () => {
  inputRef.value?.focus();
};

defineExpose({ focusCpf });
</script>
