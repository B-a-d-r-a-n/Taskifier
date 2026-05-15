import { serverEnv } from "../server";

const VALID_ENV = {
    DATABASE_URL: "postgresql://postgres:password@192.168.1.180:5432/taskifier",
    JWT_SECRET: "a-very-long-secret-key-that-is-at-least-32-chars-long",
    EMAIL_ENCRYPTION_KEY: "0".repeat(64),
    AI_SERVICE_URL: "http://192.168.1.180:8001",
    NODE_ENV: "development",
};

describe("serverEnv", () => {
    it("parses a valid environment object", () => {
        const result = serverEnv.safeParse(VALID_ENV);
        expect(result.success).toBe(true);
    });

    it("applies AI_SERVICE_URL default", () => {
        const partial: Record<string, unknown> = {
            DATABASE_URL: VALID_ENV.DATABASE_URL,
            JWT_SECRET: VALID_ENV.JWT_SECRET,
            EMAIL_ENCRYPTION_KEY: VALID_ENV.EMAIL_ENCRYPTION_KEY,
            NODE_ENV: VALID_ENV.NODE_ENV,
        };
        const result = serverEnv.safeParse(partial);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.AI_SERVICE_URL).toBe("http://192.168.1.180:8001");
        }
    });

    it("throws on missing DATABASE_URL", () => {
        const partial: Record<string, unknown> = {
            JWT_SECRET: VALID_ENV.JWT_SECRET,
            EMAIL_ENCRYPTION_KEY: VALID_ENV.EMAIL_ENCRYPTION_KEY,
            NODE_ENV: VALID_ENV.NODE_ENV,
        };
        const result = serverEnv.safeParse(partial);
        expect(result.success).toBe(false);
    });

    it("throws on JWT_SECRET shorter than 32 characters", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            JWT_SECRET: "short",
        });
        expect(result.success).toBe(false);
    });

    it("throws on EMAIL_ENCRYPTION_KEY not 64 hex chars", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            EMAIL_ENCRYPTION_KEY: "not64chars",
        });
        expect(result.success).toBe(false);
    });

    it("throws on invalid NODE_ENV", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            NODE_ENV: "staging",
        });
        expect(result.success).toBe(false);
    });

    it("throws on invalid DATABASE_URL (not a url)", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            DATABASE_URL: "not-a-url",
        });
        expect(result.success).toBe(false);
    });

    it("parses production environment", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            NODE_ENV: "production",
            COOKIE_DOMAIN: "taskifier.example.com",
        });
        expect(result.success).toBe(true);
    });

    it("parses test environment", () => {
        const result = serverEnv.safeParse({
            ...VALID_ENV,
            NODE_ENV: "test",
        });
        expect(result.success).toBe(true);
    });
});
