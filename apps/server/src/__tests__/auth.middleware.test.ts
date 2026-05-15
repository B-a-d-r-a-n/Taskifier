import {
    createRefreshToken,
    hashRefreshToken,
    verifyRefreshToken,
} from "../services/refresh-token";

describe("refresh-token", () => {
    describe("createRefreshToken", () => {
        it("returns a string starting with rft_", () => {
            const token = createRefreshToken();
            expect(token).toMatch(/^rft_/);
        });

        it("generates unique tokens on each call", () => {
            const tokens = new Set([
                createRefreshToken(),
                createRefreshToken(),
                createRefreshToken(),
            ]);
            expect(tokens.size).toBe(3);
        });
    });

    describe("hashRefreshToken / verifyRefreshToken", () => {
        it("hashes and verifies a refresh token correctly", async () => {
            const raw = "rft_test123";
            const hashed = await hashRefreshToken(raw);
            expect(hashed).not.toBe(raw);
            const valid = await verifyRefreshToken(raw, hashed);
            expect(valid).toBe(true);
        });

        it("rejects wrong token against correct hash", async () => {
            const hashed = await hashRefreshToken("correct-token");
            const valid = await verifyRefreshToken("wrong-token", hashed);
            expect(valid).toBe(false);
        });
    });
});
