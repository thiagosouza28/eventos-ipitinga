export type Role = "AdminGeral" | "AdminDistrital" | "DiretorLocal" | "Tesoureiro";

export type OrderStatus = "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "CANCELED" | "EXPIRED";

export type RegistrationStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "REFUNDED"
  | "CHECKED_IN";

export type PaymentMethod = "PIX_MP" | "CASH" | "CARD_FULL" | "CARD_INSTALLMENTS";

export interface District {
  id: string;
  name: string;
}

export interface Church {
  id: string;
  name: string;
  districtId: string;
}

export interface EventLot {
  id: string;
  name: string;
  priceCents: number;
  startsAt: string;
  endsAt: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  priceCents: number;
  isFree: boolean;
  minAgeYears?: number | null;
  slug: string;
  isActive: boolean;
  currentPriceCents?: number;
  currentLot?: EventLot | null;
  lots?: EventLot[];
  paymentMethods?: PaymentMethod[];
}

export interface Registration {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  ageYears: number;
  status: RegistrationStatus;
  districtId: string;
  churchId: string;
  orderId: string;
  eventId: string;
  priceCents: number;
  gender?: string | null;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  photoUrl?: string | null;
  receiptPdfUrl?: string | null;
}

export interface Order {
  id: string;
  eventId: string;
  status: OrderStatus;
  totalCents: number;
  buyerCpf: string;
  mpPreferenceId?: string | null;
  mpPaymentId?: string | null;
  paymentMethod: PaymentMethod;
  paidAt?: string | null;
  manualPaymentReference?: string | null;
  registrations: Registration[];
}

export interface RegistrationProfile {
  fullName: string;
  birthDate: string;
  gender: string;
  districtId: string;
  churchId: string;
  photoUrl: string | null;
}
