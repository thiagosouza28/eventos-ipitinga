const fs = require('fs');
const text = fs.readFileSync('backend/src/routes/index.ts', 'utf8');
const routes = [];
const regex = /router\.(get|post|put|patch|delete)\(/g;
let match;
while ((match = regex.exec(text)) !== null) {
  const method = match[1].toUpperCase();
  let idx = match.index + match[0].length;
  while (idx < text.length && /[\s]/.test(text[idx])) idx++;
  if (idx >= text.length) break;
  const quote = text[idx];
  if (!['"', "'", '`'].includes(quote)) continue;
  idx++;
  let route = '';
  let escaped = false;
  while (idx < text.length) {
    const ch = text[idx];
    if (escaped) {
      route += ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === quote) {
      break;
    } else {
      route += ch;
    }
    idx++;
  }
  const line = text.slice(0, match.index).split('\n').length;
  routes.push({ line, method, route });
}
routes.forEach((r) => console.log(String(r.line).padStart(4, '0') + ' ' + r.method + ' ' + r.route));
console.log('total', routes.length);
