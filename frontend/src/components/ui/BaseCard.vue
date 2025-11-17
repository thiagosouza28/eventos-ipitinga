<template>
  <div
    class="rounded-[26px] border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-5 text-[color:var(--text-base)] shadow transition sm:p-6"
    :style="{ boxShadow: 'var(--card-shadow)' }"
  >
    <slot />
  </div>
</template>
