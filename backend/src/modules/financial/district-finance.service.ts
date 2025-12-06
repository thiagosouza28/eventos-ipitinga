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

const resolveOrderGross = (order: { amountToTransfer?: number | null; netAmountCents?: number | null; totalCents?: number | null }) => {
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

export class DistrictFinanceService {
  private ensureDistrictAccess(districtId: string, actor?: Express.User) {
    if (!actor) {
      throw new UnauthorizedError();
    }
    if (actor.role === "AdminGeral") {
      return;
    }
    if (actor.role === "AdminDistrital" && actor.districtScopeId === districtId) {
      return;
    }
    throw new UnauthorizedError("Acesso restrito ao distrito do administrador.");
  }

  async listSummaries(actor: Express.User) {
    if (actor.role === "AdminDistrital" && !actor.districtScopeId) {
      throw new AppError("Administrador distrital sem distrito vinculado.", 400);
    }

    const districtWhere =
      actor.role === "AdminDistrital"
        ? { id: actor.districtScopeId ?? undefined }
        : {};

    const districts = await prisma.district.findMany({
      where: districtWhere,
      orderBy: { name: "asc" }
    });

    if (!districts.length) {
      return [];
    }

    const districtIds = districts.map((district) => district.id);

    const admins = await prisma.user.findMany({
      where: {
        districtScopeId: { in: districtIds },
        role: "AdminDistrital",
        status: "ACTIVE"
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        districtScopeId: true,
        pixType: true,
        pixKey: true,
        pixOwnerName: true,
        pixOwnerDocument: true,
        pixBankName: true
      }
    });

    const adminByDistrict = admins.reduce<Record<string, typeof admins[0]>>((acc, admin) => {
      if (admin.districtScopeId && !acc[admin.districtScopeId]) {
        acc[admin.districtScopeId] = admin;
      }
      return acc;
    }, {});

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        registrations: {
          some: {
            districtId: { in: districtIds }
          }
        }
      },
      select: {
        id: true,
        amountToTransfer: true,
        netAmountCents: true,
        totalCents: true,
        transferStatus: true,
        registrations: {
          select: {
            districtId: true
          }
        }
      }
    });

    const ordersWithDistrict = orders
      .map((order) => {
        const regDistrict = order.registrations.find(
          (reg) => reg.districtId && districtIds.includes(reg.districtId)
        )?.districtId;
        const grossCents = resolveOrderGross(order);
        const netAfterFeeCents = applyFeeDiscount(grossCents);
        const feeCents = calcFeeAmount(grossCents);
        return {
          id: order.id,
          districtId: regDistrict ?? null,
          grossCents,
          netAfterFeeCents,
          feeCents,
          transferStatus: order.transferStatus ?? null
        };
      })
      .filter((order) => order.districtId);

    const transfers = await prisma.transfer.findMany({
      where: { districtId: { in: districtIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        districtId: true,
        amount: true,
        status: true,
        createdAt: true,
        mpTransferId: true
      }
    });

    const transfersByDistrict = transfers.reduce<Record<string, typeof transfers>>((acc, transfer) => {
      const list = acc[transfer.districtId] ?? [];
      list.push(transfer);
      acc[transfer.districtId] = list;
      return acc;
    }, {});

    return districts.map((district) => {
      const districtOrders = ordersWithDistrict.filter((order) => order.districtId === district.id);
      const totalCollectedNet = districtOrders.reduce((sum, order) => sum + order.netAfterFeeCents, 0);
      const totalFeesCents = districtOrders.reduce((sum, order) => sum + order.feeCents, 0);
      const pendingOrders = districtOrders.filter((order) => isPendingTransferStatus(order.transferStatus));
      const totalPendingNet = pendingOrders.reduce((sum, order) => sum + order.netAfterFeeCents, 0);

      const districtTransfers = transfersByDistrict[district.id] ?? [];
      const totalTransferred = districtTransfers.reduce((sum, transfer) => sum + (transfer.amount ?? 0), 0);

      const history = transfersByDistrict[district.id] ?? [];
      const admin = adminByDistrict[district.id];

      return {
        district: {
          id: district.id,
          name: district.name
        },
        admin: admin
          ? {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              pixType: admin.pixType,
              pixKey: admin.pixKey,
              pixOwnerName: admin.pixOwnerName,
              pixOwnerDocument: admin.pixOwnerDocument,
              pixBankName: admin.pixBankName
            }
          : null,
        totals: {
          collectedCents: totalCollectedNet,
          feesCents: totalFeesCents,
          transferredCents: totalTransferred,
          pendingCents: totalPendingNet
        },
        pendingOrdersCount: pendingOrders.length,
        availableToTransferCents: totalPendingNet,
        lastTransfer: history[0] ?? null,
        transfersCount: history.length
      };
    });
  }

  async listPendingOrders(districtId: string, actor?: Express.User) {
    this.ensureDistrictAccess(districtId, actor);

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        registrations: {
          some: { districtId }
        },
        OR: [
          { transferStatus: null },
          { transferStatus: OrderTransferStatus.PENDING },
          { transferStatus: OrderTransferStatus.FAILED }
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

  async listTransfers(districtId: string, actor?: Express.User) {
    this.ensureDistrictAccess(districtId, actor);

    return prisma.transfer.findMany({
      where: { districtId },
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

  async executeTransfer(districtId: string, actor: Express.User) {
    if (actor.role !== "AdminGeral") {
      throw new UnauthorizedError("Apenas o Administrador Geral pode realizar repasses.");
    }

    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      throw new NotFoundError("Distrito nao encontrado");
    }

    const districtAdmin = await prisma.user.findFirst({
      where: {
        districtScopeId: districtId,
        role: "AdminDistrital",
        status: "ACTIVE"
      },
      orderBy: { createdAt: "asc" }
    });

    if (!districtAdmin) {
      throw new AppError("Nenhum administrador distrital ativo encontrado para o distrito.", 400);
    }
    if (!districtAdmin.pixKey) {
      throw new AppError("Administrador distrital sem chave PIX configurada.", 400);
    }

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        registrations: {
          some: {
            districtId
          }
        },
        OR: [
          { transferStatus: null },
          { transferStatus: OrderTransferStatus.PENDING },
          { transferStatus: OrderTransferStatus.FAILED }
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
      throw new AppError("Nao ha pedidos pendentes de repasse para este distrito.", 400);
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
        districtId,
        districtAdminId: districtAdmin.id,
        amount: totalAmount,
        pixType: districtAdmin.pixType ?? null,
        pixKey: districtAdmin.pixKey,
        pixOwnerName: districtAdmin.pixOwnerName ?? null,
        pixOwnerDocument: districtAdmin.pixOwnerDocument ?? null,
        pixBankName: districtAdmin.pixBankName ?? null,
        orderIds: ordersWithAmounts.map((order) => order.id),
        status: TransferStatus.PENDING,
        createdById: actor.id ?? null
      }
    });

    try {
      const mpTransfer = await mercadoPagoService.createPixTransfer({
        amount: totalAmount,
        pixKey: districtAdmin.pixKey,
        pixType: districtAdmin.pixType ?? undefined,
        description: `Repasse distrito ${district.name}`
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

export const districtFinanceService = new DistrictFinanceService();
