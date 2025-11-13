<template>
  <div class="relative w-full">
    <input
      ref="textInput"
      v-maska="'##/##/####'"
      v-bind="forwardedAttrs"
      :class="mergedInputClass"
      v-model="displayValue"
      type="text"
      inputmode="numeric"
      pattern="[0-9/]*"
      :placeholder="placeholder"
      :name="name"
      :id="id"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      @focus="handleFocus"
      @blur="(event) => emit('blur', event)"
      @keydown.enter.prevent="emit('enter')"
    />

    <button
      type="button"
      class="absolute inset-y-0 right-2 flex items-center rounded-full p-1 text-neutral-400 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-40"
      :disabled="disabled"
      aria-label="Abrir calendário"
      @click.prevent="openPicker"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5">
        <path
          fill="currentColor"
          d="M7 2a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1ZM5 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"
        />
      </svg>
    </button>

    <input
      ref="nativeInput"
      type="date"
      class="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      tabindex="-1"
      aria-hidden="true"
      :min="min"
      :max="max"
      :value="isoValue"
      @input="handleNativeInput"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useAttrs, watch } from "vue";

defineOptions({ inheritAttrs: false });

const baseInputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-primary-400 dark:focus:ring-primary-500/40";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    name?: string;
    id?: string;
    placeholder?: string;
    inputClass?: string;
    disabled?: boolean;
    required?: boolean;
    min?: string;
    max?: string;
    autocomplete?: string;
  }>(),
  {
    placeholder: "DD/MM/AAAA",
    inputClass: baseInputClass,
    autocomplete: "bday"
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "focus", value: FocusEvent): void;
  (event: "blur", value: FocusEvent): void;
  (event: "enter"): void;
}>();

const attrs = useAttrs();

const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

const resolveClassValue = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(resolveClassValue).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key)
      .join(" ");
  }
  return "";
};

const mergedInputClass = computed(() => {
  const extra = resolveClassValue(attrs.class);
  return [props.inputClass, extra].filter(Boolean).join(" ");
});

const nativeInput = ref<HTMLInputElement | null>(null);
const isCoarsePointer = ref(false);
const displayValue = ref(formatDisplayValue(props.modelValue));

let suppressWatch = false;

const isoValue = computed(() => props.modelValue ?? "");

const setDisplayValue = (value: string) => {
  suppressWatch = true;
  displayValue.value = value;
  void nextTick(() => {
    suppressWatch = false;
  });
};

watch(
  () => props.modelValue,
  (value) => {
    const formatted = formatDisplayValue(value);
    if (formatted !== displayValue.value) {
      setDisplayValue(formatted);
    }
    updateNativeValue(value ?? "");
  }
);

watch(displayValue, (value) => {
  if (suppressWatch) return;

  const digits = value.replace(/\D/g, "");
  if (!digits.length) {
    emit("update:modelValue", "");
    updateNativeValue("");
    return;
  }

  if (digits.length === 8) {
    const iso = parseDigitsToIso(digits);
    if (iso) {
      emit("update:modelValue", iso);
      updateNativeValue(iso);
    }
  }
});

const updateNativeValue = (value: string) => {
  if (nativeInput.value && nativeInput.value.value !== value) {
    nativeInput.value.value = value;
  }
};

const handleNativeInput = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;
  const selected = input.value;
  emit("update:modelValue", selected);
  setDisplayValue(formatDisplayValue(selected));
};

const openPicker = () => {
  if (!nativeInput.value || props.disabled) return;
  if (typeof nativeInput.value.showPicker === "function") {
    try {
      nativeInput.value.showPicker();
      return;
    } catch {
      // ignore, fallback below
    }
  }
  nativeInput.value.click();
};

const handleFocus = (event: FocusEvent) => {
  emit("focus", event);
  if (isCoarsePointer.value) {
    openPicker();
  }
};

onMounted(() => {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const media = window.matchMedia("(pointer: coarse)");
    isCoarsePointer.value = media.matches;
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", (evt) => {
        isCoarsePointer.value = evt.matches;
      });
    }
  }
});

function formatDisplayValue(value?: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function parseDigitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);
  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!yearNum || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (
    testDate.getFullYear() !== yearNum ||
    testDate.getMonth() !== monthNum - 1 ||
    testDate.getDate() !== dayNum
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}
</script>
