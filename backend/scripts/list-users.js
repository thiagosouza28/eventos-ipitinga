const { PrismaClient } = require('../src/prisma/generated/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(users);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();


