"use strict";

const http = require("node:http");
const next = require("next");

process.chdir(__dirname);

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production" && process.env.NEXT_DEV_SERVER === "true";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT inválida: ${process.env.PORT}`);
}

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const server = http.createServer((request, response) => handle(request, response));

    server.listen(port, hostname, () => {
      console.log(`Frontend iniciado em http://${hostname}:${port}`);
    });

    const shutdown = (signal) => {
      console.log(`Encerrando frontend (${signal})`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  })
  .catch((error) => {
    console.error("Falha ao iniciar o frontend", error);
    process.exit(1);
  });
