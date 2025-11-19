<template>
  <div
    class="rounded-[var(--card-radius)] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-5 text-[color:var(--text-base)] shadow transition sm:p-6"
    :style="{ boxShadow: 'var(--card-shadow)', borderWidth: 'var(--card-border-width)' }"
  >
    <slot />
  </div>
</template>
