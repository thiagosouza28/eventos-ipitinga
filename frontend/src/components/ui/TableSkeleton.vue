<template>
  <div class="space-y-3 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-4 shadow-inner">
    <div
      v-for="n in rows"
      :key="n"
      class="flex animate-pulse flex-col gap-3 rounded-xl bg-[color:var(--surface-card-alt)]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-1 flex-col gap-2">
        <div class="h-4 w-48 rounded-full bg-[color:var(--border-card)]/60"></div>
        <div class="flex gap-2">
          <div class="h-3 w-28 rounded-full bg-[color:var(--border-card)]/40"></div>
          <div class="h-3 w-20 rounded-full bg-[color:var(--border-card)]/30"></div>
        </div>
      </div>
      <div class="flex gap-2">
        <span class="h-8 w-20 rounded-full bg-[color:var(--border-card)]/40"></span>
        <span class="h-8 w-20 rounded-full bg-[color:var(--border-card)]/40"></span>
      </div>
    </div>
    <p class="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    helperText?: string;
  }>(),
  {
    rows: 4,
    helperText: "Carregando informações..."
  }
);
</script>



