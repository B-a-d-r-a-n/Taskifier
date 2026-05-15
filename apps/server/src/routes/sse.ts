import type { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { subscribe, unsubscribe } from "../services/sse.service.js";
import { assertMember } from "../services/team.service.js";

export function sseRouter(req: Request, res: Response): void {
    authMiddleware(req, res, async () => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        if (!teamId) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "teamId required",
            });
            return;
        }

        try {
            await assertMember(req.user.userId, teamId);
        } catch {
            res.status(403).json({
                code: "FORBIDDEN",
                message: "Not a team member",
            });
            return;
        }

        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        res.writeHead(200);

        subscribe(teamId, res);

        const pingInterval = setInterval(() => {
            res.write(": ping\n\n");
        }, 30_000);

        req.on("close", () => {
            clearInterval(pingInterval);
            unsubscribe(teamId, res);
        });
    });
}
