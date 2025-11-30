export type Role =
  | "AdminGeral"
  | "AdminDistrital"
  | "DiretorLocal"
  | "Tesoureiro"
  | "CoordenadorMinisterio";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "deactivate"
  | "reports"
  | "financial";

export type PermissionState = Record<PermissionAction, boolean>;

export interface ProfilePermissionEntry {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canDeactivate: boolean;
  canReport: boolean;
  canFinancial: boolean;
}

export interface AdminProfile {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissions: ProfilePermissionEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "CANCELED" | "EXPIRED";

export type RegistrationStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "REFUNDED"
  | "CHECKED_IN";

export type PaymentMethod = "PIX_MP" | "CASH" | "CARD_FULL" | "CARD_INSTALLMENTS" | "FREE_PREVIOUS_YEAR";

export type PendingPaymentValueRule =
  | "KEEP_ORIGINAL"
  | "UPDATE_TO_ACTIVE_LOT";

export interface District {
  id: string;
  name: string;
  pastorName?: string | null;
}

export interface Church {
  id: string;
  name: string;
  districtId: string;
  directorName?: string | null;
  directorCpf?: string | null;
  directorBirthDate?: string | null;
  directorEmail?: string | null;
  directorWhatsapp?: string | null;
  directorPhotoUrl?: string | null;
}

export interface Ministry {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ChurchDirectorMatch {
  churchId: string;
  churchName: string;
  districtId: string;
  districtName: string | null;
  directorName?: string | null;
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
  bannerUrl?: string | null;
  priceCents: number;
  isFree: boolean;
  minAgeYears?: number | null;
  slug: string;
  isActive: boolean;
  currentPriceCents?: number;
  currentLot?: EventLot | null;
  lots?: EventLot[];
  paymentMethods?: PaymentMethod[];
  pendingPaymentValueRule: PendingPaymentValueRule;
  ministryId?: string | null;
  ministry?: Ministry | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  cpf?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  districtScopeId?: string | null;
  churchId?: string | null;
  churchScopeId?: string | null;
  ministryId?: string | null;
  mustChangePassword?: boolean;
  ministries?: Array<{ id: string; name: string }>;
  createdAt?: string;
  status: UserStatus;
  profile?: AdminProfile | null;
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
  createdAt?: string | null;
  eventId: string;
  priceCents: number;
  gender?: string | null;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  photoUrl?: string | null;
  receiptPdfUrl?: string | null;
  order?: RegistrationOrderSummary | null;
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
  manualPaymentProofUrl?: string | null;
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

export interface RegistrationOrderSummary {
  id: string;
  totalCents: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  mpPaymentId?: string | null;
  manualPaymentReference?: string | null;
  manualPaymentProofUrl?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  buyerCpf?: string | null;
}
