import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

export class ChurchService {
  async list(districtId?: string) {
    try {
      // Verificar se as colunas do diretor existem
      const columns = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info(Church);
      `;
      const hasDirectorColumns = columns.some(col => col.name === 'directorName');
      
      if (hasDirectorColumns) {
        // Se as colunas existem, usar query raw para incluí-las
        if (districtId) {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            directorName: string | null;
            directorCpf: string | null;
            directorBirthDate: Date | null;
            directorEmail: string | null;
            directorWhatsapp: string | null;
            directorPhotoUrl: string | null;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_pastorName: string | null;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.directorName, 
              c.directorCpf, 
              c.directorBirthDate, 
              c.directorEmail, 
              c.directorWhatsapp, 
              c.directorPhotoUrl, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.pastorName as district_pastorName,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            WHERE c.districtId = ${districtId}
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: String(c.id || ""),
            name: String(c.name || ""),
            districtId: String(c.districtId || ""),
            directorName: c.directorName ? String(c.directorName) : null,
            directorCpf: c.directorCpf ? String(c.directorCpf) : null,
            directorBirthDate: c.directorBirthDate || null,
            directorEmail: c.directorEmail ? String(c.directorEmail) : null,
            directorWhatsapp: c.directorWhatsapp ? String(c.directorWhatsapp) : null,
            directorPhotoUrl: c.directorPhotoUrl ? String(c.directorPhotoUrl) : null,
            createdAt: c.createdAt,
            district: {
              id: String(c.district_id || ""),
              name: String(c.district_name || ""),
              pastorName: c.district_pastorName ? String(c.district_pastorName) : null,
              createdAt: c.district_createdAt
            }
          }));
        } else {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            directorName: string | null;
            directorCpf: string | null;
            directorBirthDate: Date | null;
            directorEmail: string | null;
            directorWhatsapp: string | null;
            directorPhotoUrl: string | null;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_pastorName: string | null;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.directorName, 
              c.directorCpf, 
              c.directorBirthDate, 
              c.directorEmail, 
              c.directorWhatsapp, 
              c.directorPhotoUrl, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.pastorName as district_pastorName,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: String(c.id || ""),
            name: String(c.name || ""),
            districtId: String(c.districtId || ""),
            directorName: c.directorName ? String(c.directorName) : null,
            directorCpf: c.directorCpf ? String(c.directorCpf) : null,
            directorBirthDate: c.directorBirthDate || null,
            directorEmail: c.directorEmail ? String(c.directorEmail) : null,
            directorWhatsapp: c.directorWhatsapp ? String(c.directorWhatsapp) : null,
            directorPhotoUrl: c.directorPhotoUrl ? String(c.directorPhotoUrl) : null,
            createdAt: c.createdAt,
            district: {
              id: String(c.district_id || ""),
              name: String(c.district_name || ""),
              pastorName: c.district_pastorName ? String(c.district_pastorName) : null,
              createdAt: c.district_createdAt
            }
          }));
        }
      } else {
        // Se não existem, usar query simples sem colunas do diretor
        if (districtId) {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_pastorName: string | null;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.pastorName as district_pastorName,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            WHERE c.districtId = ${districtId}
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: String(c.id || ""),
            name: String(c.name || ""),
            districtId: String(c.districtId || ""),
            directorName: null,
            directorCpf: null,
            directorBirthDate: null,
            directorEmail: null,
            directorWhatsapp: null,
            directorPhotoUrl: null,
            createdAt: c.createdAt,
            district: {
              id: String(c.district_id || ""),
              name: String(c.district_name || ""),
              pastorName: c.district_pastorName ? String(c.district_pastorName) : null,
              createdAt: c.district_createdAt
            }
          }));
        } else {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_pastorName: string | null;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.pastorName as district_pastorName,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: String(c.id || ""),
            name: String(c.name || ""),
            districtId: String(c.districtId || ""),
            directorName: null,
            directorCpf: null,
            directorBirthDate: null,
            directorEmail: null,
            directorWhatsapp: null,
            directorPhotoUrl: null,
            createdAt: c.createdAt,
            district: {
              id: String(c.district_id || ""),
              name: String(c.district_name || ""),
              pastorName: c.district_pastorName ? String(c.district_pastorName) : null,
              createdAt: c.district_createdAt
            }
          }));
  }
      }
    } catch (error: any) {
      // Fallback: tentar query simples sem colunas do diretor
      try {
        if (districtId) {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            WHERE c.districtId = ${districtId}
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: c.id,
            name: c.name,
            districtId: c.districtId,
            directorName: null,
            directorCpf: null,
            directorBirthDate: null,
            directorEmail: null,
            directorWhatsapp: null,
            directorPhotoUrl: null,
            createdAt: c.createdAt,
            district: {
              id: c.district_id,
              name: c.district_name,
              pastorName: null,
              createdAt: c.district_createdAt
            }
          }));
        } else {
          const churches = await prisma.$queryRaw<Array<{
            id: string;
            name: string;
            districtId: string;
            createdAt: Date;
            district_id: string;
            district_name: string;
            district_createdAt: Date;
          }>>`
            SELECT 
              c.id, 
              c.name, 
              c.districtId, 
              c.createdAt,
              d.id as district_id,
              d.name as district_name,
              d.createdAt as district_createdAt
            FROM Church c
            INNER JOIN District d ON c.districtId = d.id
            ORDER BY c.name ASC
          `;
          
          return churches.map(c => ({
            id: c.id,
            name: c.name,
            districtId: c.districtId,
            directorName: null,
            directorCpf: null,
            directorBirthDate: null,
            directorEmail: null,
            directorWhatsapp: null,
            directorPhotoUrl: null,
            createdAt: c.createdAt,
            district: {
              id: c.district_id,
              name: c.district_name,
              pastorName: null,
              createdAt: c.district_createdAt
            }
          }));
        }
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  async create(data: {
    name: string;
    districtId: string;
    directorName?: string;
    directorCpf?: string;
    directorBirthDate?: string;
    directorEmail?: string;
    directorWhatsapp?: string;
    directorPhotoUrl?: string;
  }, actorId?: string) {
    // Garantir que todos os campos sejam strings válidas
    const cleanData: any = {
      name: String(data.name || "").trim(),
      districtId: String(data.districtId || "").trim()
    };
    
    if (data.directorName !== undefined && data.directorName !== null) {
      cleanData.directorName = String(data.directorName).trim() || null;
    }
    if (data.directorCpf !== undefined && data.directorCpf !== null) {
      cleanData.directorCpf = String(data.directorCpf).trim() || null;
    }
    if (data.directorBirthDate !== undefined && data.directorBirthDate !== null) {
      cleanData.directorBirthDate = new Date(String(data.directorBirthDate)) || null;
    }
    if (data.directorEmail !== undefined && data.directorEmail !== null) {
      cleanData.directorEmail = String(data.directorEmail).trim() || null;
    }
    if (data.directorWhatsapp !== undefined && data.directorWhatsapp !== null) {
      cleanData.directorWhatsapp = String(data.directorWhatsapp).trim() || null;
    }
    if (data.directorPhotoUrl !== undefined && data.directorPhotoUrl !== null) {
      cleanData.directorPhotoUrl = String(data.directorPhotoUrl).trim() || null;
    }
    
    const church = await prisma.church.create({
      data: cleanData,
      include: { district: true }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_CREATED",
      entity: "church",
      entityId: church.id,
      metadata: cleanData
    });
    return {
      id: String(church.id),
      name: String(church.name),
      districtId: String(church.districtId),
      directorName: church.directorName ? String(church.directorName) : null,
      directorCpf: church.directorCpf ? String(church.directorCpf) : null,
      directorBirthDate: church.directorBirthDate || null,
      directorEmail: church.directorEmail ? String(church.directorEmail) : null,
      directorWhatsapp: church.directorWhatsapp ? String(church.directorWhatsapp) : null,
      directorPhotoUrl: church.directorPhotoUrl ? String(church.directorPhotoUrl) : null,
      createdAt: church.createdAt,
      district: church.district ? {
        id: String(church.district.id),
        name: String(church.district.name),
        pastorName: church.district.pastorName ? String(church.district.pastorName) : null,
        createdAt: church.district.createdAt
      } : null
    };
  }

  async update(id: string, data: {
    name?: string;
    districtId?: string;
    directorName?: string;
    directorCpf?: string;
    directorBirthDate?: string;
    directorEmail?: string;
    directorWhatsapp?: string;
    directorPhotoUrl?: string;
  }, actorId?: string) {
    const exists = await prisma.church.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Igreja não encontrada");
    
    // Garantir que todos os campos sejam strings válidas
    const updateData: any = {};
    if (data.name !== undefined && data.name !== null) {
      updateData.name = String(data.name).trim();
    }
    if (data.districtId !== undefined && data.districtId !== null) {
      updateData.districtId = String(data.districtId).trim();
    }
    if (data.directorName !== undefined && data.directorName !== null) {
      updateData.directorName = String(data.directorName).trim() || null;
    }
    if (data.directorCpf !== undefined && data.directorCpf !== null) {
      updateData.directorCpf = String(data.directorCpf).trim() || null;
    }
    if (data.directorBirthDate !== undefined && data.directorBirthDate !== null) {
      updateData.directorBirthDate = new Date(String(data.directorBirthDate)) || null;
    }
    if (data.directorEmail !== undefined && data.directorEmail !== null) {
      updateData.directorEmail = String(data.directorEmail).trim() || null;
    }
    if (data.directorWhatsapp !== undefined && data.directorWhatsapp !== null) {
      updateData.directorWhatsapp = String(data.directorWhatsapp).trim() || null;
    }
    if (data.directorPhotoUrl !== undefined && data.directorPhotoUrl !== null) {
      updateData.directorPhotoUrl = String(data.directorPhotoUrl).trim() || null;
    }
    
    const church = await prisma.church.update({ 
      where: { id }, 
      data: updateData,
      include: { district: true }
    });
    await auditService.log({
      actorUserId: actorId,
      action: "CHURCH_UPDATED",
      entity: "church",
      entityId: id,
      metadata: updateData
    });
    return {
      id: String(church.id),
      name: String(church.name),
      districtId: String(church.districtId),
      directorName: church.directorName ? String(church.directorName) : null,
      directorCpf: church.directorCpf ? String(church.directorCpf) : null,
      directorBirthDate: church.directorBirthDate || null,
      directorEmail: church.directorEmail ? String(church.directorEmail) : null,
      directorWhatsapp: church.directorWhatsapp ? String(church.directorWhatsapp) : null,
      directorPhotoUrl: church.directorPhotoUrl ? String(church.directorPhotoUrl) : null,
      createdAt: church.createdAt,
      district: church.district ? {
        id: String(church.district.id),
        name: String(church.district.name),
        pastorName: church.district.pastorName ? String(church.district.pastorName) : null,
        createdAt: church.district.createdAt
      } : null
    };
  }
}

export const churchService = new ChurchService();
