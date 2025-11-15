const { PrismaClient } = require('../src/prisma/generated/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.$queryRawUnsafe(`PRAGMA table_info("Order")`);
    console.log('Colunas da tabela Order:');
    result.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Verificar se feeCents e netAmountCents existem
    const columns = result.map(col => col.name);
    console.log('\nColunas encontradas:', columns.join(', '));
    console.log('feeCents existe:', columns.includes('feeCents'));
    console.log('netAmountCents existe:', columns.includes('netAmountCents'));
    
    if (!columns.includes('feeCents') || !columns.includes('netAmountCents')) {
      console.log('\n⚠️ Colunas faltando! Adicionando...');
      if (!columns.includes('feeCents')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "feeCents" INTEGER NOT NULL DEFAULT 0`);
        console.log('✅ Coluna feeCents adicionada!');
      }
      if (!columns.includes('netAmountCents')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "netAmountCents" INTEGER NOT NULL DEFAULT 0`);
        console.log('✅ Coluna netAmountCents adicionada!');
      }
    } else {
      console.log('\n✅ Todas as colunas já existem!');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
})();


