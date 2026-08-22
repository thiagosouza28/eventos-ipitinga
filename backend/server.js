"use strict";

const path = require("node:path");

// cPanel/Passenger pode iniciar a aplicação com outro diretório de trabalho.
// Fixar o cwd garante que .env, templates e arquivos públicos sejam encontrados.
process.chdir(__dirname);

const compiledEntry = path.join(__dirname, "dist", "main.js");

try {
  require(compiledEntry);
} catch (error) {
  if (error && error.code === "MODULE_NOT_FOUND" && String(error.message).includes(compiledEntry)) {
    console.error("Backend não compilado. Execute `npm run build` antes de iniciar.");
  }
  throw error;
}
