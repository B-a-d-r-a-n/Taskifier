import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { assertMember } from "../services/team.service.js";
import {
    createTask,
    updateTask,
    deleteTask,
    findTaskById,
    listTasksByTeam,
    listMyTasks,
    calendarRange,
    searchTasks,
} from "../repositories/task.repo.js";
import { broadcast } from "../services/sse.service.js";
import { callActionable } from "../services/task.service.js";
import {
    createTaskSchema,
    updateTaskSchema,
    actionableSchema,
    searchSchema,
} from "../validations/index.js";

export const tasksRouter: Router = Router();

const userKeyGenerator = (req: Request): string => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    return userId ?? ip;
};

const taskLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    keyGenerator: userKeyGenerator,
    message: { code: "RATE_LIMITED", message: "Too many requests" },
});

const actionableLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    keyGenerator: userKeyGenerator,
    message: { code: "RATE_LIMITED", message: "Too many AI requests" },
});

tasksRouter.use(authMiddleware);
tasksRouter.use(taskLimiter);

tasksRouter.post("/api/tasks", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid input",
        });
        return;
    }

    await assertMember(req.user.userId, parsed.data.teamId);

    const task = await createTask({
        teamId: parsed.data.teamId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assignedToId: parsed.data.assignedToId ?? null,
        createdById: req.user.userId,
        calendarStart: parsed.data.calendarStart
            ? new Date(parsed.data.calendarStart)
            : null,
        calendarEnd: parsed.data.calendarEnd
            ? new Date(parsed.data.calendarEnd)
            : null,
    });

    broadcast(parsed.data.teamId, { type: "task:created", payload: task });

    res.status(201).json(task);
});

tasksRouter.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid input",
        });
        return;
    }

    const taskId = req.params["id"] as string;
    const existing = await findTaskById(taskId);
    if (!existing) {
        res.status(404).json({
            code: "TASK_NOT_FOUND",
            message: "Task not found",
        });
        return;
    }

    await assertMember(req.user.userId, existing.teamId);

    const updateData: Parameters<typeof updateTask>[1] = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined)
        updateData.description = parsed.data.description;
    if (parsed.data.completed !== undefined)
        updateData.completed = parsed.data.completed;
    if (parsed.data.assignedToId !== undefined)
        updateData.assignedToId = parsed.data.assignedToId;
    if (parsed.data.calendarStart !== undefined) {
        updateData.calendarStart = parsed.data.calendarStart
            ? new Date(parsed.data.calendarStart)
            : null;
    }
    if (parsed.data.calendarEnd !== undefined) {
        updateData.calendarEnd = parsed.data.calendarEnd
            ? new Date(parsed.data.calendarEnd)
            : null;
    }

    const updated = await updateTask(taskId, updateData);

    broadcast(existing.teamId, { type: "task:updated", payload: updated });

    res.json(updated);
});

tasksRouter.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const taskId = req.params["id"] as string;
    const existing = await findTaskById(taskId);
    if (!existing) {
        res.status(404).json({
            code: "TASK_NOT_FOUND",
            message: "Task not found",
        });
        return;
    }

    await assertMember(req.user.userId, existing.teamId);

    await deleteTask(taskId);

    broadcast(existing.teamId, {
        type: "task:deleted",
        payload: { id: taskId },
    });

    res.json({ ok: true });
});

tasksRouter.get(
    "/api/tasks/team/:teamId",
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

        const completed = req.query["completed"];
        const tasks = await listTasksByTeam(
            teamId,
            completed !== undefined ? completed === "true" : undefined,
        );

        res.json(tasks);
    },
);

tasksRouter.get("/api/tasks/my", async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
        });
        return;
    }

    const completed = req.query["completed"];
    const tasks = await listMyTasks(
        req.user.userId,
        completed !== undefined ? completed === "true" : undefined,
    );

    res.json(tasks);
});

tasksRouter.get(
    "/api/tasks/calendar/:teamId",
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        const start = req.query["start"] as string | undefined;
        const end = req.query["end"] as string | undefined;

        if (!start || !end) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "start and end query params required",
            });
            return;
        }

        await assertMember(req.user.userId, teamId);

        const tasks = await calendarRange(
            teamId,
            new Date(start),
            new Date(end),
        );
        res.json(tasks);
    },
);

tasksRouter.get(
    "/api/tasks/search/:teamId",
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const parsed = searchSchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "Invalid query",
            });
            return;
        }

        const teamId = req.params["teamId"] as string;
        await assertMember(req.user.userId, teamId);

        const tasks = await searchTasks(teamId, parsed.data["q"]);
        res.json(tasks);
    },
);

tasksRouter.post(
    "/api/tasks/actionable",
    actionableLimiter,
    async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Not authenticated",
            });
            return;
        }

        const parsed = actionableSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "Invalid input",
            });
            return;
        }

        try {
            const actionable = await callActionable(
                parsed.data.title,
                parsed.data.description,
            );
            res.json({ actionable });
        } catch {
            res.status(502).json({
                code: "AI_UNAVAILABLE",
                message: "AI service unavailable right now",
            });
        }
    },
);
