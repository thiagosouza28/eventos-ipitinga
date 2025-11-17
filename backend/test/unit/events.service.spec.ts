import { eventService } from "../../src/modules/events/event.service";
import { prisma } from "../../src/lib/prisma";
import { auditService } from "../../src/services/audit.service";

const adminActor = { id: "admin-1", role: "AdminGeral" } as any;

describe("EventService.delete", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deletes event when there are no related orders or registrations", async () => {
    jest.spyOn(prisma.event, "findUnique").mockResolvedValue({
      id: "evt-1",
      slug: "event-slug",
      createdById: adminActor.id
    } as any);
    const orderCount = jest.spyOn(prisma.order, "count").mockResolvedValue(0);
    const registrationCount = jest.spyOn(prisma.registration, "count").mockResolvedValue(0);
    const deleteSpy = jest.spyOn(prisma.event, "delete").mockResolvedValue({ id: "evt-1" } as any);
    const auditSpy = jest.spyOn(auditService, "log").mockResolvedValue(undefined as any);

    await eventService.delete("evt-1", adminActor);

    expect(orderCount).toHaveBeenCalledWith({ where: { eventId: "evt-1" } });
    expect(registrationCount).toHaveBeenCalledWith({ where: { eventId: "evt-1" } });
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: "evt-1" } });
    expect(auditSpy).toHaveBeenCalledWith({
      action: "EVENT_DELETED",
      entity: "event",
      entityId: "evt-1",
      metadata: { slug: "event-slug" }
    });
  });

  it("throws when event does not exist", async () => {
    jest.spyOn(prisma.event, "findUnique").mockResolvedValue(null);

    await expect(eventService.delete("missing", adminActor)).rejects.toThrow("Evento nao encontrado");
  });

  it("blocks deletion when there are related records", async () => {
    jest.spyOn(prisma.event, "findUnique").mockResolvedValue({
      id: "evt-1",
      slug: "event-slug",
      createdById: adminActor.id
    } as any);
    jest.spyOn(prisma.order, "count").mockResolvedValue(1);
    jest.spyOn(prisma.registration, "count").mockResolvedValue(0);
    const deleteSpy = jest.spyOn(prisma.event, "delete");

    await expect(eventService.delete("evt-1", adminActor)).rejects.toThrow(
      "Evento possui pedidos ou inscricoes e nao pode ser excluido"
    );
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
