import type { Handler, RouteDef } from "./route-utils";

import { authenticate } from "@/middlewares/auth-middleware";
import { authorize, authorizePermission } from "@/middlewares/rbac-middleware";
import { applyScope } from "@/middlewares/scope-middleware";
import { enforcePasswordUpdate } from "@/middlewares/force-password-middleware";
import { hydratePermissions } from "@/middlewares/permissions-middleware";
import { publicCache } from "@/middlewares/cache-control";

import {
  loginHandler,
  changePasswordHandler,
  recoverPasswordHandler,
  getProfileHandler
} from "@/controllers/auth.controller";
import {
  createChurchHandler,
  listChurchesHandler,
  updateChurchHandler,
  deleteChurchHandler,
  findChurchByDirectorCpfHandler
} from "@/controllers/church.controller";
import {
  createDistrictHandler,
  listDistrictsHandler,
  updateDistrictHandler,
  deleteDistrictHandler
} from "@/controllers/district.controller";
import {
  createEventHandler,
  listPublicEventsHandler,
  getEventBySlugHandler,
  listEventsAdminHandler,
  updateEventHandler,
  deleteEventHandler
} from "@/controllers/event.controller";
import {
  listEventLotsHandler,
  createEventLotHandler,
  updateEventLotHandler,
  deleteEventLotHandler
} from "@/controllers/event-lot.controller";
import {
  listMinistriesHandler,
  createMinistryHandler,
  updateMinistryHandler,
  deleteMinistryHandler
} from "@/controllers/ministry.controller";
import {
  getOrderPaymentHandler,
  getPaymentByPreferenceIdHandler,
  getMercadoPagoPaymentHandler,
  listOrdersHandler,
  startInscriptionHandler,
  createBatchInscriptionHandler,
  checkParticipantCpfHandler,
  markOrderPaidHandler,
  listPendingOrdersHandler,
  reportPixIntegrityHandler,
  bulkPaymentHandler
} from "@/controllers/order.controller";
import {
  cancelRegistrationHandler,
  deleteRegistrationHandler,
  listRegistrationsHandler,
  downloadRegistrationsReportHandler,
  downloadRegistrationsListPdfHandler,
  downloadRegistrationsListXlsxHandler,
  registrationsReportHandler,
  reactivateRegistrationHandler,
  refundRegistrationHandler,
  updateRegistrationHandler,
  markRegistrationsPaidHandler,
  regenerateRegistrationPaymentLinkHandler,
  createPaymentForRegistrationsHandler,
  getRegistrationHistoryHandler,
  getRegistrationReceiptLinkHandler
} from "@/controllers/registration.controller";
import {
  getReportJobStatusHandler,
  downloadReportJobFileHandler
} from "@/modules/reports/report-job.controller";
import {
  downloadReceiptImageHandler,
  downloadReceiptHandler,
  lookupReceiptsHandler
} from "@/controllers/receipt.controller";
import { mercadoPagoWebhookHandler } from "@/controllers/webhook.controller";
import {
  getCheckinDashboardHandler,
  scanCheckinHandler,
  manualCheckinHandler,
  confirmAdminCheckinHandler,
  validateCheckinLinkHandler,
  confirmCheckinLinkHandler
} from "@/controllers/checkin.controller";
import {
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  listExpensesByEventHandler,
  getExpenseHandler
} from "@/controllers/expense.controller";
import {
  getEventSummaryHandler,
  getDistrictSummaryHandler,
  getChurchSummaryHandler,
  getGeneralSummaryHandler,
  downloadEventFinancialReportHandler
} from "@/controllers/financial.controller";
import { createPixPaymentHandler, unifiedPixWebhookHandler } from "@/controllers/pix.controller";
import { getPixConfigHandler, upsertPixConfigHandler } from "@/controllers/pix-config.controller";
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  resetUserPasswordHandler,
  updateUserStatusHandler,
  deleteUserHandler
} from "@/controllers/user.controller";
import {
  listProfilesHandler,
  createProfileHandler,
  updateProfileHandler,
  updateProfileStatusHandler,
  deleteProfileHandler
} from "@/controllers/profile.controller";
import {
  getPublicSystemConfigHandler,
  getAdminSystemConfigHandler,
  updateSystemConfigHandler
} from "@/controllers/system-config.controller";
import {
  listDistrictFinanceHandler,
  listDistrictPendingOrdersHandler,
  listDistrictTransfersHandler,
  createDistrictTransferHandler
} from "@/controllers/district-finance.controller";
import {
  listResponsibleFinanceHandler,
  listResponsiblePendingOrdersHandler,
  listResponsibleTransfersHandler,
  createResponsibleTransferHandler
} from "@/controllers/responsible-finance.controller";
import {
  adminRegistrationsReportHandler,
  downloadAdminRegistrationsReportCsvHandler,
  downloadAdminRegistrationsReportXlsxHandler,
  downloadAdminRegistrationsReportPdfHandler
} from "@/controllers/admin-registrations-report.controller";
import { registrationsDashboardHandler } from "@/controllers/registrations-dashboard.controller";
import {
  getOfflineInscritoHandler,
  listOfflineInscritosHandler
} from "@/modules/offline/offline-inscritos.controller";
import { listInsuranceHandler } from "@/modules/insurance/insurance.controller";

const adminBase: Handler[] = [
  authenticate,
  hydratePermissions,
  applyScope,
  enforcePasswordUpdate
];

const route = (
  method: string,
  path: string,
  handlers: Handler[],
  options?: { upload?: boolean }
): RouteDef => ({ method, path, handlers, options });

export const routes: RouteDef[] = [
  route("GET", "/system/config", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), getPublicSystemConfigHandler]),

  // Public
  route("GET", "/events", [publicCache({ sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }), listPublicEventsHandler]),
  route("GET", "/events/:slug", [publicCache({ sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }), getEventBySlugHandler]),
  route("POST", "/inscriptions/start", [startInscriptionHandler]),
  route("POST", "/inscriptions/check", [checkParticipantCpfHandler]),
  route("POST", "/orders/bulk-payment", [bulkPaymentHandler]),
  route("POST", "/inscriptions/batch", [createBatchInscriptionHandler]),
  route("GET", "/inscritos", [
    ...adminBase,
    authorizePermission("checkin", "view"),
    listOfflineInscritosHandler
  ]),
  route("GET", "/inscritos/:numero", [
    ...adminBase,
    authorizePermission("checkin", "view"),
    getOfflineInscritoHandler
  ]),
  route(
    "POST",
    "/admin/inscriptions/batch",
    [...adminBase, authorizePermission("registrations", "create"), createBatchInscriptionHandler]
  ),
  route("GET", "/payments/order/:orderId", [getOrderPaymentHandler]),
  route("GET", "/payments/preference/:preferenceId", [getPaymentByPreferenceIdHandler]),
  route("POST", "/payments/pix/integrity", [reportPixIntegrityHandler]),
  route("POST", "/payments/pix/create", [createPixPaymentHandler]),
  route("POST", "/receipts/lookup", [lookupReceiptsHandler]),
  route("OPTIONS", "/receipts/:registrationId.pdf", [downloadReceiptHandler]),
  route("GET", "/receipts/:registrationId.pdf", [downloadReceiptHandler]),
  route("OPTIONS", "/receipts/:registrationId.png", [downloadReceiptImageHandler]),
  route("GET", "/receipts/:registrationId.png", [downloadReceiptImageHandler]),
  route("GET", "/checkin/validate", [validateCheckinLinkHandler]),
  route("POST", "/checkin/confirm", [confirmCheckinLinkHandler]),
  route("POST", "/webhooks/mercadopago", [mercadoPagoWebhookHandler]),
  route("POST", "/webhooks/pix", [unifiedPixWebhookHandler]),
  route("GET", "/catalog/districts", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), listDistrictsHandler]),
  route("GET", "/catalog/churches", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), listChurchesHandler]),
  route("GET", "/catalog/churches/director", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), findChurchByDirectorCpfHandler]),
  route("GET", "/catalog/ministries", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), listMinistriesHandler]),
  route("GET", "/public/districts", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), listDistrictsHandler]),
  route("GET", "/public/churches", [publicCache({ sMaxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }), listChurchesHandler]),
  route("GET", "/public/registrations", [listRegistrationsHandler]),

  // Auth
  route("POST", "/admin/login", [loginHandler]),
  route("POST", "/admin/password/recover", [recoverPasswordHandler]),
  route("GET", "/profile", [authenticate, getProfileHandler]),

  // Admin protected
  route(
    "GET",
    "/admin/system/config",
    [...adminBase, authorize("AdminGeral"), authorizePermission("system", "view"), getAdminSystemConfigHandler]
  ),
  route(
    "PUT",
    "/admin/system/config",
    [...adminBase, authorize("AdminGeral"), authorizePermission("system", "edit"), updateSystemConfigHandler]
  ),
  route(
    "GET",
    "/admin/payments/pix-config",
    [...adminBase, authorize("AdminGeral"), getPixConfigHandler]
  ),
  route(
    "PUT",
    "/admin/payments/pix-config",
    [...adminBase, authorize("AdminGeral"), upsertPixConfigHandler]
  ),
  route(
    "GET",
    "/admin/payments/mercadopago/:paymentId",
    [...adminBase, authorizePermission("orders", "view"), getMercadoPagoPaymentHandler]
  ),
  route(
    "POST",
    "/admin/profile/change-password",
    [...adminBase, changePasswordHandler]
  ),
  route(
    "GET",
    "/admin/dashboard/registrations",
    [...adminBase, authorizePermission("dashboard", "view"), registrationsDashboardHandler]
  ),

  // Districts
  route(
    "GET",
    "/admin/districts",
    [...adminBase, authorizePermission("districts", "view"), listDistrictsHandler]
  ),
  route(
    "POST",
    "/admin/districts",
    [...adminBase, authorizePermission("districts", "create"), createDistrictHandler]
  ),
  route(
    "PATCH",
    "/admin/districts/:id",
    [...adminBase, authorizePermission("districts", "edit"), updateDistrictHandler]
  ),
  route(
    "DELETE",
    "/admin/districts/:id",
    [...adminBase, authorizePermission("districts", "delete"), deleteDistrictHandler]
  ),

  // Ministries
  route(
    "GET",
    "/admin/ministries",
    [...adminBase, authorizePermission("ministries", "view"), listMinistriesHandler]
  ),
  route(
    "POST",
    "/admin/ministries",
    [...adminBase, authorizePermission("ministries", "create"), createMinistryHandler]
  ),
  route(
    "PATCH",
    "/admin/ministries/:id",
    [...adminBase, authorizePermission("ministries", "edit"), updateMinistryHandler]
  ),
  route(
    "DELETE",
    "/admin/ministries/:id",
    [...adminBase, authorizePermission("ministries", "delete"), deleteMinistryHandler]
  ),

  // Users
  route(
    "GET",
    "/admin/users",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "view"), listUsersHandler]
  ),
  route(
    "POST",
    "/admin/users",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "create"), createUserHandler]
  ),
  route(
    "PATCH",
    "/admin/users/:id",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "edit"), updateUserHandler]
  ),
  route(
    "POST",
    "/admin/users/:id/reset-password",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "edit"), resetUserPasswordHandler]
  ),
  route(
    "PATCH",
    "/admin/users/:id/status",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "edit"), updateUserStatusHandler]
  ),
  route(
    "DELETE",
    "/admin/users/:id",
    [...adminBase, authorize("AdminGeral"), authorizePermission("users", "delete"), deleteUserHandler]
  ),

  // Profiles
  route(
    "GET",
    "/admin/profiles",
    [...adminBase, authorize("AdminGeral"), authorizePermission("profiles", "view"), listProfilesHandler]
  ),
  route(
    "POST",
    "/admin/profiles",
    [...adminBase, authorize("AdminGeral"), authorizePermission("profiles", "create"), createProfileHandler]
  ),
  route(
    "PATCH",
    "/admin/profiles/:id",
    [...adminBase, authorize("AdminGeral"), authorizePermission("profiles", "edit"), updateProfileHandler]
  ),
  route(
    "PATCH",
    "/admin/profiles/:id/status",
    [...adminBase, authorize("AdminGeral"), authorizePermission("profiles", "edit"), updateProfileStatusHandler]
  ),
  route(
    "DELETE",
    "/admin/profiles/:id",
    [...adminBase, authorize("AdminGeral"), authorizePermission("profiles", "delete"), deleteProfileHandler]
  ),

  // Churches
  route(
    "GET",
    "/admin/churches",
    [...adminBase, authorizePermission("churches", "view"), listChurchesHandler]
  ),
  route(
    "POST",
    "/admin/churches",
    [...adminBase, authorizePermission("churches", "create"), createChurchHandler]
  ),
  route(
    "PATCH",
    "/admin/churches/:id",
    [...adminBase, authorizePermission("churches", "edit"), updateChurchHandler]
  ),
  route(
    "DELETE",
    "/admin/churches/:id",
    [...adminBase, authorizePermission("churches", "delete"), deleteChurchHandler]
  ),

  // Events
  route(
    "GET",
    "/admin/events",
    [...adminBase, authorizePermission("events", "view"), listEventsAdminHandler]
  ),
  route(
    "GET",
    "/admin/insurance",
    [...adminBase, authorizePermission("events", "view"), listInsuranceHandler]
  ),
  route(
    "POST",
    "/admin/events",
    [...adminBase, authorizePermission("events", "create"), createEventHandler]
  ),
  route(
    "PATCH",
    "/admin/events/:id",
    [...adminBase, authorizePermission("events", "edit"), updateEventHandler]
  ),
  route(
    "DELETE",
    "/admin/events/:id",
    [...adminBase, authorizePermission("events", "delete"), deleteEventHandler]
  ),
  route(
    "POST",
    "/admin/uploads",
    [...adminBase, authorizePermission("events", "edit")],
    { upload: true }
  ),
  route(
    "GET",
    "/admin/events/:eventId/lots",
    [...adminBase, authorizePermission("events", "view"), listEventLotsHandler]
  ),
  route(
    "POST",
    "/admin/events/:eventId/lots",
    [...adminBase, authorizePermission("events", "edit"), createEventLotHandler]
  ),
  route(
    "PATCH",
    "/admin/events/:eventId/lots/:lotId",
    [...adminBase, authorizePermission("events", "edit"), updateEventLotHandler]
  ),
  route(
    "DELETE",
    "/admin/events/:eventId/lots/:lotId",
    [...adminBase, authorizePermission("events", "delete"), deleteEventLotHandler]
  ),

  // Orders
  route(
    "GET",
    "/admin/orders",
    [...adminBase, authorizePermission("orders", "view"), listOrdersHandler]
  ),
  route(
    "GET",
    "/admin/orders/pending",
    [...adminBase, authorizePermission("orders", "view"), listPendingOrdersHandler]
  ),
  route(
    "POST",
    "/admin/orders/:id/mark-paid",
    [...adminBase, authorizePermission("orders", "financial"), markOrderPaidHandler]
  ),

  // Registrations
  route(
    "GET",
    "/admin/registrations",
    [...adminBase, authorizePermission("registrations", "view"), listRegistrationsHandler]
  ),
  route(
    "OPTIONS",
    "/admin/registrations/list.pdf",
    [
      ...adminBase,
      authorizePermission("registrations", "view"),
      authorizePermission("reports", "reports"),
      downloadRegistrationsListPdfHandler
    ]
  ),
  route(
    "GET",
    "/admin/registrations/list.pdf",
    [
      ...adminBase,
      authorizePermission("registrations", "view"),
      authorizePermission("reports", "reports"),
      downloadRegistrationsListPdfHandler
    ]
  ),
  route(
    "OPTIONS",
    "/admin/registrations/list.xlsx",
    [
      ...adminBase,
      authorizePermission("registrations", "view"),
      authorizePermission("reports", "reports"),
      downloadRegistrationsListXlsxHandler
    ]
  ),
  route(
    "GET",
    "/admin/registrations/list.xlsx",
    [
      ...adminBase,
      authorizePermission("registrations", "view"),
      authorizePermission("reports", "reports"),
      downloadRegistrationsListXlsxHandler
    ]
  ),
  route(
    "GET",
    "/admin/registrations/report",
    [...adminBase, authorizePermission("registrations", "reports"), registrationsReportHandler]
  ),
  route(
    "GET",
    "/admin/reports/registrations/summary",
    [...adminBase, authorizePermission("reports", "reports"), adminRegistrationsReportHandler]
  ),
  route(
    "OPTIONS",
    "/admin/registrations/report.pdf",
    [...adminBase, authorizePermission("registrations", "reports"), downloadRegistrationsReportHandler]
  ),
  route(
    "GET",
    "/admin/registrations/report.pdf",
    [...adminBase, authorizePermission("registrations", "reports"), downloadRegistrationsReportHandler]
  ),
  route(
    "OPTIONS",
    "/admin/reports/registrations/summary.csv",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportCsvHandler]
  ),
  route(
    "GET",
    "/admin/reports/registrations/summary.csv",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportCsvHandler]
  ),
  route(
    "OPTIONS",
    "/admin/reports/registrations/summary.xlsx",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportXlsxHandler]
  ),
  route(
    "GET",
    "/admin/reports/registrations/summary.xlsx",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportXlsxHandler]
  ),
  route(
    "OPTIONS",
    "/admin/reports/registrations/summary.pdf",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportPdfHandler]
  ),
  route(
    "GET",
    "/admin/reports/registrations/summary.pdf",
    [...adminBase, authorizePermission("reports", "reports"), downloadAdminRegistrationsReportPdfHandler]
  ),
  route(
    "GET",
    "/admin/reports/jobs/:jobId",
    [...adminBase, authorizePermission("reports", "reports"), getReportJobStatusHandler]
  ),
  route(
    "OPTIONS",
    "/admin/reports/jobs/:jobId/file",
    [...adminBase, authorizePermission("reports", "reports"), downloadReportJobFileHandler]
  ),
  route(
    "GET",
    "/admin/reports/jobs/:jobId/file",
    [...adminBase, authorizePermission("reports", "reports"), downloadReportJobFileHandler]
  ),
  route(
    "PATCH",
    "/admin/registrations/:id",
    [...adminBase, authorizePermission("registrations", "edit"), updateRegistrationHandler]
  ),
  route(
    "DELETE",
    "/admin/registrations/:id",
    [...adminBase, authorizePermission("registrations", "delete"), deleteRegistrationHandler]
  ),
  route(
    "POST",
    "/admin/registrations/:id/cancel",
    [...adminBase, authorizePermission("registrations", "deactivate"), cancelRegistrationHandler]
  ),
  route(
    "POST",
    "/admin/registrations/:id/reactivate",
    [...adminBase, authorizePermission("registrations", "approve"), reactivateRegistrationHandler]
  ),
  route(
    "POST",
    "/admin/registrations/:id/refund",
    [...adminBase, authorizePermission("registrations", "financial"), refundRegistrationHandler]
  ),
  route(
    "POST",
    "/admin/registrations/mark-paid",
    [...adminBase, authorizePermission("registrations", "financial"), markRegistrationsPaidHandler]
  ),
  route(
    "POST",
    "/admin/registrations/payment-order",
    [...adminBase, authorizePermission("registrations", "financial"), createPaymentForRegistrationsHandler]
  ),
  route(
    "POST",
    "/admin/registrations/:id/payment-link",
    [...adminBase, authorizePermission("registrations", "financial"), regenerateRegistrationPaymentLinkHandler]
  ),
  route(
    "GET",
    "/admin/registrations/:id/history",
    [...adminBase, authorizePermission("registrations", "view"), getRegistrationHistoryHandler]
  ),
  route(
    "GET",
    "/admin/registrations/:id/receipt-link",
    [...adminBase, authorizePermission("registrations", "view"), getRegistrationReceiptLinkHandler]
  ),

  // Checkin
  route(
    "GET",
    "/admin/checkin/:eventId",
    [...adminBase, authorizePermission("checkin", "view"), getCheckinDashboardHandler]
  ),
  route(
    "POST",
    "/admin/checkin/scan",
    [...adminBase, authorizePermission("checkin", "approve"), scanCheckinHandler]
  ),
  route(
    "POST",
    "/admin/checkin/manual",
    [...adminBase, authorizePermission("checkin", "approve"), manualCheckinHandler]
  ),
  route(
    "POST",
    "/admin/checkin/confirm",
    [...adminBase, authorizePermission("checkin", "approve"), confirmAdminCheckinHandler]
  ),

  // Expenses
  route(
    "GET",
    "/admin/events/:eventId/expenses",
    [...adminBase, authorizePermission("financial", "view"), listExpensesByEventHandler]
  ),
  route(
    "POST",
    "/admin/events/:eventId/expenses",
    [...adminBase, authorizePermission("financial", "create"), createExpenseHandler]
  ),
  route(
    "GET",
    "/admin/expenses/:id",
    [...adminBase, authorizePermission("financial", "view"), getExpenseHandler]
  ),
  route(
    "PATCH",
    "/admin/expenses/:id",
    [...adminBase, authorizePermission("financial", "edit"), updateExpenseHandler]
  ),
  route(
    "DELETE",
    "/admin/expenses/:id",
    [...adminBase, authorizePermission("financial", "delete"), deleteExpenseHandler]
  ),

  // Financial
  route(
    "GET",
    "/admin/financial/summary",
    [...adminBase, authorizePermission("financial", "view"), getGeneralSummaryHandler]
  ),
  route(
    "GET",
    "/admin/financial/events/:eventId",
    [...adminBase, authorizePermission("financial", "view"), getEventSummaryHandler]
  ),
  route(
    "GET",
    "/admin/financial/events/:eventId/districts/:districtId",
    [...adminBase, authorizePermission("financial", "view"), getDistrictSummaryHandler]
  ),
  route(
    "GET",
    "/admin/financial/events/:eventId/churches/:churchId",
    [...adminBase, authorizePermission("financial", "view"), getChurchSummaryHandler]
  ),
  route(
    "OPTIONS",
    "/admin/financial/events/:eventId/report.pdf",
    [...adminBase, authorizePermission("financial", "reports"), downloadEventFinancialReportHandler]
  ),
  route(
    "GET",
    "/admin/financial/events/:eventId/report.pdf",
    [...adminBase, authorizePermission("financial", "reports"), downloadEventFinancialReportHandler]
  ),
  route(
    "GET",
    "/admin/finance/districts",
    [...adminBase, authorizePermission("financial", "view"), listDistrictFinanceHandler]
  ),
  route(
    "GET",
    "/admin/finance/districts/:id/pending-orders",
    [...adminBase, authorizePermission("financial", "view"), listDistrictPendingOrdersHandler]
  ),
  route(
    "GET",
    "/admin/finance/districts/:id/transfers",
    [...adminBase, authorizePermission("financial", "view"), listDistrictTransfersHandler]
  ),
  route(
    "POST",
    "/admin/finance/districts/:districtId/transfer",
    [...adminBase, authorizePermission("financial", "financial"), createDistrictTransferHandler]
  ),
  route(
    "GET",
    "/admin/finance/responsibles",
    [...adminBase, authorizePermission("financial", "view"), listResponsibleFinanceHandler]
  ),
  route(
    "GET",
    "/admin/finance/responsibles/:id/pending-orders",
    [...adminBase, authorizePermission("financial", "view"), listResponsiblePendingOrdersHandler]
  ),
  route(
    "GET",
    "/admin/finance/responsibles/:id/transfers",
    [...adminBase, authorizePermission("financial", "view"), listResponsibleTransfersHandler]
  ),
  route(
    "POST",
    "/admin/finance/responsibles/:responsibleUserId/transfer",
    [...adminBase, authorizePermission("financial", "financial"), createResponsibleTransferHandler]
  )
];
