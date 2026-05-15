import { z } from "zod";

export const createTaskSchema = z.object({
    teamId: z.string(),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).nullable().optional(),
    assignedToId: z.string().nullable().optional(),
    calendarStart: z.string().datetime().optional(),
    calendarEnd: z.string().datetime().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
    .object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(5000).nullable().optional(),
        completed: z.boolean().optional(),
        assignedToId: z.string().nullable().optional(),
        calendarStart: z.string().datetime().nullable().optional(),
        calendarEnd: z.string().datetime().nullable().optional(),
    })
    .strict();

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const actionableSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(5000).nullable().optional(),
});

export type ActionableInput = z.infer<typeof actionableSchema>;

export const searchSchema = z.object({
    q: z.string().min(1).max(200),
});

export type SearchInput = z.infer<typeof searchSchema>;
