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
            O comprovante e carregado automaticamente. Use o botao ao lado para baixar o PDF.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-400/40 transition hover:-translate-y-0.5 hover:from-primary-500 hover:to-primary-400 disabled:cursor-not-allowed disabled:opacity-70 dark:from-primary-500 dark:to-sky-500"
            :disabled="loadingDoc || loading || !currentDoc"
            @click="handleDownloadPdf"
          >
            <ArrowDownTrayIcon class="h-4 w-4" aria-hidden="true" />
            Baixar em PDF
          </button>
        </div>
      </header>
      <div
        v-if="actionError"
        class="rounded-2xl border border-red-200/70 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
        role="alert"
      >
        {{ actionError }}
      </div>

      <div v-if="loading" class="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div class="space-y-4">
          <div class="h-32 rounded-3xl border border-white/60 bg-white/70 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
          <div class="h-64 rounded-3xl border border-white/60 bg-white/70 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
        </div>
        <div class="h-[70vh] rounded-3xl border border-white/60 bg-white/70 shadow-inner shadow-primary-100/40 animate-pulse dark:border-white/10 dark:bg-neutral-900/50" />
      </div>

      <div
        v-else-if="sessionError"
        class="rounded-2xl border border-red-200/70 bg-red-50/80 p-6 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <p class="text-base font-semibold">Não foi possível carregar o documento</p>
            <p>{{ sessionError }}</p>
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
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-xs text-neutral-600 shadow-sm dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-200">
            <div class="min-w-[200px]">
              <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Arquivo</p>
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ currentDoc?.fileName ?? "documento" }}</p>
              <p v-if="formattedCreatedAt" class="text-xs text-neutral-500 dark:text-neutral-400">Gerado em {{ formattedCreatedAt }}</p>
            </div>
            <div v-if="isPdf" class="flex items-center gap-3">
              <span class="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Zoom</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                  :disabled="!canZoomOut"
                  @click="zoomOut"
                >
                  -
                </button>
                <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-200">{{ zoomPercent }}%</span>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                  :disabled="!canZoomIn"
                  @click="zoomIn"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="previewError"
            class="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-sm font-semibold">Não foi possível carregar o documento</p>
                <p>{{ previewError }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/50 dark:bg-transparent dark:text-red-100 dark:hover:bg-red-500/10"
                @click="retryPreview"
              >
                Tentar novamente
              </button>
            </div>
          </div>

          <div
            ref="previewRef"
            class="relative isolate overflow-auto rounded-2xl border border-neutral-200/70 bg-neutral-100/80 shadow-inner shadow-primary-100/40 dark:border-neutral-800 dark:bg-neutral-950/70"
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
                :src="pdfViewerSrc"
                title="Pré-visualização em PDF"
                class="h-[70vh] w-full border-0"
              />
              <img
                v-else-if="isImage"
                :src="viewerSrc"
                :alt="currentDoc?.title ?? 'Pré-visualização do documento'"
                class="mx-auto block max-h-[75vh] w-full bg-white object-contain"
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
                  : "Documento ainda não carregado. Tente novamente em instantes."
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
import { ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
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
const sessionError = ref("");
const previewError = ref("");
const actionError = ref("");
const loading = ref(true);
const loadingDoc = ref(false);
const previewStatus = ref<"idle" | "loading" | "success" | "error">("idle");
const previewActivated = ref(false);
const imageDownloadState = ref<"idle" | "processing" | "error">("idle");
const previewRef = ref<HTMLElement | null>(null);
const currentIndex = ref(0);
const viewerSrc = ref("");
const zoomLevel = ref(1);

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

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;

const zoomPercent = computed(() => Math.round(zoomLevel.value * 100));
const canZoomIn = computed(() => zoomLevel.value < MAX_ZOOM - 0.01);
const canZoomOut = computed(() => zoomLevel.value > MIN_ZOOM + 0.01);

const buildPdfViewerSrc = (source: string, zoom: number) => {
  const [base, hash = ""] = source.split("#");
  const params = new URLSearchParams(hash);
  params.set("zoom", String(zoom));
  params.set("view", "FitH");
  return `${base}#${params.toString()}`;
};

const pdfViewerSrc = computed(() =>
  viewerSrc.value && isPdf.value ? buildPdfViewerSrc(viewerSrc.value, zoomPercent.value) : viewerSrc.value
);

const normalizeDocumentUrl = (value?: string) => {
  if (!value) return value;
  if (value.startsWith("blob:") || value.startsWith("data:")) return value;
  if (typeof window === "undefined") return value;
  try {
    const parsed = new URL(value, window.location.origin);
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    if (localHosts.has(parsed.hostname) && !localHosts.has(window.location.hostname)) {
      parsed.hostname = window.location.hostname;
    }
    return parsed.toString();
  } catch {
    return value;
  }
};

const resolveResponseMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    if (data && typeof data.message === "string") return data.message;
  } catch {}
  return fallback;
};

const ensureDocUrl = async (doc?: PreviewDocument) => {
  if (!doc) return;
  loadingDoc.value = true;
  previewStatus.value = "loading";
  previewError.value = "";
  try {
    const cached = urlCache.get(doc.id) ?? doc.src;
    if (cached) {
      urlCache.set(doc.id, cached);
      viewerSrc.value = cached;
      previewStatus.value = "success";
      if (!blobCache.has(doc.id) && doc.src) {
        try {
          const probe = await fetch(doc.src);
          if (probe.ok) {
            const blob = await probe.blob();
            blobCache.set(doc.id, blob);
          }
        } catch (error) {
          console.warn("Falha ao atualizar cache do documento", error);
        }
      }
      return;
    }
    if (doc.sourceUrl) {
      const sourceUrl = normalizeDocumentUrl(doc.sourceUrl);
      if (!sourceUrl) {
        throw new Error("Origem do documento não informada.");
      }
      const response = await fetch(sourceUrl, { credentials: "include" });
      if (!response.ok) {
        const message = await resolveResponseMessage(
          response,
          "Não foi possível carregar o documento."
        );
        throw new Error(message);
      }
      const blob = await response.blob();
      blobCache.set(doc.id, blob);
      const url = URL.createObjectURL(blob);
      urlCache.set(doc.id, url);
      viewerSrc.value = url;
      doc.mimeType = doc.mimeType || blob.type;
      doc.sourceUrl = sourceUrl;
      previewStatus.value = "success";
    } else {
      throw new Error("Origem do documento não informada.");
    }
  } catch (error: any) {
    console.error("Falha ao preparar visualizacao", error);
    previewError.value = error?.message ?? "Não foi possível carregar o documento.";
    previewStatus.value = "error";
    viewerSrc.value = "";
  } finally {
    loadingDoc.value = false;
  }
};

const loadSession = async (options?: { autoPreview?: boolean }) => {
  const sessionId = route.query.session?.toString() ?? "";
  sessionError.value = "";
  previewError.value = "";
  actionError.value = "";
  loading.value = true;
  previewStatus.value = "loading";
  if (!sessionId) {
    sessionError.value = "Nenhuma sessao de documento foi informada.";
    loading.value = false;
    previewStatus.value = "error";
    return;
  }
  const payload = consumePreviewSession(sessionId);
  if (!payload || !payload.documents?.length) {
    sessionError.value = "Sessao expirada ou invalida. Gere o documento novamente.";
    loading.value = false;
    previewStatus.value = "error";
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
  if (options?.autoPreview !== false) {
    previewActivated.value = true;
    await ensureDocUrl(payload.documents[startIndex]);
  } else {
    previewStatus.value = "idle";
  }
};

watch(currentIndex, (next) => {
  const doc = documents.value[next];
  zoomLevel.value = 1;
  if (!doc) return;
  if (!previewActivated.value) return;
  const cachedUrl = urlCache.get(doc.id) ?? doc.src;
  if (cachedUrl) {
    viewerSrc.value = cachedUrl;
    previewStatus.value = "success";
  }
  void ensureDocUrl(doc);
});

const viewDocument = async (options?: { scroll?: boolean }) => {
  if (!documents.value.length) return;
  previewActivated.value = true;
  previewError.value = "";
  actionError.value = "";
  await ensureDocUrl(documents.value[currentIndex.value]);
  if (options?.scroll !== false) {
    previewRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const retryPreview = () => {
  previewError.value = "";
  actionError.value = "";
  void viewDocument({ scroll: false });
};

const zoomIn = () => {
  if (!canZoomIn.value) return;
  zoomLevel.value = Math.min(MAX_ZOOM, zoomLevel.value + ZOOM_STEP);
};

const zoomOut = () => {
  if (!canZoomOut.value) return;
  zoomLevel.value = Math.max(MIN_ZOOM, zoomLevel.value - ZOOM_STEP);
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
  const rawUrl = urlCache.get(doc.id) ?? doc.src ?? doc.sourceUrl;
  const targetUrl = normalizeDocumentUrl(rawUrl);
  if (!targetUrl) {
    throw new Error("Documento indisponivel para download.");
  }
  const response = await fetch(targetUrl, { credentials: "include" });
  if (!response.ok) {
    const message = await resolveResponseMessage(
      response,
      "Não foi possível baixar o documento."
    );
    throw new Error(message);
  }
  const blob = await response.blob();
  blobCache.set(doc.id, blob);
  if (doc.sourceUrl && rawUrl === doc.sourceUrl) {
    doc.sourceUrl = targetUrl;
  }
  if (!urlCache.has(doc.id) && targetUrl.startsWith("blob:")) {
    urlCache.set(doc.id, targetUrl);
  }
  return blob;
};

const baseName = (fileName: string) => fileName.replace(/\.[^/.]+$/, "") || "documento";

const handleDownloadPdf = async () => {
  if (!currentDoc.value) return;
  actionError.value = "";
  try {
    const blob = await fetchDocumentBlob(currentDoc.value);
    const fileName = currentDoc.value.fileName.toLowerCase().includes(".pdf")
      ? currentDoc.value.fileName
      : `${baseName(currentDoc.value.fileName)}.pdf`;
    triggerDownload(blob, fileName);
  } catch (error: any) {
    actionError.value = error?.message ?? "Não foi possível baixar o PDF.";
  }
};

const downloadPdfAsImages = async (blob: Blob, name: string) => {
  imageDownloadState.value = "processing";
  actionError.value = "";
  try {
    const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    const zip = new JSZip();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas indisponivel para renderizar o PDF.");
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
    actionError.value = error?.message ?? "Não foi possível gerar a imagem do documento.";
  }
};

const handleDownloadImage = async () => {
  if (!currentDoc.value) return;
  actionError.value = "";
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
    actionError.value = error?.message ?? "Não foi possível baixar como imagem.";
    imageDownloadState.value = "error";
  } finally {
    if (imageDownloadState.value === "processing") {
      imageDownloadState.value = "idle";
    }
  }
};

const reloadSession = () => {
  sessionError.value = "";
  previewError.value = "";
  actionError.value = "";
  loading.value = true;
  void loadSession({ autoPreview: true });
};

onMounted(() => { void loadSession({ autoPreview: true }); });

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















