import { calculateAge, isValidCpf } from "../../src/utils/cpf";
import { maskCpf } from "../../src/utils/mask";
import { generateCheckinSignature, verifyCheckinSignature } from "../../src/utils/hmac";

describe("Utils helpers", () => {
  it("validates CPF correctly", () => {
    expect(isValidCpf("390.533.447-05")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("masks CPF properly", () => {
    expect(maskCpf("12345678909")).toBe("123.***.***-09");
  });

  it("calculates age from birth date", () => {
    const age = calculateAge("2000-01-01");
    expect(age).toBeGreaterThan(20);
  });

  it("generates and validates check-in signature", () => {
    const registrationId = "7e1a90f4-87c0-44fe-8f83-02479cbff001";
    const createdAt = new Date("2024-01-01T00:00:00Z");
    const signature = generateCheckinSignature(registrationId, createdAt);
    expect(signature).toHaveLength(64);
    expect(verifyCheckinSignature(registrationId, createdAt, signature)).toBe(true);
  });
});