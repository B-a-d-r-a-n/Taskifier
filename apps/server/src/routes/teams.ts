import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
    assertMember,
    assertAdmin,
    TeamAccessDeniedError,
} from "../services/team.service.js";
import {
    createTeam,
    findTeamByInviteCode,
    regenerateInviteCode,
    addMember,
    removeMember,
    listTeamMembers,
    unassignTeamTasks,
    promoteOldestMember,
    countTeamMembers,
    deleteTeam,
} from "../repositories/team.repo.js";
import { broadcast } from "../services/sse.service.js";
import { findUserById } from "../repositories/user.repo.js";
import { createTeamSchema, joinTeamSchema } from "../validations/index.js";

export const teamsRouter: Router = Router();

teamsRouter.use(authMiddleware);

teamsRouter.post("/api/teams", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid input",
        });
        return;
    }

    const team = await createTeam({
        name: parsed.data.name,
        userId: req.user.userId,
    });

    res.status(201).json(team);
});

teamsRouter.post("/api/teams/join", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const parsed = joinTeamSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid input",
        });
        return;
    }

    const team = await findTeamByInviteCode(parsed.data.inviteCode);
    if (!team) {
        res.status(404).json({
            code: "TEAM_NOT_FOUND",
            message: "Team not found",
        });
        return;
    }

    try {
        await assertMember(req.user.userId, team.id);
        res.status(409).json({
            code: "ALREADY_MEMBER",
            message: "Already a member of this team",
        });
        return;
    } catch (err) {
        if (!(err instanceof TeamAccessDeniedError)) {
            throw err;
        }
    }

    const member = await addMember(req.user.userId, team.id, "MEMBER");

    const user = await findUserById(req.user.userId);
    if (user) {
        broadcast(team.id, {
            type: "member:joined",
            payload: { userId: user.id, user, teamId: team.id },
        });
    }

    res.status(201).json({ team, member });
});

teamsRouter.get(
    "/api/teams/:teamId/members",
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        await assertMember(req.user.userId, teamId);

        const members = await listTeamMembers(teamId);
        res.json(members);
    },
);

teamsRouter.delete(
    "/api/teams/:teamId/members/:userId",
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        const targetUserId = req.params["userId"] as string;
        const requesterId = req.user!.userId;

        // Use assertAdmin's throw as a boolean check — avoids a separate membership query
        const isRequesterAdmin = await (async () => {
            try {
                await assertAdmin(requesterId, teamId);
                return true;
            } catch {
                return false;
            }
        })();

        if (!isRequesterAdmin && requesterId !== targetUserId) {
            res.status(403).json({
                code: "FORBIDDEN",
                message: "Cannot remove this member",
            });
            return;
        }

        await assertMember(targetUserId, teamId);

        const isTargetAdmin = await (async () => {
            try {
                await assertAdmin(targetUserId, teamId);
                return true;
            } catch {
                return false;
            }
        })();

        // Must unassign before removing the member — removing breaks the FK constraint on task.assignedToId
        await unassignTeamTasks(targetUserId, teamId);

        // If kicking someone else, broadcast member:kicked
        const isKick = requesterId !== targetUserId;

        // If the target is an admin, promote the oldest remaining member
        let promotedUserId: string | null = null;
        if (isTargetAdmin) {
            promotedUserId = await promoteOldestMember(teamId, targetUserId);
        }

        // Remove the member
        await removeMember(targetUserId, teamId);

        // Check remaining members
        const remaining = await countTeamMembers(teamId);

        if (remaining === 0) {
            // Last member left, delete the team and all its tasks (cascade)
            await deleteTeam(teamId);
            broadcast(teamId, {
                type: "team:deleted",
                payload: { teamId },
            });
        } else if (isKick) {
            broadcast(teamId, {
                type: "member:kicked",
                payload: { userId: targetUserId, teamId },
            });
        } else {
            broadcast(teamId, {
                type: "member:left",
                payload: { userId: targetUserId, teamId },
            });
        }

        // Broadcast promotion event if someone was promoted
        if (promotedUserId) {
            const promotedUser = await findUserById(promotedUserId);
            if (promotedUser) {
                broadcast(teamId, {
                    type: "member:promoted",
                    payload: { userId: promotedUserId, user: promotedUser, teamId },
                });
            }
        }

        res.json({ ok: true });
    },
);

teamsRouter.post(
    "/api/teams/:teamId/regenerate-invite",
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        await assertAdmin(req.user.userId, teamId);

        const newCode = await regenerateInviteCode(teamId);
        broadcast(teamId, {
            type: "team:invite-updated",
            payload: { teamId, inviteCode: newCode },
        });
        res.json({ inviteCode: newCode });
    },
);
