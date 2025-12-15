import { Router } from "express";

import { authenticate } from "../middlewares/auth-middleware";
import { authorize, authorizePermission } from "../middlewares/rbac-middleware";
import { applyScope } from "../middlewares/scope-middleware";
import { enforcePasswordUpdate } from "../middlewares/force-password-middleware";
import { hydratePermissions } from "../middlewares/permissions-middleware";
import {
  loginHandler,
  changePasswordHandler,
  recoverPasswordHandler,
  getProfileHandler
} from "../controllers/auth.controller";
import {
  createChurchHandler,
  listChurchesHandler,
  updateChurchHandler,
  deleteChurchHandler,
  findChurchByDirectorCpfHandler
} from "../controllers/church.controller";
import {
  createDistrictHandler,
  listDistrictsHandler,
  updateDistrictHandler,
  deleteDistrictHandler
} from "../controllers/district.controller";
import {
  createEventHandler,
  listPublicEventsHandler,
  getEventBySlugHandler,
  listEventsAdminHandler,
  updateEventHandler,
  deleteEventHandler
} from "../controllers/event.controller";
import {
  listEventLotsHandler,
  createEventLotHandler,
  updateEventLotHandler,
  deleteEventLotHandler
} from "../controllers/event-lot.controller";
import {
  listMinistriesHandler,
  createMinistryHandler,
  updateMinistryHandler,
  deleteMinistryHandler
} from "../controllers/ministry.controller";
import {
  getOrderPaymentHandler,
  getPaymentByPreferenceIdHandler,
  listOrdersHandler,
  startInscriptionHandler,
  createBatchInscriptionHandler,
  checkParticipantCpfHandler,
  markOrderPaidHandler,
  listPendingOrdersHandler,
  bulkPaymentHandler
} from "../controllers/order.controller";
import {
  cancelRegistrationHandler,
  deleteRegistrationHandler,
  listRegistrationsHandler,
  downloadRegistrationsReportHandler,
  registrationsReportHandler,
  reactivateRegistrationHandler,
  refundRegistrationHandler,
  updateRegistrationHandler,
  markRegistrationsPaidHandler,
  regenerateRegistrationPaymentLinkHandler,
  getRegistrationHistoryHandler,
  getRegistrationReceiptLinkHandler
} from "../controllers/registration.controller";
import {
  downloadReceiptHandler,
  lookupReceiptsHandler
} from "../controllers/receipt.controller";
import { mercadoPagoWebhookHandler } from "../controllers/webhook.controller";
import {
  getCheckinDashboardHandler,
  scanCheckinHandler,
  manualCheckinHandler,
  confirmAdminCheckinHandler,
  validateCheckinLinkHandler,
  confirmCheckinLinkHandler
} from "../controllers/checkin.controller";
import {
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  listExpensesByEventHandler,
  getExpenseHandler
} from "../controllers/expense.controller";
import {
  getEventSummaryHandler,
  getDistrictSummaryHandler,
  getChurchSummaryHandler,
  getGeneralSummaryHandler,
  downloadEventFinancialReportHandler
} from "../controllers/financial.controller";
import {
  createPixPaymentHandler,
  unifiedPixWebhookHandler
} from "../controllers/pix.controller";
import {
  getPixConfigHandler,
  upsertPixConfigHandler
} from "../controllers/pix-config.controller";
import { uploadMiddleware } from "../config/upload";
import { uploadImageHandler } from "../controllers/upload.controller";
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  resetUserPasswordHandler,
  updateUserStatusHandler,
  deleteUserHandler
} from "../controllers/user.controller";
import {
  listProfilesHandler,
  createProfileHandler,
  updateProfileHandler,
  updateProfileStatusHandler,
  deleteProfileHandler
} from "../controllers/profile.controller";
import {
  getPublicSystemConfigHandler,
  getAdminSystemConfigHandler,
  updateSystemConfigHandler
} from "../controllers/system-config.controller";
import {
  listDistrictFinanceHandler,
  listDistrictPendingOrdersHandler,
  listDistrictTransfersHandler,
  createDistrictTransferHandler
} from "../controllers/district-finance.controller";
import {
  listResponsibleFinanceHandler,
  listResponsiblePendingOrdersHandler,
  listResponsibleTransfersHandler,
  createResponsibleTransferHandler
} from "../controllers/responsible-finance.controller";

export const router = Router();

router.get("/system/config", getPublicSystemConfigHandler);

// PÃºblico
router.get("/events", listPublicEventsHandler);
router.get("/events/:slug", getEventBySlugHandler);
router.post("/inscriptions/start", startInscriptionHandler);
router.post("/inscriptions/check", checkParticipantCpfHandler);
router.post("/orders/bulk-payment", bulkPaymentHandler);
router.post("/inscriptions/batch", createBatchInscriptionHandler);
// Versão autenticada para criação de inscrições em modo administrativo
router.post(
  "/admin/inscriptions/batch",
  authenticate,
  authorizePermission("registrations", "create"),
  createBatchInscriptionHandler
);
router.get("/payments/order/:orderId", getOrderPaymentHandler);
router.get("/payments/preference/:preferenceId", getPaymentByPreferenceIdHandler);
router.post("/payments/pix/create", createPixPaymentHandler);
router.post("/receipts/lookup", lookupReceiptsHandler);
router.options("/receipts/:registrationId.pdf", downloadReceiptHandler);
router.get("/receipts/:registrationId.pdf", downloadReceiptHandler);
router.get("/checkin/validate", validateCheckinLinkHandler);
router.post("/checkin/confirm", confirmCheckinLinkHandler);
router.post("/webhooks/mercadopago", mercadoPagoWebhookHandler);
router.post("/webhooks/pix", unifiedPixWebhookHandler);
router.get("/catalog/districts", listDistrictsHandler);
router.get("/catalog/churches", listChurchesHandler);
router.get("/catalog/churches/director", findChurchByDirectorCpfHandler);
router.get("/catalog/ministries", listMinistriesHandler);
router.get("/public/districts", listDistrictsHandler);
router.get("/public/churches", listChurchesHandler);

// AutenticaÃ§Ã£o
router.post("/admin/login", loginHandler);
router.post("/admin/password/recover", recoverPasswordHandler);
router.get("/profile", authenticate, getProfileHandler);

// Admin protegido
router.use("/admin", authenticate, hydratePermissions, applyScope, enforcePasswordUpdate);

router.get(
  "/admin/system/config",
  authorize("AdminGeral"),
  authorizePermission("system", "view"),
  getAdminSystemConfigHandler
);
router.put(
  "/admin/system/config",
  authorize("AdminGeral"),
  authorizePermission("system", "edit"),
  updateSystemConfigHandler
);
router.get(
  "/admin/payments/pix-config",
  authorize("AdminGeral"),
  getPixConfigHandler
);
router.put(
  "/admin/payments/pix-config",
  authorize("AdminGeral"),
  upsertPixConfigHandler
);

router.post("/admin/profile/change-password", changePasswordHandler);

router.get("/admin/districts", authorizePermission("districts", "view"), listDistrictsHandler);
router.post("/admin/districts", authorizePermission("districts", "create"), createDistrictHandler);
router.patch("/admin/districts/:id", authorizePermission("districts", "edit"), updateDistrictHandler);
router.delete("/admin/districts/:id", authorizePermission("districts", "delete"), deleteDistrictHandler);

router.get("/admin/ministries", authorizePermission("ministries", "view"), listMinistriesHandler);
router.post("/admin/ministries", authorizePermission("ministries", "create"), createMinistryHandler);
router.patch("/admin/ministries/:id", authorizePermission("ministries", "edit"), updateMinistryHandler);
router.delete("/admin/ministries/:id", authorizePermission("ministries", "delete"), deleteMinistryHandler);

router.get("/admin/users", authorize("AdminGeral"), authorizePermission("users", "view"), listUsersHandler);
router.post("/admin/users", authorize("AdminGeral"), authorizePermission("users", "create"), createUserHandler);
router.patch("/admin/users/:id", authorize("AdminGeral"), authorizePermission("users", "edit"), updateUserHandler);
router.post(
  "/admin/users/:id/reset-password",
  authorize("AdminGeral"),
  authorizePermission("users", "edit"),
  resetUserPasswordHandler
);
router.patch(
  "/admin/users/:id/status",
  authorize("AdminGeral"),
  authorizePermission("users", "edit"),
  updateUserStatusHandler
);
router.delete(
  "/admin/users/:id",
  authorize("AdminGeral"),
  authorizePermission("users", "delete"),
  deleteUserHandler
);
router.get("/admin/profiles", authorize("AdminGeral"), authorizePermission("profiles", "view"), listProfilesHandler);
router.post("/admin/profiles", authorize("AdminGeral"), authorizePermission("profiles", "create"), createProfileHandler);
router.patch("/admin/profiles/:id", authorize("AdminGeral"), authorizePermission("profiles", "edit"), updateProfileHandler);
router.patch(
  "/admin/profiles/:id/status",
  authorize("AdminGeral"),
  authorizePermission("profiles", "edit"),
  updateProfileStatusHandler
);
router.delete(
  "/admin/profiles/:id",
  authorize("AdminGeral"),
  authorizePermission("profiles", "delete"),
  deleteProfileHandler
);

router.get("/admin/churches", authorizePermission("churches", "view"), listChurchesHandler);
router.post("/admin/churches", authorizePermission("churches", "create"), createChurchHandler);
router.patch("/admin/churches/:id", authorizePermission("churches", "edit"), updateChurchHandler);
router.delete("/admin/churches/:id", authorizePermission("churches", "delete"), deleteChurchHandler);

router.get("/admin/events", authorizePermission("events", "view"), listEventsAdminHandler);
router.post("/admin/events", authorizePermission("events", "create"), createEventHandler);
router.patch("/admin/events/:id", authorizePermission("events", "edit"), updateEventHandler);
router.delete("/admin/events/:id", authorizePermission("events", "delete"), deleteEventHandler);
router.post(
  "/admin/uploads",
  authorizePermission("events", "edit"),
  uploadMiddleware.single("file"),
  uploadImageHandler
);
router.get("/admin/events/:eventId/lots", authorizePermission("events", "view"), listEventLotsHandler);
router.post("/admin/events/:eventId/lots", authorizePermission("events", "edit"), createEventLotHandler);
router.patch(
  "/admin/events/:eventId/lots/:lotId",
  authorizePermission("events", "edit"),
  updateEventLotHandler
);
router.delete(
  "/admin/events/:eventId/lots/:lotId",
  authorizePermission("events", "delete"),
  deleteEventLotHandler
);

router.get("/admin/orders", authorizePermission("orders", "view"), listOrdersHandler);
router.get("/admin/orders/pending", authorizePermission("orders", "view"), listPendingOrdersHandler);
router.post("/admin/orders/:id/mark-paid", authorizePermission("orders", "financial"), markOrderPaidHandler);

router.get("/admin/registrations", authorizePermission("registrations", "view"), listRegistrationsHandler);
router.get(
  "/admin/registrations/report",
  authorizePermission("registrations", "reports"),
  registrationsReportHandler
);
router.get(
  "/admin/registrations/report.pdf",
  authorizePermission("registrations", "reports"),
  downloadRegistrationsReportHandler
);
router.patch("/admin/registrations/:id", authorizePermission("registrations", "edit"), updateRegistrationHandler);
router.delete("/admin/registrations/:id", authorizePermission("registrations", "delete"), deleteRegistrationHandler);
router.post(
  "/admin/registrations/:id/cancel",
  authorizePermission("registrations", "deactivate"),
  cancelRegistrationHandler
);
router.post(
  "/admin/registrations/:id/reactivate",
  authorizePermission("registrations", "approve"),
  reactivateRegistrationHandler
);
router.post(
  "/admin/registrations/:id/refund",
  authorizePermission("registrations", "financial"),
  refundRegistrationHandler
);
router.post(
  "/admin/registrations/mark-paid",
  authorizePermission("registrations", "financial"),
  markRegistrationsPaidHandler
);

router.post(
  "/admin/registrations/:id/payment-link",
  authorizePermission("registrations", "financial"),
  regenerateRegistrationPaymentLinkHandler
);

// Registration History
router.get(
  "/admin/registrations/:id/history",
  authorizePermission("registrations", "view"),
  getRegistrationHistoryHandler
);
router.get(
  "/admin/registrations/:id/receipt-link",
  authorizePermission("registrations", "view"),
  getRegistrationReceiptLinkHandler
);

router.get("/admin/checkin/:eventId", authorizePermission("checkin", "view"), getCheckinDashboardHandler);
router.post("/admin/checkin/scan", authorizePermission("checkin", "approve"), scanCheckinHandler);
router.post("/admin/checkin/manual", authorizePermission("checkin", "approve"), manualCheckinHandler);
router.post("/admin/checkin/confirm", authorizePermission("checkin", "approve"), confirmAdminCheckinHandler);

// Expenses
router.get(
  "/admin/events/:eventId/expenses",
  authorizePermission("financial", "view"),
  listExpensesByEventHandler
);
router.post(
  "/admin/events/:eventId/expenses",
  authorizePermission("financial", "create"),
  createExpenseHandler
);
router.get("/admin/expenses/:id", authorizePermission("financial", "view"), getExpenseHandler);
router.patch("/admin/expenses/:id", authorizePermission("financial", "edit"), updateExpenseHandler);
router.delete("/admin/expenses/:id", authorizePermission("financial", "delete"), deleteExpenseHandler);

// Financial Dashboard
router.get("/admin/financial/summary", authorizePermission("financial", "view"), getGeneralSummaryHandler);
router.get(
  "/admin/financial/events/:eventId",
  authorizePermission("financial", "view"),
  getEventSummaryHandler
);
router.get(
  "/admin/financial/events/:eventId/districts/:districtId",
  authorizePermission("financial", "view"),
  getDistrictSummaryHandler
);
router.get(
  "/admin/financial/events/:eventId/churches/:churchId",
  authorizePermission("financial", "view"),
  getChurchSummaryHandler
);
router.get(
  "/admin/financial/events/:eventId/report.pdf",
  authorizePermission("financial", "reports"),
  downloadEventFinancialReportHandler
);
router.get(
  "/admin/finance/districts",
  authorizePermission("financial", "view"),
  listDistrictFinanceHandler
);
router.get(
  "/admin/finance/districts/:id/pending-orders",
  authorizePermission("financial", "view"),
  listDistrictPendingOrdersHandler
);
router.get(
  "/admin/finance/districts/:id/transfers",
  authorizePermission("financial", "view"),
  listDistrictTransfersHandler
);
router.post(
  "/admin/finance/districts/:districtId/transfer",
  authorizePermission("financial", "financial"),
  createDistrictTransferHandler
);
router.get(
  "/admin/finance/responsibles",
  authorizePermission("financial", "view"),
  listResponsibleFinanceHandler
);
router.get(
  "/admin/finance/responsibles/:id/pending-orders",
  authorizePermission("financial", "view"),
  listResponsiblePendingOrdersHandler
);
router.get(
  "/admin/finance/responsibles/:id/transfers",
  authorizePermission("financial", "view"),
  listResponsibleTransfersHandler
);
router.post(
  "/admin/finance/responsibles/:responsibleUserId/transfer",
  authorizePermission("financial", "financial"),
  createResponsibleTransferHandler
);

export default router;








