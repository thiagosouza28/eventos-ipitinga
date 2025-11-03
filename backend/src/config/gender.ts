export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER"
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: "Masculino",
  [Gender.FEMALE]: "Feminino",
  [Gender.OTHER]: "Outro"
};

export const parseGender = (value: string | null | undefined): Gender => {
  if (!value) return Gender.OTHER;
  const normalized = value.trim().toUpperCase();
  if (normalized === Gender.MALE || normalized === Gender.FEMALE) {
    return normalized as Gender;
  }
  return Gender.OTHER;
};
