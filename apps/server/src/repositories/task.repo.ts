import { prisma } from "../lib/prisma.js";
import type { Task } from "@taskifier/types";

export interface CreateTaskInput {
    teamId: string;
    title: string;
    description: string | null;
    createdById: string;
    assignedToId?: string | null;
    calendarStart?: Date | null;
    calendarEnd?: Date | null;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string | null;
    completed?: boolean;
    assignedToId?: string | null;
    calendarStart?: Date | null;
    calendarEnd?: Date | null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
    const task = await prisma.task.create({
        data: input,
        include: { assignedTo: true, createdBy: true },
    });
    return serializeTask(task);
}

export async function findTaskById(id: string): Promise<Task | null> {
    const task = await prisma.task.findUnique({
        where: { id },
        include: { assignedTo: true, createdBy: true },
    });
    return task ? serializeTask(task) : null;
}

export async function updateTask(
    id: string,
    input: UpdateTaskInput,
): Promise<Task> {
    const task = await prisma.task.update({
        where: { id },
        data: input,
        include: { assignedTo: true, createdBy: true },
    });
    return serializeTask(task);
}

export async function deleteTask(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
}

export async function listTasksByTeam(
    teamId: string,
    completed?: boolean,
): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
        where: { teamId, ...(completed !== undefined ? { completed } : {}) },
        include: { assignedTo: true, createdBy: true },
        orderBy: { createdAt: "desc" },
    });
    return tasks.map(serializeTask);
}

export async function listMyTasks(
    userId: string,
    completed?: boolean,
): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
        where: {
            assignedToId: userId,
            ...(completed !== undefined ? { completed } : {}),
        },
        include: { assignedTo: true, createdBy: true },
        orderBy: { createdAt: "desc" },
    });
    return tasks.map(serializeTask);
}

export async function calendarRange(
    teamId: string,
    start: Date,
    end: Date,
): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
        where: {
            teamId,
            calendarStart: { gte: start },
            calendarEnd: { lte: end },
        },
        include: { assignedTo: true, createdBy: true },
        orderBy: { calendarStart: "asc" },
    });
    return tasks.map(serializeTask);
}

export async function searchTasks(
    teamId: string,
    query: string,
): Promise<Task[]> {
    // Uses PostgreSQL searchVector + ts_rank. Raw SQL needed because Prisma doesn't expose full-text search natively.
    const results = await prisma.$queryRaw<
        Array<{
            id: string;
            teamId: string;
            title: string;
            description: string | null;
            completed: boolean;
            assignedToId: string | null;
            createdById: string;
            calendarStart: Date | null;
            calendarEnd: Date | null;
            createdAt: Date;
            updatedAt: Date;
        }>
    >`
    SELECT t.* FROM "Task" t
    WHERE t."teamId" = ${teamId}
      AND t."searchVector" @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank(t."searchVector", plainto_tsquery('english', ${query})) DESC
    LIMIT 50
  `;

    const ids = (results as Array<{ id: string }>).map((r) => r.id);
    if (ids.length === 0) return [];

    const tasks = await prisma.task.findMany({
        where: { id: { in: ids } },
        include: { assignedTo: true, createdBy: true },
    });
    return tasks.map(serializeTask);
}

function serializeTask(task: {
     id: string;
     teamId: string;
     title: string;
     description: string | null;
     completed: boolean;
     assignedToId: string | null;
     createdById: string;
     calendarStart: Date | null;
     calendarEnd: Date | null;
     createdAt: Date;
     updatedAt: Date;
     assignedTo?: {
         id: string;
         emailHash: string;
         displayName: string;
         createdAt: Date;
         updatedAt: Date;
     } | null;
     createdBy: {
         id: string;
         emailHash: string;
         displayName: string;
         createdAt: Date;
         updatedAt: Date;
     };
 }): Task {
     return {
         id: task.id,
         teamId: task.teamId,
         title: task.title,
         description: task.description,
         completed: task.completed,
         assignedToId: task.assignedToId,
         createdById: task.createdById,
         calendarStart: task.calendarStart?.toISOString() ?? null,
         calendarEnd: task.calendarEnd?.toISOString() ?? null,
         createdAt: task.createdAt.toISOString(),
         updatedAt: task.updatedAt.toISOString(),
         assignedTo: task.assignedTo
             ? {
                   id: task.assignedTo.id,
                   emailHash: task.assignedTo.emailHash,
                   displayName: task.assignedTo.displayName,
                   createdAt: task.assignedTo.createdAt.toISOString(),
                   updatedAt: task.assignedTo.updatedAt.toISOString(),
               }
             : null,
         createdBy: {
             id: task.createdBy.id,
             emailHash: task.createdBy.emailHash,
             displayName: task.createdBy.displayName,
             createdAt: task.createdBy.createdAt.toISOString(),
             updatedAt: task.createdBy.updatedAt.toISOString(),
         },
     };
 }
