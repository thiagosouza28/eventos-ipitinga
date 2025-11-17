import type { UserPermission as PrismaUserPermission } from "@/prisma/generated/client";

import type { PermissionEntry } from "../../config/permissions";
import { prisma } from "../../lib/prisma";
import { auditService } from "../../services/audit.service";
import { NotFoundError } from "../../utils/errors";

const mapToCreateData = (userId: string, entry: PermissionEntry) => ({
  userId,
  module: entry.module,
  canView: Boolean(entry.canView),
  canCreate: Boolean(entry.canCreate),
  canEdit: Boolean(entry.canEdit),
  canDelete: Boolean(entry.canDelete),
  canApprove: Boolean(entry.canApprove),
  canDeactivate: Boolean(entry.canDeactivate),
  canReport: Boolean(entry.canReport),
  canFinancial: Boolean(entry.canFinancial)
});

const mapToEntry = (permission: PrismaUserPermission): PermissionEntry => ({
  module: permission.module,
  canView: permission.canView,
  canCreate: permission.canCreate,
  canEdit: permission.canEdit,
  canDelete: permission.canDelete,
  canApprove: permission.canApprove,
  canDeactivate: permission.canDeactivate,
  canReport: permission.canReport,
  canFinancial: permission.canFinancial
});

class UserPermissionService {
  private async ensureUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("Usuario nao encontrado");
    }
  }

  async list(userId: string): Promise<PermissionEntry[]> {
    await this.ensureUser(userId);
    const permissions = await prisma.userPermission.findMany({
      where: { userId },
      orderBy: { module: "asc" }
    });
    return permissions.map(mapToEntry);
  }

  async upsert(userId: string, entries: PermissionEntry[], actorUserId?: string) {
    await this.ensureUser(userId);
    await prisma.userPermission.deleteMany({ where: { userId } });
    if (entries.length) {
      await prisma.userPermission.createMany({
        data: entries.map((entry) => mapToCreateData(userId, entry))
      });
    }

    await auditService.log({
      actorUserId,
      action: "USER_PERMISSIONS_UPDATED",
      entity: "user",
      entityId: userId,
      metadata: { count: entries.length }
    });

    return this.list(userId);
  }
}

export const userPermissionService = new UserPermissionService();
