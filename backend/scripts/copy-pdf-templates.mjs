import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("src", "pdf", "templates");
const destination = path.resolve("public", "pdf-templates");
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log("Templates PDF preparados em backend/public/pdf-templates.");
