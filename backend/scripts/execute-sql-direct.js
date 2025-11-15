/**
 * Script para executar SQL diretamente no banco de dados
 * Uso: node scripts/execute-sql-direct.js
 */

const { PrismaClient } = require('../src/prisma/generated/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SQL_SCRIPT = `
-- Adicionar coluna pastorName na tabela District
ALTER TABLE District ADD COLUMN pastorName TEXT;

-- Adicionar colunas do Diretor Jovem na tabela Church
ALTER TABLE Church ADD COLUMN directorName TEXT;
ALTER TABLE Church ADD COLUMN directorCpf TEXT;
ALTER TABLE Church ADD COLUMN directorBirthDate DATETIME;
ALTER TABLE Church ADD COLUMN directorEmail TEXT;
ALTER TABLE Church ADD COLUMN directorWhatsapp TEXT;
ALTER TABLE Church ADD COLUMN directorPhotoUrl TEXT;

-- Adicionar coluna bannerUrl na tabela Event
ALTER TABLE Event ADD COLUMN bannerUrl TEXT;
`;

async function executeSQL(sql) {
  // Dividir o SQL em comandos individuais
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 0);

  const results = [];
  
  for (const command of commands) {
    try {
      await prisma.$executeRawUnsafe(command);
      results.push({ command: command.substring(0, 50) + '...', status: '✅ Sucesso' });
    } catch (error) {
      if (error.message.includes('duplicate column name') || 
          error.message.includes('already exists')) {
        results.push({ command: command.substring(0, 50) + '...', status: '⚠️  Já existe' });
      } else {
        results.push({ command: command.substring(0, 50) + '...', status: '❌ Erro: ' + error.message });
      }
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('🔄 Executando SQL diretamente no banco de dados...\n');
    
    const results = await executeSQL(SQL_SCRIPT);
    
    console.log('\n📊 Resultados:\n');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.status}`);
      console.log(`   ${result.command}\n`);
    });
    
    console.log('\n📋 Verificando estrutura final...\n');
    
    // Verificar District
    const districtColumns = await prisma.$queryRawUnsafe(`PRAGMA table_info(District);`);
    console.log('District:', districtColumns.map(c => c.name).join(', '));
    
    // Verificar Church
    const churchColumns = await prisma.$queryRawUnsafe(`PRAGMA table_info(Church);`);
    console.log('Church:', churchColumns.map(c => c.name).join(', '));
    
    // Verificar Event
    const eventColumns = await prisma.$queryRawUnsafe(`PRAGMA table_info(Event);`);
    console.log('Event:', eventColumns.map(c => c.name).join(', '));
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
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


