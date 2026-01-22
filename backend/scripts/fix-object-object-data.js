const { PrismaClient } = require("./prisma-client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando e corrigindo dados no banco...\n');

    // Buscar todos os distritos
    const districts = await prisma.$queryRaw`
      SELECT id, name, pastorName FROM District
    `;

    console.log(`Encontrados ${districts.length} distritos`);

    for (const district of districts) {
      let needsUpdate = false;
      const updateData = {};

      // Verificar e corrigir name
      if (typeof district.name !== 'string' || district.name === '[object Object]' || district.name.includes('[object')) {
        console.log(`⚠️  Distrito ${district.id} tem name inválido: ${JSON.stringify(district.name)}`);
        // Não podemos recuperar o valor original, então vamos marcar para atualização manual
        updateData.name = `DISTRITO_${district.id.substring(0, 8)}`;
        needsUpdate = true;
      }

      // Verificar e corrigir pastorName
      if (district.pastorName && (typeof district.pastorName !== 'string' || district.pastorName === '[object Object]' || district.pastorName.includes('[object'))) {
        console.log(`⚠️  Distrito ${district.id} tem pastorName inválido: ${JSON.stringify(district.pastorName)}`);
        updateData.pastorName = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const setClauses = [];
        const values = [];
        
        if (updateData.name) {
          setClauses.push('name = ?');
          values.push(updateData.name);
        }
        if (updateData.pastorName !== undefined) {
          setClauses.push('pastorName = ?');
          values.push(updateData.pastorName);
        }
        
        values.push(district.id);
        
        await prisma.$executeRawUnsafe(
          `UPDATE District SET ${setClauses.join(', ')} WHERE id = ?`,
          ...values
        );
        console.log(`✅ Distrito ${district.id} corrigido`);
      }
    }

    // Buscar todas as igrejas
    const churches = await prisma.$queryRaw`
      SELECT id, name, directorName, directorCpf, directorEmail, directorWhatsapp, directorPhotoUrl 
      FROM Church
    `;

    console.log(`\nEncontradas ${churches.length} igrejas`);

    for (const church of churches) {
      let needsUpdate = false;
      const updateData = {};

      const fieldsToCheck = ['name', 'directorName', 'directorCpf', 'directorEmail', 'directorWhatsapp', 'directorPhotoUrl'];
      
      for (const field of fieldsToCheck) {
        if (church[field] && (typeof church[field] !== 'string' || church[field] === '[object Object]' || (typeof church[field] === 'string' && church[field].includes('[object')))) {
          console.log(`⚠️  Igreja ${church.id} tem ${field} inválido: ${JSON.stringify(church[field])}`);
          if (field === 'name') {
            updateData[field] = `IGREJA_${church.id.substring(0, 8)}`;
          } else {
            updateData[field] = null;
          }
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const setClauses = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updateData), church.id];
        
        await prisma.$executeRawUnsafe(
          `UPDATE Church SET ${setClauses} WHERE id = ?`,
          ...values
        );
        console.log(`✅ Igreja ${church.id} corrigida`);
      }
    }

    console.log('\n✅ Verificação e correção concluídas!');
    console.log('\n⚠️  ATENÇÃO: Alguns registros podem ter sido renomeados.');
    console.log('   Revise e atualize manualmente os nomes que foram substituídos.');
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

