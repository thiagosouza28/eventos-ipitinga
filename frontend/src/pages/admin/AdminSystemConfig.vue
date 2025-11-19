<template>
  <div class="space-y-6" data-uppercase-scope>
    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold">Configurações globais</h1>
          <p class="text-sm text-[color:var(--text-muted)]">
            Ajuste a identidade visual, tipografia e componentes utilizados em todo o sistema.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-full border border-[color:var(--border-card)] px-4 py-2 text-sm font-medium text-[color:var(--text-base)] transition hover:bg-[color:var(--surface-card-alt)]"
            :disabled="saving"
            @click="handleReset"
          >
            Recarregar
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? "Salvando..." : "Salvar alterações" }}
          </button>
        </div>
      </div>
      <p v-if="feedback.message" class="mt-4 text-sm" :class="feedback.type === 'success' ? 'text-green-500' : 'text-red-500'">
        {{ feedback.message }}
      </p>
    </BaseCard>

    <form class="space-y-6" @submit.prevent>
      <BaseCard>
        <h2 class="text-lg font-semibold">Identidade visual</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-medium text-[color:var(--text-muted)]">Logo tema claro</label>
            <input v-model="draft.branding.logoLightUrl" type="text" class="mt-2 w-full" placeholder="https://..." />
          </div>
          <div>
            <label class="text-sm font-medium text-[color:var(--text-muted)]">Logo tema escuro</label>
            <input v-model="draft.branding.logoDarkUrl" type="text" class="mt-2 w-full" placeholder="https://..." />
          </div>
          <div>
            <label class="text-sm font-medium text-[color:var(--text-muted)]">Fonte principal</label>
            <input v-model="draft.branding.fontFamily" type="text" class="mt-2 w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-[color:var(--text-muted)]">Fonte para títulos</label>
            <input v-model="draft.branding.headingFontFamily" type="text" class="mt-2 w-full" />
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="text-lg font-semibold">Paleta de cores</h2>
        <div class="mt-6 space-y-8">
          <div v-for="theme in themeOptions" :key="theme.key" class="space-y-4 rounded-2xl border border-dashed border-[color:var(--border-card)] p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">{{ theme.label }}</h3>
              <span class="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">Tokens e escalas</span>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-xs font-medium text-[color:var(--text-muted)]">Plano de fundo</label>
                <textarea v-model="draft.theme[theme.key].tokens.appBackground" rows="2" class="mt-1 w-full"></textarea>
              </div>
              <div>
                <label class="text-xs font-medium text-[color:var(--text-muted)]">Shell / container</label>
                <input v-model="draft.theme[theme.key].tokens.shellBackground" type="text" class="mt-1 w-full" />
              </div>
              <div>
                <label class="text-xs font-medium text-[color:var(--text-muted)]">Superfície principal</label>
                <input v-model="draft.theme[theme.key].tokens.surface" type="text" class="mt-1 w-full" />
              </div>
              <div>
                <label class="text-xs font-medium text-[color:var(--text-muted)]">Texto base</label>
                <input v-model="draft.theme[theme.key].tokens.textBase" type="text" class="mt-1 w-full" />
              </div>
            </div>
            <div class="grid gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Primary</p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <label v-for="shade in paletteShades" :key="`primary-${theme.key}-${shade}`" class="flex items-center gap-3 text-sm font-medium">
                    <span class="w-16 text-[color:var(--text-muted)]">-{{ shade }}</span>
                    <input v-model="draft.theme[theme.key].palette.primary[shade]" type="color" class="h-10 w-12 rounded-md border border-[color:var(--border-card)] bg-transparent" />
                  </label>
                </div>
              </div>
              <div>
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Neutral</p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <label v-for="shade in paletteShades" :key="`neutral-${theme.key}-${shade}`" class="flex items-center gap-3 text-sm font-medium">
                    <span class="w-16 text-[color:var(--text-muted)]">-{{ shade }}</span>
                    <input v-model="draft.theme[theme.key].palette.neutral[shade]" type="color" class="h-10 w-12 rounded-md border border-[color:var(--border-card)] bg-transparent" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="text-lg font-semibold">Tipografia e layout</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Tamanho base (px)</label>
            <input v-model.number="draft.typography.baseFontSize" type="number" min="12" max="22" class="mt-2 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Razão de escala</label>
            <input v-model.number="draft.typography.scaleRatio" type="number" step="0.05" class="mt-2 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Raio global (px)</label>
            <input v-model.number="draft.layout.borderRadius.lg" type="number" min="0" class="mt-2 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Raio pill (px)</label>
            <input v-model.number="draft.layout.borderRadius.pill" type="number" min="0" class="mt-2 w-full" />
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="text-lg font-semibold">Componentes & relatórios</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Sombra de cards</label>
            <input v-model="draft.components.card.shadow" type="text" class="mt-1 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Sombra de botões</label>
            <input v-model="draft.components.button.shadow" type="text" class="mt-1 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Cor primária do relatório</label>
            <input v-model="draft.reports.primaryColor" type="text" class="mt-1 w-full" />
          </div>
          <div>
            <label class="text-xs font-medium text-[color:var(--text-muted)]">Texto da marca d'água</label>
            <input v-model="draft.reports.watermarkText" type="text" class="mt-1 w-full" />
          </div>
        </div>
      </BaseCard>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import BaseCard from "../../components/ui/BaseCard.vue";
import { COLOR_SCALE_KEYS, type SystemConfigSettings } from "../../config/systemConfig";
import { useSystemConfigStore } from "../../stores/system-config";

const systemConfigStore = useSystemConfigStore();
const { config } = storeToRefs(systemConfigStore);

const cloneConfig = (value: SystemConfigSettings) => JSON.parse(JSON.stringify(value)) as SystemConfigSettings;

const draft = ref<SystemConfigSettings>(cloneConfig(config.value));
const saving = ref(false);
const feedback = reactive<{ type: "success" | "error"; message: string | null }>({
  type: "success",
  message: null
});

const themeOptions = [
  { key: "light", label: "Tema claro" },
  { key: "dark", label: "Tema escuro" }
] as const;

const paletteShades = COLOR_SCALE_KEYS;

watch(
  config,
  (value) => {
    draft.value = cloneConfig(value);
  },
  { deep: true }
);

const handleSave = async () => {
  saving.value = true;
  feedback.message = null;
  try {
    await systemConfigStore.saveConfig(draft.value);
    feedback.type = "success";
    feedback.message = "Configurações atualizadas com sucesso.";
  } catch (error) {
    console.error("Erro ao salvar configuracoes", error);
    feedback.type = "error";
    feedback.message = "Não foi possível salvar. Tente novamente.";
  } finally {
    saving.value = false;
  }
};

const handleReset = async () => {
  await systemConfigStore.refresh();
  draft.value = cloneConfig(config.value);
  feedback.message = null;
};
</script>
