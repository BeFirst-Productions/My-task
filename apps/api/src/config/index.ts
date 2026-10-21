import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load environment variables from .env file if present
loadDotenv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL is required to connect to PostgreSQL",
    })
    .url("DATABASE_URL must be a valid connection URL"),
  // Bunny CDN & Storage
  BUNNY_STORAGE_ZONE_NAME: z.string().optional().default(""),
  BUNNY_STORAGE_ACCESS_KEY: z.string().optional().default(""),
  BUNNY_STORAGE_REGION: z.string().optional().default("de"),
  BUNNY_CDN_URL: z.string().optional().default(""),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(
      `[FATAL] Configuration validation failed:\n${issues}\nPlease check your .env configuration.\n`
    );
    throw new Error("Invalid application environment configuration.");
  }

  return result.data;
}

export const env = validateEnv();
