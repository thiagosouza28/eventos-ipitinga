<template>
  <div class="rounded border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Formulário de inscrição</p>
        <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Campos do formulário</h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Organize, edite e adicione campos. Campos do sistema são obrigatórios e não podem ser removidos.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
        @click="addField"
      >
        + Adicionar campo
      </button>
    </div>

    <div class="mt-4 space-y-3">
      <div
        v-for="(field, index) in modelValue.campos"
        :key="index"
        class="rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-950"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs text-neutral-400">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">≡</span>
            <span>Arraste para reordenar</span>
          </div>
          <button
            type="button"
            class="text-xs font-semibold text-red-600 transition hover:text-red-500 disabled:opacity-50"
            :disabled="isLocked(field)"
            @click="removeField(index)"
          >
            Remover
          </button>
        </div>

        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label class="block text-xs font-semibold text-neutral-500">ID do campo</label>
            <input
              :value="field.id"
              type="text"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              :disabled="isLocked(field)"
              @input="updateField(index, { id: ($event.target as HTMLInputElement).value })"
            />
            <p v-if="idErrors[index]" class="mt-1 text-[11px] text-red-500">{{ idErrors[index] }}</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500">Label</label>
            <input
              :value="field.label"
              type="text"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              @input="updateField(index, { label: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500">Tipo</label>
            <select
              :value="field.tipo"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              :disabled="isLocked(field)"
              @change="updateField(index, { tipo: ($event.target as HTMLSelectElement).value as any })"
            >
              <option v-for="type in fieldTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500">Obrigatório</label>
            <div class="mt-1 flex items-center gap-2">
              <input
                :checked="Boolean(field.obrigatorio)"
                type="checkbox"
                class="h-4 w-4"
                :disabled="isLocked(field)"
                @change="updateField(index, { obrigatorio: ($event.target as HTMLInputElement).checked })"
              />
              <span class="text-xs text-neutral-500">Sim</span>
            </div>
          </div>
          <div class="md:col-span-2" v-if="supportsPlaceholder(field)">
            <label class="block text-xs font-semibold text-neutral-500">Placeholder</label>
            <input
              :value="field.placeholder ?? ''"
              type="text"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              @input="updateField(index, { placeholder: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div v-if="field.tipo === 'number'">
            <label class="block text-xs font-semibold text-neutral-500">Mínimo</label>
            <input
              :value="field.min ?? ''"
              type="number"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              @input="updateField(index, { min: toNumber(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div v-if="field.tipo === 'number'">
            <label class="block text-xs font-semibold text-neutral-500">Máximo</label>
            <input
              :value="field.max ?? ''"
              type="number"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              @input="updateField(index, { max: toNumber(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="md:col-span-2" v-if="field.tipo === 'select'">
            <label class="block text-xs font-semibold text-neutral-500">Opções (uma por linha)</label>
            <textarea
              :value="getOptionsDraft(field, index)"
              rows="3"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              :disabled="isLocked(field)"
              @input="handleOptionsInput(field, index, ($event.target as HTMLTextAreaElement).value)"
              @blur="clearOptionsDraft(field, index)"
            ></textarea>
            <p v-if="isLocked(field)" class="mt-1 text-[11px] text-neutral-400">
              Opções gerenciadas pelo sistema.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 rounded border border-dashed border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950">
      <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Preview</p>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div v-for="field in modelValue.campos" :key="`preview-${field.id}`" :class="fieldWideClass(field)">
          <template v-if="field.tipo === 'checkbox'">
            <label class="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <input type="checkbox" disabled class="h-4 w-4" />
              <span>
                {{ field.label }}
                <span v-if="field.obrigatorio" class="text-red-500">*</span>
              </span>
            </label>
          </template>
          <template v-else>
            <label class="block text-xs font-semibold text-neutral-500">
              {{ field.label }}
              <span v-if="field.obrigatorio" class="text-red-500">*</span>
            </label>
            <select
              v-if="field.tipo === 'select'"
              disabled
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option>Selecione</option>
              <option v-for="option in field.opcoes ?? []" :key="option">{{ option }}</option>
            </select>
            <textarea
              v-else-if="field.tipo === 'textarea'"
              disabled
              rows="2"
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
            ></textarea>
            <input
              v-else
              :type="field.tipo === 'number' ? 'number' : field.tipo === 'email' ? 'email' : 'text'"
              disabled
              class="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900"
              :placeholder="field.placeholder"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import type { EventFormConfig, EventFormField } from "../../types/api";
import { FORM_FIELD_TYPES, SYSTEM_FIELD_IDS } from "../../utils/formConfig";

const props = defineProps<{ modelValue: EventFormConfig }>();
const emit = defineEmits<{ (e: "update:modelValue", value: EventFormConfig): void }>();

const fieldTypes = FORM_FIELD_TYPES;
const dragIndex = ref<number | null>(null);
const optionsDrafts = reactive<Record<string, string>>({});

const cloneConfig = (config: EventFormConfig): EventFormConfig => ({
  campos: config.campos.map((field) => ({
    ...field,
    opcoes: field.opcoes ? [...field.opcoes] : undefined
  }))
});

const isLocked = (field: EventFormField) => SYSTEM_FIELD_IDS.has(field.id);

const updateConfig = (updater: (config: EventFormConfig) => void) => {
  const next = cloneConfig(props.modelValue);
  updater(next);
  emit("update:modelValue", next);
};

const generateFieldId = (config: EventFormConfig) => {
  let index = config.campos.length + 1;
  let candidate = `campo_${index}`;
  const existing = new Set(config.campos.map((field) => field.id));
  while (existing.has(candidate)) {
    index += 1;
    candidate = `campo_${index}`;
  }
  return candidate;
};

const addField = () => {
  updateConfig((config) => {
    config.campos.push({
      id: generateFieldId(config),
      label: "Novo campo",
      tipo: "text",
      obrigatorio: false,
      placeholder: ""
    });
  });
};

const removeField = (index: number) => {
  updateConfig((config) => {
    const removed = config.campos[index];
    config.campos.splice(index, 1);
    if (removed) {
      const key = draftKey(removed, index);
      delete optionsDrafts[key];
    }
  });
};

const updateField = (index: number, patch: Partial<EventFormField>) => {
  const current = props.modelValue.campos[index];
  const currentKey = current ? draftKey(current, index) : "";
  updateConfig((config) => {
    const current = config.campos[index];
    if (!current) return;
    const next = { ...current, ...patch };
    if (next.tipo !== "select") {
      next.opcoes = undefined;
    }
    if (next.tipo !== "number") {
      next.min = undefined;
      next.max = undefined;
    }
    config.campos.splice(index, 1, next);
  });
  if (patch.tipo && patch.tipo !== "select" && currentKey) {
    delete optionsDrafts[currentKey];
  }
};

const updateOptions = (index: number, raw: string) => {
  const options = raw
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
  updateField(index, { opcoes: options });
};

const toNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const optionsAsText = (field: EventFormField) => (field.opcoes ?? []).join("\n");

const draftKey = (field: EventFormField, index: number) =>
  field.id ? `id:${field.id}` : `index:${index}`;

const getOptionsDraft = (field: EventFormField, index: number) => {
  const key = draftKey(field, index);
  return optionsDrafts[key] ?? optionsAsText(field);
};

const handleOptionsInput = (field: EventFormField, index: number, raw: string) => {
  const key = draftKey(field, index);
  optionsDrafts[key] = raw;
  updateOptions(index, raw);
};

const clearOptionsDraft = (field: EventFormField, index: number) => {
  const key = draftKey(field, index);
  optionsDrafts[key] = optionsAsText(field);
};

const supportsPlaceholder = (field: EventFormField) =>
  ["text", "email", "number", "textarea"].includes(field.tipo);

const fieldWideClass = (field: EventFormField) =>
  field.tipo === "textarea" || field.tipo === "checkbox" ? "md:col-span-2" : "";

const idErrors = computed(() => {
  const counts = new Map<string, number>();
  props.modelValue.campos.forEach((field) => {
    counts.set(field.id, (counts.get(field.id) ?? 0) + 1);
  });
  return props.modelValue.campos.map((field) => {
    if (!field.id.trim()) return "ID obrigatório.";
    if (!/^[a-zA-Z0-9_-]+$/.test(field.id)) return "Use apenas letras, números, hífen ou underline.";
    if ((counts.get(field.id) ?? 0) > 1) return "ID duplicado.";
    return "";
  });
});

const onDragStart = (index: number) => {
  dragIndex.value = index;
};

const onDrop = (index: number) => {
  if (dragIndex.value === null || dragIndex.value === index) return;
  updateConfig((config) => {
    const [moved] = config.campos.splice(dragIndex.value as number, 1);
    config.campos.splice(index, 0, moved);
  });
  dragIndex.value = null;
};
</script>
