import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const testRoot = path.resolve("test");

const collectTests = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTests(target);
      return entry.isFile() && entry.name.endsWith(".test.ts") ? [target] : [];
    })
  );
  return nested.flat();
};

const tests = await collectTests(testRoot);
if (!tests.length) {
  console.error("Nenhum teste .test.ts encontrado em backend/test.");
  process.exit(1);
}

const forceExit = process.allowedNodeEnvironmentFlags.has("--test-force-exit")
  ? ["--test-force-exit"]
  : [];
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...forceExit, ...tests], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "test" },
  stdio: "inherit"
});

if (result.error) {
  console.error("Não foi possível iniciar os testes:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
