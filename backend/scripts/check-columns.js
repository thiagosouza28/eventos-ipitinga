const { PrismaClient } = require('../src/prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar estrutura da tabela District
    const districtColumns = await prisma.$queryRaw`
      PRAGMA table_info(District);
    `;
    console.log('\n📋 Colunas da tabela District:');
    districtColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Verificar estrutura da tabela Church
    const churchColumns = await prisma.$queryRaw`
      PRAGMA table_info(Church);
    `;
    console.log('\n📋 Colunas da tabela Church:');
    churchColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Verificar estrutura da tabela Event
    const eventColumns = await prisma.$queryRaw`
      PRAGMA table_info(Event);
    `;
    console.log('\n📋 Colunas da tabela Event:');
    eventColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


