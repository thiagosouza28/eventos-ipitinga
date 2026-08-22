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

export type PendingPaymentValueRule = "KEEP_ORIGINAL" | "UPDATE_TO_ACTIVE_LOT";

export type PixType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM" | "EVP";
export type OrderTransferStatus = "PENDING" | "TRANSFERRED" | "FAILED";
export type TransferStatus = "PENDING" | "SUCCESS" | "FAILED";

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

export interface PixGatewayConfig {
  id: number;
  provider: string;
  clientId?: string | null;
  clientSecret?: string | null;
  apiKey?: string | null;
  webhookUrl?: string | null;
  certificatePath?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  type?: "PADRAO" | "PROMOCIONAL";
  status?: "ATIVO" | "INATIVO" | "ENCERRADO";
  startsAt: string;
  endsAt: string | null;
}

export interface EventNotice {
  enabled: boolean;
  title: string;
  bullets: string[];
  footerText?: string;
  showOnce?: boolean;
}

export type EventFormFieldType = "text" | "email" | "number" | "textarea" | "select" | "checkbox";

export interface EventFormField {
  id: string;
  label: string;
  tipo: EventFormFieldType;
  obrigatorio?: boolean;
  placeholder?: string;
  opcoes?: string[];
  min?: number;
  max?: number;
}

export interface EventFormConfig {
  campos: EventFormField[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  bannerUrl?: string | null;
  formConfig?: EventFormConfig | null;
  priceCents: number;
  insuranceEnabled: boolean;
  insuranceRequired: boolean;
  insuranceDailyCents: number;
  insuranceDays: number;
  isFree: boolean;
  minAgeYears?: number | null;
  slug: string;
  isActive: boolean;
  districtId: string;
  churchId?: string | null;
  currentPriceCents?: number;
  currentLot?: EventLot | null;
  lots?: EventLot[];
  paymentMethods?: PaymentMethod[];
  notice?: EventNotice | null;
  pendingPaymentValueRule: PendingPaymentValueRule;
  ministryId?: string | null;
  ministry?: Ministry | null;
  district?: District | null;
  church?: Church | null;
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
  pixType?: PixType | null;
  pixKey?: string | null;
  pixOwnerName?: string | null;
  pixOwnerDocument?: string | null;
  pixBankName?: string | null;
  pixStatus?: "VALIDATED" | "PENDING" | null;
}

export interface TransferRecord {
  id: string;
  amount: number;
  status: TransferStatus;
  errorMessage?: string | null;
  createdAt: string;
  mpTransferId?: string | null;
  orderIds?: string[] | null;
  pixKey?: string | null;
  pixType?: PixType | null;
  pixOwnerName?: string | null;
  pixOwnerDocument?: string | null;
  pixBankName?: string | null;
  createdBy?: { id: string; name?: string | null; email?: string | null } | null;
}

export interface ResponsibleFinanceSummary {
  responsible: {
    id: string;
    name?: string | null;
    email?: string | null;
    pixType?: PixType | null;
    pixKey?: string | null;
    pixOwnerName?: string | null;
    pixOwnerDocument?: string | null;
    pixBankName?: string | null;
  };
  totals: {
    collectedCents: number;
    feesCents: number;
    netCents: number;
    transferredCents: number;
    availableCents: number;
  };
  pendingOrdersCount: number;
  lastTransfer: TransferRecord | null;
  transfersCount: number;
}

export interface ResponsiblePendingOrder {
  id: string;
  amountToTransfer: number;
  transferStatus: OrderTransferStatus;
  event?: { id: string; title: string } | null;
  registrations?: Array<{ id: string; fullName: string; priceCents: number; districtId?: string | null }>;
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
  formResponses?: Record<string, unknown> | null;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
  photoUrl?: string | null;
  receiptPdfUrl?: string | null;
  district?: District | null;
  church?: Church | null;
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
  lotId?: string | null;
  lotName?: string | null;
  pricingLotId?: string | null;
  pricingLot?: { id: string; name: string } | null;
  mpPaymentId?: string | null;
  manualPaymentReference?: string | null;
  manualPaymentProofUrl?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  buyerCpf?: string | null;
}

export interface AdminRegistrationsReportItem {
  districtId: string | null;
  districtName: string;
  eventId: string | null;
  eventTitle: string;
  lotId: string | null;
  lotName: string;
  registrationsCount: number;
}

export interface AdminRegistrationsReportTotals {
  total: number;
  byDistrict: Array<{ id: string | null; name: string; count: number }>;
  byEvent: Array<{ id: string | null; name: string; count: number; districtId?: string | null; districtName?: string }>;
  byLot: Array<{ id: string | null; name: string; count: number; eventId?: string | null; eventTitle?: string }>;
}

export interface AdminRegistrationsReportResponse {
  generatedAt: string;
  filters: {
    districtId?: string;
    districtName?: string | null;
    eventId?: string;
    eventTitle?: string | null;
    lotId?: string;
    lotName?: string | null;
    startDate?: string;
    endDate?: string;
  };
  items: AdminRegistrationsReportItem[];
  totals: AdminRegistrationsReportTotals;
}

export interface RegistrationsDashboardSummary {
  totalRegistrations: number;
  districtsCount: number;
  churchesCount: number;
  lotsCount: number;
}

export interface RegistrationsDashboardDistrict {
  districtId: string | null;
  districtName: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
}

export interface RegistrationsDashboardChurch {
  churchId: string | null;
  churchName: string;
  districtId: string | null;
  districtName: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
}

export interface RegistrationsDashboardLot {
  lotId: string | null;
  lotName: string;
  eventId: string | null;
  eventTitle: string;
  registrationsCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
}

export interface RegistrationsDashboardResponse {
  generatedAt: string;
  filters: {
    eventId?: string;
    startDate?: string;
    endDate?: string;
  };
  summary: RegistrationsDashboardSummary;
  byDistrict: RegistrationsDashboardDistrict[];
  byChurch: RegistrationsDashboardChurch[];
  byLot: RegistrationsDashboardLot[];
}
