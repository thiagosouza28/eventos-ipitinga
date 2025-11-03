import { describe, it, expect } from "vitest";

import { formatCurrency, maskCpf } from "../format";

describe("format utils", () => {
  it("formatCurrency formats cents to BRL", () => {
    expect(formatCurrency(12345)).toBe("R$\u00a0123,45");
  });

  it("maskCpf masks cpf values", () => {
    expect(maskCpf("12345678909")).toBe("123.456.789-09");
  });
});
