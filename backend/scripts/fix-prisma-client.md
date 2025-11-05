# Fix Prisma Client

O erro P2022 ocorre porque o Prisma Client não foi regenerado após a migração.

## Solução:

1. **Pare o servidor backend** (Ctrl+C no terminal onde está rodando)

2. **Regenere o Prisma Client:**
   ```bash
   cd backend
   npx prisma generate
   ```

3. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

## Alternativa (se o erro persistir):

Se ainda houver erro EPERM, feche todos os processos Node.js e tente novamente:

**Windows:**
```powershell
taskkill /F /IM node.exe
npx prisma generate
```

Depois reinicie o servidor.

