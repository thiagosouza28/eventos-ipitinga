import { Request, Response } from "express";

import { responsibleFinanceService } from "./responsible-finance.service";

export const listResponsibleFinanceHandler = async (request: Request, response: Response) => {
  try {
    const result = await responsibleFinanceService.listSummaries(request.user!);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao carregar financeiro por responsavel"
    });
  }
};

export const listResponsiblePendingOrdersHandler = async (request: Request, response: Response) => {
  try {
    const { id } = request.params;
    const result = await responsibleFinanceService.listPendingOrders(id, request.user);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao listar pedidos pendentes do responsavel"
    });
  }
};

export const listResponsibleTransfersHandler = async (request: Request, response: Response) => {
  try {
    const { id } = request.params;
    const result = await responsibleFinanceService.listTransfers(id, request.user);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao listar repasses do responsavel"
    });
  }
};

export const createResponsibleTransferHandler = async (request: Request, response: Response) => {
  try {
    const { responsibleUserId } = request.params;
    const transfer = await responsibleFinanceService.executeTransfer(responsibleUserId, request.user!);
    return response.json({
      message: "Repasse realizado com sucesso",
      status: transfer.status,
      transfer
    });
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao realizar repasse",
      status: "FAILED"
    });
  }
};
