const path = require("path");
const { existsSync } = require("fs");

const rootDir = path.resolve(__dirname, "..");
const distClient = path.resolve(rootDir, "dist", "prisma", "generated", "client");
const srcClient = path.resolve(rootDir, "src", "prisma", "generated", "client");

const clientPath = existsSync(distClient) ? distClient : srcClient;

module.exports = require(clientPath);
