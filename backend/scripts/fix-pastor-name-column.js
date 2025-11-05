const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Verificando e adicionando coluna pastorName...\n');
    
    // Primeiro, verificar se a coluna existe
    const columns = await prisma.$queryRaw`
      PRAGMA table_info(District);
    `;
    
    const hasPastorName = columns.some(col => col.name === 'pastorName');
    console.log(`Colunas encontradas: ${columns.map(c => c.name).join(', ')}`);
    console.log(`Coluna pastorName existe: ${hasPastorName}\n`);
    
    if (!hasPastorName) {
      console.log('Adicionando coluna pastorName...');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE District ADD COLUMN pastorName TEXT;`
      );
      console.log('✅ Coluna pastorName adicionada!');
    } else {
      console.log('✅ Coluna pastorName já existe!');
    }
    
    // Verificar novamente
    const columnsAfter = await prisma.$queryRaw`
      PRAGMA table_info(District);
    `;
    console.log(`\nColunas após operação: ${columnsAfter.map(c => c.name).join(', ')}`);
    
    // Testar uma query
    const test = await prisma.$queryRaw`
      SELECT id, name, pastorName, createdAt FROM District LIMIT 1;
    `;
    console.log('\n✅ Query de teste funcionou!');
    console.log('Resultado:', test);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();

