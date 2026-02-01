import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "tmp", "uploads");
const targetDir = path.join(rootDir, "uploads");

const run = async () => {
  await fs.mkdir(targetDir, { recursive: true });

  let entries: string[] = [];
  try {
    entries = await fs.readdir(sourceDir);
  } catch {
    console.log("Pasta tmp/uploads não encontrada. Nada para migrar.");
    return;
  }

  if (!entries.length) {
    console.log("Nenhum arquivo em tmp/uploads para migrar.");
    return;
  }

  const shouldMove = process.argv.includes("--move");
  let copied = 0;
  let skipped = 0;

  for (const name of entries) {
    const sourcePath = path.join(sourceDir, name);
    const targetPath = path.join(targetDir, name);
    try {
      await fs.access(targetPath);
      skipped += 1;
      continue;
    } catch {
      // Target does not exist, continue copy/move.
    }

    await fs.copyFile(sourcePath, targetPath);
    copied += 1;
    if (shouldMove) {
      await fs.unlink(sourcePath).catch(() => undefined);
    }
  }

  console.log(
    `Migração concluída. Copiados: ${copied}, ignorados: ${skipped}${shouldMove ? ", removidos da origem" : ""}.`
  );
};

run().catch((error) => {
  console.error("Falha ao migrar uploads:", error);
  process.exitCode = 1;
});
