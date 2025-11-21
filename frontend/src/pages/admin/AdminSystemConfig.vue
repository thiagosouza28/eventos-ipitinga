<template>
  <div class="space-y-10" data-uppercase-scope>
    <section
      class="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-r from-[#1f4fff] via-[#4965ff] to-[#101a52] text-white shadow-[0_40px_120px_rgba(15,23,42,0.32)]"
    >
      <div class="absolute inset-0 opacity-40">
        <div class="absolute -left-24 top-10 h-56 w-56 rounded-full bg-white/30 blur-3xl"></div>
        <div class="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#00d2ff]/40 blur-3xl"></div>
      </div>
      <div class="relative grid gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div class="space-y-6">
          <p class="text-sm tracking-[0.35em] text-white/70">System experience</p>
          <div class="space-y-4">
            <h1 class="text-3xl font-semibold leading-tight tracking-tight">Curadoria visual e identidade global</h1>
            <p class="max-w-3xl text-base text-white/80">
              Centralize logos, tipografia, temas claro/escuro e tokens de componentes. Cada ajuste reflete instantaneamente em todo o ecossistema SaaS.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3">
              <p class="text-xs uppercase tracking-[0.25em] text-white/70">Fonte base</p>
              <p class="mt-1 text-lg font-semibold">{{ heroHighlights.font }}</p>
            </div>
            <div class="rounded-2xl border border-white/30 bg-white/10 px-4 py-3">
              <p class="text-xs uppercase tracking-[0.25em] text-white/70">Fonte de títulos</p>
              <p class="mt-1 text-lg font-semibold">{{ heroHighlights.heading }}</p>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            :disabled="saving"
            @click="handleReset"
          >
            Recarregar
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#1f4fff] shadow-[0_20px_45px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? "Salvando..." : "Salvar configurações" }}
          </button>
        </div>
      </div>
    </section>

    <p
      v-if="feedback.message"
      class="rounded-2xl border border-white/60 bg-white/80 px-5 py-3 text-sm font-medium text-[color:var(--text-base)] shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      :class="feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'"
    >
      {{ feedback.message }}
    </p>

    <form class="space-y-6" @submit.prevent>
      <div class="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div class="space-y-6">
          <BaseCard>
            <div class="space-y-6">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold tracking-tight">Identidade visual</h2>
                  <p class="text-sm text-[color:var(--text-muted)]">Defina logos e families tipograficas utilizadas em todo o app.</p>
                </div>
                <div class="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                  <span>Brand kit</span>
                </div>
              </div>
              <div class="grid gap-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-[color:var(--text-muted)]">
                    Logo tema claro
                    <input v-model="draft.branding.logoLightUrl" type="text" class="w-full" placeholder="https://..." />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-[color:var(--text-muted)]">
                    Logo tema escuro
                    <input v-model="draft.branding.logoDarkUrl" type="text" class="w-full" placeholder="https://..." />
                  </label>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-[color:var(--text-muted)]">
                    Fonte principal
                    <input v-model="draft.branding.fontFamily" type="text" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-[color:var(--text-muted)]">
                    Fonte de títulos
                    <input v-model="draft.branding.headingFontFamily" type="text" class="w-full" />
                  </label>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-[color:var(--border-card)] bg-white/60 px-4 py-3 text-sm shadow-sm">
                    <p class="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Preview light</p>
                    <div class="mt-3 flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[color:var(--border-card)] bg-white">
                        <img
                          v-if="draft.branding.logoLightUrl"
                          :src="draft.branding.logoLightUrl"
                          alt="Logo light"
                          class="h-10 w-10 object-contain"
                        />
                        <span v-else class="text-xs font-semibold text-[color:var(--text-muted)]">LOGO</span>
                      </div>
                      <span class="text-sm text-[color:var(--text-base)]">
                        {{ draft.branding.logoLightUrl ? "Personalizado" : "Usando padrao" }}
                      </span>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-[color:var(--border-card)] bg-white/60 px-4 py-3 text-sm shadow-sm">
                    <p class="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Preview dark</p>
                    <div class="mt-3 flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[color:var(--border-card)] bg-neutral-900">
                        <img
                          v-if="draft.branding.logoDarkUrl"
                          :src="draft.branding.logoDarkUrl"
                          alt="Logo dark"
                          class="h-10 w-10 object-contain"
                        />
                        <span v-else class="text-xs font-semibold text-white">LOGO</span>
                      </div>
                      <span class="text-sm text-[color:var(--text-base)]">
                        {{ draft.branding.logoDarkUrl ? "Personalizado" : "Usando padrao" }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="space-y-6">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">Tipografia e layout</h2>
                <p class="text-sm text-[color:var(--text-muted)]">Controle escala, alturas de linha e tokens estruturais.</p>
              </div>
              <div class="grid gap-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Base font size (px)
                    <input v-model.number="draft.typography.baseFontSize" type="number" min="10" max="24" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Scale ratio
                    <input v-model.number="draft.typography.scaleRatio" type="number" step="0.05" min="1" max="1.8" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Body line height
                    <input v-model.number="draft.typography.bodyLineHeight" type="number" step="0.05" min="1" max="2" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Heading line height
                    <input v-model.number="draft.typography.headingLineHeight" type="number" step="0.05" min="1" max="2" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Letter spacing (px)
                    <input v-model.number="draft.typography.letterSpacing" type="number" step="0.25" min="-2" max="2" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Container width (px)
                    <input v-model.number="draft.layout.containerWidth" type="number" min="900" class="w-full" />
                  </label>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <div class="rounded-2xl border border-dashed border-[color:var(--border-card)] px-4 py-3 text-xs">
                    <p class="font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Radiuses</p>
                    <div class="mt-3 grid gap-2 text-[color:var(--text-base)]">
                      <label class="flex items-center justify-between">
                        <span>SM</span>
                        <input v-model.number="draft.layout.borderRadius.sm" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>MD</span>
                        <input v-model.number="draft.layout.borderRadius.md" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>LG</span>
                        <input v-model.number="draft.layout.borderRadius.lg" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>Pill</span>
                        <input v-model.number="draft.layout.borderRadius.pill" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                    </div>
                  </div>
                  <div class="rounded-2xl border border-dashed border-[color:var(--border-card)] px-4 py-3 text-xs">
                    <p class="font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Spacing</p>
                    <div class="mt-3 grid gap-2 text-[color:var(--text-base)]">
                      <label class="flex items-center justify-between">
                        <span>XS</span>
                        <input v-model.number="draft.layout.spacing.xs" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>SM</span>
                        <input v-model.number="draft.layout.spacing.sm" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>MD</span>
                        <input v-model.number="draft.layout.spacing.md" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>LG</span>
                        <input v-model.number="draft.layout.spacing.lg" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                      <label class="flex items-center justify-between">
                        <span>XL</span>
                        <input v-model.number="draft.layout.spacing.xl" type="number" class="w-20 rounded-lg border px-2 py-1 text-right" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="space-y-5">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">Componentes e relatorios</h2>
                <p class="text-sm text-[color:var(--text-muted)]">Aplique personalidade aos elementos de interface e documentos.</p>
              </div>
              <div class="grid gap-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Sombra de cards
                    <input v-model="draft.components.card.shadow" type="text" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Sombra de botoes
                    <input v-model="draft.components.button.shadow" type="text" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Cor primaria do relatorio
                    <input v-model="draft.reports.primaryColor" type="text" class="w-full" />
                  </label>
                  <label class="flex flex-col gap-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    Texto watermark
                    <input v-model="draft.reports.watermarkText" type="text" class="w-full" />
                  </label>
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-3xl border border-[color:var(--border-card)] bg-white/80 p-4 shadow-inner">
                    <p class="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Preview botão</p>
                    <button
                      type="button"
                      class="mt-3 w-full text-sm font-semibold text-white shadow-lg"
                      :style="{
                        borderRadius: toPx(draft.components.button.borderRadius),
                        paddingBlock: toPx(draft.components.button.paddingY),
                        paddingInline: toPx(draft.components.button.paddingX),
                        fontWeight: draft.components.button.fontWeight,
                        boxShadow: draft.components.button.shadow,
                        borderWidth: toPx(draft.components.button.borderWidth),
                        borderStyle: 'solid',
                        background: draft.theme.light.palette.primary['500']
                      }"
                    >
                      Botao primario
                    </button>
                  </div>
                  <div class="rounded-3xl border border-[color:var(--border-card)] bg-white/80 p-4 shadow-inner">
                    <p class="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Preview input</p>
                    <input
                      type="text"
                      value="Placeholder"
                      readonly
                      class="mt-3 w-full text-sm"
                      :style="{
                        borderRadius: toPx(draft.components.input.borderRadius),
                        borderWidth: toPx(draft.components.input.borderWidth),
                        borderStyle: 'solid',
                        borderColor: draft.components.input.borderColor,
                        background: draft.components.input.background,
                        boxShadow: draft.components.input.shadow,
                        padding: '0.65rem 1rem'
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        <div class="space-y-6">
          <BaseCard>
            <div class="space-y-6">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold tracking-tight">Paletas e tokens</h2>
                  <p class="text-sm text-[color:var(--text-muted)]">Regule fundos, textos e escala cromatica de cada tema.</p>
                </div>
                <span class="rounded-full border border-[color:var(--border-card)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                  Light & Dark
                </span>
              </div>
              <div class="space-y-6">
                <div
                  v-for="theme in themeOptions"
                  :key="theme.key"
                  class="space-y-5 rounded-3xl border border-dashed border-[color:var(--border-card)] p-5"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">{{ theme.label }}</p>
                      <p class="text-base text-[color:var(--text-base)]">Token set e escala primaria</p>
                    </div>
                    <div class="h-10 w-10 rounded-2xl shadow-inner" :style="{ background: draft.theme[theme.key].palette.primary['500'] }" />
                  </div>
                  <div class="grid gap-4 md:grid-cols-2">
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Plano de fundo
                      <textarea v-model="draft.theme[theme.key].tokens.appBackground" rows="2" class="mt-2 w-full"></textarea>
                    </label>
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Shell / container
                      <input v-model="draft.theme[theme.key].tokens.shellBackground" type="text" class="mt-2 w-full" />
                    </label>
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Superficie principal
                      <input v-model="draft.theme[theme.key].tokens.surface" type="text" class="mt-2 w-full" />
                    </label>
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Texto base
                      <input v-model="draft.theme[theme.key].tokens.textBase" type="text" class="mt-2 w-full" />
                    </label>
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Texto muted
                      <input v-model="draft.theme[theme.key].tokens.textMuted" type="text" class="mt-2 w-full" />
                    </label>
                    <label class="text-xs font-medium text-[color:var(--text-muted)]">
                      Bordas / outline
                      <input v-model="draft.theme[theme.key].tokens.border" type="text" class="mt-2 w-full" />
                    </label>
                  </div>
                  <div class="grid gap-5 md:grid-cols-2">
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Primary</p>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <label
                          v-for="shade in paletteShades"
                          :key="`primary-${theme.key}-${shade}`"
                          class="flex items-center gap-3 text-sm font-medium"
                        >
                          <span class="w-14 text-[color:var(--text-muted)]">-{{ shade }}</span>
                          <input
                            v-model="draft.theme[theme.key].palette.primary[shade]"
                            type="color"
                            class="h-10 w-12 rounded-md border border-[color:var(--border-card)] bg-transparent"
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Neutral</p>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <label
                          v-for="shade in paletteShades"
                          :key="`neutral-${theme.key}-${shade}`"
                          class="flex items-center gap-3 text-sm font-medium"
                        >
                          <span class="w-14 text-[color:var(--text-muted)]">-{{ shade }}</span>
                          <input
                            v-model="draft.theme[theme.key].palette.neutral[shade]"
                            type="color"
                            class="h-10 w-12 rounded-md border border-[color:var(--border-card)] bg-transparent"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
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
const normalizeNullableText = (value?: string | null) => {
  if (typeof value !== "string") {
    return value ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};
const toPx = (value?: number | null) => (typeof value === "number" ? `${value}px` : undefined);

const draft = ref<SystemConfigSettings>(cloneConfig(config.value));
const saving = ref(false);
const feedback = reactive<{ type: "success" | "error"; message: string | null }>({
  type: "success",
  message: null
});

const heroHighlights = computed(() => ({
  font: draft.value.branding.fontFamily || "Inter",
  heading: draft.value.branding.headingFontFamily || "Poppins"
}));

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

const buildPayload = () => {
  const payload = cloneConfig(draft.value);
  payload.branding.logoLightUrl = normalizeNullableText(payload.branding.logoLightUrl);
  payload.branding.logoDarkUrl = normalizeNullableText(payload.branding.logoDarkUrl);
  return payload;
};

const handleSave = async () => {
  saving.value = true;
  feedback.message = null;
  try {
    await systemConfigStore.saveConfig(buildPayload());
    feedback.type = "success";
    feedback.message = "Configurações atualizadas com sucesso.";
  } catch (error) {
    console.error("Erro ao salvar configurações", error);
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
