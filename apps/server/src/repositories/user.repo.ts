import { prisma } from "../lib/prisma.js";
import { hashEmail, encryptEmail } from "@taskifier/utils";
import type { User } from "@taskifier/types";

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    displayName: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
    const emailHash = hashEmail(input.email);
    const encryptedEmail = encryptEmail(input.email);

    const user = await prisma.user.create({
        data: {
            emailHash,
            encryptedEmail,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
        },
    });

    return serializeUser(user);
}

export async function findUserByEmailHash(
    emailHash: string,
): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { emailHash } });
    return user ? serializeUser(user) : null;
}

export async function findUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? serializeUser(user) : null;
}

export async function findUserByEmailHashWithPassword(
    emailHash: string,
): Promise<{ id: string; emailHash: string; passwordHash: string } | null> {
    const user = await prisma.user.findUnique({
        where: { emailHash },
        select: { id: true, emailHash: true, passwordHash: true },
    });
    return user;
}

export interface CreateRefreshTokenInput {
    userId: string;
    hashedToken: string;
    prefix: string;
    expiresAt: Date;
}

export async function createRefreshToken(
    input: CreateRefreshTokenInput,
): Promise<string> {
    const token = await prisma.refreshToken.create({
        data: {
            userId: input.userId,
            token: input.hashedToken,
            prefix: input.prefix,
            expiresAt: input.expiresAt,
        },
    });
    return token.id;
}

export async function findRefreshToken(
    tokenId: string,
): Promise<{ id: string; userId: string; token: string; expiresAt: Date } | null> {
    const token = await prisma.refreshToken.findUnique({
        where: { prefix: tokenId },
    });
    // Check expiry in application code (not just DB) — defense against clock skew between app servers
    if (!token || token.expiresAt < new Date()) {
        return null;
    }
    return {
        id: token.id,
        userId: token.userId,
        token: token.token,
        expiresAt: token.expiresAt,
    };
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
    // Idempotent — token may already be deleted by a concurrent rotation; that's safe
    await prisma.refreshToken.delete({
        where: { prefix: tokenId },
    }).catch(() => {});
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
        where: { userId },
    });
}

export async function getUserByIdWithRefreshToken(
    userId: string,
): Promise<{ id: string; emailHash: string } | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, emailHash: true },
    });
    return user;
}



function serializeUser(user: {
     id: string;
     emailHash: string;
     displayName: string;
     createdAt: Date;
     updatedAt: Date;
 }): User {
     return {
         id: user.id,
         emailHash: user.emailHash,
         displayName: user.displayName,
         createdAt: user.createdAt.toISOString(),
         updatedAt: user.updatedAt.toISOString(),
     };
 }