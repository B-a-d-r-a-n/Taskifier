import { z } from "zod";

export const serverEnv = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    EMAIL_ENCRYPTION_KEY: z.string().length(64),
    AI_SERVICE_URL: z.string().url().default("http://192.168.1.180:8001"),
    NODE_ENV: z.enum(["development", "production", "test"]),
    COOKIE_DOMAIN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnv>;
