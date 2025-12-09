<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-[color:var(--border-card)] bg-[color:var(--surface-card)] p-6 shadow-xl">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">Conta</p>
          <h1 class="text-2xl font-semibold text-[color:var(--text)]">Meu perfil</h1>
          <p class="text-sm text-[color:var(--text-muted)]">Atualize seus dados pessoais e foto.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--border-card)] bg-primary-600 text-white">
            <img
              v-if="form.photoUrl"
              :src="form.photoUrl"
              alt="Foto de perfil"
              class="h-full w-full object-cover"
              @error="form.photoUrl = ''"
            />
            <span v-else class="flex h-full w-full items-center justify-center text-xl font-semibold">{{ initials }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="rounded-full border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
              :disabled="uploading"
              @click="selectPhoto"
            >
              {{ uploading ? "Enviando..." : "Trocar foto" }}
            </button>
            <button
              v-if="form.photoUrl"
              type="button"
              class="text-xs font-semibold text-red-500 hover:text-red-400"
              :disabled="uploading || saving"
              @click="form.photoUrl = ''"
            >
              Remover foto
            </button>
            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onPhotoChange" />
          </div>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm font-medium text-[color:var(--text)]">Nome completo</label>
          <input
            v-model="form.name"
            type="text"
            class="mt-1 w-full rounded-lg border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-2 text-sm"
            placeholder="Seu nome"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-[color:var(--text)]">E-mail</label>
          <input
            v-model="form.email"
            type="email"
            class="mt-1 w-full rounded-lg border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-2 text-sm"
            placeholder="seuemail@dominio.com"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-[color:var(--text)]">Telefone</label>
          <input
            v-model="form.phone"
            type="tel"
            class="mt-1 w-full rounded-lg border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-2 text-sm"
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-[color:var(--text)]">CPF</label>
          <input
            v-model="form.cpf"
            type="text"
            class="mt-1 w-full rounded-lg border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-2 text-sm"
            placeholder="000.000.000-00"
          />
        </div>
        <div class="md:col-span-2">
          <label class="text-sm font-medium text-[color:var(--text)]">Foto (URL)</label>
          <input
            v-model="form.photoUrl"
            type="text"
            class="mt-1 w-full rounded-lg border border-[color:var(--border-card)] bg-[color:var(--surface-card-alt)] px-4 py-2 text-sm"
            placeholder="https://exemplo.com/foto.jpg"
          />
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-[color:var(--border-card)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-card-alt)]"
          :disabled="saving"
          @click="resetForm"
        >
          Desfazer
        </button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-700 disabled:opacity-70"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? "Salvando..." : "Salvar" }}
        </button>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-500">{{ error }}</p>
      <p v-if="success" class="mt-3 text-sm text-emerald-500">{{ success }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useAdminStore } from "../../stores/admin";

const auth = useAuthStore();
const admin = useAdminStore();

const saving = ref(false);
const uploading = ref(false);
const error = ref("");
const success = ref("");
const photoInput = ref<HTMLInputElement | null>(null);

const form = reactive({
  name: "",
  email: "",
  phone: "",
  cpf: "",
  photoUrl: ""
});

const initials = computed(() => {
  const name = form.name.trim();
  if (!name) return "CI";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
});

const loadForm = () => {
  const user = auth.user;
  if (!user) return;
  form.name = user.name ?? "";
  form.email = user.email ?? "";
  form.phone = user.phone ?? "";
  form.cpf = user.cpf ?? "";
  form.photoUrl = user.photoUrl ?? "";
};

onMounted(() => {
  loadForm();
});

const resetForm = () => {
  error.value = "";
  success.value = "";
  loadForm();
};

const selectPhoto = () => {
  photoInput.value?.click();
};

const onPhotoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    error.value = "Selecione um arquivo de até 4 MB.";
    return;
  }
  uploading.value = true;
  error.value = "";
  success.value = "";
  try {
    const uploaded = await admin.uploadAsset(file);
    form.photoUrl = uploaded.url;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? "Falha ao enviar imagem.";
  } finally {
    uploading.value = false;
    target.value = "";
  }
};

const persistAuth = () => {
  try {
    localStorage.setItem(
      "catre-auth",
      JSON.stringify({
        token: auth.token,
        user: auth.user
      })
    );
  } catch {}
};

const save = async () => {
  const user = auth.user;
  if (!user) {
    error.value = "Sessão expirada. Faça login novamente.";
    return;
  }
  if (!form.name.trim()) {
    error.value = "Informe seu nome.";
    return;
  }
  if (!form.email.trim()) {
    error.value = "Informe seu e-mail.";
    return;
  }
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    const updated = await admin.updateUser(user.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      cpf: form.cpf.trim() || null,
      photoUrl: form.photoUrl.trim() || null
    });
    auth.user = { ...user, ...updated };
    persistAuth();
    success.value = "Perfil atualizado com sucesso.";
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? "Falha ao atualizar perfil.";
  } finally {
    saving.value = false;
  }
};
</script>
