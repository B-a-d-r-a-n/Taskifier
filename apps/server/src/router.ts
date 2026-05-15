import { Router } from "express";
import { authRouter } from "./routes/auth.js";
import { tasksRouter } from "./routes/tasks.js";
import { teamsRouter } from "./routes/teams.js";
import { sseRouter } from "./routes/sse.js";

export function createApp(): Router {
    const router = Router();

    router.use(authRouter);
    router.use(tasksRouter);
    router.use(teamsRouter);
    router.get("/api/sse/:teamId", sseRouter);

    return router;
}
