import type { Request, Response } from "express";
import { z } from "zod";

import { registrationsDashboardService } from "./registrations-dashboard.service";
import { AppError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { getScopedMinistryIds } from "../../utils/user-scope";

const REPORT_ERROR_MESSAGE = "Não foi possível carregar as métricas de inscrições.";
const reportErrorPayload = { success: false, message: REPORT_ERROR_MESSAGE };

const respondReportError = (response: Response, error: unknown, context: string) => {
  logger.error({ error }, context);
  const status = error instanceof AppError ? error.statusCode : 500;
  return response.status(status).json(reportErrorPayload);
};

const optionalId = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (s.length === 0) return undefined;
  const isUuid = z.string().uuid().safeParse(s).success;
  const isCuid = z.string().cuid().safeParse(s).success;
  return isUuid || isCuid ? s : undefined;
}, z.string().optional());

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional()
);

const dashboardFiltersSchema = z.object({
  eventId: optionalId,
  startDate: optionalDate,
  endDate: optionalDate
});

type DashboardFilters = z.infer<typeof dashboardFiltersSchema> & { districtId?: string; churchId?: string; ministryIds?: string[] };

const applyScopedFilters = (filters: DashboardFilters, user?: Request["user"]) => {
  if (!user) return filters;
  const scoped: DashboardFilters = { ...filters };
  if (user.role === "DiretorLocal") {
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
    if (user.churchId) {
      scoped.churchId = user.churchId;
    }
  } else if (user.role === "AdminDistrital") {
    if (user.districtScopeId) {
      scoped.districtId = user.districtScopeId;
    }
  }
  return scoped;
};

export const registrationsDashboardHandler = async (request: Request, response: Response) => {
  try {
    const filters = dashboardFiltersSchema.parse(request.query);
    const scopedFilters = applyScopedFilters(filters, request.user);
    const ministryIds = getScopedMinistryIds(request.user);

    const data = await registrationsDashboardService.getMetrics({
      ...scopedFilters,
      ministryIds
    });

    return response.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.flatten() }, "Parâmetros inválidos");
      return response.status(400).json(reportErrorPayload);
    }
    return respondReportError(response, error, "Erro ao carregar métricas de inscrições");
  }
};
