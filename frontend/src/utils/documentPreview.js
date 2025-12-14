import { router } from "../router";
const STORAGE_PREFIX = "document-preview:";
const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `doc-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};
const ensureExtension = (fileName, mimeType) => {
    if (fileName.includes("."))
        return fileName;
    if (mimeType.includes("pdf"))
        return `${fileName}.pdf`;
    if (mimeType.includes("png"))
        return `${fileName}.png`;
    if (mimeType.includes("jpg") || mimeType.includes("jpeg"))
        return `${fileName}.jpg`;
    return `${fileName}.bin`;
};
const serializeDocument = async (input) => {
    const mimeType = input.mimeType || input.blob?.type || "application/pdf";
    const doc = {
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
export const createPreviewSession = async (documents, options) => {
    if (typeof window === "undefined") {
        throw new Error("A visualização de documentos só está disponível no navegador.");
    }
    const resolved = await Promise.all(documents.map(serializeDocument));
    const sessionId = generateId();
    const payload = {
        id: sessionId,
        context: options?.context ?? "Documentos",
        createdAt: new Date().toISOString(),
        defaultIndex: options?.defaultIndex ?? 0,
        documents: resolved
    };
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(payload));
    }
    catch (error) {
        console.warn("Não foi possível persistir a sessão de visualização", error);
    }
    const targetUrl = router.resolve({ name: "document-preview", query: { session: sessionId } }).href;
    if (options?.openInNewTab !== false) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    return { sessionId, targetUrl, documents: resolved };
};
export const consumePreviewSession = (sessionId) => {
    if (typeof window === "undefined")
        return null;
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        console.error("Falha ao interpretar sessão de visualização", error);
        return null;
    }
};
export const clearPreviewSession = (sessionId) => {
    if (typeof window === "undefined")
        return;
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
};
//# sourceMappingURL=documentPreview.js.map