import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Format: rft_{prefix}_{suffix}. Only the prefix is stored in DB as the lookup key;
// the full token is bcrypt-hashed. The suffix adds entropy without ever being persisted.
export function createRefreshToken(): string {
    const prefix = randomBytes(12).toString("hex");
    const suffix = randomBytes(32).toString("hex");
    return `rft_${prefix}_${suffix}`;
}

export function extractTokenId(token: string): string | null {
    const parts = token.split("_");
    if (parts.length === 3 && parts[0] === "rft") {
        return parts[1] ?? null;
    }
    return null;
}

export async function hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
}

export async function verifyRefreshToken(
    token: string,
    hashedToken: string,
): Promise<boolean> {
    return bcrypt.compare(token, hashedToken);
}