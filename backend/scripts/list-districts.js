const { PrismaClient } = require('../src/prisma/generated/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.district.findMany({ select: { id: true, name: true, pastorName: true } });
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

