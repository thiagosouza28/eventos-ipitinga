import { describe, expect, it } from "vitest";
import { formatCPF, validateCPF } from "../cpf";
describe("CPF utils", () => {
    it("aceita CPF valido", () => {
        const digits = "52998224725";
        expect(formatCPF(digits)).toBe("529.982.247-25");
        expect(validateCPF(digits)).toBe(true);
        expect(validateCPF("529.982.247-25")).toBe(true);
    });
    it("rejeita CPF com digito verificador incorreto", () => {
        expect(validateCPF("529.982.247-24")).toBe(false);
    });
    it("rejeita CPFs com todos os digitos iguais", () => {
        expect(validateCPF("111.111.111-11")).toBe(false);
    });
});
//# sourceMappingURL=cpf.spec.js.map