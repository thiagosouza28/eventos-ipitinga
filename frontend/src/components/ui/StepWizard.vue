<template>
  <div class="overflow-x-auto pb-2">
    <ol
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <li
        v-for="(step, index) in steps"
        :key="step.title"
        class="flex flex-1 min-w-[220px] items-center gap-3 sm:min-w-0"
      >
        <div
          :class="[
            'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition',
            index < currentStep
              ? 'border-primary-500 bg-primary-500 text-white'
              : index === currentStep
                ? 'border-primary-500 text-primary-600'
                : 'border-neutral-300 text-neutral-400 dark:border-neutral-700'
          ]"
        >
          {{ index + 1 }}
        </div>
        <div>
          <p class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            {{ step.title }}
          </p>
          <p class="text-xs text-neutral-400">{{ step.description }}</p>
        </div>
        <div
          v-if="index < steps.length - 1"
          class="hidden flex-1 border-t border-dashed border-neutral-300 sm:block dark:border-neutral-700"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
interface Step {
  title: string;
  description: string;
}

defineProps<{
  steps: Step[];
  currentStep: number;
}>();
</script>
