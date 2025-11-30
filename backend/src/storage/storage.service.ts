import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { env } from "../config/env";
import { logger } from "../utils/logger";

class StorageService {
  private uploadsDir = path.resolve(__dirname, "..", "..", "tmp", "uploads");
  private supabase: SupabaseClient | null = null;
  private supabaseBucket: string | null = null;

  constructor() {
    if (env.STORAGE_DRIVER === "supabase") {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || !env.SUPABASE_STORAGE_BUCKET) {
        throw new Error(
          "Configuração Supabase incompleta. Defina SUPABASE_URL, SUPABASE_SERVICE_KEY e SUPABASE_STORAGE_BUCKET."
        );
      }
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      this.supabaseBucket = env.SUPABASE_STORAGE_BUCKET;
    }
  }

  async saveBase64Image(base64: string | null | undefined) {
    if (!base64) return null;
    if (/^https?:\/\//.test(base64)) {
      return base64;
    }

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Formato de imagem inválido");
    }
    const [, mime, data] = matches;
    if (!mime.startsWith("image/")) {
      throw new Error("Apenas imagens são suportadas");
    }

    const extension = mime.split("/")[1];
    const buffer = Buffer.from(data, "base64");
    const filename = `${randomUUID()}.${extension}`;

    if (env.STORAGE_DRIVER === "supabase" && this.supabase && this.supabaseBucket) {
      const filePath = `photos/${filename}`;
      const { error } = await this.supabase.storage.from(this.supabaseBucket).upload(filePath, buffer, {
        contentType: mime,
        upsert: false
      });
      if (error) {
        logger.error({ error }, "Falha ao enviar imagem para Supabase Storage");
        throw new Error("Não foi possível salvar a imagem no storage");
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(this.supabaseBucket)
        .getPublicUrl(filePath);
      logger.info({ filePath }, "Foto salva no Supabase Storage");
      return publicUrlData.publicUrl;
    }

    await fs.mkdir(this.uploadsDir, { recursive: true });
    const filepath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filepath, buffer);

    const publicUrl =
      env.STORAGE_DRIVER === "in-memory"
        ? `data:${mime};base64,${data}`
        : `${env.APP_URL}/uploads/${filename}`;

    logger.info({ filename }, "Foto salva no storage local");
    return publicUrl;
  }

  async saveBase64Attachment(base64: string | null | undefined, options?: { prefix?: string }) {
    if (!base64) return null;
    if (/^https?:\/\//.test(base64)) {
      return base64;
    }

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Formato de arquivo inválido");
    }
    const [, mime, data] = matches;
    const allowed = ["image/", "application/pdf"];
    const isAllowed = allowed.some((prefix) =>
      prefix.endsWith("/") ? mime.startsWith(prefix) : mime === prefix
    );
    if (!isAllowed) {
      throw new Error("Apenas arquivos de imagem ou PDF são suportados");
    }

    const resolveExtension = (type: string) => {
      if (type === "application/pdf") return "pdf";
      if (type === "image/jpeg" || type === "image/jpg") return "jpg";
      if (type === "image/png") return "png";
      if (type === "image/webp") return "webp";
      if (type === "image/gif") return "gif";
      if (type === "image/bmp") return "bmp";
      const [, subtype = "bin"] = type.split("/");
      return subtype || "bin";
    };

    const extension = resolveExtension(mime);
    const buffer = Buffer.from(data, "base64");
    const filename = `${options?.prefix ?? "proof"}-${randomUUID()}.${extension}`;
    const folder = "proofs";

    if (env.STORAGE_DRIVER === "supabase" && this.supabase && this.supabaseBucket) {
      const filePath = `${folder}/${filename}`;
      const { error } = await this.supabase.storage
        .from(this.supabaseBucket)
        .upload(filePath, buffer, { contentType: mime, upsert: false });
      if (error) {
        logger.error({ error }, "Falha ao enviar comprovante para Supabase Storage");
        throw new Error("Não foi possível salvar o arquivo no storage");
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(this.supabaseBucket)
        .getPublicUrl(filePath);
      logger.info({ filePath }, "Comprovante salvo no Supabase Storage");
      return publicUrlData.publicUrl;
    }

    const proofsDir = path.join(this.uploadsDir, folder);
    await fs.mkdir(proofsDir, { recursive: true });
    const filepath = path.join(proofsDir, filename);
    await fs.writeFile(filepath, buffer);

    const publicUrl =
      env.STORAGE_DRIVER === "in-memory"
        ? `data:${mime};base64,${data}`
        : `${env.APP_URL.replace(/\/$/, "")}/uploads/${folder}/${filename}`;
    logger.info({ filename }, "Comprovante salvo no storage local");
    return publicUrl;
  }

  /**
   * Verifica se a URL informada aponta para um arquivo gerenciado pelo storage
   * (local uploads ou bucket do Supabase). Utilizado para evitar tentar remover
   * imagens externas.
   */
  isManagedUrl(url: string | null | undefined) {
    if (!url) return false;
    try {
      const u = new URL(url);
      // Local uploads: {APP_URL}/uploads/{file}
      const isLocalUpload = u.pathname.startsWith("/uploads/");
      // Supabase public URL: .../storage/v1/object/public/{bucket}/photos/{file}
      const isSupabase = this.supabaseBucket
        ? u.pathname.includes(`/storage/v1/object/public/${this.supabaseBucket}/`)
        : false;
      return isLocalUpload || isSupabase;
    } catch {
      // Pode ser data URL (in-memory) — não gerenciado para remoção
      return false;
    }
  }

  /**
   * Remove um arquivo do storage com base na URL pública, quando possível.
   * Silenciosamente ignora URLs não gerenciadas.
   */
  async deleteByUrl(url: string | null | undefined) {
    if (!url) return;
    if (!this.isManagedUrl(url)) return;

    try {
      if (env.STORAGE_DRIVER === "supabase" && this.supabase && this.supabaseBucket) {
        // Extrair caminho após o bucket: photos/{filename}
        const u = new URL(url);
        const index = u.pathname.indexOf(`/storage/v1/object/public/${this.supabaseBucket}/`);
        if (index >= 0) {
          const objectPath = u.pathname.substring(index + (`/storage/v1/object/public/${this.supabaseBucket}/`).length);
          const { error } = await this.supabase.storage.from(this.supabaseBucket).remove([objectPath]);
          if (error) {
            logger.warn({ error, url }, "Falha ao remover imagem no Supabase Storage");
          } else {
            logger.info({ url }, "Imagem removida do Supabase Storage");
          }
        }
        return;
      }

      // Remoção local: mapear /uploads/{filename} para pasta tmp/uploads
      const u = new URL(url, env.APP_URL);
      if (u.pathname.startsWith("/uploads/")) {
        const filename = u.pathname.replace("/uploads/", "");
        const filepath = path.join(this.uploadsDir, filename);
        await fs.unlink(filepath).catch(() => undefined);
        logger.info({ filename }, "Imagem removida do storage local");
      }
    } catch (err) {
      logger.warn({ err, url }, "Nao foi possivel remover imagem anterior");
    }
  }
}

export const storageService = new StorageService();
