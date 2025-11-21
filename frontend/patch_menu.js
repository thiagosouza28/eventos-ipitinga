const fs = require("fs");
const path = require("path");
const file = path.resolve("src/App.vue");
let text = fs.readFileSync(file, "utf8");
text = text.replace(
  /\{ label: \"Configura[\s\S]*?Cog6ToothIcon \}\n  \];/,
  `  { label: "Configurações", to: "/admin/system-config", icon: Cog6ToothIcon }\n];`
);
text = text.replace('Inscri??????es', 'Inscrições');
fs.writeFileSync(file, text);
