# Como executar o script SQL no banco de dados

## Opção 1: Usando o script Node.js (Recomendado - Seguro)
```bash
cd backend
node scripts/migrate-add-all-columns.js
```

Este script verifica se as colunas já existem antes de adicionar, evitando erros.

## Opção 2: Executar SQL diretamente

### Usando SQLite CLI (se instalado):
```bash
sqlite3 backend/tmp/dev.db < backend/scripts/migrate-add-all-columns.sql
```

### Usando Node.js com sqlite3:
```bash
cd backend
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('tmp/dev.db'); const fs = require('fs'); const sql = fs.readFileSync('scripts/migrate-add-all-columns.sql', 'utf8'); db.exec(sql, (err) => { if (err && !err.message.includes('duplicate')) console.error(err); else console.log('✅ SQL executado!'); db.close(); });"
```

### Usando um cliente SQLite GUI:
1. Abra o arquivo `backend/tmp/dev.db` em um cliente SQLite (como DB Browser for SQLite)
2. Vá na aba "Execute SQL"
3. Copie e cole o conteúdo de `backend/scripts/migrate-add-all-columns.sql`
4. Execute o script

## Opção 3: Usando Prisma Studio (Visual)
```bash
cd backend
npx prisma studio
```
Depois, você pode executar comandos SQL manualmente na interface.

## ⚠️ IMPORTANTE:
- Se uma coluna já existir, você receberá um erro "duplicate column name"
- Isso é normal e não causa problemas
- O script Node.js trata isso automaticamente
- Para produção, sempre use o script Node.js que faz a verificação

## Verificar se as colunas foram adicionadas:
```sql
PRAGMA table_info(District);
PRAGMA table_info(Church);
PRAGMA table_info(Event);
```

