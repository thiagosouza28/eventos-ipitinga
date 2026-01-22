const { PrismaClient } = require("./prisma-client");
const prisma = new PrismaClient();

async function addColumnIfNotExists(table, column, type) {
  try {
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
      return false;
    } else {
      console.error(`❌ Erro ao adicionar ${table}.${column}:`, error.message);
      return false;
    }
  }
}

async function main() {
  try {
    console.log('🔄 Adicionando colunas no banco de dados...\n');
    
    // Adicionar coluna pastorName na tabela District
    await addColumnIfNotExists('District', 'pastorName', 'TEXT');
    
    // Adicionar colunas do diretor jovem na tabela Church
    await addColumnIfNotExists('Church', 'directorName', 'TEXT');
    await addColumnIfNotExists('Church', 'directorCpf', 'TEXT');
    await addColumnIfNotExists('Church', 'directorBirthDate', 'DATETIME');
    await addColumnIfNotExists('Church', 'directorEmail', 'TEXT');
    await addColumnIfNotExists('Church', 'directorWhatsapp', 'TEXT');
    await addColumnIfNotExists('Church', 'directorPhotoUrl', 'TEXT');
    
    // Adicionar coluna bannerUrl na tabela Event
    await addColumnIfNotExists('Event', 'bannerUrl', 'TEXT');
    
    console.log('\n✅ Processo concluído!');
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


