import "dotenv/config";

// Ensure test defaults for env (APP_URL, secrets, etc.)
process.env.NODE_ENV = process.env.NODE_ENV || "test";

import { promises as fs } from "fs";
import path from "path";

import { generateReceiptPdf, closeReceiptBrowser } from "../src/pdf/receipt.service";

async function main() {
  const outDir = path.resolve(__dirname, "..", "tmp", "receipts");
  await fs.mkdir(outDir, { recursive: true });

  const sample = {
    eventTitle: "Retiro Espiritual 2025",
    eventLocation: "CATRE Ipitinga, MG",
    eventPeriod: "20/06/2025 - 23/06/2025",
    fullName: "Participante de Teste",
    cpf: "12345678909",
    birthDate: "05/11/1998",
    ageYears: 26,
    districtName: "Distrito Norte",
    churchName: "Igreja Central",
    registrationId: "TEST-REG-0001",
    status: "Pago",
    createdAt: new Date(),
    paymentMethod: "PIX (teste)",
    paymentDate: new Date(),
    photoUrl: ""
  } as const;

  const { pdfBuffer, validationUrl } = await generateReceiptPdf(sample as any);
  const outFile = path.join(outDir, `sample-receipt.pdf`);
  await fs.writeFile(outFile, pdfBuffer);
  console.log(`Sample receipt written to: ${outFile}`);
  console.log(`Validation URL: ${validationUrl}`);
}

main()
  .catch((err) => {
    console.error("Failed to generate sample receipt:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeReceiptBrowser();
  });
