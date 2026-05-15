import { apiFetch, setTokens, clearTokens } from "../services/api";

beforeEach(async () => {
    await clearTokens();
    jest.clearAllMocks();
});

afterEach(async () => {
    await clearTokens();
});

function mockFetch(response: Response | number, options?: ResponseInit) {
    const res =
        typeof response === "number"
            ? new Response(null, { status: response, ...options })
            : response;
    global.fetch = jest.fn().mockResolvedValue(res) as unknown as typeof fetch;
}

describe("apiFetch", () => {
    it("sends bearer token when token is set", async () => {
        await setTokens("test-access-token", "test-refresh-token");
        mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));

        await apiFetch("/api/me");

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/me"),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: "Bearer test-access-token",
                }),
            }),
        );
    });

    it("attaches method to POST requests", async () => {
        mockFetch(new Response(null, { status: 204 }));

        await apiFetch("/api/logout", { method: "POST" });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/logout"),
            expect.objectContaining({
                method: "POST",
            }),
        );
    });

    it("returns parsed JSON on success", async () => {
        const data = { id: "user-1", teams: [] };
        mockFetch(new Response(JSON.stringify(data), { status: 200 }));

        const result = await apiFetch<typeof data>("/api/me");

        expect(result).toEqual(data);
    });

    it("throws error with message from server on non-ok non-401 response", async () => {
        mockFetch(
            new Response(
                JSON.stringify({ code: "VALIDATION_ERROR", message: "Invalid input" }),
                {
                    status: 400,
                    headers: { "content-type": "application/json" },
                },
            ),
        );

        await expect(apiFetch("/api/tasks")).rejects.toThrow("Invalid input");
    });

    it("does NOT retry when retryOn401 is false and returns 401", async () => {
        mockFetch(new Response(null, { status: 401 }));

        await expect(apiFetch("/api/me", { retryOn401: false })).rejects.toThrow();

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("attempts refresh on 401 and retries once", async () => {
        await setTokens("expired-access", "valid-refresh");

        let callCount = 0;
        global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve(new Response(null, { status: 401 }));
            }
            if (callCount === 2) {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({ actToken: "new-access", refreshToken: "new-refresh" }),
                        { status: 200 },
                    ),
                );
            }
            return Promise.resolve(
                new Response(JSON.stringify({ ok: true }), { status: 200 }),
            );
        }) as unknown as typeof fetch;

        const result = await apiFetch<{ ok: boolean }>("/api/me");
        expect(result).toEqual({ ok: true });
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });
});
