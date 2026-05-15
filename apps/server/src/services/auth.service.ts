import jwt from "jsonwebtoken";
import { serverEnv } from "@taskifier/env/server";
import type { JWTPayload } from "@taskifier/types";
import {
    createRefreshToken as genRefreshToken,
    hashRefreshToken,
    verifyRefreshToken,
    extractTokenId,
} from "./refresh-token.js";
import {
    findRefreshToken,
    revokeRefreshToken,
    createRefreshToken as createRefreshTokenDb,
    getUserByIdWithRefreshToken,
} from "../repositories/user.repo.js";
import { AppError, UnauthorizedError } from "../errors/AppError.js";

const env = serverEnv.parse(process.env);

const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createAccessToken(userId: string, emailHash: string): string {
    const payload: JWTPayload = { userId, emailHash };
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: ACCESS_TTL_SECONDS,
    });
}

export function verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}

export async function rotateRefreshToken(rawRefreshToken: string): Promise<{
    newRawToken: string;
    userData: { id: string; emailHash: string };
}> {
    const tokenId = extractTokenId(rawRefreshToken);
    if (!tokenId) throw new UnauthorizedError("SESSION_EXPIRED", "Session expired");

    const storedToken = await findRefreshToken(tokenId);
    if (!storedToken) throw new UnauthorizedError("SESSION_EXPIRED", "Session expired");

    const valid = await verifyRefreshToken(rawRefreshToken, storedToken.token);
    if (!valid) throw new UnauthorizedError("SESSION_EXPIRED", "Session expired");

    // Revoke old then issue new — single-use rotation limits the exposure window of a stolen token
    await revokeRefreshToken(tokenId);

    const newRawToken = genRefreshToken();
    const newHashedToken = await hashRefreshToken(newRawToken);
    const newPrefix = extractTokenId(newRawToken);

    if (!newPrefix) throw new AppError(500, "INTERNAL_ERROR", "Failed to create refresh token");

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await createRefreshTokenDb({
        userId: storedToken.userId,
        hashedToken: newHashedToken,
        prefix: newPrefix,
        expiresAt,
    });

    const userData = await getUserByIdWithRefreshToken(storedToken.userId);
    if (!userData) throw new UnauthorizedError("SESSION_EXPIRED", "Session expired");

    return { newRawToken, userData };
}

export async function issueTokens(userId: string, emailHash: string): Promise<{
    actToken: string;
    rawRefreshToken: string;
}> {
    const rawRefreshToken = genRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(rawRefreshToken);
    const prefix = extractTokenId(rawRefreshToken);

    if (!prefix) throw new AppError(500, "INTERNAL_ERROR", "Failed to create refresh token");

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await createRefreshTokenDb({ userId, hashedToken: hashedRefreshToken, prefix, expiresAt });

    const actToken = createAccessToken(userId, emailHash);
    return { actToken, rawRefreshToken };
}

export {
    genRefreshToken as createRefreshToken,
    hashRefreshToken,
    verifyRefreshToken,
    extractTokenId,
};