/*
  Script de correção rápida do banco (SQLite via Prisma)
  - Garante a existência de colunas usadas pelo app
  - Limpa valores inválidos como "[object Object]"
  - Pode ser executado quantas vezes for necessário
*/

const { PrismaClient } = require("../src/prisma/generated/client");
const prisma = new PrismaClient();

async function addColumnIfMissing(table, column, type) {
  try {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table});`);
    const exists = Array.isArray(columns) && columns.some((c) => c.name === column);
    if (!exists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
      console.log(`✔ Coluna adicionada: ${table}.${column}`);
    } else {
      console.log(`• Coluna já existe: ${table}.${column}`);
    }
  } catch (e) {
    // Idempotente: ignora erros de coluna duplicada
    const msg = String(e?.message || e);
    if (/duplicate|already exists/i.test(msg)) {
      console.log(`• Coluna já existia: ${table}.${column}`);
      return;
    }
    console.error(`Erro ao adicionar coluna ${table}.${column}:`, msg);
    throw e;
  }
}

function sanitizeString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    try {
      // tenta extrair algum campo comum
      if (value && typeof value.value === "string") return value.value;
      const firstStr = Object.values(value).find((v) => typeof v === "string");
      if (firstStr) return String(firstStr);
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isInvalidObjectString(s) {
  return typeof s === "string" && /\[object\s+Object\]/i.test(s);
}

async function fixDistricts() {
  await addColumnIfMissing("District", "pastorName", "TEXT");
  const rows = await prisma.$queryRawUnsafe(`SELECT id, name, pastorName FROM District;`);
  console.log(`Verificando District: ${rows.length} registros`);
  for (const d of rows) {
    const update = {};
    let name = sanitizeString(d.name);
    if (!name || isInvalidObjectString(name)) {
      name = `DISTRITO_${String(d.id).slice(0, 8)}`;
      update.name = name;
    }
    if (d.pastorName !== null && d.pastorName !== undefined) {
      const p = sanitizeString(d.pastorName);
      if (!p || isInvalidObjectString(p)) {
        update.pastorName = null;
      } else if (p !== d.pastorName) {
        update.pastorName = p;
      }
    }
    if (Object.keys(update).length) {
      const set = Object.keys(update).map((k) => `${k} = ?`).join(", ");
      const params = [...Object.values(update), d.id];
      await prisma.$executeRawUnsafe(`UPDATE District SET ${set} WHERE id = ?`, ...params);
      console.log(`✔ District corrigido: ${d.id}`);
    }
  }
}

async function fixChurches() {
  await addColumnIfMissing("Church", "directorName", "TEXT");
  await addColumnIfMissing("Church", "directorCpf", "TEXT");
  await addColumnIfMissing("Church", "directorBirthDate", "DATETIME");
  await addColumnIfMissing("Church", "directorEmail", "TEXT");
  await addColumnIfMissing("Church", "directorWhatsapp", "TEXT");
  await addColumnIfMissing("Church", "directorPhotoUrl", "TEXT");

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, name, directorName, directorCpf, directorEmail, directorWhatsapp, directorPhotoUrl FROM Church;`
  );
  console.log(`Verificando Church: ${rows.length} registros`);
  for (const c of rows) {
    const update = {};
    const fields = [
      "name",
      "directorName",
      "directorCpf",
      "directorEmail",
      "directorWhatsapp",
      "directorPhotoUrl"
    ];
    for (const f of fields) {
      const raw = c[f];
      if (raw === null || raw === undefined) continue;
      let v = sanitizeString(raw);
      if (f === "name" && (!v || isInvalidObjectString(v))) {
        v = `IGREJA_${String(c.id).slice(0, 8)}`;
      } else if (!v || isInvalidObjectString(v)) {
        v = null;
      }
      if (v !== raw) update[f] = v;
    }
    if (Object.keys(update).length) {
      const set = Object.keys(update).map((k) => `${k} = ?`).join(", ");
      const params = [...Object.values(update), c.id];
      await prisma.$executeRawUnsafe(`UPDATE Church SET ${set} WHERE id = ?`, ...params);
      console.log(`✔ Church corrigida: ${c.id}`);
    }
  }
}

async function main() {
  console.log("Iniciando correção do banco...");
  await fixDistricts();
  await fixChurches();
  console.log("Concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


