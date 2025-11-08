<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
        CPF do responsavel pelo pagamento
      </label>
      <input
        ref="cpfInput"
        v-model="cpf"
        type="text"
        placeholder="000.000.000-00"
        inputmode="numeric"
        autocomplete="off"
        class="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-800 focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        :aria-invalid="cpfError ? 'true' : 'false'"
        aria-describedby="cpf-error-message"
        required
        @input="onInput"
        @blur="onBlur"
      />
      <p
        v-if="cpfError"
        id="cpf-error-message"
        role="alert"
        class="mt-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ cpfError }}
      </p>
    </div>
    <div class="flex justify-between">
      <RouterLink
        to="/"
        class="text-sm font-medium text-primary-600 transition hover:text-primary-500 dark:text-primary-200 dark:hover:text-primary-100"
      >
        Voltar
      </RouterLink>
      <button
        type="submit"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="loading"
      >
        <span v-if="loading" class="flex items-center gap-2">
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
          Validando...
        </span>
        <span v-else>Continuar</span>
      </button>
    </div>
    <p v-if="submitError" role="alert" class="text-sm text-red-500">
      {{ submitError }}
    </p>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { formatCPF, normalizeCPF, validateCPF } from "../../utils/cpf";

const props = defineProps<{
  modelValue: string;
  submitError?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "submit", value: string): void;
}>();

const cpf = ref(props.modelValue ?? "");
const cpfError = ref("");
const cpfInput = ref<HTMLInputElement | null>(null);
const loading = computed(() => Boolean(props.loading));

const getCpfError = (value: string) => {
  const digits = normalizeCPF(value);
  if (!digits.length) return "";
  return validateCPF(value) ? "" : "CPF inválido";
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== cpf.value) {
      cpf.value = formatCPF(value);
      cpfError.value = getCpfError(cpf.value);
    }
  }
);

const onInput = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;
  const formatted = formatCPF(input.value);
  cpf.value = formatted;
  emit("update:modelValue", formatted);
  cpfError.value = getCpfError(formatted);
};

const onBlur = () => {
  cpfError.value = getCpfError(cpf.value);
};

const handleSubmit = async () => {
  const digits = normalizeCPF(cpf.value);
  cpfError.value = digits.length === 0 ? "CPF invalido" : getCpfError(cpf.value);

  if (cpfError.value) {
    await nextTick();
    cpfInput.value?.focus();
    return;
  }

  emit("submit", digits);
};

const focusCpf = () => {
  cpfInput.value?.focus();
};

defineExpose({ focusCpf });
</script>
