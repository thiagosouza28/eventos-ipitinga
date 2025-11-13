import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

import { AppError } from "../utils/errors";

const uploadsDir = path.resolve(__dirname, "..", "..", "tmp", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeExtension = extension || ".png";
      callback(null, `${randomUUID()}${safeExtension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }
    callback(new AppError("Apenas arquivos de imagem são permitidos."));
  }
});
