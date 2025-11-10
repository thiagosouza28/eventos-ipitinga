import request from "supertest";

import { createApp } from "../../src/app";
import { registrationService } from "../../src/modules/registrations/registration.service";

describe("POST /api/inscriptions/check", () => {
  const app = createApp();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the exists flag from registration service", async () => {
    const isCpfRegistered = jest
      .spyOn(registrationService, "isCpfRegistered")
      .mockResolvedValue(true);
    const getLatestProfileByCpf = jest
      .spyOn(registrationService, "getLatestProfileByCpf")
      .mockResolvedValue(null);

    const response = await request(app)
      .post("/api/inscriptions/check")
      .send({
        eventId: "00000000-0000-0000-0000-000000000001",
        cpf: "529.982.247-25"
      })
      .expect(200);

    expect(response.body).toEqual({ existsInEvent: true, profile: null });
    expect(isCpfRegistered).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      "52998224725"
    );
    expect(getLatestProfileByCpf).toHaveBeenCalledWith("52998224725");
  });

  it("validates payload schema", async () => {
    await request(app)
      .post("/api/inscriptions/check")
      .send({
        eventId: "not-a-valid-id",
        cpf: "123"
      })
      .expect(422);
  });
});
