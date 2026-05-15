import {
    subscribe,
    unsubscribe,
    broadcast,
    getConnectionCount,
    resetForTest,
} from "../services/sse.service";
import type { Response } from "express";
import type { SSEEvent } from "@taskifier/types";

function createMockResponse(): Response {
    const chunks: string[] = [];
    const write = jest.fn((data: string) => {
        chunks.push(data);
        return true;
    });
    return {
        write,
        _getChunks: () => chunks,
    } as unknown as Response & { _getChunks: () => string[]; write: jest.Mock };
}

describe("sse.service", () => {
    beforeEach(() => {
        resetForTest();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("subscribe / unsubscribe", () => {
        it("tracks connections by teamId", () => {
            const res1 = createMockResponse();
            const res2 = createMockResponse();

            subscribe("team-1", res1);
            subscribe("team-1", res2);
            subscribe("team-2", res1);

            expect(getConnectionCount("team-1")).toBe(2);
            expect(getConnectionCount("team-2")).toBe(1);
        });

        it("removes a connection on unsubscribe", () => {
            const res1 = createMockResponse();
            const res2 = createMockResponse();

            subscribe("team-1", res1);
            subscribe("team-1", res2);
            unsubscribe("team-1", res1);

            expect(getConnectionCount("team-1")).toBe(1);
        });

        it("removes team from map when last connection closes", () => {
            const res = createMockResponse();
            subscribe("team-1", res);
            expect(getConnectionCount("team-1")).toBe(1);

            unsubscribe("team-1", res);
            expect(getConnectionCount("team-1")).toBe(0);
        });

        it("does not throw on unsubscribe for unknown team", () => {
            expect(() =>
                unsubscribe("unknown-team", createMockResponse()),
            ).not.toThrow();
        });
    });

    describe("broadcast", () => {
        it("does not throw when team has no connections", () => {
            expect(() =>
                broadcast("empty-team", {
                    type: "task:created",
                    payload: {
                        id: "t1",
                        teamId: "team",
                        title: "t",
                        completed: false,
                        createdById: "u",
                        createdAt: "",
                        updatedAt: "",
                    },
                } as SSEEvent),
            ).not.toThrow();
        });

        it("writes SSE-formatted data to all connections", () => {
            const res1 = createMockResponse();
            const res2 = createMockResponse();

            subscribe("team-1", res1);
            subscribe("team-1", res2);

            const event: SSEEvent = {
                type: "task:updated",
                payload: {
                    id: "task-1",
                    teamId: "team-1",
                    title: "Test task",
                    description: null,
                    completed: false,
                    assignedToId: null,
                    createdById: "u1",
                    calendarStart: null,
                    calendarEnd: null,
                    createdAt: "2025-01-01T00:00:00.000Z",
                    updatedAt: "2025-01-01T00:00:00.000Z",
                },
            };

            broadcast("team-1", event);

            const chunks1 = (
                res1 as Response & { _getChunks: () => string[] }
            )._getChunks();
            const chunks2 = (
                res2 as Response & { _getChunks: () => string[] }
            )._getChunks();

            expect(chunks1).toHaveLength(1);
            expect(chunks2).toHaveLength(1);
            expect(chunks1[0]!).toMatch(/^event: task:updated\ndata: .+\n\n$/);
        });

        it("only broadcasts to the target team", () => {
            const resTarget = createMockResponse();
            const resOther = createMockResponse();

            subscribe("team-1", resTarget);
            subscribe("team-2", resOther);

            const event: SSEEvent = {
                type: "task:created",
                payload: {
                    id: "task-1",
                    teamId: "team-1",
                    title: "New task",
                    description: null,
                    completed: false,
                    assignedToId: null,
                    createdById: "u1",
                    calendarStart: null,
                    calendarEnd: null,
                    createdAt: "2025-01-01T00:00:00.000Z",
                    updatedAt: "2025-01-01T00:00:00.000Z",
                },
            };

            broadcast("team-1", event);

            const chunksTarget = (
                resTarget as Response & { _getChunks: () => string[] }
            )._getChunks();
            const chunksOther = (
                resOther as Response & { _getChunks: () => string[] }
            )._getChunks();

            expect(chunksTarget).toHaveLength(1);
            expect(chunksOther).toHaveLength(0);
        });

it("serializes member:joined events with the SSE event type in the event line", () => {
            const res = createMockResponse();
            subscribe("team-1", res);

            const event: SSEEvent = {
                type: "member:joined",
                payload: {
                    userId: "user-1",
user: {
                        id: "user-1",
                        emailHash: "abc",
                        displayName: "Test User",
                        createdAt: "2025-01-01T00:00:00.000Z",
                        updatedAt: "2025-01-01T00:00:00.000Z",
                    },
                    teamId: "team-1",
                },
            };

            broadcast("team-1", event);

            const chunks = (
                res as Response & { _getChunks: () => string[] }
            )._getChunks();
            expect(chunks[0]!).toContain("event: member:joined");
        });
    });
});
