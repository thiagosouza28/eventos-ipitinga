<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-50">
            Cadastros administrativos
          </h1>
          <p class="text-sm text-neutral-500">
            Escolha o módulo desejado para gerenciar distritos, igrejas ou ministérios.
          </p>
        </div>
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Voltar
        </RouterLink>
      </div>
    </BaseCard>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <BaseCard class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Distritos</p>
          <p class="text-sm text-neutral-500">
            Crie ou edite distritos e mantenha atualizado o nome do pastor responsável.
          </p>
        </div>
        <RouterLink
          to="/admin/districts"
          class="inline-flex w-full items-center justify-center rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-900/20"
        >
          Abrir tela de distritos
        </RouterLink>
      </BaseCard>

      <BaseCard class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Igrejas</p>
          <p class="text-sm text-neutral-500">
            Cadastre igrejas vinculadas aos distritos e mantenha os dados dos diretores jovens.
          </p>
        </div>
        <RouterLink
          to="/admin/churches"
          class="inline-flex w-full items-center justify-center rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-900/20"
        >
          Abrir tela de igrejas
        </RouterLink>
      </BaseCard>

      <BaseCard class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-100">Ministérios</p>
          <p class="text-sm text-neutral-500">
            Defina os ministérios ativos que poderão ser associados aos eventos.
          </p>
        </div>
        <RouterLink
          to="/admin/ministries"
          class="inline-flex w-full items-center justify-center rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-900/20"
        >
          Abrir tela de ministérios
        </RouterLink>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

import BaseCard from "../../components/ui/BaseCard.vue";
</script>
