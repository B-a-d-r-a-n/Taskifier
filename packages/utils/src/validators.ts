import { z } from "zod";

export const emailSchema = z
    .string()
    .transform((v: string) => v.trim().toLowerCase())
    .pipe(z.string().email());

export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters");

export const cuidSchema = z
    .string()
    .regex(/^c[a-z0-9]{24}$/, "Invalid CUID format");

export const teamNameSchema = z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be at most 100 characters");

export const taskTitleSchema = z
    .string()
    .min(1, "Task title is required")
    .max(255, "Task title must be at most 255 characters");

export const taskDescriptionSchema = z
    .string()
    .max(5000, "Task description must be at most 5000 characters")
    .nullable();

export const isoDateSchema = z
    .string()
    .refine(
        (v: string) => !isNaN(Date.parse(v)),
        "Invalid ISO 8601 date string",
    )
    .nullable();
