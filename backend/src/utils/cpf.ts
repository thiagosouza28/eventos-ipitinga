import { differenceInDays, parseISO } from "date-fns";

export const isValidCpf = (cpf: string): boolean => {
  const sanitized = cpf.replace(/\D/g, "");
  if (sanitized.length !== 11) return false;
  if (/^(\d)\1+$/.test(sanitized)) return false;

  const calc = (base: string, factor: number): number => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += parseInt(base.charAt(i), 10) * (factor - i);
    }
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const baseNine = sanitized.substring(0, 9);
  const d1 = calc(baseNine, 10);
  const d2 = calc(baseNine + d1, 11);

  return sanitized === `${baseNine}${d1}${d2}`;
};

export const calculateAge = (birthDate: string | Date): number => {
  const date = typeof birthDate === "string" ? parseISO(birthDate) : birthDate;
  const days = differenceInDays(new Date(), date);
  return Math.floor(days / 365.2425);
};
