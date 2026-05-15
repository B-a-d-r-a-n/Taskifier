import { z } from "zod";

export const createTeamSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const joinTeamSchema = z.object({
    inviteCode: z.string().min(1),
});

export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
