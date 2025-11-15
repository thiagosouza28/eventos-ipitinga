const { PrismaClient } = require('../src/prisma/generated/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const d = await prisma.district.create({ data: { name: 'TESTE DISTRITO', pastorName: 'PASTOR A' } });
    const after = await prisma.district.update({ where: { id: d.id }, data: { pastorName: 'PASTOR B' } });
    console.log({ created: d, updated: after });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

