import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "@taskifier/types";
import { verifyAccessToken } from "../services/auth.service.js";

declare module "express" {
    interface Request {
        user?: JWTPayload;
    }
}

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const token = extractBearerToken(req);

    if (!token) {
        res.status(401).json({
            code: "SESSION_EXPIRED",
            message: "Session expired",
        });
        return;
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            code: "SESSION_EXPIRED",
            message: "Session expired",
        });
    }
}

function extractBearerToken(req: Request): string | undefined {
    const header = req.headers["authorization"];
    if (header?.startsWith("Bearer ")) return header.slice(7);
    // EventSource on web can't set Authorization headers, so token is also accepted via ?token= query param
    const queryToken = req.query["token"] as string | undefined;
    if (queryToken) return queryToken;
    return undefined;
}
