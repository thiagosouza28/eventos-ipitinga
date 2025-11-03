import { prisma } from "../../src/lib/prisma";
import { registrationService } from "../../src/modules/registrations/registration.service";

describe("RegistrationService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("isCpfRegistered", () => {
    it("normalizes CPF before querying and returns true when a registration exists", async () => {
      const findFirst = jest
        .spyOn(prisma.registration, "findFirst")
        .mockResolvedValue({ id: "reg-1" } as any);

      const exists = await registrationService.isCpfRegistered(
        "00000000-0000-0000-0000-000000000001",
        "529.982.247-25"
      );

      expect(exists).toBe(true);
      expect(findFirst).toHaveBeenCalledWith({
        where: {
          eventId: "00000000-0000-0000-0000-000000000001",
          cpf: "52998224725",
          status: { notIn: ["REFUNDED", "CANCELED"] }
        }
      });
    });

    it("returns false when no registration is found", async () => {
      jest.spyOn(prisma.registration, "findFirst").mockResolvedValue(null);

      const exists = await registrationService.isCpfRegistered(
        "00000000-0000-0000-0000-000000000001",
        "52998224725"
      );

      expect(exists).toBe(false);
    });
  });
});
