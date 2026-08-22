import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = path.join(backendRoot, ".env.local");
const localRoot = path.join(backendRoot, ".local");
const dataDir = path.join(localRoot, "mysql-data");
const runDir = path.join(localRoot, "mysql-run");
const defaultMysqlHome = "C:\\Program Files\\MySQL\\MySQL Server 8.4";
const mysqlHome = process.env.MYSQL_HOME || defaultMysqlHome;
const mysqld = path.join(mysqlHome, "bin", "mysqld.exe");
const mysql = path.join(mysqlHome, "bin", "mysql.exe");

if (process.platform !== "win32") {
  console.error("[local-db] Este inicializador usa a instalação local do MySQL para Windows.");
  process.exit(1);
}

if (!existsSync(localEnvPath)) {
  console.error("[local-db] Crie backend/.env.local a partir da configuração local do projeto.");
  process.exit(1);
}

if (!existsSync(mysqld) || !existsSync(mysql)) {
  console.error(`[local-db] MySQL não encontrado em ${mysqlHome}. Defina MYSQL_HOME se necessário.`);
  process.exit(1);
}

const parsed = loadDotenv({ path: localEnvPath, quiet: true }).parsed ?? {};
const databaseUrl = parsed.DATABASE_URL;
if (!databaseUrl) {
  console.error("[local-db] DATABASE_URL não encontrada em backend/.env.local.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const host = url.hostname;
const port = Number(url.port || 3306);
const database = url.pathname.replace(/^\/+/, "");
const username = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);

if (host !== "127.0.0.1" || !Number.isInteger(port) || !/^[a-zA-Z0-9_]+$/.test(database) || !/^[a-zA-Z0-9_]+$/.test(username)) {
  console.error("[local-db] DATABASE_URL local inválida ou fora do host permitido (127.0.0.1).");
  process.exit(1);
}

const isPortOpen = () => new Promise((resolve) => {
  const socket = net.createConnection({ host, port });
  const finish = (value) => {
    socket.removeAllListeners();
    socket.destroy();
    resolve(value);
  };
  socket.setTimeout(500);
  socket.once("connect", () => finish(true));
  socket.once("timeout", () => finish(false));
  socket.once("error", () => finish(false));
});

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    env: { ...process.env, ...parsed, DATABASE_URL: databaseUrl },
    stdio: "inherit",
    windowsHide: true,
    ...options
  });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  }
};

mkdirSync(dataDir, { recursive: true });
mkdirSync(runDir, { recursive: true });

if (!existsSync(path.join(dataDir, "mysql"))) {
  console.log("[local-db] Inicializando os arquivos do MySQL...");
  run(mysqld, ["--no-defaults", "--initialize-insecure", `--basedir=${mysqlHome}`, `--datadir=${dataDir}`, "--console"]);
}

if (!(await isPortOpen())) {
  console.log(`[local-db] Iniciando MySQL isolado na porta ${port}...`);
  const server = spawn(mysqld, [
    "--no-defaults",
    `--basedir=${mysqlHome}`,
    `--datadir=${dataDir}`,
    `--port=${port}`,
    `--bind-address=${host}`,
    "--mysqlx=OFF",
    `--pid-file=${path.join(runDir, "mysql.pid")}`,
    `--log-error=${path.join(runDir, "mysql-error.log")}`
  ], {
    cwd: backendRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  server.unref();

  const deadline = Date.now() + 20_000;
  while (!(await isPortOpen())) {
    if (Date.now() >= deadline) {
      console.error(`[local-db] MySQL não iniciou. Consulte ${path.join(runDir, "mysql-error.log")}.`);
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

const escapeSqlString = (value) => value.replaceAll("'", "''");
const sql = [
  `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE USER IF NOT EXISTS '${username}'@'localhost' IDENTIFIED BY '${escapeSqlString(password)}'`,
  `CREATE USER IF NOT EXISTS '${username}'@'127.0.0.1' IDENTIFIED BY '${escapeSqlString(password)}'`,
  `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${username}'@'localhost'`,
  `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${username}'@'127.0.0.1'`,
  "FLUSH PRIVILEGES"
].join("; ");

run(mysql, ["--protocol=TCP", "-h", host, "-P", String(port), "-u", "root", "-e", sql]);
run(process.execPath, [path.join(backendRoot, "scripts", "prisma-cli.mjs"), "db", "push", "--skip-generate"]);
run(process.execPath, [path.join(backendRoot, "prisma", "seed.mjs")]);

console.log(`[local-db] Banco pronto em ${host}:${port}/${database}.`);
