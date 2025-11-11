export const Roles = [
  "AdminGeral",
  "AdminDistrital",
  "DiretorLocal",
  "Tesoureiro",
  "CoordenadorMinisterio"
] as const;

export type Role = (typeof Roles)[number];

export const RoleHierarchy: Record<Role, Role[]> = {
  AdminGeral: ["AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro", "CoordenadorMinisterio"],
  AdminDistrital: ["AdminDistrital", "DiretorLocal", "Tesoureiro", "CoordenadorMinisterio"],
  DiretorLocal: ["DiretorLocal"],
  Tesoureiro: ["Tesoureiro"],
  CoordenadorMinisterio: ["CoordenadorMinisterio"]
};
