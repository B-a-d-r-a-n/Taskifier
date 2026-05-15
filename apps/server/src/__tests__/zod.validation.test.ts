import { z } from "zod";

describe("API Zod validation", () => {
    const registerSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
    });

    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
    });

    const createTaskSchema = z.object({
        teamId: z.string(),
        title: z.string().min(1).max(255),
        description: z.string().max(5000).nullable().optional(),
        assignedToId: z.string().nullable().optional(),
        calendarStart: z.string().datetime().optional(),
        calendarEnd: z.string().datetime().optional(),
    });

    const updateTaskSchema = z
        .object({
            title: z.string().min(1).max(255).optional(),
            description: z.string().max(5000).nullable().optional(),
            completed: z.boolean().optional(),
            assignedToId: z.string().nullable().optional(),
            calendarStart: z.string().datetime().nullable().optional(),
            calendarEnd: z.string().datetime().nullable().optional(),
        })
        .strict();

    const actionableSchema = z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).nullable().optional(),
    });

    const createTeamSchema = z.object({
        name: z.string().min(1).max(100),
    });

    const joinTeamSchema = z.object({
        inviteCode: z.string().min(1),
    });

    describe("registerSchema", () => {
        it("accepts valid input", () => {
            expect(
                registerSchema.safeParse({
                    email: "test@example.com",
                    password: "password123",
                }).success,
            ).toBe(true);
        });

        it("rejects missing email", () => {
            const result = registerSchema.safeParse({
                password: "password123",
            });
            expect(result.success).toBe(false);
        });

        it("rejects invalid email", () => {
            const result = registerSchema.safeParse({
                email: "not-an-email",
                password: "password123",
            });
            expect(result.success).toBe(false);
        });

        it("rejects short password", () => {
            const result = registerSchema.safeParse({
                email: "test@example.com",
                password: "short",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("loginSchema", () => {
        it("accepts valid input", () => {
            expect(
                loginSchema.safeParse({
                    email: "test@example.com",
                    password: "password",
                }).success,
            ).toBe(true);
        });

        it("rejects empty password", () => {
            const result = loginSchema.safeParse({
                email: "test@example.com",
                password: "",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("createTaskSchema", () => {
        it("accepts minimal valid input", () => {
            expect(
                createTaskSchema.safeParse({
                    teamId: "team-1",
                    title: "Do something",
                }).success,
            ).toBe(true);
        });

        it("accepts full valid input", () => {
            expect(
                createTaskSchema.safeParse({
                    teamId: "team-1",
                    title: "Task title",
                    description: "Task description",
                    assignedToId: "user-1",
                    calendarStart: "2025-01-15T10:00:00Z",
                    calendarEnd: "2025-01-15T18:00:00Z",
                }).success,
            ).toBe(true);
        });

        it("rejects empty title", () => {
            const result = createTaskSchema.safeParse({
                teamId: "team-1",
                title: "",
            });
            expect(result.success).toBe(false);
        });

        it("rejects missing teamId", () => {
            const result = createTaskSchema.safeParse({
                title: "Do something",
            });
            expect(result.success).toBe(false);
        });

        it("rejects description over 5000 chars", () => {
            const result = createTaskSchema.safeParse({
                teamId: "team-1",
                title: "Task",
                description: "a".repeat(5001),
            });
            expect(result.success).toBe(false);
        });

        it("rejects invalid calendarStart (not ISO date)", () => {
            const result = createTaskSchema.safeParse({
                teamId: "team-1",
                title: "Task",
                calendarStart: "not-a-date",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("updateTaskSchema", () => {
        it("accepts partial update (completed only)", () => {
            expect(
                updateTaskSchema.safeParse({ completed: true }).success,
            ).toBe(true);
        });

        it("accepts null for nullable fields", () => {
            expect(
                updateTaskSchema.safeParse({
                    description: null,
                    assignedToId: null,
                }).success,
            ).toBe(true);
        });

        it("rejects unknown fields", () => {
            const result = updateTaskSchema.safeParse({
                unknownField: "value",
            });
            expect(result.success).toBe(false);
        });
    });

    describe("actionableSchema", () => {
        it("accepts title only", () => {
            expect(
                actionableSchema.safeParse({ title: "Do something" }).success,
            ).toBe(true);
        });

        it("accepts title with optional description", () => {
            expect(
                actionableSchema.safeParse({
                    title: "Do something",
                    description: "Details here",
                }).success,
            ).toBe(true);
        });

        it("rejects empty title", () => {
            const result = actionableSchema.safeParse({ title: "" });
            expect(result.success).toBe(false);
        });
    });

    describe("team schemas", () => {
        it("accepts valid team creation input", () => {
            expect(
                createTeamSchema.safeParse({ name: "My Team" }).success,
            ).toBe(true);
        });

        it("rejects empty team name", () => {
            expect(createTeamSchema.safeParse({ name: "" }).success).toBe(
                false,
            );
        });

        it("accepts valid join input", () => {
            expect(
                joinTeamSchema.safeParse({ inviteCode: "team-code-123" })
                    .success,
            ).toBe(true);
        });

        it("rejects empty invite code", () => {
            expect(joinTeamSchema.safeParse({ inviteCode: "" }).success).toBe(
                false,
            );
        });
    });
});
