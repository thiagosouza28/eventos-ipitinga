const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkAndCreateExpenseTable() {
  try {
    // Verificar se a tabela Expense existe
    const tables = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Expense';
    `);

    if (tables.length === 0) {
      console.log("Tabela Expense não existe. Criando...");
      
      await prisma.$executeRawUnsafe(`
        CREATE TABLE Expense (
          id TEXT PRIMARY KEY,
          eventId TEXT NOT NULL,
          description TEXT NOT NULL,
          date DATETIME NOT NULL,
          amountCents INTEGER NOT NULL,
          madeBy TEXT NOT NULL,
          items TEXT,
          receiptUrl TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (eventId) REFERENCES Event(id)
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS Expense_eventId_idx ON Expense(eventId);
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS Expense_date_idx ON Expense(date);
      `);

      console.log("✅ Tabela Expense criada com sucesso!");
    } else {
      console.log("✅ Tabela Expense já existe.");
    }

    // Verificar colunas
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(Expense);`);
    console.log("\nColunas da tabela Expense:");
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

  } catch (error) {
    console.error("❌ Erro ao verificar/criar tabela Expense:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateExpenseTable();

