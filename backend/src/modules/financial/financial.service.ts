import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";

export class FinancialService {
  /**
   * Retorna o resumo financeiro de um evento
   */
  async getEventSummary(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError("Evento nao encontrado");
    }

    // Verificar se as colunas existem antes de usar
    const columns = await prisma.$queryRaw<Array<{ column_name?: string; COLUMN_NAME?: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'Order'
    `;
    const columnNames = columns.map(
      (col) => col.column_name ?? col.COLUMN_NAME ?? (col as any).name ?? ""
    );
    const hasFeeCents = columnNames.includes("feeCents");
    const hasNetAmountCents = columnNames.includes("netAmountCents");

    // Usar query raw para evitar problemas com Prisma Client não regenerado
    const feeCentsSelect = hasFeeCents ? "COALESCE(o.feeCents, 0) as feeCents" : "0 as feeCents";
    const netAmountCentsSelect = hasNetAmountCents ? "COALESCE(o.netAmountCents, o.totalCents) as netAmountCents" : "o.totalCents as netAmountCents";

    const paidOrdersRaw = await prisma.$queryRawUnsafe<Array<{
      id: string;
      totalCents: bigint | number;
      feeCents: bigint | number | null;
      netAmountCents: bigint | number | null;
      paymentMethod?: string | null;
    }>>(`
      SELECT 
        o.id,
        o.totalCents,
        ${feeCentsSelect},
        ${netAmountCentsSelect},
        o.paymentMethod
      FROM \`Order\` o
      WHERE o.eventId = '${eventId}' AND o.status = 'PAID'
    `);

    // Converter BigInt para Number
    const paidOrdersBase = paidOrdersRaw.map(row => ({
      id: row.id,
      totalCents: Number(row.totalCents),
      feeCents: Number(row.feeCents || 0),
      netAmountCents: Number(row.netAmountCents || row.totalCents),
      paymentMethod: (row as any).paymentMethod as string | null
    }));

    // Buscar registrations separadamente para evitar problemas com Prisma Client
    const orderIds = paidOrdersBase.map(o => o.id);
    const registrations = orderIds.length > 0 ? await prisma.registration.findMany({
      where: { orderId: { in: orderIds } },
      select: {
        id: true,
        orderId: true,
        priceCents: true,
        district: {
          select: {
            id: true,
            name: true
          }
        },
        church: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }) : [];

    // Agrupar registrations por orderId
    const registrationsByOrderId = registrations.reduce((acc, reg) => {
      if (!acc[reg.orderId]) {
        acc[reg.orderId] = [];
      }
      acc[reg.orderId].push(reg);
      return acc;
    }, {} as Record<string, typeof registrations>);

    const paidOrders = paidOrdersBase.map(order => ({
      ...order,
      registrations: registrationsByOrderId[order.id] || []
    }));

    const pendingOrdersRaw = await prisma.order.findMany({
      where: { eventId, status: "PENDING" },
      select: {
        id: true,
        totalCents: true,
        paymentMethod: true
      }
    });

    const pendingOrders = pendingOrdersRaw.map((order) => ({
      id: order.id,
      totalCents: Number(order.totalCents || 0),
      paymentMethod: (order.paymentMethod ?? null) as string | null
    }));

    // Calcular totais
    let totalGrossCents = 0;
    let totalFeesCents = 0;
    let totalNetCents = 0;
    let pixGrossCents = 0;
    let pixFeesCents = 0;
    let pixNetCents = 0;
    let cashCents = 0;

    for (const order of paidOrders) {
      totalGrossCents += order.totalCents;
      totalFeesCents += order.feeCents;
      totalNetCents += order.netAmountCents;
      const method = (order as any).paymentMethod ? String((order as any).paymentMethod).toUpperCase() : '';
      if (method === 'PIX_MP') {
        pixGrossCents += order.totalCents;
        pixFeesCents += order.feeCents;
        pixNetCents += order.netAmountCents;
      } else if (method === 'CASH') {
        cashCents += order.totalCents;
      }
    }

    // Total de despesas
    let expensesCents = 0;
    try {
      const expensesTotal = await prisma.expense.aggregate({
        where: { eventId },
        _sum: {
          amountCents: true
        }
      });
      expensesCents = expensesTotal._sum.amountCents || 0;
    } catch (error: any) {
      // Se a tabela não existir, assumir 0 despesas
      if (error.code === "P2021" || error.code === "P2022" || error.message?.includes("does not exist")) {
        expensesCents = 0;
      } else {
        throw error;
      }
    }

    // Saldo do caixa (líquido - despesas)
    const cashBalanceCents = totalNetCents - expensesCents;

    // Contagem de inscrições pagas
    const paidRegistrationsCount = paidOrders.reduce(
      (sum, order) => sum + order.registrations.length,
      0
    );

    let pendingGrossCents = 0;
    let pendingPixGrossCents = 0;
    let pendingCashGrossCents = 0;
    for (const order of pendingOrders) {
      pendingGrossCents += order.totalCents;
      const method = order.paymentMethod ? order.paymentMethod.toUpperCase() : "";
      if (method === "PIX_MP") {
        pendingPixGrossCents += order.totalCents;
      } else if (method === "CASH") {
        pendingCashGrossCents += order.totalCents;
      }
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug
      },
      totals: {
        grossCents: totalGrossCents,
        feesCents: totalFeesCents,
        netCents: totalNetCents,
        pix: { grossCents: pixGrossCents, feesCents: pixFeesCents, netCents: pixNetCents },
        cashCents: cashCents,
        generalNetCents: pixNetCents + cashCents,
        expensesCents,
        cashBalanceCents
      },
      paidRegistrationsCount,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
      pendingTotals: {
        grossCents: pendingGrossCents,
        pixGrossCents: pendingPixGrossCents,
        cashGrossCents: pendingCashGrossCents
      }
    };
  }

  /**
   * Retorna o resumo financeiro por distrito
   */
  async getDistrictSummary(eventId: string, districtId: string) {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      throw new NotFoundError("Distrito nao encontrado");
    }

    const paidRegistrations = await prisma.registration.findMany({
      where: {
        eventId,
        districtId,
        status: "PAID"
      },
      select: {
        id: true,
        priceCents: true,
        order: {
          select: {
            id: true,
            status: true,
            totalCents: true,
            feeCents: true,
            netAmountCents: true
          }
        },
        church: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    let totalGrossCents = 0;
    let totalFeesCents = 0;
    let totalNetCents = 0;

    for (const registration of paidRegistrations) {
      const order = registration.order;
      if (order.status === "PAID") {
        const priceCents = registration.priceCents || 0;
        totalGrossCents += priceCents;
        // Distribuir taxas proporcionalmente (assumir 1 registro por pedido se não houver preço)
        const registrationShare = priceCents > 0 && order.totalCents > 0 ? priceCents / order.totalCents : 1;
        const feeCents = (order as any).feeCents;
        const netAmountCents = (order as any).netAmountCents;
        totalFeesCents += (feeCents !== undefined && feeCents !== null ? feeCents : 0) * registrationShare;
        totalNetCents += (netAmountCents !== undefined && netAmountCents !== null ? netAmountCents : order.totalCents) * registrationShare;
      }
    }

    return {
      district: {
        id: district.id,
        name: district.name
      },
      totals: {
        grossCents: totalGrossCents,
        feesCents: totalFeesCents,
        netCents: totalNetCents
      },
      registrationsCount: paidRegistrations.length
    };
  }

  /**
   * Retorna o resumo financeiro por igreja
   */
  async getChurchSummary(eventId: string, churchId: string) {
    const church = await prisma.church.findUnique({
      where: { id: churchId },
      include: { district: true }
    });
    if (!church) {
      throw new NotFoundError("Igreja nao encontrada");
    }

    const paidRegistrations = await prisma.registration.findMany({
      where: {
        eventId,
        churchId,
        status: "PAID"
      },
      select: {
        id: true,
        priceCents: true,
        order: {
          select: {
            id: true,
            status: true,
            totalCents: true,
            feeCents: true,
            netAmountCents: true
          }
        }
      }
    });

    let totalGrossCents = 0;
    let totalFeesCents = 0;
    let totalNetCents = 0;

    for (const registration of paidRegistrations) {
      const order = registration.order;
      if (order.status === "PAID") {
        const priceCents = registration.priceCents || 0;
        totalGrossCents += priceCents;
        // Distribuir taxas proporcionalmente (assumir 1 registro por pedido se não houver preço)
        const registrationShare = priceCents > 0 && order.totalCents > 0 ? priceCents / order.totalCents : 1;
        const feeCents = (order as any).feeCents;
        const netAmountCents = (order as any).netAmountCents;
        totalFeesCents += (feeCents !== undefined && feeCents !== null ? feeCents : 0) * registrationShare;
        totalNetCents += (netAmountCents !== undefined && netAmountCents !== null ? netAmountCents : order.totalCents) * registrationShare;
      }
    }

    return {
      church: {
        id: church.id,
        name: church.name,
        district: {
          id: church.district.id,
          name: church.district.name
        }
      },
      totals: {
        grossCents: totalGrossCents,
        feesCents: totalFeesCents,
        netCents: totalNetCents
      },
      registrationsCount: paidRegistrations.length
    };
  }

  async getEventFinancialReportData(eventId: string) {
    const summary = await this.getEventSummary(eventId);
    let expenses: Array<{ id: string; description: string; amountCents: number; date: Date; madeBy: string }> = [];
    try {
      expenses = await prisma.expense.findMany({
        where: { eventId },
        orderBy: { date: "asc" },
        select: {
          id: true,
          description: true,
          amountCents: true,
          date: true,
          madeBy: true
        }
      });
    } catch (error: any) {
      if (error.code === "P2021" || error.code === "P2022" || error.message?.includes("does not exist")) {
        expenses = [];
      } else {
        throw error;
      }
    }

    return {
      ...summary,
      expenses
    };
  }

  /**
   * Retorna o resumo financeiro geral (todos os eventos)
   */
  async getGeneralSummary() {
    try {
      // Verificar se as colunas existem antes de usar
    const columns = await prisma.$queryRaw<Array<{ column_name?: string; COLUMN_NAME?: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'Order'
    `;
    const columnNames = columns.map(
      (col) => col.column_name ?? col.COLUMN_NAME ?? (col as any).name ?? ""
    );
      const hasFeeCents = columnNames.includes("feeCents");
      const hasNetAmountCents = columnNames.includes("netAmountCents");

      console.log("Colunas encontradas:", columnNames);
      console.log("hasFeeCents:", hasFeeCents, "hasNetAmountCents:", hasNetAmountCents);

      // Construir query dinamicamente baseado nas colunas disponíveis
      // Usar COALESCE para lidar com valores NULL
      const feeCentsSelect = hasFeeCents ? "COALESCE(o.feeCents, 0) as feeCents" : "0 as feeCents";
      const netAmountCentsSelect = hasNetAmountCents ? "COALESCE(o.netAmountCents, o.totalCents) as netAmountCents" : "o.totalCents as netAmountCents";

      const query = `
        SELECT 
          o.id,
          o.eventId,
          o.totalCents,
          ${feeCentsSelect},
          ${netAmountCentsSelect},
          o.paymentMethod,
          e.id as event_id,
          e.title as event_title,
          e.slug as event_slug
        FROM \`Order\` o
        INNER JOIN \`Event\` e ON o.eventId = e.id
        WHERE o.status = 'PAID'
      `;

      console.log("Query SQL:", query);

      const paidOrdersRaw = await prisma.$queryRawUnsafe<Array<{
        id: string;
        eventId: string;
        totalCents: bigint | number;
        feeCents: bigint | number | null;
        netAmountCents: bigint | number | null;
        event_id: string;
        event_title: string;
        event_slug: string;
      }>>(query);

      // Converter BigInt para Number (SQLite retorna inteiros como BigInt)
      const paidOrders = paidOrdersRaw.map(row => ({
        id: row.id,
        eventId: row.eventId,
        totalCents: Number(row.totalCents),
        feeCents: Number(row.feeCents || 0),
        netAmountCents: Number(row.netAmountCents || row.totalCents),
        paymentMethod: (row as any).paymentMethod as string | null,
        event: {
          id: row.event_id,
          title: row.event_title,
          slug: row.event_slug
        }
      }));

    let totalGrossCents = 0;
    let totalFeesCents = 0;
    let totalNetCents = 0;
    let pixGrossCents = 0;
    let pixFeesCents = 0;
    let pixNetCents = 0;
    let cashCents = 0;

    for (const order of paidOrders) {
      totalGrossCents += order.totalCents;
      totalFeesCents += order.feeCents;
      totalNetCents += order.netAmountCents;
      const method = (order as any).paymentMethod ? String((order as any).paymentMethod).toUpperCase() : '';
      if (method === 'PIX_MP') {
        pixGrossCents += order.totalCents;
        pixFeesCents += order.feeCents;
        pixNetCents += order.netAmountCents;
      } else if (method === 'CASH') {
        cashCents += order.totalCents;
      }
    }

    // Verificar se a tabela Expense existe antes de tentar consultar
    let expensesCents = 0;
    try {
      const expensesTotal = await prisma.expense.aggregate({
        _sum: {
          amountCents: true
        }
      });
      expensesCents = expensesTotal._sum.amountCents || 0;
    } catch (error: any) {
      // Se a tabela não existir, assumir 0 despesas
      if (error.code === "P2021" || error.code === "P2022" || error.message?.includes("does not exist")) {
        expensesCents = 0;
      } else {
        throw error;
      }
    }
    const cashBalanceCents = totalNetCents - expensesCents;

    // Agrupar por evento
    const eventSummaries = new Map<string, {
      event: { id: string; title: string; slug: string };
      grossCents: number;
      feesCents: number;
      netCents: number;
      ordersCount: number;
    }>();

    for (const order of paidOrders) {
      const eventId = order.eventId;
      const existing = eventSummaries.get(eventId) || {
        event: order.event,
        grossCents: 0,
        feesCents: 0,
        netCents: 0,
        ordersCount: 0
      };

      existing.grossCents += order.totalCents;
      existing.feesCents += order.feeCents;
      existing.netCents += order.netAmountCents;
      existing.ordersCount += 1;

      eventSummaries.set(eventId, existing);
    }

      return {
        totals: {
          grossCents: totalGrossCents,
          feesCents: totalFeesCents,
          netCents: totalNetCents,
          pix: { grossCents: pixGrossCents, feesCents: pixFeesCents, netCents: pixNetCents },
          cashCents: cashCents,
          generalNetCents: pixNetCents + cashCents,
          expensesCents,
          cashBalanceCents
        },
        events: Array.from(eventSummaries.values())
      };
    } catch (error: any) {
      console.error("Erro em getGeneralSummary:", error);
      throw error;
    }
  }
}

export const financialService = new FinancialService();

