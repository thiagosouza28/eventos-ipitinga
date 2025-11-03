export const Roles = ["AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro"] as const;

export type Role = (typeof Roles)[number];

export const RoleHierarchy: Record<Role, Role[]> = {
  AdminGeral: ["AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro"],
  AdminDistrital: ["AdminDistrital", "DiretorLocal", "Tesoureiro"],
  DiretorLocal: ["DiretorLocal"],
  Tesoureiro: ["Tesoureiro"]
};
