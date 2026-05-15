import {
    emailSchema,
    passwordSchema,
    cuidSchema,
    teamNameSchema,
    taskTitleSchema,
    taskDescriptionSchema,
    isoDateSchema,
} from "../validators";

describe("validators", () => {
    describe("emailSchema", () => {
        it("accepts valid lowercase-trimmed email", () => {
            const result = emailSchema.safeParse("Test@Example.com");
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe("test@example.com");
            }
        });

        it("trims whitespace", () => {
            const result = emailSchema.safeParse("  user@example.com  ");
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe("user@example.com");
            }
        });

        it("rejects invalid email", () => {
            expect(emailSchema.safeParse("not-an-email").success).toBe(false);
            expect(emailSchema.safeParse("").success).toBe(false);
        });
    });

    describe("passwordSchema", () => {
        it("accepts password of 8+ characters", () => {
            expect(passwordSchema.safeParse("password123").success).toBe(true);
        });

        it("rejects password shorter than 8 characters", () => {
            expect(passwordSchema.safeParse("short").success).toBe(false);
            expect(passwordSchema.safeParse("1234567").success).toBe(false);
        });
    });

    describe("cuidSchema", () => {
        it("accepts valid CUID", () => {
            expect(
                cuidSchema.safeParse("clxxxxxxxxxxxx00000000000").success,
            ).toBe(true);
        });

        it("rejects invalid CUID", () => {
            expect(cuidSchema.safeParse("invalid").success).toBe(false);
            expect(cuidSchema.safeParse("").success).toBe(false);
        });
    });

    describe("teamNameSchema", () => {
        it("accepts valid team name", () => {
            expect(teamNameSchema.safeParse("My Team").success).toBe(true);
        });

        it("rejects empty string", () => {
            expect(teamNameSchema.safeParse("").success).toBe(false);
        });

        it("rejects name longer than 100 chars", () => {
            expect(teamNameSchema.safeParse("a".repeat(101)).success).toBe(
                false,
            );
        });
    });

    describe("taskTitleSchema", () => {
        it("accepts valid title", () => {
            expect(taskTitleSchema.safeParse("Fix bug").success).toBe(true);
        });

        it("rejects empty string", () => {
            expect(taskTitleSchema.safeParse("").success).toBe(false);
        });

        it("rejects title longer than 255 chars", () => {
            expect(taskTitleSchema.safeParse("a".repeat(256)).success).toBe(
                false,
            );
        });
    });

    describe("taskDescriptionSchema", () => {
        it("accepts null", () => {
            expect(taskDescriptionSchema.safeParse(null).success).toBe(true);
        });

        it("accepts string within limit", () => {
            expect(taskDescriptionSchema.safeParse("Description").success).toBe(
                true,
            );
        });

        it("rejects string longer than 5000 chars", () => {
            expect(
                taskDescriptionSchema.safeParse("a".repeat(5001)).success,
            ).toBe(false);
        });
    });

    describe("isoDateSchema", () => {
        it("accepts null", () => {
            expect(isoDateSchema.safeParse(null).success).toBe(true);
        });

        it("accepts valid ISO 8601 date string", () => {
            expect(
                isoDateSchema.safeParse("2025-01-15T10:30:00Z").success,
            ).toBe(true);
        });

        it("rejects invalid date string", () => {
            expect(isoDateSchema.safeParse("not-a-date").success).toBe(false);
        });
    });
});
