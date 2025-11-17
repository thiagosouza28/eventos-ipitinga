export const formatCurrency = (value) => (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatDate = (value) => new Date(value).toLocaleDateString("pt-BR");
export const maskCpf = (cpf) => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11)
        return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};
export const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits)
        return "";
    const area = digits.slice(0, 2);
    if (digits.length <= 2)
        return `(${area}`;
    if (digits.length <= 6)
        return `(${area}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${area}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${area}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
//# sourceMappingURL=format.js.map
