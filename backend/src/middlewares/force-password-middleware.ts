import type { RequestHandler } from "express";

import { AppError } from "../utils/errors";

const allowedPaths = new Set<string>(["/admin/profile/change-password", "/profile/change-password"]);

export const enforcePasswordUpdate: RequestHandler = (request, _response, next) => {
  if (!request.user?.mustChangePassword) {
    return next();
  }
  const normalizedPath = `${request.baseUrl ?? ""}${request.path ?? ""}`;
  if (allowedPaths.has(request.path) || allowedPaths.has(normalizedPath)) {
    return next();
  }

  throw new AppError("Troca de senha obrigatória antes de continuar", 428);
};
