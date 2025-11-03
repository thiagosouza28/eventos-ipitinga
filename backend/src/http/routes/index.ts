import { Router } from "express";

import { authenticate } from "../../middlewares/auth-middleware";
import { authorize } from "../../middlewares/rbac-middleware";
import { loginHandler } from "../../modules/auth/auth.controller";
import {
  createChurchHandler,
  listChurchesHandler,
  updateChurchHandler
} from "../../modules/churches/church.controller";
import {
  createDistrictHandler,
  listDistrictsHandler,
  updateDistrictHandler
} from "../../modules/districts/district.controller";
import {
  createEventHandler,
  listPublicEventsHandler,
  getEventBySlugHandler,
  listEventsAdminHandler,
  updateEventHandler,
  deleteEventHandler
} from "../../modules/events/event.controller";
import {
  listEventLotsHandler,
  createEventLotHandler,
  updateEventLotHandler,
  deleteEventLotHandler
} from "../../modules/events/event-lot.controller";
import {
  getOrderPaymentHandler,
  listOrdersHandler,
  startInscriptionHandler,
  createBatchInscriptionHandler,
  checkParticipantCpfHandler,
  markOrderPaidHandler
} from "../../modules/orders/order.controller";
import {
  cancelRegistrationHandler,
  deleteRegistrationHandler,
  listRegistrationsHandler,
  downloadRegistrationsReportHandler,
  registrationsReportHandler,
  refundRegistrationHandler,
  updateRegistrationHandler,
  markRegistrationsPaidHandler
} from "../../modules/registrations/registration.controller";
import {
  downloadReceiptHandler,
  lookupReceiptsHandler
} from "../../modules/receipts/receipt.controller";
import { mercadoPagoWebhookHandler } from "../../modules/webhooks/webhook.controller";
import {
  getCheckinDashboardHandler,
  scanCheckinHandler,
  manualCheckinHandler,
  confirmAdminCheckinHandler,
  validateCheckinLinkHandler,
  confirmCheckinLinkHandler
} from "../../modules/checkin/checkin.controller";

export const router = Router();

// PÃºblico
router.get("/events", listPublicEventsHandler);
router.get("/events/:slug", getEventBySlugHandler);
router.post("/inscriptions/start", startInscriptionHandler);
router.post("/inscriptions/check", checkParticipantCpfHandler);
router.post("/inscriptions/batch", createBatchInscriptionHandler);
router.get("/payments/order/:orderId", getOrderPaymentHandler);
router.post("/receipts/lookup", lookupReceiptsHandler);
router.get("/receipts/:registrationId.pdf", downloadReceiptHandler);
router.get("/checkin/validate", validateCheckinLinkHandler);
router.post("/checkin/confirm", confirmCheckinLinkHandler);
router.post("/webhooks/mercadopago", mercadoPagoWebhookHandler);
router.get("/catalog/districts", listDistrictsHandler);
router.get("/catalog/churches", listChurchesHandler);

// AutenticaÃ§Ã£o
router.post("/admin/login", loginHandler);

// Admin protegido
router.use("/admin", authenticate);

router.get(
  "/admin/districts",
  authorize("AdminGeral", "AdminDistrital"),
  listDistrictsHandler
);
router.post("/admin/districts", authorize("AdminGeral"), createDistrictHandler);
router.patch("/admin/districts/:id", authorize("AdminGeral"), updateDistrictHandler);

router.get("/admin/churches", authorize("AdminGeral", "AdminDistrital"), listChurchesHandler);
router.post("/admin/churches", authorize("AdminGeral", "AdminDistrital"), createChurchHandler);
router.patch("/admin/churches/:id", authorize("AdminGeral", "AdminDistrital"), updateChurchHandler);

router.get("/admin/events", authorize("AdminGeral", "AdminDistrital"), listEventsAdminHandler);
router.post("/admin/events", authorize("AdminGeral"), createEventHandler);
router.patch("/admin/events/:id", authorize("AdminGeral"), updateEventHandler);
router.delete("/admin/events/:id", authorize("AdminGeral"), deleteEventHandler);
router.get(
  "/admin/events/:eventId/lots",
  authorize("AdminGeral", "AdminDistrital"),
  listEventLotsHandler
);
router.post("/admin/events/:eventId/lots", authorize("AdminGeral"), createEventLotHandler);
router.patch(
  "/admin/events/:eventId/lots/:lotId",
  authorize("AdminGeral"),
  updateEventLotHandler
);
router.delete(
  "/admin/events/:eventId/lots/:lotId",
  authorize("AdminGeral"),
  deleteEventLotHandler
);

router.get("/admin/orders", authorize("AdminGeral", "Tesoureiro"), listOrdersHandler);
router.post(
  "/admin/orders/:id/mark-paid",
  authorize("AdminGeral", "Tesoureiro"),
  markOrderPaidHandler
);

router.get(
  "/admin/registrations",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro"),
  listRegistrationsHandler
);
router.get(
  "/admin/registrations/report",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro"),
  registrationsReportHandler
);
router.get(
  "/admin/registrations/report.pdf",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal", "Tesoureiro"),
  downloadRegistrationsReportHandler
);
router.patch(
  "/admin/registrations/:id",
  authorize("AdminGeral", "AdminDistrital"),
  updateRegistrationHandler
);
router.delete(
  "/admin/registrations/:id",
  authorize("AdminGeral", "AdminDistrital"),
  deleteRegistrationHandler
);
router.post(
  "/admin/registrations/:id/cancel",
  authorize("AdminGeral", "AdminDistrital"),
  cancelRegistrationHandler
);
router.post(
  "/admin/registrations/:id/refund",
  authorize("AdminGeral", "Tesoureiro"),
  refundRegistrationHandler
);
router.post(
  "/admin/registrations/mark-paid",
  authorize("AdminGeral", "Tesoureiro"),
  markRegistrationsPaidHandler
);

router.get(
  "/admin/checkin/:eventId",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal"),
  getCheckinDashboardHandler
);
router.post(
  "/admin/checkin/scan",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal"),
  scanCheckinHandler
);
router.post(
  "/admin/checkin/manual",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal"),
  manualCheckinHandler
);
router.post(
  "/admin/checkin/confirm",
  authorize("AdminGeral", "AdminDistrital", "DiretorLocal"),
  confirmAdminCheckinHandler
);
