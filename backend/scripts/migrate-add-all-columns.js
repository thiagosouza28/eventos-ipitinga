const { PrismaClient } = require("./prisma-client");
const prisma = new PrismaClient();

async function addColumnIfNotExists(table, column, type) {
  try {
    // Verificar se a coluna já existe usando query raw unsafe
    const columns = await prisma.$queryRawUnsafe(
      `PRAGMA table_info(${table});`
    );
    
    const exists = columns.some(col => col.name === column);
    if (exists) {
      console.log(`✓ Coluna ${table}.${column} já existe.`);
      return true;
    }
    
    // Adicionar coluna
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${type};`
    );
    console.log(`✅ Coluna ${table}.${column} adicionada com sucesso!`);
    return true;
  } catch (error) {
    if (error.message.includes('duplicate column name') || 
        error.message.includes('already exists') ||
        error.message.includes('duplicate')) {
      console.log(`⚠️  Coluna ${table}.${column} já existe.`);
      return true;
    } else {
      console.error(`❌ Erro ao adicionar ${table}.${column}:`, error.message);
      return false;
    }
  }
}

async function main() {
  try {
    console.log('🔄 Adicionando todas as colunas necessárias no banco de dados...\n');
    
    // Colunas do District
    console.log('\n📋 Tabela District:');
    await addColumnIfNotExists('District', 'pastorName', 'TEXT');
    
    // Colunas do Church
    console.log('\n📋 Tabela Church:');
    await addColumnIfNotExists('Church', 'directorName', 'TEXT');
    await addColumnIfNotExists('Church', 'directorCpf', 'TEXT');
    await addColumnIfNotExists('Church', 'directorBirthDate', 'DATETIME');
    await addColumnIfNotExists('Church', 'directorEmail', 'TEXT');
    await addColumnIfNotExists('Church', 'directorWhatsapp', 'TEXT');
    await addColumnIfNotExists('Church', 'directorPhotoUrl', 'TEXT');
    
    // Colunas do Event
    console.log('\n📋 Tabela Event:');
    await addColumnIfNotExists('Event', 'bannerUrl', 'TEXT');
    
    console.log('\n✅ Todas as colunas foram verificadas/adicionadas!');
    console.log('\n📊 Verificando estrutura final do banco...\n');
    
    // Verificar District
    const districtColumns = await prisma.$queryRawUnsafe(
      `PRAGMA table_info(District);`
    );
    console.log('District:', districtColumns.map(c => c.name).join(', '));
    
    // Verificar Church
    const churchColumns = await prisma.$queryRawUnsafe(
      `PRAGMA table_info(Church);`
    );
    console.log('Church:', churchColumns.map(c => c.name).join(', '));
    
    // Verificar Event
    const eventColumns = await prisma.$queryRawUnsafe(
      `PRAGMA table_info(Event);`
    );
    console.log('Event:', eventColumns.map(c => c.name).join(', '));
    
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


