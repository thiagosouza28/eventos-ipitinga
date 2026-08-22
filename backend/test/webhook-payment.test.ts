import assert from "node:assert/strict";
import { test } from "node:test";

import { WebhookService } from "../src/modules/webhooks/webhook.service";
import { paymentService } from "../src/services/payment.service";

type StoredEvent = {
  idempotencyKey: string;
  processedAt: Date | null;
};

const createWebhookFixture = (markPaid: (...args: any[]) => Promise<unknown>) => {
  const events = new Map<string, StoredEvent>();
  const payment = {
    id: 987654321,
    status: "approved",
    status_detail: "accredited",
    external_reference: "order-1",
    transaction_amount: 125,
    currency_id: "BRL",
    date_approved: "2026-08-17T12:00:00.000Z",
    metadata: { preference_version: 3 }
  };

  const fakePrisma = {
    webhookEvent: {
      findUnique: async ({ where }: any) => events.get(where.idempotencyKey) ?? null,
      create: async ({ data }: any) => {
        const stored = { idempotencyKey: data.idempotencyKey, processedAt: null };
        events.set(data.idempotencyKey, stored);
        return stored;
      },
      updateMany: async ({ where, data }: any) => {
        for (const key of where.idempotencyKey.in) {
          const stored = events.get(key);
          if (stored) stored.processedAt = data.processedAt;
        }
        return { count: where.idempotencyKey.in.length };
      }
    },
    order: {
      findMany: async () => [{ id: "order-1", totalCents: 12_500 }],
      findUnique: async () => null
    }
  };
  const fakePaymentService = {
    fetchPayment: async () => payment,
    fetchMerchantOrder: async () => null
  };
  const fakeOrderService = { markPaid, markRefunded: async () => undefined };
  const service = new WebhookService({
    prisma: fakePrisma as any,
    paymentService: fakePaymentService as any,
    orderService: fakeOrderService as any
  });

  return { service, events, payment };
};

test("webhook aprovado baixa o pedido e só então marca o evento processado", async () => {
  const calls: any[][] = [];
  const fixture = createWebhookFixture(async (...args) => {
    calls.push(args);
  });

  const result = await fixture.service.handleMercadoPago({
    type: "payment",
    action: "payment.updated",
    data: { id: String(fixture.payment.id) }
  });

  assert.deepEqual(result, { status: "processed" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "order-1");
  assert.equal(calls[0][1], String(fixture.payment.id));
  assert.equal(calls[0][2].paidAt.toISOString(), fixture.payment.date_approved);
  assert.ok([...fixture.events.values()][0]?.processedAt instanceof Date);
});

test("falha na baixa deixa o webhook pendente e permite reprocessamento", async () => {
  let attempts = 0;
  const fixture = createWebhookFixture(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("falha transitória");
  });
  const payload = {
    type: "payment",
    action: "payment.updated",
    data: { id: String(fixture.payment.id) }
  };

  await assert.rejects(() => fixture.service.handleMercadoPago(payload), /falha transitória/);
  assert.equal([...fixture.events.values()][0]?.processedAt, null);

  const result = await fixture.service.handleMercadoPago(payload);
  assert.deepEqual(result, { status: "processed" });
  assert.equal(attempts, 2);
  assert.ok([...fixture.events.values()][0]?.processedAt instanceof Date);
});

test("webhook não baixa pedido quando o valor pago diverge", async () => {
  let called = false;
  const fixture = createWebhookFixture(async () => {
    called = true;
  });
  fixture.payment.transaction_amount = 1;

  await assert.rejects(
    () => fixture.service.handleMercadoPago({ type: "payment", data: { id: "987654321" } }),
    /Valor do pagamento diverge/
  );
  assert.equal(called, false);
  assert.equal([...fixture.events.values()][0]?.processedAt, null);
});

test("mudança de pending para approved no mesmo payment.updated é processada", async () => {
  let paidCalls = 0;
  const fixture = createWebhookFixture(async () => {
    paidCalls += 1;
  });
  const payload = {
    type: "payment",
    action: "payment.updated",
    data: { id: String(fixture.payment.id) }
  };

  fixture.payment.status = "pending";
  assert.deepEqual(await fixture.service.handleMercadoPago(payload), { status: "processed" });
  assert.equal(paidCalls, 0);

  fixture.payment.status = "approved";
  assert.deepEqual(await fixture.service.handleMercadoPago(payload), { status: "processed" });
  assert.equal(paidCalls, 1);
  assert.equal(fixture.events.size, 2);
});

test("consulta escolhe pagamento aprovado mesmo com tentativa rejeitada mais recente", async () => {
  const service = paymentService as any;
  const originalPaymentClient = service.payment;
  service.payment = {
    search: async () => ({
      results: [
        { id: 20, status: "rejected", status_detail: "cc_rejected_other_reason" },
        { id: 10, status: "approved", status_detail: "accredited", date_approved: "2026-08-17" }
      ]
    })
  };

  try {
    const result = await paymentService.findLatestPaymentByExternalReference("order-1");
    assert.equal(result?.id, "10");
    assert.equal(result?.status, "approved");
  } finally {
    service.payment = originalPaymentClient;
  }
});
