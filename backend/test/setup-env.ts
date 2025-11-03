import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, ".env.test") });

const ensure = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

ensure("APP_URL", "http://localhost:5173");
ensure("API_URL", "http://localhost:3001/api");
ensure("DATABASE_URL", "file:./dev.db");
ensure("JWT_SECRET", "test-secret-should-be-32-chars-long");
ensure("MP_ACCESS_TOKEN", "TEST-MP-TOKEN");
ensure("PDF_SIGN_SECRET", "test-pdf-secret");
ensure("HMAC_SECRET", "test-hmac-secret");
ensure("ADMIN_EMAIL", "admin@catre.test");
ensure("ADMIN_PASSWORD", "Admin123!");
ensure("NODE_ENV", "test");
