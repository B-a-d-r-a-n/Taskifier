import { encryptEmail, decryptEmail, hashEmail, isEncrypted } from "../crypto";

const TEST_KEY = "0".repeat(64);
process.env.EMAIL_ENCRYPTION_KEY = TEST_KEY;

describe("crypto module", () => {
    describe("encryptEmail / decryptEmail", () => {
        it("encrypts and decrypts a plaintext email symmetrically", () => {
            const plaintext = "Test@Example.com";
            const encrypted = encryptEmail(plaintext);
            const decrypted = decryptEmail(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it("produces different ciphertexts for the same plaintext (random IV)", () => {
            const plaintext = "test@example.com";
            const enc1 = encryptEmail(plaintext);
            const enc2 = encryptEmail(plaintext);
            expect(enc1).not.toBe(enc2);
            expect(decryptEmail(enc1)).toBe(decryptEmail(enc2));
        });

        it("throws when decrypting with wrong key", () => {
            process.env.EMAIL_ENCRYPTION_KEY = "1".repeat(64);
            const encrypted = encryptEmail("test@example.com");
            process.env.EMAIL_ENCRYPTION_KEY = "2".repeat(64);
            expect(() => decryptEmail(encrypted)).toThrow();
            process.env.EMAIL_ENCRYPTION_KEY = TEST_KEY;
        });

        it("throws on malformed ciphertext", () => {
            expect(() => decryptEmail("not-valid")).toThrow();
            expect(() => decryptEmail("a:b")).toThrow();
            expect(() => decryptEmail("too:many:parts:here")).toThrow();
        });

        it("throws when EMAIL_ENCRYPTION_KEY is not set", () => {
            const original = process.env.EMAIL_ENCRYPTION_KEY;
            delete process.env.EMAIL_ENCRYPTION_KEY;
            expect(() => encryptEmail("test@example.com")).toThrow();
            process.env.EMAIL_ENCRYPTION_KEY = original;
        });
    });

    describe("hashEmail", () => {
        it("produces a consistent SHA-256 hash", () => {
            const hash1 = hashEmail("Test@Example.com");
            const hash2 = hashEmail("test@example.com");
            expect(hash1).toBe(hash2);
        });

        it("produces a 64-character hex string", () => {
            const hash = hashEmail("test@example.com");
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it("produces different hashes for different emails", () => {
            const hash1 = hashEmail("a@example.com");
            const hash2 = hashEmail("b@example.com");
            expect(hash1).not.toBe(hash2);
        });
    });

    describe("isEncrypted", () => {
        it("returns true for a valid encrypted email format", () => {
            const encrypted = encryptEmail("test@example.com");
            expect(isEncrypted(encrypted)).toBe(true);
        });

        it("returns false for a regular string", () => {
            expect(isEncrypted("not-encrypted")).toBe(false);
        });

        it("returns false for a hash (64-char hex)", () => {
            const hash = hashEmail("test@example.com");
            expect(isEncrypted(hash)).toBe(false);
        });
    });
});
