/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import JSZip from "jszip";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { clearPreviewSession, consumePreviewSession } from "../../utils/documentPreview";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const route = useRoute();
const session = ref(null);
const errorMessage = ref("");
const loading = ref(true);
const loadingDoc = ref(false);
const imageDownloadState = ref("idle");
const previewRef = ref(null);
const currentIndex = ref(0);
const viewerSrc = ref("");
const blobCache = new Map();
const urlCache = new Map();
const documents = computed(() => session.value?.documents ?? []);
const currentDoc = computed(() => documents.value[currentIndex.value]);
const isPdf = computed(() => (currentDoc.value?.mimeType || "").toLowerCase().includes("pdf"));
const isImage = computed(() => (currentDoc.value?.mimeType || "").toLowerCase().startsWith("image/"));
const headerTitle = computed(() => session.value?.context ?? "Visualização de documentos");
const formattedCreatedAt = computed(() => session.value?.createdAt ? new Date(session.value.createdAt).toLocaleString("pt-BR") : "");
const currentDocLabel = computed(() => {
    if (isPdf.value)
        return "PDF";
    if (isImage.value)
        return "Imagem";
    return currentDoc.value?.mimeType || "Arquivo";
});
const ensureDocUrl = async (doc) => {
    if (!doc)
        return;
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
            if (!response.ok)
                throw new Error(`Erro ao carregar o documento (${response.status}).`);
            const blob = await response.blob();
            blobCache.set(doc.id, blob);
            const url = URL.createObjectURL(blob);
            urlCache.set(doc.id, url);
            viewerSrc.value = url;
            doc.mimeType = doc.mimeType || blob.type;
        }
        else {
            throw new Error("Origem do documento não informada.");
        }
    }
    catch (error) {
        console.error("Falha ao preparar visualização", error);
        errorMessage.value = error?.message ?? "Não foi possível carregar o documento.";
    }
    finally {
        loadingDoc.value = false;
    }
};
const loadSession = async () => {
    const sessionId = route.query.session?.toString() ?? "";
    if (!sessionId) {
        errorMessage.value = "Nenhuma sessão de documento foi informada.";
        loading.value = false;
        return;
    }
    const payload = consumePreviewSession(sessionId);
    if (!payload || !payload.documents?.length) {
        errorMessage.value = "Sessão expirada ou inválida. Gere o documento novamente.";
        loading.value = false;
        return;
    }
    session.value = payload;
    const startIndex = Math.min(payload.defaultIndex ?? 0, payload.documents.length - 1);
    currentIndex.value = startIndex;
    await ensureDocUrl(payload.documents[startIndex]);
    loading.value = false;
};
watch(currentIndex, (next) => {
    const doc = documents.value[next];
    if (!doc)
        return;
    const cachedUrl = urlCache.get(doc.id) ?? doc.src;
    if (cachedUrl) {
        viewerSrc.value = cachedUrl;
    }
    void ensureDocUrl(doc);
});
const scrollToPreview = () => {
    previewRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};
const triggerDownload = (blob, fileName) => {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
};
const fetchDocumentBlob = async (doc) => {
    if (blobCache.has(doc.id)) {
        return blobCache.get(doc.id);
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
const baseName = (fileName) => fileName.replace(/\.[^/.]+$/, "") || "documento";
const handleDownloadPdf = async () => {
    if (!currentDoc.value)
        return;
    try {
        const blob = await fetchDocumentBlob(currentDoc.value);
        const fileName = currentDoc.value.fileName.toLowerCase().includes(".pdf")
            ? currentDoc.value.fileName
            : `${baseName(currentDoc.value.fileName)}.pdf`;
        triggerDownload(blob, fileName);
    }
    catch (error) {
        errorMessage.value = error?.message ?? "Não foi possível baixar o PDF.";
    }
};
const downloadPdfAsImages = async (blob, name) => {
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
    }
    catch (error) {
        console.error("Erro ao converter PDF para imagem", error);
        imageDownloadState.value = "error";
        errorMessage.value = error?.message ?? "Não foi possível gerar a imagem do documento.";
    }
};
const handleDownloadImage = async () => {
    if (!currentDoc.value)
        return;
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
    }
    catch (error) {
        errorMessage.value = error?.message ?? "Não foi possível baixar como imagem.";
        imageDownloadState.value = "error";
    }
    finally {
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "min-h-screen bg-gradient-to-br from-neutral-50 via-sky-50 to-primary-50 text-neutral-900 dark:from-neutral-900 dark:via-neutral-950 dark:to-sky-950 dark:text-neutral-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-primary-100/60 backdrop-blur-lg dark:border-white/5 dark:bg-white/5 dark:shadow-black/40 md:flex-row md:items-center md:justify-between" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "space-y-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs font-semibold uppercase tracking-[0.35em] text-primary-700 dark:text-primary-200" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-3xl font-semibold text-neutral-900 dark:text-white" },
});
(__VLS_ctx.headerTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "max-w-2xl text-sm text-neutral-600 dark:text-neutral-300" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-wrap items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.scrollToPreview) },
    type: "button",
    ...{ class: "rounded-full border border-neutral-200/80 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700 dark:border-white/10 dark:text-neutral-100 dark:hover:border-primary-500/50 dark:hover:text-primary-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleDownloadImage) },
    type: "button",
    ...{ class: "inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm shadow-primary-200/50 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100" },
    disabled: (__VLS_ctx.imageDownloadState === 'processing' || __VLS_ctx.loadingDoc),
});
if (__VLS_ctx.imageDownloadState === 'processing') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-200" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleDownloadPdf) },
    type: "button",
    ...{ class: "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-400/40 transition hover:-translate-y-0.5 hover:from-primary-500 hover:to-primary-400 disabled:cursor-not-allowed disabled:opacity-70 dark:from-primary-500 dark:to-sky-500" },
    disabled: (__VLS_ctx.loadingDoc),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "h-4 w-4" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-center rounded-2xl border border-white/60 bg-white/80 p-10 text-sm text-neutral-600 shadow-inner shadow-primary-100/50 dark:border-white/10 dark:bg-neutral-900/40 dark:text-neutral-200" },
    });
}
else if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-2xl border border-red-200/70 bg-red-50/80 p-6 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-start justify-between gap-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "space-y-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-base font-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.errorMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.reloadSession) },
        type: "button",
        ...{ class: "rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/50 dark:bg-transparent dark:text-red-100 dark:hover:bg-red-500/10" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid gap-4 lg:grid-cols-[280px_1fr]" },
    });
    if (__VLS_ctx.documents.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg shadow-primary-100/50 dark:border-white/10 dark:bg-white/5 dark:shadow-black/40" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-300" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 space-y-2" },
        });
        for (const [doc, index] of __VLS_getVForSourceType((__VLS_ctx.documents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.errorMessage))
                            return;
                        if (!(__VLS_ctx.documents.length > 1))
                            return;
                        __VLS_ctx.currentIndex = index;
                    } },
                key: (doc.id),
                type: "button",
                ...{ class: "w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700 dark:border-white/10 dark:hover:border-primary-500/60 dark:hover:text-primary-100" },
                ...{ class: (index === __VLS_ctx.currentIndex ? 'border-primary-300 bg-primary-50/70 text-primary-800 shadow-sm shadow-primary-200/60 dark:border-primary-500/70 dark:bg-primary-500/10 dark:text-primary-100' : 'border-neutral-200/80 bg-white/60 text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200') },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "block truncate" },
            });
            (doc.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400" },
            });
            (doc.fileName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "rounded-3xl border border-white/70 bg-white/90 shadow-2xl shadow-primary-100/60 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/50" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100/80 px-5 py-4 dark:border-neutral-800/80" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "text-lg font-semibold text-neutral-900 dark:text-white" },
    });
    (__VLS_ctx.currentDoc?.title ?? "Documento");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-neutral-500 dark:text-neutral-400" },
    });
    (__VLS_ctx.currentDoc?.fileName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-100" },
    });
    (__VLS_ctx.currentDocLabel);
    if (__VLS_ctx.formattedCreatedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rounded-full bg-neutral-100 px-3 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" },
        });
        (__VLS_ctx.formattedCreatedAt);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "previewRef",
        ...{ class: "relative isolate overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-inner shadow-primary-100/40 dark:border-neutral-800 dark:bg-neutral-950/60" },
    });
    /** @type {typeof __VLS_ctx.previewRef} */ ;
    if (__VLS_ctx.loadingDoc) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/80 text-sm text-neutral-600 backdrop-blur dark:bg-neutral-900/70 dark:text-neutral-200" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent dark:border-primary-200" },
        });
    }
    if (__VLS_ctx.viewerSrc) {
        if (__VLS_ctx.isPdf) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe)({
                src: (__VLS_ctx.viewerSrc),
                title: "Pré-visualização em PDF",
                ...{ class: "h-[70vh] w-full border-0" },
            });
        }
        else if (__VLS_ctx.isImage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.viewerSrc),
                alt: (__VLS_ctx.currentDoc?.title ?? 'Pré-visualização do documento'),
                ...{ class: "block max-h-[75vh] w-full bg-white object-contain" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-neutral-600 dark:text-neutral-200" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            if (__VLS_ctx.currentDoc?.sourceUrl || __VLS_ctx.viewerSrc) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (__VLS_ctx.currentDoc?.sourceUrl || __VLS_ctx.viewerSrc),
                    target: "_blank",
                    rel: "noopener",
                    ...{ class: "rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900" },
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex h-[70vh] items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-300" },
        });
        (__VLS_ctx.loadingDoc ? "Carregando documento..." : "Selecione um documento para visualizar.");
    }
}
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['via-sky-50']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-neutral-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-sky-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-50']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:px-8']} */ ;
/** @type {__VLS_StyleScopedClasses['md:py-10']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/60']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.35em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:border-primary-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-200/50']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-300']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['to-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-400/40']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:from-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:to-primary-400']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-sky-500']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-500/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-red-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-100']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-700']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-red-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-red-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-red-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-[280px_1fr]']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/60']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/40']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.25em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:border-primary-500/60']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-normal']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/90']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/60']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:shadow-black/50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-100/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-800/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-[0.3em]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-primary-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['isolate']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200/70']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-primary-100/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-950/60']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-10']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-neutral-900/70']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['border-t-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-primary-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-[70vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-[75vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['object-contain']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-[70vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-neutral-900/20']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:-translate-y-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-[70vh]']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-neutral-300']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            errorMessage: errorMessage,
            loading: loading,
            loadingDoc: loadingDoc,
            imageDownloadState: imageDownloadState,
            previewRef: previewRef,
            currentIndex: currentIndex,
            viewerSrc: viewerSrc,
            documents: documents,
            currentDoc: currentDoc,
            isPdf: isPdf,
            isImage: isImage,
            headerTitle: headerTitle,
            formattedCreatedAt: formattedCreatedAt,
            currentDocLabel: currentDocLabel,
            scrollToPreview: scrollToPreview,
            handleDownloadPdf: handleDownloadPdf,
            handleDownloadImage: handleDownloadImage,
            reloadSession: reloadSession,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=DocumentPreview.vue.js.map