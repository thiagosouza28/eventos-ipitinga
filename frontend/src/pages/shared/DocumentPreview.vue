<template>
  <div
    class="min-h-screen bg-gradient-to-br from-neutral-50 via-sky-50 to-primary-50 text-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-sky-950 dark:text-neutral-50"
  >
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header
        class="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-primary-100/60 backdrop-blur-lg dark:border-white/5 dark:bg-white/5 dark:shadow-black/40 md:flex-row md:items-center md:justify-between"
      >
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-primary-700 dark:text-primary-200">
            PRÉ-VISUALIZAÇÃO
          </p>
          <h1 class="text-3xl font-semibold text-neutral-900 dark:text-white">
            {{ headerTitle }}
          </h1>
          <p class="max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
            Conferir antes de baixar: use os botões ao lado para exportar em PDF ou imagem (PNG/JPG) ou apenas navegar pelo documento.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-neutral-200/80 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700 dark:border-white/10 dark:text-neutral-100 dark:hover:border-primary-500/50 dark:hover:text-primary-100"
            @click="viewDocument"
          >
            Apenas visualizar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm shadow-primary-200/50 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100"
            :disabled="imageDownloadState === 'processing' || loadingDoc"
            @click="handleDownloadImage"
          >
            <span v-if="imageDownloadState === 'processing'" class="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200" />
            Baixar como imagem
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-400/40 transition hover:-translate-y-0.5 hover:from-primary-500 hover:to-primary-400 disabled:cursor-not-allowed disabled:opacity-70 dark:from-primary-500 dark:to-sky-500"
            :disabled="loadingDoc"
            @click="handleDownloadPdf"
          >
            <span class="h-4 w-4">↓</span>
            Baixar em PDF
          </button>
        </div>
      </header>

      <div v-if="loading" class="flex items-center justify-center rounded-2xl border border-white/60 bg-white/80 p-10 text-sm text-neutral-600 shadow-inner shadow-primary-100/50 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-200">
        Carregando visualização...
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-red-200/70 bg-red-50/80 p-6 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <p class="text-base font-semibold">Não foi possível carregar o documento</p>
            <p>{{ errorMessage }}</p>
          </div>
          <button
            type="button"
            class="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/50 dark:bg-transparent dark:text-red-100 dark:hover:bg-red-500/10"
            @click="reloadSession"
          >
            Tentar novamente
          </button>
        </div>
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside class="space-y-4">
          <div
            class="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg shadow-primary-100/50 dark:border-white/10 dark:bg-white/5 dark:shadow-black/40"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">Visualizando</p>
            <h2 class="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
              {{ currentDoc?.title ?? "Documento" }}
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ currentDoc?.fileName }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <span class="rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-100">
                {{ currentDocLabel }}
              </span>
              <span
                v-if="formattedCreatedAt"
                class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                Gerado em {{ formattedCreatedAt }}
              </span>
            </div>
          </div>

          <div
            v-if="documents.length > 1"
            class="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg shadow-primary-100/50 dark:border-white/10 dark:bg-white/5 dark:shadow-black/40"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-300">Documentos</p>
            <div class="mt-3 space-y-2">
              <button
                v-for="(doc, index) in documents"
                :key="doc.id"
                type="button"
                class="w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700 dark:border-white/10 dark:hover:border-primary-500/60 dark:hover:text-primary-100"
                :class="index === currentIndex ? 'border-primary-300 bg-primary-50/70 text-primary-800 shadow-sm shadow-primary-200/60 dark:border-primary-500/70 dark:bg-primary-500/10 dark:text-primary-100' : 'border-neutral-200/80 bg-white/60 text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200'"
                @click="currentIndex = index"
              >
                <span class="block truncate">{{ doc.title }}</span>
                <span class="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{{ doc.fileName }}</span>
              </button>
            </div>
          </div>
        </aside>

        <section
          class="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl shadow-primary-100/60 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50"
        >
          <div
            ref="previewRef"
            class="relative isolate overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-inner shadow-primary-100/40 dark:border-neutral-800 dark:bg-neutral-950/60"
          >
            <div
              v-if="loadingDoc"
              class="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/80 text-sm text-neutral-600 backdrop-blur dark:bg-neutral-900/70 dark:text-neutral-200"
            >
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent dark:border-primary-200" />
              Carregando documento...
            </div>

            <template v-if="viewerSrc">
              <iframe
                v-if="isPdf"
                :src="viewerSrc"
                title="Pré-visualização em PDF"
                class="h-[70vh] w-full border-0"
              />
              <img
                v-else-if="isImage"
                :src="viewerSrc"
                :alt="currentDoc?.title ?? 'Pré-visualização do documento'"
                class="block max-h-[75vh] w-full bg-white object-contain"
              />
              <div v-else class="flex h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-neutral-600 dark:text-neutral-200">
                <p>Não conseguimos exibir este formato aqui.</p>
                <a
                  v-if="currentDoc?.sourceUrl || viewerSrc"
                  :href="currentDoc?.sourceUrl || viewerSrc"
                  target="_blank"
                  rel="noopener"
                  class="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900"
                >
                  Abrir original
                </a>
              </div>
            </template>
            <div
              v-else
              class="flex h-[70vh] items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-300"
            >
              {{
                loadingDoc
                  ? "Carregando documento..."
                  : "Clique em \"Apenas visualizar\" para carregar o documento."
              }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import JSZip from "jszip";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  clearPreviewSession,
  consumePreviewSession,
  type DocumentPreviewSession,
  type PreviewDocument
} from "../../utils/documentPreview";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const route = useRoute();

const session = ref<DocumentPreviewSession | null>(null);
const errorMessage = ref("");
const loading = ref(true);
const loadingDoc = ref(false);
const previewActivated = ref(false);
const imageDownloadState = ref<"idle" | "processing" | "error">("idle");
const previewRef = ref<HTMLElement | null>(null);
const currentIndex = ref(0);
const viewerSrc = ref("");

const blobCache = new Map<string, Blob>();
const urlCache = new Map<string, string>();

const documents = computed(() => session.value?.documents ?? []);
const currentDoc = computed(() => documents.value[currentIndex.value]);
const isPdf = computed(() => (currentDoc.value?.mimeType || "").toLowerCase().includes("pdf"));
const isImage = computed(() => (currentDoc.value?.mimeType || "").toLowerCase().startsWith("image/"));
const headerTitle = computed(() => session.value?.context ?? "Visualização de documentos");
const formattedCreatedAt = computed(() =>
  session.value?.createdAt ? new Date(session.value.createdAt).toLocaleString("pt-BR") : ""
);
const currentDocLabel = computed(() => {
  if (isPdf.value) return "PDF";
  if (isImage.value) return "Imagem";
  return currentDoc.value?.mimeType || "Arquivo";
});

const ensureDocUrl = async (doc?: PreviewDocument) => {
  if (!doc) return;
  loadingDoc.value = true;
  try {
    const cached = urlCache.get(doc.id) ?? doc.src;
    if (cached) {
      urlCache.set(doc.id, cached);
      viewerSrc.value = cached;
      if (!blobCache.has(doc.id) && doc.src) {
        const probe = await fetch(doc.src);
        if (probe.ok) {
          const blob = await probe.blob();
          blobCache.set(doc.id, blob);
        }
      }
      return;
    }
    if (doc.sourceUrl) {
      const response = await fetch(doc.sourceUrl, { credentials: "include" });
      if (!response.ok) throw new Error(`Erro ao carregar o documento (${response.status}).`);
      const blob = await response.blob();
      blobCache.set(doc.id, blob);
      const url = URL.createObjectURL(blob);
      urlCache.set(doc.id, url);
      viewerSrc.value = url;
      doc.mimeType = doc.mimeType || blob.type;
    } else {
      throw new Error("Origem do documento não informada.");
    }
  } catch (error: any) {
    console.error("Falha ao preparar visualização", error);
    errorMessage.value = error?.message ?? "Não foi possível carregar o documento.";
  } finally {
    loadingDoc.value = false;
  }
};

const loadSession = async () => {
  const sessionId = route.query.session?.toString() ?? "";
  if (!sessionId) {
    errorMessage.value = "Nenhuma sess?o de documento foi informada.";
    loading.value = false;
    return;
  }
  const payload = consumePreviewSession(sessionId);
  if (!payload || !payload.documents?.length) {
    errorMessage.value = "Sess?o expirada ou inv?lida. Gere o documento novamente.";
    loading.value = false;
    return;
  }
  blobCache.clear();
  urlCache.clear();
  viewerSrc.value = "";
  previewActivated.value = false;
  session.value = payload;
  const startIndex = Math.min(payload.defaultIndex ?? 0, payload.documents.length - 1);
  currentIndex.value = startIndex;
  loading.value = false;
};

watch(currentIndex, (next) => {
  const doc = documents.value[next];
  if (!doc) return;
  if (!previewActivated.value) return;
  const cachedUrl = urlCache.get(doc.id) ?? doc.src;
  if (cachedUrl) {
    viewerSrc.value = cachedUrl;
  }
  void ensureDocUrl(doc);
});

const viewDocument = async () => {
  if (!documents.value.length) return;
  previewActivated.value = true;
  await ensureDocUrl(documents.value[currentIndex.value]);
  previewRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const triggerDownload = (blob: Blob, fileName: string) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
};

const fetchDocumentBlob = async (doc: PreviewDocument) => {
  if (blobCache.has(doc.id)) {
    return blobCache.get(doc.id)!;
  }
  const targetUrl = urlCache.get(doc.id) ?? doc.src ?? doc.sourceUrl;
  if (!targetUrl) {
    throw new Error("Documento indisponível para download.");
  }
  const response = await fetch(targetUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Não foi possível baixar o documento (${response.status}).`);
  }
  const blob = await response.blob();
  blobCache.set(doc.id, blob);
  if (!urlCache.has(doc.id) && targetUrl.startsWith("blob:")) {
    urlCache.set(doc.id, targetUrl);
  }
  return blob;
};

const baseName = (fileName: string) => fileName.replace(/\.[^/.]+$/, "") || "documento";

const handleDownloadPdf = async () => {
  if (!currentDoc.value) return;
  try {
    const blob = await fetchDocumentBlob(currentDoc.value);
    const fileName = currentDoc.value.fileName.toLowerCase().includes(".pdf")
      ? currentDoc.value.fileName
      : `${baseName(currentDoc.value.fileName)}.pdf`;
    triggerDownload(blob, fileName);
  } catch (error: any) {
    errorMessage.value = error?.message ?? "Não foi possível baixar o PDF.";
  }
};

const downloadPdfAsImages = async (blob: Blob, name: string) => {
  imageDownloadState.value = "processing";
  try {
    const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    const zip = new JSZip();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas indisponível para renderizar o PDF.");
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1] ?? "";
      const pageName = `${name}-p${String(pageNumber).padStart(2, "0")}.png`;
      zip.file(pageName, base64, { base64: true });
    }
    const archive = await zip.generateAsync({ type: "blob" });
    triggerDownload(archive, `${name}-imagens.zip`);
    imageDownloadState.value = "idle";
  } catch (error: any) {
    console.error("Erro ao converter PDF para imagem", error);
    imageDownloadState.value = "error";
    errorMessage.value = error?.message ?? "Não foi possível gerar a imagem do documento.";
  }
};

const handleDownloadImage = async () => {
  if (!currentDoc.value) return;
  try {
    const blob = await fetchDocumentBlob(currentDoc.value);
    if (blob.type.startsWith("image/")) {
      triggerDownload(blob, `${baseName(currentDoc.value.fileName)}.png`);
      return;
    }
    if ((blob.type || currentDoc.value.mimeType).toLowerCase().includes("pdf")) {
      await downloadPdfAsImages(blob, baseName(currentDoc.value.fileName));
      return;
    }
    triggerDownload(blob, currentDoc.value.fileName);
  } catch (error: any) {
    errorMessage.value = error?.message ?? "Não foi possível baixar como imagem.";
    imageDownloadState.value = "error";
  } finally {
    if (imageDownloadState.value === "processing") {
      imageDownloadState.value = "idle";
    }
  }
};

const reloadSession = () => {
  errorMessage.value = "";
  loading.value = true;
  void loadSession();
};

onMounted(loadSession);

onBeforeUnmount(() => {
  if (session.value) {
    clearPreviewSession(session.value.id);
  }
  urlCache.forEach((url) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
});
</script>




