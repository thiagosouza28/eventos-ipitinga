export const maskCpf = (cpf: string): string => {
  if (!cpf) return cpf;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
};

export const sanitizeCpf = (cpf: string): string => cpf.replace(/\D/g, "");
