const DIGITS_ONLY_REGEX = /\D/g;
const REPEATED_DIGITS_REGEX = /^(\d)\1{10}$/;

export const normalizeCPF = (cpfRaw: string): string => cpfRaw.replace(DIGITS_ONLY_REGEX, "");

export const formatCPF = (cpfRaw: string): string => {
  const digits = normalizeCPF(cpfRaw).slice(0, 11);
  if (!digits) return "";

  let formatted = "";
  for (let index = 0; index < digits.length; index += 1) {
    formatted += digits[index];

    const remaining = digits.length - (index + 1);
    if (index === 2 && remaining > 0) {
      formatted += ".";
    } else if (index === 5 && remaining > 0) {
      formatted += ".";
    } else if (index === 8 && remaining > 0) {
      formatted += "-";
    }
  }

  return formatted;
};

const calculateVerifierDigit = (digits: string, factorStart: number): number => {
  let total = 0;

  for (let index = 0; index < digits.length; index += 1) {
    total += Number(digits[index]) * (factorStart - index);
  }

  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const validateCPF = (cpfRaw: string): boolean => {
  const digits = normalizeCPF(cpfRaw);
  if (digits.length !== 11) return false;
  if (REPEATED_DIGITS_REGEX.test(digits)) return false;

  const baseNine = digits.slice(0, 9);
  const verifierOne = calculateVerifierDigit(baseNine, 10);

  if (verifierOne !== Number(digits[9])) {
    return false;
  }

  const baseTen = digits.slice(0, 10);
  const verifierTwo = calculateVerifierDigit(baseTen, 11);

  return verifierTwo === Number(digits[10]);
};
