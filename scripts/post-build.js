const fs = require("fs");
const path = require("path");

const templatesSource = path.resolve(__dirname, "..", "src", "pdf", "templates");
const templatesTarget = path.resolve(__dirname, "..", "dist", "pdf", "templates");

async function copyReceiptTemplates() {
  try {
    await fs.promises.access(templatesSource);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      console.warn("Receipt template directory not found, skipping copy step.");
      return;
    }
    throw error;
  }

  await fs.promises.mkdir(templatesTarget, { recursive: true });
  const files = await fs.promises.readdir(templatesSource);
  await Promise.all(
    files.map((file) =>
      fs.promises.copyFile(
        path.join(templatesSource, file),
        path.join(templatesTarget, file)
      )
    )
  );
  console.log(`Copied ${files.length} receipt template file(s) to dist.`);
}

copyReceiptTemplates().catch((error) => {
  console.error("Failed to copy receipt templates", error);
  process.exit(1);
});
