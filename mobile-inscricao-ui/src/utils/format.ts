export const stripNonDigits = (value: string) => value.replace(/\D/g, "");

export const formatCpf = (value: string) => {
  const digits = stripNonDigits(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);
  const formatted = [part1, part2, part3].filter(Boolean).join(".");
  return part4 ? `${formatted}-${part4}` : formatted;
};

export const isCpfFormatValid = (value: string) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(value);

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
