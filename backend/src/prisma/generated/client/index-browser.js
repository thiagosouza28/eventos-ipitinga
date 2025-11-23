
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.DistrictScalarFieldEnum = {
  id: 'id',
  name: 'name',
  pastorName: 'pastorName',
  createdAt: 'createdAt'
};

exports.Prisma.ChurchScalarFieldEnum = {
  id: 'id',
  name: 'name',
  districtId: 'districtId',
  directorName: 'directorName',
  directorCpf: 'directorCpf',
  directorBirthDate: 'directorBirthDate',
  directorEmail: 'directorEmail',
  directorWhatsapp: 'directorWhatsapp',
  directorPhotoUrl: 'directorPhotoUrl',
  createdAt: 'createdAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  startDate: 'startDate',
  endDate: 'endDate',
  location: 'location',
  bannerUrl: 'bannerUrl',
  priceCents: 'priceCents',
  minAgeYears: 'minAgeYears',
  isFree: 'isFree',
  isActive: 'isActive',
  slug: 'slug',
  paymentMethods: 'paymentMethods',
  pendingPaymentValueRule: 'pendingPaymentValueRule',
  createdAt: 'createdAt',
  ministryId: 'ministryId',
  createdById: 'createdById'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  buyerCpf: 'buyerCpf',
  totalCents: 'totalCents',
  status: 'status',
  paymentMethod: 'paymentMethod',
  mpPaymentId: 'mpPaymentId',
  mpPreferenceId: 'mpPreferenceId',
  preferenceVersion: 'preferenceVersion',
  pricingLotId: 'pricingLotId',
  externalReference: 'externalReference',
  expiresAt: 'expiresAt',
  paidAt: 'paidAt',
  manualPaymentReference: 'manualPaymentReference',
  feeCents: 'feeCents',
  netAmountCents: 'netAmountCents',
  createdAt: 'createdAt'
};

exports.Prisma.RegistrationScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  eventId: 'eventId',
  fullName: 'fullName',
  cpf: 'cpf',
  birthDate: 'birthDate',
  ageYears: 'ageYears',
  priceCents: 'priceCents',
  districtId: 'districtId',
  churchId: 'churchId',
  photoUrl: 'photoUrl',
  gender: 'gender',
  paymentMethod: 'paymentMethod',
  status: 'status',
  receiptPdfUrl: 'receiptPdfUrl',
  checkinAt: 'checkinAt',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  ministryId: 'ministryId'
};

exports.Prisma.RefundScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  registrationId: 'registrationId',
  amountCents: 'amountCents',
  mpRefundId: 'mpRefundId',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.WebhookEventScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  eventType: 'eventType',
  payloadJson: 'payloadJson',
  idempotencyKey: 'idempotencyKey',
  processedAt: 'processedAt',
  createdAt: 'createdAt',
  orderId: 'orderId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorUserId: 'actorUserId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  districtScopeId: 'districtScopeId',
  churchId: 'churchId',
  ministryId: 'ministryId',
  createdAt: 'createdAt',
  cpf: 'cpf',
  isTemporaryPassword: 'isTemporaryPassword',
  passwordUpdatedAt: 'passwordUpdatedAt',
  phone: 'phone',
  photoUrl: 'photoUrl',
  profileId: 'profileId',
  status: 'status'
};

exports.Prisma.SystemConfigScalarFieldEnum = {
  id: 'id',
  settings: 'settings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  updatedById: 'updatedById'
};

exports.Prisma.EventLotScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  name: 'name',
  priceCents: 'priceCents',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  createdAt: 'createdAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  description: 'description',
  date: 'date',
  amountCents: 'amountCents',
  madeBy: 'madeBy',
  items: 'items',
  receiptUrl: 'receiptUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MinistryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MinistryUserScalarFieldEnum = {
  userId: 'userId',
  ministryId: 'ministryId',
  assignedAt: 'assignedAt'
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfilePermissionScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  module: 'module',
  canView: 'canView',
  canCreate: 'canCreate',
  canEdit: 'canEdit',
  canDelete: 'canDelete',
  canApprove: 'canApprove',
  canDeactivate: 'canDeactivate',
  canReport: 'canReport',
  canFinancial: 'canFinancial',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  module: 'module',
  canView: 'canView',
  canCreate: 'canCreate',
  canEdit: 'canEdit',
  canDelete: 'canDelete',
  canApprove: 'canApprove',
  canDeactivate: 'canDeactivate',
  canReport: 'canReport',
  canFinancial: 'canFinancial',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.Prisma.ModelName = {
  District: 'District',
  Church: 'Church',
  Event: 'Event',
  Order: 'Order',
  Registration: 'Registration',
  Refund: 'Refund',
  WebhookEvent: 'WebhookEvent',
  AuditLog: 'AuditLog',
  User: 'User',
  SystemConfig: 'SystemConfig',
  EventLot: 'EventLot',
  Expense: 'Expense',
  Ministry: 'Ministry',
  MinistryUser: 'MinistryUser',
  Profile: 'Profile',
  ProfilePermission: 'ProfilePermission',
  UserPermission: 'UserPermission'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
