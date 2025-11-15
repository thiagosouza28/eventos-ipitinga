import type { Order } from "@/prisma/generated/client";

export interface OrderWithDetails extends Order {
  event: {
    name: string;
  };
  registrations: {
    id: string;
    fullName: string;
    cpf: string;
    church: {
      name: string;
    };
    district: {
      name: string;
    };
  }[];
}
