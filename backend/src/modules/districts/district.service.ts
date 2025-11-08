import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../utils/errors";
import { auditService } from "../../services/audit.service";

export class DistrictService {
  async list() {
    try {
      // Primeiro, verificar se a coluna existe
      const columns = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info(District);
      `;
      const hasPastorName = columns.some(col => col.name === 'pastorName');
      
      if (hasPastorName) {
        // Se a coluna existe, buscar com ela
        const districts = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          pastorName: string | null;
          createdAt: Date;
        }>>`
          SELECT id, name, pastorName, createdAt
          FROM District
          ORDER BY name ASC
        `;
        return districts.map(d => {
          // Garantir que name seja string primitiva
          let nameStr: string;
          if (typeof d.name === "string") {
            nameStr = d.name;
          } else if (d.name && typeof d.name === "object") {
            // Se for objeto, tentar extrair valor
            // Pode ser que o SQLite retorne como objeto JSON
            if ("value" in d.name) {
              nameStr = String(d.name.value);
            } else if ("name" in d.name) {
              nameStr = String(d.name.name);
            } else {
              // Tentar pegar o primeiro valor string do objeto
              const values = Object.values(d.name);
              const firstString = values.find((v: any) => typeof v === "string");
              nameStr = firstString ? String(firstString) : String(d.name || "");
            }
          } else {
            nameStr = String(d.name || "");
          }
          
          // Garantir que pastorName seja string primitiva ou null
          let pastorNameStr: string | null = null;
          if (d.pastorName) {
            if (typeof d.pastorName === "string") {
              pastorNameStr = d.pastorName;
            } else if (d.pastorName && typeof d.pastorName === "object") {
              if ("value" in d.pastorName) {
                pastorNameStr = String(d.pastorName.value);
              } else if ("pastorName" in d.pastorName) {
                pastorNameStr = String(d.pastorName.pastorName);
              } else {
                const values = Object.values(d.pastorName);
                const firstString = values.find((v: any) => typeof v === "string");
                pastorNameStr = firstString ? String(firstString) : null;
              }
            } else {
              pastorNameStr = String(d.pastorName);
            }
          }
          
          return {
            id: String(d.id || ""),
            name: nameStr,
            pastorName: pastorNameStr,
            createdAt: d.createdAt
          };
        });
      } else {
        // Se não existe, buscar sem ela e adicionar null
        const districts = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          createdAt: Date;
        }>>`
          SELECT id, name, createdAt
          FROM District
          ORDER BY name ASC
        `;
        return districts.map(d => {
          // Garantir que name seja string primitiva
          let nameStr: string;
          if (typeof d.name === "string") {
            nameStr = d.name;
          } else if (d.name && typeof d.name === "object") {
            // Se for objeto, tentar extrair valor
            if ("value" in d.name) {
              nameStr = String(d.name.value);
            } else if ("name" in d.name) {
              nameStr = String(d.name.name);
            } else {
              // Tentar pegar o primeiro valor string do objeto
              const values = Object.values(d.name);
              const firstString = values.find((v: any) => typeof v === "string");
              nameStr = firstString ? String(firstString) : String(d.name || "");
            }
          } else {
            nameStr = String(d.name || "");
          }
          
          return {
            id: String(d.id || ""),
            name: nameStr,
            pastorName: null,
            createdAt: d.createdAt
          };
        });
      }
    } catch (error: any) {
      // Fallback: tentar query simples sem pastorName
      try {
        const districts = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          createdAt: Date;
        }>>`
          SELECT id, name, createdAt
          FROM District
          ORDER BY name ASC
        `;
        return districts.map(d => {
          // Garantir que name seja string primitiva
          let nameStr: string;
          if (typeof d.name === "string") {
            nameStr = d.name;
          } else if (d.name && typeof d.name === "object") {
            nameStr = JSON.stringify(d.name).replace(/^"|"$/g, "");
          } else {
            nameStr = String(d.name || "");
          }
          
          return {
            id: String(d.id || ""),
            name: nameStr,
            pastorName: null,
            createdAt: d.createdAt
          };
        });
      } catch (fallbackError) {
        throw error; // Lançar o erro original
      }
    }
  }

  async create(data: { name: string; pastorName?: string }, actorId?: string) {
    console.log('[DEBUG] districtService.create - data recebido:', JSON.stringify(data, null, 2));
    console.log('[DEBUG] districtService.create - typeof data.name:', typeof data.name);
    
    // Garantir que name e pastorName sejam strings primitivas
    let nameStr: string;
    if (typeof data.name === "string") {
      nameStr = data.name.trim();
    } else if (data.name && typeof data.name === "object") {
      console.log('[DEBUG] districtService.create - data.name é objeto:', data.name);
      // Se for objeto, tentar extrair valor ou serializar
      if ("value" in data.name && typeof data.name.value === "string") {
        nameStr = data.name.value.trim();
      } else {
        nameStr = JSON.stringify(data.name).replace(/^"|"$/g, "").trim();
      }
    } else {
      nameStr = String(data.name || "").trim();
    }
    
    // Garantir que seja string primitiva
    if (typeof nameStr !== "string") {
      nameStr = String(nameStr);
    }
    
    let pastorNameStr: string | undefined = undefined;
    if (data.pastorName !== undefined && data.pastorName !== null) {
      if (typeof data.pastorName === "string") {
        pastorNameStr = data.pastorName.trim() || undefined;
      } else if (data.pastorName && typeof data.pastorName === "object") {
        if ("value" in data.pastorName && typeof data.pastorName.value === "string") {
          pastorNameStr = data.pastorName.value.trim() || undefined;
        } else {
          const str = JSON.stringify(data.pastorName).replace(/^"|"$/g, "").trim();
          pastorNameStr = str || undefined;
        }
      } else {
        pastorNameStr = String(data.pastorName).trim() || undefined;
      }
    }
    
    const cleanData: { name: string; pastorName?: string } = {
      name: nameStr
    };
    
    if (pastorNameStr) {
      cleanData.pastorName = pastorNameStr;
    }
    
    console.log('[DEBUG] districtService.create - cleanData antes de salvar:', JSON.stringify(cleanData, null, 2));
    console.log('[DEBUG] districtService.create - typeof cleanData.name:', typeof cleanData.name);
    console.log('[DEBUG] districtService.create - cleanData.name é string primitiva?', Object.prototype.toString.call(cleanData.name) === '[object String]' && typeof cleanData.name === 'string');
    
    // Verificar se os dados são realmente strings primitivas
    if (typeof cleanData.name !== "string") {
      throw new Error(`Nome deve ser string, recebido: ${typeof cleanData.name}, valor: ${cleanData.name}`);
    }
    
    // Forçar criação de nova string primitiva usando método mais seguro
    // Criar strings completamente novas para evitar referências a objetos
    const nameValue = cleanData.name.toString();
    const pastorNameValue = cleanData.pastorName ? cleanData.pastorName.toString() : undefined;
    
    // Criar objeto completamente novo com valores primitivos
    const finalData: { name: string; pastorName?: string } = {
      name: nameValue
    };
    
    if (pastorNameValue) {
      finalData.pastorName = pastorNameValue;
    }
    
    console.log('[DEBUG] districtService.create - finalData para Prisma:', JSON.stringify(finalData, null, 2));
    console.log('[DEBUG] districtService.create - finalData.name:', finalData.name);
    console.log('[DEBUG] districtService.create - typeof finalData.name:', typeof finalData.name);
    console.log('[DEBUG] districtService.create - finalData.name é string primitiva?', typeof finalData.name === 'string' && Object.prototype.toString.call(finalData.name) === '[object String]');
    
    // Usar SQL raw para garantir que seja salvo como string literal
    // Isso evita qualquer problema de serialização do Prisma
    // SQLite usa ? para placeholders
    const { createId } = await import('@paralleldrive/cuid2');
    const id = createId();
    const now = new Date().toISOString();
    
    // Garantir que os valores sejam strings literais - criar strings completamente novas
    const nameLiteral = '' + finalData.name;
    const pastorNameLiteral = finalData.pastorName ? ('' + finalData.pastorName) : null;
    
    console.log('[DEBUG] districtService.create - Inserindo com SQL raw:');
    console.log('[DEBUG] - id:', id);
    console.log('[DEBUG] - nameLiteral:', nameLiteral, typeof nameLiteral);
    console.log('[DEBUG] - pastorNameLiteral:', pastorNameLiteral, typeof pastorNameLiteral);
    
    if (pastorNameLiteral) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO District (id, name, pastorName, createdAt) VALUES (?, ?, ?, ?)`,
        id,
        nameLiteral,
        pastorNameLiteral,
        now
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO District (id, name, createdAt) VALUES (?, ?, ?)`,
        id,
        nameLiteral,
        now
      );
    }
    
    // Buscar o distrito criado
    const district = await prisma.district.findUnique({ where: { id } });
    
    if (!district) {
      throw new Error('Erro ao criar distrito');
    }
    
    console.log('[DEBUG] districtService.create - Distrito salvo:', JSON.stringify(district, null, 2));
    console.log('[DEBUG] districtService.create - district.name:', district.name);
    console.log('[DEBUG] districtService.create - typeof district.name:', typeof district.name);
    
    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_CREATED",
      entity: "district",
      entityId: district.id,
      metadata: finalData
    });
    
    // Garantir que o retorno também seja string
    const result = {
      id: String(district.id),
      name: String(district.name),
      pastorName: district.pastorName ? String(district.pastorName) : null,
      createdAt: district.createdAt
    };
    
    console.log('[DEBUG] districtService.create - Retornando:', JSON.stringify(result, null, 2));
    
    return result;
  }

  async update(id: string, data: { name?: string; pastorName?: string }, actorId?: string) {
    const exists = await prisma.district.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Distrito nao encontrado");

    // Normalizar strings recebidas
    const cleanData: { name?: string; pastorName?: string | null } = {};

    if (data.name !== undefined && data.name !== null) {
      if (typeof data.name === "string") {
        cleanData.name = data.name.trim();
      } else if (data.name && typeof data.name === "object") {
        cleanData.name = JSON.stringify(data.name).replace(/^"|"$/g, "").trim();
      } else {
        cleanData.name = String(data.name).trim();
      }
      if (typeof cleanData.name !== "string") {
        throw new Error(`Nome deve ser string, recebido: ${typeof cleanData.name}`);
      }
    }

    if (data.pastorName !== undefined && data.pastorName !== null) {
      if (typeof data.pastorName === "string") {
        const v = data.pastorName.trim();
        cleanData.pastorName = v.length ? v : null;
      } else if (data.pastorName && typeof data.pastorName === "object") {
        const str = JSON.stringify(data.pastorName).replace(/^"|"$/g, "").trim();
        cleanData.pastorName = str.length ? str : null;
      } else {
        const str = String(data.pastorName).trim();
        cleanData.pastorName = str.length ? str : null;
      }
    }

    // Atualizar de forma resiliente (garante coluna e grava valor)
    const columns = await prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA table_info(District);
    `;
    const hasPastorName = columns.some((c) => c.name === "pastorName");
    if (!hasPastorName) {
      await prisma.$executeRawUnsafe(`ALTER TABLE District ADD COLUMN pastorName TEXT;`);
    }

    // Monta SET dinâmico para SQL raw (evita problemas de serialização)
    const sets: string[] = [];
    const params: any[] = [];
    if (cleanData.name !== undefined) {
      sets.push("name = ?");
      params.push(cleanData.name);
    }
    if (cleanData.pastorName !== undefined) {
      sets.push("pastorName = ?");
      params.push(cleanData.pastorName);
    }

    if (sets.length) {
      params.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE District SET ${sets.join(", ")} WHERE id = ?`,
        ...params
      );
    }

    const district = await prisma.district.findUnique({ where: { id } });
    if (!district) throw new NotFoundError("Distrito nao encontrado");

    await auditService.log({
      actorUserId: actorId,
      action: "DISTRICT_UPDATED",
      entity: "district",
      entityId: id,
      metadata: cleanData
    });
    return {
      id: String(district.id),
      name: String(district.name),
      pastorName: district.pastorName ? String(district.pastorName) : null,
      createdAt: district.createdAt
    };
  }

  async delete(id: string, actorId?: string) {
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        churches: {
          select: {
            id: true
          }
        }
      }
    });

    if (!district) {
      throw new NotFoundError("Distrito nao encontrado");
    }

    // Verificar se há igrejas vinculadas
    if (district.churches.length > 0) {
      throw new Error("Nao e possivel excluir distrito com igrejas vinculadas");
    }

    await prisma.district.delete({
      where: { id }
    });

    await auditService.log({
      action: "DISTRICT_DELETED",
      entity: "district",
      entityId: id,
      actorId,
      metadata: {
        name: district.name
      }
    });

    return { success: true };
  }
}

export const districtService = new DistrictService();
