import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
    const envKey = process.env["EMAIL_ENCRYPTION_KEY"];
    if (!envKey) {
        throw new Error("EMAIL_ENCRYPTION_KEY environment variable is not set");
    }
    return Buffer.from(envKey, "hex");
}

export function encryptEmail(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptEmail(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid ciphertext format");
    }

    const [ivHex, authTagHex, encryptedPart] = parts;
    if (!ivHex || !authTagHex || !encryptedPart) {
        throw new Error("Invalid ciphertext format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedPart, "hex", "utf8");
    const finalPart = decipher.final("utf8");
    decrypted = decrypted + finalPart;

    return decrypted;
}

export function hashEmail(plaintext: string): string {
    return crypto
        .createHash("sha256")
        .update(plaintext.toLowerCase())
        .digest("hex");
}

export function isEncrypted(ciphertext: string): boolean {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
        return false;
    }
    const [ivHex, authTagHex] = parts;
    if (!ivHex || !authTagHex) {
        return false;
    }
    return (
        ivHex.length === IV_LENGTH * 2 &&
        authTagHex.length === AUTH_TAG_LENGTH * 2
    );
}
