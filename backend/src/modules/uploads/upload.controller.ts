import type { Request, Response } from "express";

import { env } from "../../config/env";

const resolvePublicBaseUrl = () => {
  const apiUrl = env.API_URL ?? "";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const uploadImageHandler = (request: Request, response: Response) => {
  if (!request.file) {
    return response.status(400).json({ message: "Arquivo não enviado." });
  }

  const fileName = request.file.filename;
  const publicBase = resolvePublicBaseUrl().replace(/\/$/, "");
  const url = `${publicBase}/uploads/${fileName}`;

  return response.status(201).json({
    fileName,
    url,
    size: request.file.size,
    mimeType: request.file.mimetype
  });
};
