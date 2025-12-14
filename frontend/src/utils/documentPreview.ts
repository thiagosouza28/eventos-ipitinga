import { router } from "../router";

export type PreviewDocumentInput = {
  id?: string;
  title: string;
  fileName: string;
  mimeType?: string;
  blob?: Blob;
  sourceUrl?: string;
};

export type PreviewDocument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  src?: string;
  sourceUrl?: string;
};

export type DocumentPreviewSession = {
  id: string;
  context: string;
  createdAt: string;
  defaultIndex?: number;
  documents: PreviewDocument[];
};

const STORAGE_PREFIX = "document-preview:";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

const ensureExtension = (fileName: string, mimeType: string) => {
  if (fileName.includes(".")) return fileName;
  if (mimeType.includes("pdf")) return `${fileName}.pdf`;
  if (mimeType.includes("png")) return `${fileName}.png`;
  if (mimeType.includes("jpg") || mimeType.includes("jpeg")) return `${fileName}.jpg`;
  return `${fileName}.bin`;
};

const serializeDocument = async (input: PreviewDocumentInput): Promise<PreviewDocument> => {
  const mimeType = input.mimeType || input.blob?.type || "application/pdf";
  const doc: PreviewDocument = {
    id: input.id ?? generateId(),
    title: input.title || input.fileName,
    fileName: ensureExtension(input.fileName || "documento", mimeType),
    mimeType,
    sourceUrl: input.sourceUrl
  };
  if (input.blob) {
    doc.src = URL.createObjectURL(input.blob);
  }
  return doc;
};

export const createPreviewSession = async (
  documents: PreviewDocumentInput[],
  options?: { context?: string; defaultIndex?: number; openInNewTab?: boolean }
) => {
  if (typeof window === "undefined") {
    throw new Error("A visualização de documentos só está disponível no navegador.");
  }
  const resolved = await Promise.all(documents.map(serializeDocument));
  const sessionId = generateId();
  const payload: DocumentPreviewSession = {
    id: sessionId,
    context: options?.context ?? "Documentos",
    createdAt: new Date().toISOString(),
    defaultIndex: options?.defaultIndex ?? 0,
    documents: resolved
  };
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(payload));
  } catch (error) {
    console.warn("Não foi possível persistir a sessão de visualização", error);
  }
  const targetUrl = router.resolve({ name: "document-preview", query: { session: sessionId } }).href;
  if (options?.openInNewTab !== false) {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }
  return { sessionId, targetUrl, documents: resolved };
};

export const consumePreviewSession = (sessionId: string): DocumentPreviewSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocumentPreviewSession;
  } catch (error) {
    console.error("Falha ao interpretar sessão de visualização", error);
    return null;
  }
};

export const clearPreviewSession = (sessionId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
};

