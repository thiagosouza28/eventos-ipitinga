<template>
  <div>
    <ol class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <li
        v-for="(step, index) in steps"
        :key="step.title"
        class="flex flex-1 items-center gap-3"
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
          class="hidden flex-1 border-t border-dashed border-neutral-300 md:block dark:border-neutral-700"
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
