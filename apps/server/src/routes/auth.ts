import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { hashEmail } from "@taskifier/utils";
import { authMiddleware } from "../middleware/auth.js";
import {
    createAccessToken,
    issueTokens,
    rotateRefreshToken,
} from "../services/auth.service.js";
import {
    createUser,
    findUserByEmailHash,
    findUserByEmailHashWithPassword,
    revokeAllUserRefreshTokens,
    findUserById,
} from "../repositories/user.repo.js";
import { listUserTeams } from "../repositories/team.repo.js";
import {
    registerSchema,
    loginSchema,
} from "../validations/index.js";

export const authRouter: Router = Router();

// Key rate limit by IP+email combination — prevents one user's failed attempts from blocking another user behind the same NAT
const keyGenerator = (req: Request): string => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const email = (req.body?.email as string | undefined) ?? "anon";
    return `${ip}::${email}`;
};

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    keyGenerator,
    message: { code: "RATE_LIMITED", message: "Too many registrations" },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    keyGenerator,
    message: { code: "RATE_LIMITED", message: "Too many login attempts" },
});

authRouter.post(
    "/api/register",
    registerLimiter,
    async (req: Request, res: Response) => {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "Invalid input",
            });
            return;
        }

        const { email, password, displayName } = parsed.data;
        const emailHash = hashEmail(email);

        const existing = await findUserByEmailHash(emailHash);
        if (existing) {
            res.status(409).json({
                code: "EMAIL_EXISTS",
                message: "Email already registered",
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser({
            email,
            passwordHash: hashedPassword,
            displayName,
        });

        const { actToken, rawRefreshToken } = await issueTokens(user.id, user.emailHash);

        res.status(201).json({
            id: user.id,
            createdAt: user.createdAt,
            teams: [],
            actToken,
            refreshToken: rawRefreshToken,
        });
    },
);

authRouter.post(
    "/api/login",
    loginLimiter,
    async (req: Request, res: Response) => {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "Invalid input",
            });
            return;
        }

        const { email, password } = parsed.data;
        const emailHash = hashEmail(email);

        const dbUser = await findUserByEmailHashWithPassword(emailHash);
        if (!dbUser) {
            res.status(401).json({
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
            return;
        }

        const isValid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!isValid) {
            res.status(401).json({
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
            return;
        }

        const user = await findUserByEmailHash(emailHash);
        if (!user) {
            res.status(500).json({
                code: "INTERNAL_ERROR",
                message: "User not found",
            });
            return;
        }

        const { actToken, rawRefreshToken } = await issueTokens(user.id, user.emailHash);

        const teams = await listUserTeams(user.id);

        res.json({
            id: user.id,
            createdAt: user.createdAt,
            teams,
            actToken,
            refreshToken: rawRefreshToken,
        });
    },
);

authRouter.post("/api/refresh", async (req: Request, res: Response) => {
    const rawRefreshToken = req.body?.refreshToken;

    if (!rawRefreshToken) {
        res.status(401).json({
            code: "SESSION_EXPIRED",
            message: "Session expired",
        });
        return;
    }

    try {
        const { newRawToken, userData } = await rotateRefreshToken(rawRefreshToken);
        const newActToken = createAccessToken(userData.id, userData.emailHash);
        res.json({ ok: true, actToken: newActToken, refreshToken: newRawToken });
    } catch {
        res.status(401).json({
            code: "SESSION_EXPIRED",
            message: "Session expired",
        });
    }
});

authRouter.post(
    "/api/logout",
    authMiddleware,
    async (req: Request, res: Response) => {
        if (req.user) {
            await revokeAllUserRefreshTokens(req.user.userId);
        }
        res.json({ ok: true });
    },
);

authRouter.get(
    "/api/me",
    authMiddleware,
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const user = await findUserById(req.user.userId);
        if (!user) {
            res.status(404).json({
                code: "USER_NOT_FOUND",
                message: "User not found",
            });
            return;
        }

        const teams = await listUserTeams(user.id);

        res.json({ id: user.id, createdAt: user.createdAt, teams });
    },
);
