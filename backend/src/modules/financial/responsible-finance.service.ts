import { prisma } from "../../lib/prisma";
import { AppError, NotFoundError, UnauthorizedError } from "../../utils/errors";
import { OrderStatus } from "../../config/statuses";
import { OrderTransferStatus, TransferStatus } from "../../config/transfer-status";
import { mercadoPagoService } from "../../services/mercado-pago-transfer.service";

const FEE_RATE = 0.0094;
const applyFeeDiscount = (amount: number | null | undefined) =>
  Math.max(Math.round((amount ?? 0) * (1 - FEE_RATE)), 0);
const calcFeeAmount = (amount: number | null | undefined) =>
  Math.max(Math.round((amount ?? 0) * FEE_RATE), 0);

const resolveOrderGross = (order: {
  amountToTransfer?: number | null;
  netAmountCents?: number | null;
  totalCents?: number | null;
}) => {
  if (order.totalCents && order.totalCents > 0) {
    return order.totalCents;
  }
  if (order.amountToTransfer && order.amountToTransfer > 0) {
    return order.amountToTransfer;
  }
  if (order.netAmountCents && order.netAmountCents > 0) {
    return order.netAmountCents;
  }
  return 0;
};

const isPendingTransferStatus = (status?: string | null) =>
  !status || status === OrderTransferStatus.PENDING || status === OrderTransferStatus.FAILED;

const matchesResponsible = (
  order: { responsibleUserId?: string | null; event?: { createdById?: string | null } | null },
  responsibleUserId: string
) => order.responsibleUserId === responsibleUserId || (!order.responsibleUserId && order.event?.createdById === responsibleUserId);

export class ResponsibleFinanceService {
  private eventDistrictColumn?: boolean;

  private async hasEventDistrictColumn() {
    if (this.eventDistrictColumn !== undefined) {
      return this.eventDistrictColumn;
    }
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'Event'
    `;
    this.eventDistrictColumn = columns.some((col) => col.column_name === "districtId");
    return this.eventDistrictColumn;
  }
  private async ensureAccess(responsibleUserId: string, actor?: Express.User) {
    if (!actor) {
      throw new UnauthorizedError();
    }
    if (actor.role === "AdminGeral") {
      return;
    }
    if (actor.role === "AdminDistrital" && actor.districtScopeId) {
      const hasDistrict = await this.hasEventDistrictColumn();
      if (!hasDistrict) {
        return;
      }
      const count = await prisma.order.count({
        where: {
          status: OrderStatus.PAID,
          OR: [
            { responsibleUserId },
            { responsibleUserId: null, event: { createdById: responsibleUserId } }
          ],
          event: { districtId: actor.districtScopeId }
        }
      });
      if (count > 0) return;
      throw new UnauthorizedError("Sem permissao para visualizar este responsavel.");
    }
    throw new UnauthorizedError();
  }

  private async resolveEventScope(actor?: Express.User) {
    if (actor?.role === "AdminDistrital" && actor.districtScopeId) {
      const hasDistrict = await this.hasEventDistrictColumn();
      if (hasDistrict) {
        return { event: { districtId: actor.districtScopeId } };
      }
    }
    return {};
  }

  async listSummaries(actor: Express.User) {
    if (!actor) {
      throw new UnauthorizedError();
    }
    if (actor.role === "AdminDistrital" && !actor.districtScopeId) {
      throw new AppError("Administrador distrital sem distrito vinculado.", 400);
    }

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        ...(await this.resolveEventScope(actor))
      },
      select: {
        id: true,
        amountToTransfer: true,
        netAmountCents: true,
        totalCents: true,
        transferStatus: true,
        responsibleUserId: true,
        event: {
          select: {
            id: true,
            title: true,
            createdById: true
          }
        }
      }
    });

    const grouped: Record<
      string,
      Array<{
        id: string;
        grossCents: number;
        netAfterFeeCents: number;
        feeCents: number;
        transferStatus: string | null;
        eventId?: string | null;
      }>
    > = {};

    for (const order of orders) {
      const responsibleId = order.responsibleUserId ?? order.event?.createdById ?? null;
      if (!responsibleId) continue;
      const grossCents = resolveOrderGross(order);
      const netAfterFeeCents = applyFeeDiscount(grossCents);
      const feeCents = calcFeeAmount(grossCents);
      const current = grouped[responsibleId] ?? [];
      current.push({
        id: order.id,
        grossCents,
        netAfterFeeCents,
        feeCents,
        transferStatus: order.transferStatus ?? null,
        eventId: order.event?.id ?? null
      });
      grouped[responsibleId] = current;
    }

    const responsibleIds = Object.keys(grouped);
    if (!responsibleIds.length) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: { id: { in: responsibleIds } },
      select: {
        id: true,
        name: true,
        email: true,
        pixType: true,
        pixKey: true,
        pixOwnerName: true,
        pixOwnerDocument: true,
        pixBankName: true
      }
    });
    const userById = users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const transfers = await prisma.transfer.findMany({
      where: { responsibleUserId: { in: responsibleIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        responsibleUserId: true,
        amount: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        mpTransferId: true,
        orderIds: true,
        pixKey: true,
        pixType: true,
        pixOwnerName: true,
        pixOwnerDocument: true,
        pixBankName: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const transfersByResponsible = transfers.reduce<Record<string, typeof transfers>>((acc, transfer) => {
      const list = acc[transfer.responsibleUserId ?? ""] ?? [];
      list.push(transfer);
      acc[transfer.responsibleUserId ?? ""] = list;
      return acc;
    }, {});

    return responsibleIds.map((id) => {
      const responsibleOrders = grouped[id] ?? [];
      const totalGross = responsibleOrders.reduce((sum, order) => sum + order.grossCents, 0);
      const totalFees = calcFeeAmount(totalGross);
      const totalNet = Math.max(totalGross - totalFees, 0);
      const pendingOrders = responsibleOrders.filter((order) => isPendingTransferStatus(order.transferStatus));
      const transferredOrders = responsibleOrders.filter(
        (order) => order.transferStatus === OrderTransferStatus.TRANSFERRED
      );
      const pendingNet = pendingOrders.reduce((sum, order) => sum + order.netAfterFeeCents, 0);
      const transferredNet = transferredOrders.reduce((sum, order) => sum + order.netAfterFeeCents, 0);
      const history = transfersByResponsible[id] ?? [];
      const user = userById[id];

      return {
        responsible: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              pixType: user.pixType,
              pixKey: user.pixKey,
              pixOwnerName: user.pixOwnerName,
              pixOwnerDocument: user.pixOwnerDocument,
              pixBankName: user.pixBankName
            }
          : { id, name: "Responsável", email: null, pixType: null, pixKey: null },
        totals: {
          collectedCents: totalGross,
          feesCents: totalFees,
          netCents: totalNet,
          transferredCents: transferredNet,
          availableCents: pendingNet
        },
        pendingOrdersCount: pendingOrders.length,
        lastTransfer: history[0] ?? null,
        transfersCount: history.length
      };
    });
  }

  async listPendingOrders(responsibleUserId: string, actor?: Express.User) {
    await this.ensureAccess(responsibleUserId, actor);
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        ...(await this.resolveEventScope(actor)),
        AND: [
          {
            OR: [
              { responsibleUserId },
              { responsibleUserId: null, event: { createdById: responsibleUserId } }
            ]
          },
          {
            OR: [
              { transferStatus: null },
              { transferStatus: OrderTransferStatus.PENDING },
              { transferStatus: OrderTransferStatus.FAILED }
            ]
          }
        ]
      },
      orderBy: { paidAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            title: true
          }
        },
        registrations: {
          select: {
            id: true,
            fullName: true,
            priceCents: true,
            districtId: true
          }
        }
      }
    });

    return pendingOrders.map((order) => ({
      id: order.id,
      amountToTransfer: applyFeeDiscount(resolveOrderGross(order)),
      transferStatus: order.transferStatus ?? OrderTransferStatus.PENDING,
      event: order.event,
      registrations: order.registrations
    }));
  }

  async listTransfers(responsibleUserId: string, actor?: Express.User) {
    await this.ensureAccess(responsibleUserId, actor);

    return prisma.transfer.findMany({
      where: { responsibleUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        mpTransferId: true,
        orderIds: true,
        pixKey: true,
        pixType: true,
        pixOwnerName: true,
        pixOwnerDocument: true,
        pixBankName: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async executeTransfer(responsibleUserId: string, actor: Express.User) {
    if (!actor || (actor.role !== "AdminGeral" && actor.role !== "AdminDistrital")) {
      throw new UnauthorizedError("Apenas administradores podem realizar repasses.");
    }
    await this.ensureAccess(responsibleUserId, actor);

    const responsibleUser = await prisma.user.findUnique({ where: { id: responsibleUserId } });
    if (!responsibleUser) {
      throw new NotFoundError("Responsavel nao encontrado");
    }
    if (!responsibleUser.pixKey) {
      throw new AppError("Responsavel sem chave PIX configurada.", 400);
    }

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        ...(await this.resolveEventScope(actor)),
        AND: [
          {
            OR: [
              { responsibleUserId },
              { responsibleUserId: null, event: { createdById: responsibleUserId } }
            ]
          },
          {
            OR: [
              { transferStatus: null },
              { transferStatus: OrderTransferStatus.PENDING },
              { transferStatus: OrderTransferStatus.FAILED }
            ]
          }
        ]
      },
      select: {
        id: true,
        amountToTransfer: true,
        netAmountCents: true,
        totalCents: true,
        transferStatus: true
      }
    });

    if (!pendingOrders.length) {
      throw new AppError("Nao ha pedidos pendentes de repasse para este responsavel.", 400);
    }

    const ordersWithAmounts = pendingOrders.map((order) => ({
      ...order,
      computedAmount: applyFeeDiscount(resolveOrderGross(order))
    }));

    const totalAmount = ordersWithAmounts.reduce((sum, order) => sum + (order.computedAmount ?? 0), 0);
    if (totalAmount <= 0) {
      throw new AppError("Total pendente para repasse igual a zero.", 400);
    }

    const transfer = await prisma.transfer.create({
      data: {
        responsibleUserId,
        districtId: null,
        districtAdminId: null,
        amount: totalAmount,
        pixType: responsibleUser.pixType ?? null,
        pixKey: responsibleUser.pixKey,
        pixOwnerName: responsibleUser.pixOwnerName ?? null,
        pixOwnerDocument: responsibleUser.pixOwnerDocument ?? null,
        pixBankName: responsibleUser.pixBankName ?? null,
        orderIds: ordersWithAmounts.map((order) => order.id),
        status: TransferStatus.PENDING,
        createdById: actor.id ?? null
      }
    });

    try {
      const mpTransfer = await mercadoPagoService.createPixTransfer({
        amount: totalAmount,
        pixKey: responsibleUser.pixKey,
        pixType: responsibleUser.pixType ?? undefined,
        description: `Repasse responsavel ${responsibleUser.name ?? ""}`.trim()
      });

      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const savedTransfer = await tx.transfer.update({
          where: { id: transfer.id },
          data: {
            status: TransferStatus.SUCCESS,
            mpTransferId: mpTransfer.id ?? null,
            errorMessage: null
          }
        });

        await tx.order.updateMany({
          where: { id: { in: ordersWithAmounts.map((order) => order.id) } },
          data: {
            transferStatus: OrderTransferStatus.TRANSFERRED,
            transferBatchId: transfer.id
          }
        });

        for (const order of ordersWithAmounts) {
          if (order.amountToTransfer === order.computedAmount) {
            continue;
          }
          await tx.order.update({
            where: { id: order.id },
            data: { amountToTransfer: order.computedAmount }
          });
        }

        return savedTransfer;
      });

      return updatedTransfer;
    } catch (error: any) {
      const message = error?.message ?? "Falha ao executar transferencia PIX";
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.FAILED,
          errorMessage: message
        }
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(message, 502);
    }
  }
}

export const responsibleFinanceService = new ResponsibleFinanceService();
