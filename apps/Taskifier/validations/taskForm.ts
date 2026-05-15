import { z } from "zod";

export const taskFormSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(255, "Title must be at most 255 characters"),
    description: z
        .string()
        .max(5000, "Description must be at most 5000 characters"),
    calendarStart: z.string().optional(),
    calendarStartHour: z.string(),
    calendarStartMinute: z.string(),
    calendarEnd: z.string().optional(),
    calendarEndHour: z.string(),
    calendarEndMinute: z.string(),
    assignedToId: z.string().optional(),
// Refine: when both dates are set, end time must be strictly after start time.
// This is a Zod refinement (cross-field validation) that checks combined date+time values.
}).refine(
    (data) => {
        if (!data.calendarStart || !data.calendarEnd) return true;
        const start = new Date(`${data.calendarStart}T${data.calendarStartHour}:${data.calendarStartMinute}:00`);
        const end = new Date(`${data.calendarEnd}T${data.calendarEndHour}:${data.calendarEndMinute}:00`);
        return end > start;
    },
    { message: "End time must be after start time", path: ["calendarEnd"] },
);

export type TaskFormData = z.infer<typeof taskFormSchema>;

export type FormErrors = Record<string, string>;

export function parseErrors(error: z.ZodError): FormErrors {
    const errors: FormErrors = {};
    for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = issue.message;
    }
    return errors;
}
