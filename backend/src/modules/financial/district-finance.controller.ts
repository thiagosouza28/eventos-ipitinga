import { Request, Response } from "express";

import { districtFinanceService } from "./district-finance.service";

export const listDistrictFinanceHandler = async (request: Request, response: Response) => {
  try {
    const result = await districtFinanceService.listSummaries(request.user!);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao carregar financeiro distrital"
    });
  }
};

export const listDistrictPendingOrdersHandler = async (request: Request, response: Response) => {
  try {
    const { id } = request.params;
    const result = await districtFinanceService.listPendingOrders(id, request.user);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao listar pedidos pendentes do distrito"
    });
  }
};

export const listDistrictTransfersHandler = async (request: Request, response: Response) => {
  try {
    const { id } = request.params;
    const result = await districtFinanceService.listTransfers(id, request.user);
    return response.json(result);
  } catch (error: any) {
    return response.status(error.statusCode ?? 500).json({
      message: error.message ?? "Erro ao listar repasses do distrito"
    });
  }
};

export const createDistrictTransferHandler = async (request: Request, response: Response) => {
  try {
    const { districtId } = request.params;
    const transfer = await districtFinanceService.executeTransfer(districtId, request.user!);
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
