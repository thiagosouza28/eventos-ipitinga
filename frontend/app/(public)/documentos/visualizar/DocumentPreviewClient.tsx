"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

import {
  clearPreviewSession,
  consumePreviewSession,
  type DocumentPreviewSession,
  type PreviewDocument
} from "@/lib/utils/documentPreview";
import { BaseCard } from "@/components/ui/BaseCard";
import { resolveReceiptFileUrl } from "@/lib/utils/receiptUrl";

export default function DocumentPreviewPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<DocumentPreviewSession | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewerSrc, setViewerSrc] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "png" | "">("");

  const blobCache = useRef<Map<string, Blob>>(new Map());
  const urlCache = useRef<Map<string, string>>(new Map());

  const documents = session?.documents ?? [];
  const currentDoc = documents[currentIndex];

  const isPdf = useMemo(() => (currentDoc?.mimeType || "").toLowerCase().includes("pdf"), [currentDoc]);
  const isImage = useMemo(() => (currentDoc?.mimeType || "").toLowerCase().startsWith("image/"), [currentDoc]);
  const headerTitle = session?.context ?? "Visualização de documentos";
  const formattedCreatedAt = session?.createdAt ? new Date(session.createdAt).toLocaleString("pt-BR") : "";

  const normalizeDocumentUrl = (value?: string) => {
    if (!value) return value;
    if (value.startsWith("blob:") || value.startsWith("data:")) return value;
    if (/\/receipts\/[^/]+\.(?:pdf|png)(?:\?|$)/i.test(value)) {
      return resolveReceiptFileUrl(value, value.toLowerCase().includes(".png") ? "png" : "pdf");
    }
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
    setLoadingDoc(true);
    setPreviewError("");
    try {
      const cached = urlCache.current.get(doc.id) ?? doc.src;
      if (cached) {
        urlCache.current.set(doc.id, cached);
        setViewerSrc(cached);
        return;
      }
      if (doc.sourceUrl) {
        const sourceUrl = normalizeDocumentUrl(doc.sourceUrl);
        if (!sourceUrl) {
          throw new Error("Origem do documento não informada.");
        }
        const response = await fetch(sourceUrl, { credentials: "include" });
        if (!response.ok) {
          const message = await resolveResponseMessage(response, "Não foi possível carregar o documento.");
          throw new Error(message);
        }
        const blob = await response.blob();
        blobCache.current.set(doc.id, blob);
        const url = URL.createObjectURL(blob);
        urlCache.current.set(doc.id, url);
        setViewerSrc(url);
      } else {
        throw new Error("Origem do documento não informada.");
      }
    } catch (error: any) {
      console.error("Falha ao preparar visualização", error);
      setPreviewError(error?.message ?? "Não foi possível carregar o documento.");
      setViewerSrc("");
    } finally {
      setLoadingDoc(false);
    }
  };

  const loadSession = () => {
    const sessionId = searchParams.get("session") ?? "";
    setSessionError("");
    setPreviewError("");
    setActionError("");
    setLoading(true);
    if (!sessionId) {
      setSessionError("Nenhuma sessão de documento foi informada.");
      setLoading(false);
      return;
    }
    const payload = consumePreviewSession(sessionId);
    if (!payload || !payload.documents?.length) {
      setSessionError("Sessão expirada ou inválida. Gere o documento novamente.");
      setLoading(false);
      return;
    }
    blobCache.current.clear();
    urlCache.current.clear();
    setViewerSrc("");
    setSession(payload);
    const startIndex = Math.min(payload.defaultIndex ?? 0, payload.documents.length - 1);
    setCurrentIndex(startIndex);
    setLoading(false);
    void ensureDocUrl(payload.documents[startIndex]);
  };

  useEffect(() => {
    loadSession();
    return () => {
      if (session) {
        clearPreviewSession(session.id);
      }
      urlCache.current.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const doc = documents[currentIndex];
    if (!doc) return;
    const cachedUrl = urlCache.current.get(doc.id) ?? doc.src;
    if (cachedUrl) {
      setViewerSrc(cachedUrl);
    }
    void ensureDocUrl(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const fetchDocumentBlob = async (
    doc: PreviewDocument,
    options: { sourceUrl?: string; cacheSuffix?: string } = {}
  ) => {
    const cacheKey = `${doc.id}:${options.cacheSuffix ?? "document"}`;
    if (blobCache.current.has(cacheKey)) {
      return blobCache.current.get(cacheKey)!;
    }
    const rawUrl = options.sourceUrl ?? urlCache.current.get(doc.id) ?? doc.src ?? doc.sourceUrl;
    const targetUrl = normalizeDocumentUrl(rawUrl);
    if (!targetUrl) {
      throw new Error("Documento indisponível para download.");
    }
    const response = await fetch(targetUrl, { credentials: "include" });
    if (!response.ok) {
      const message = await resolveResponseMessage(response, "Não foi possível baixar o documento.");
      throw new Error(message);
    }
    const blob = await response.blob();
    blobCache.current.set(cacheKey, blob);
    return blob;
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

  const handleDownloadPdf = async () => {
    if (!currentDoc) return;
    setActionError("");
    setDownloadingFormat("pdf");
    try {
      const blob = await fetchDocumentBlob(currentDoc, { cacheSuffix: "pdf" });
      const fileName = currentDoc.fileName.toLowerCase().includes(".pdf")
        ? currentDoc.fileName
        : `${currentDoc.fileName}.pdf`;
      triggerDownload(blob, fileName);
    } catch (error: any) {
      setActionError(error?.message ?? "Não foi possível baixar o PDF.");
    } finally {
      setDownloadingFormat("");
    }
  };

  const handleDownloadImage = async () => {
    if (!currentDoc) return;
    setActionError("");
    setDownloadingFormat("png");
    try {
      const imageSourceUrl = currentDoc.imageSourceUrl ?? (isImage ? currentDoc.sourceUrl : undefined);
      if (!imageSourceUrl) {
        throw new Error("A versão em imagem não está disponível para este documento.");
      }
      const blob = await fetchDocumentBlob(currentDoc, {
        sourceUrl: imageSourceUrl,
        cacheSuffix: "png"
      });
      const fileName = currentDoc.fileName.replace(/\.[^.]+$/, "") || `comprovante-${currentDoc.id}`;
      triggerDownload(blob, `${fileName}.png`);
    } catch (error: any) {
      setActionError(error?.message ?? "Não foi possível baixar a imagem.");
    } finally {
      setDownloadingFormat("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
          <div className="h-32 animate-pulse border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-[70vh] animate-pulse border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <header className="flex flex-col gap-4 border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-700 dark:text-primary-200">
              PRÉ-VISUALIZAÇÃO
            </p>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">{headerTitle}</h1>
            <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
              O comprovante é carregado automaticamente e pode ser salvo em PDF ou imagem.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary-500 dark:hover:bg-primary-400"
              disabled={loadingDoc || !currentDoc || Boolean(downloadingFormat)}
              onClick={handleDownloadPdf}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              {downloadingFormat === "pdf" ? "Preparando PDF..." : "Baixar PDF"}
            </button>
            {currentDoc?.imageSourceUrl || isImage ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-primary-300 bg-white px-5 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-primary-500 dark:bg-neutral-900 dark:text-primary-100 dark:hover:bg-neutral-800"
                disabled={loadingDoc || !currentDoc || Boolean(downloadingFormat)}
                onClick={handleDownloadImage}
              >
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                {downloadingFormat === "png" ? "Preparando imagem..." : "Baixar imagem"}
              </button>
            ) : null}
          </div>
        </header>

        {actionError ? (
          <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            {actionError}
          </div>
        ) : null}

        {sessionError ? (
          <BaseCard>
            <div className="text-sm text-red-600 dark:text-red-300">{sessionError}</div>
          </BaseCard>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-4">
              <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400">
                  Visualizando
                </p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
                  {currentDoc?.title ?? "Documento"}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{currentDoc?.fileName}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <span className="border border-primary-200 bg-primary-50 px-3 py-1 font-semibold text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/20 dark:text-primary-100">
                    {isPdf ? "PDF" : isImage ? "Imagem" : currentDoc?.mimeType || "Arquivo"}
                  </span>
                  {formattedCreatedAt ? (
                    <span className="border border-neutral-200 bg-neutral-100 px-3 py-1 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      Gerado em {formattedCreatedAt}
                    </span>
                  ) : null}
                </div>
              </div>

              {documents.length > 1 ? (
                <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-300">
                    Documentos
                  </p>
                  <div className="mt-3 space-y-2">
                    {documents.map((doc, index) => (
                      <button
                        key={doc.id}
                        type="button"
                        className={[
                          "w-full border px-3 py-3 text-left text-sm font-semibold transition hover:border-primary-300 hover:text-primary-700 dark:border-white/10 dark:hover:border-primary-500/60 dark:hover:text-primary-100",
                          index === currentIndex
                            ? "border-primary-300 bg-primary-50/70 text-primary-800 shadow-sm shadow-primary-200/60 dark:border-primary-500/70 dark:bg-primary-500/10 dark:text-primary-100"
                            : "border-neutral-200/80 bg-white/60 text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200"
                        ].join(" ")}
                        onClick={() => setCurrentIndex(index)}
                      >
                        <span className="block truncate">{doc.title}</span>
                        <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                          {doc.fileName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>

            <section className="border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              {previewError ? (
                <div className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                  {previewError}
                </div>
              ) : null}

              <div className="relative isolate overflow-auto border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
                {loadingDoc ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/80 text-sm text-neutral-600 backdrop-blur dark:bg-neutral-900/70 dark:text-neutral-200">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent dark:border-primary-200" />
                    Carregando documento...
                  </div>
                ) : null}

                {viewerSrc ? (
                  isPdf ? (
                    <iframe src={viewerSrc} title="Pré-visualização em PDF" className="h-[70vh] w-full border-0" />
                  ) : isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewerSrc}
                      alt={currentDoc?.title ?? "Pré-visualização do documento"}
                      className="mx-auto block max-h-[75vh] w-full bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-neutral-600 dark:text-neutral-200">
                      <p>Não conseguimos exibir este formato aqui.</p>
                      {currentDoc?.sourceUrl || viewerSrc ? (
                        <a
                          href={currentDoc?.sourceUrl || viewerSrc}
                          target="_blank"
                          rel="noopener"
                          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 transition hover:-translate-y-0.5 dark:bg-white dark:text-neutral-900"
                        >
                          Abrir original
                        </a>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div className="flex h-[70vh] items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-300">
                    {loadingDoc ? "Carregando documento..." : "Documento ainda não carregado."}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
