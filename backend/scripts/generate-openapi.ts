import { copyFileSync } from "fs";
import { resolve } from "path";

const source = resolve(__dirname, "..", "src", "openapi", "openapi.json");
const target = resolve(__dirname, "..", "openapi.json");

copyFileSync(source, target);
console.log("OpenAPI atualizado em", target);
