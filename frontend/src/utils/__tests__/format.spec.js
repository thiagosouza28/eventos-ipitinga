import { describe, it, expect } from "vitest";
import { formatCurrency, formatPhone, maskCpf } from "../format";
describe("format utils", () => {
    it("formatCurrency formats cents to BRL", () => {
        expect(formatCurrency(12345)).toBe("R$\u00a0123,45");
    });
    it("maskCpf masks cpf values", () => {
        expect(maskCpf("12345678909")).toBe("123.456.789-09");
    });
    it("formatPhone formats cellular numbers", () => {
        expect(formatPhone("91987654321")).toBe("(91) 98765-4321");
    });
    it("formatPhone formats landline numbers", () => {
        expect(formatPhone("1132654321")).toBe("(11) 3265-4321");
    });
});
//# sourceMappingURL=format.spec.js.map