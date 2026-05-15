import { useTasksStore } from "../store/tasks";
import type { Task, SSEEvent } from "@taskifier/types";

function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: "task-1",
        teamId: "team-1",
        title: "Test Task",
        description: null,
        completed: false,
        assignedToId: null,
        createdById: "user-1",
        calendarStart: null,
        calendarEnd: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function makeEvent(
    type: SSEEvent["type"],
    payload: SSEEvent extends { type: infer T }
        ? { type: T; payload: infer P } extends SSEEvent
        ? P
        : never
        : never,
): SSEEvent {
    return { type, payload } as SSEEvent;
}

beforeEach(() => {
    useTasksStore.getState().reset();
});

describe("Zustand tasks store", () => {
    describe("addTask", () => {
        it("adds a task to the team tasks list", () => {
            const task = makeTask({ teamId: "team-1" });
            useTasksStore.getState().addTask(task);
            const tasks = useTasksStore.getState().tasks["team-1"];
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe("task-1");
        });

        it("prepends new task", () => {
            const task1 = makeTask({ id: "task-1" });
            const task2 = makeTask({ id: "task-2" });
            useTasksStore.getState().addTask(task1);
            useTasksStore.getState().addTask(task2);
            const tasks = useTasksStore.getState().tasks["team-1"];
            expect(tasks[0].id).toBe("task-2");
            expect(tasks[1].id).toBe("task-1");
        });
    });

    describe("updateTask", () => {
        it("updates an existing task", () => {
            const task = makeTask({ id: "task-1", title: "Original" });
            useTasksStore.getState().addTask(task);
            const updated = makeTask({ id: "task-1", title: "Updated" });
            useTasksStore.getState().updateTask(updated);
            const tasks = useTasksStore.getState().tasks["team-1"];
            expect(tasks[0].title).toBe("Updated");
        });

        it("updates task in myTasks list too", () => {
            const task = makeTask({ id: "task-1", assignedToId: "user-1" });
            useTasksStore.getState().addTask(task);
            useTasksStore.getState().setMyTasks([task]);
            const updated = makeTask({
                id: "task-1",
                assignedToId: "user-1",
                completed: true,
            });
            useTasksStore.getState().updateTask(updated);
            const myTasks = useTasksStore.getState().myTasks;
            expect(myTasks[0].completed).toBe(true);
        });
    });

    describe("deleteTask", () => {
        it("removes task from team tasks", () => {
            const task = makeTask({ id: "task-1" });
            useTasksStore.getState().addTask(task);
            useTasksStore.getState().deleteTask("task-1");
            expect(useTasksStore.getState().tasks["team-1"]).toHaveLength(0);
        });

        it("removes task from myTasks", () => {
            const task = makeTask({ id: "task-1", assignedToId: "user-1" });
            useTasksStore.getState().addTask(task);
            useTasksStore.getState().setMyTasks([task]);
            useTasksStore.getState().deleteTask("task-1");
            expect(useTasksStore.getState().myTasks).toHaveLength(0);
        });
    });

    describe("handleSSEEvent", () => {
        it("dispatches task:created event to addTask", () => {
            const task = makeTask({ id: "sse-task-1", teamId: "team-1" });
            const event = makeEvent("task:created", task);
            useTasksStore.getState().handleSSEEvent(event);
            expect(useTasksStore.getState().tasks["team-1"]).toHaveLength(1);
            expect(useTasksStore.getState().tasks["team-1"][0].id).toBe("sse-task-1");
        });

        it("dispatches task:updated event to updateTask", () => {
            const task = makeTask({
                id: "sse-task-1",
                teamId: "team-1",
                title: "Old",
            });
            useTasksStore.getState().addTask(task);
            const updated = makeTask({
                id: "sse-task-1",
                teamId: "team-1",
                title: "New Title",
            });
            const event = makeEvent("task:updated", updated);
            useTasksStore.getState().handleSSEEvent(event);
            expect(useTasksStore.getState().tasks["team-1"][0].title).toBe(
                "New Title",
            );
        });

        it("dispatches task:deleted event to deleteTask", () => {
            const task = makeTask({ id: "sse-task-1" });
            useTasksStore.getState().addTask(task);
            const event = makeEvent("task:deleted", { id: "sse-task-1" });
            useTasksStore.getState().handleSSEEvent(event);
            expect(useTasksStore.getState().tasks["team-1"]).toHaveLength(0);
        });

        it("dispatches member:joined event", () => {
            const event = makeEvent("member:joined", {
                userId: "new-user",
user: {
                     id: "new-user",
                     emailHash: "abc123",
                     createdAt: "2024-01-01T00:00:00.000Z",
                     updatedAt: "2024-01-01T00:00:00.000Z",
                 },
                 teamId: "team-1",
             });
             useTasksStore.getState().setCurrentTeam("team-1");
            useTasksStore.getState().handleSSEEvent(event);
            const members = useTasksStore.getState().members["team-1"];
            expect(members).toHaveLength(1);
            expect(members[0].userId).toBe("new-user");
        });

        it("dispatches member:joined event with explicit teamId (currentTeamId not set)", () => {
            const event = makeEvent("member:joined", {
                userId: "new-user",
user: {
                     id: "new-user",
                     emailHash: "abc123",
                     createdAt: "2024-01-01T00:00:00.000Z",
                     updatedAt: "2024-01-01T00:00:00.000Z",
                 },
                 teamId: "team-1",
             });
             // Note: currentTeamId NOT set — relies on event payload's teamId
            useTasksStore.getState().handleSSEEvent(event);
            const members = useTasksStore.getState().members["team-1"];
            expect(members).toHaveLength(1);
            expect(members[0].userId).toBe("new-user");
        });

        it("dispatches member:left event", () => {
            const joinEvent = makeEvent("member:joined", {
                userId: "user-to-leave",
user: {
                     id: "user-to-leave",
                     emailHash: "abc123",
                     createdAt: "2024-01-01T00:00:00.000Z",
                     updatedAt: "2024-01-01T00:00:00.000Z",
                 },
                 teamId: "team-1",
             });
             useTasksStore.getState().setCurrentTeam("team-1");
            useTasksStore.getState().handleSSEEvent(joinEvent);

            const leaveEvent = makeEvent("member:left", { userId: "user-to-leave", teamId: "team-1" });
            useTasksStore.getState().handleSSEEvent(leaveEvent);

            expect(useTasksStore.getState().members["team-1"]).toHaveLength(0);
        });

        it("clearTeamMembers removes entire team member entry", () => {
            const joinEvent = makeEvent("member:joined", {
                userId: "some-user",
user: {
                     id: "some-user",
                     emailHash: "abc123",
                     createdAt: "2024-01-01T00:00:00.000Z",
                     updatedAt: "2024-01-01T00:00:00.000Z",
                 },
                 teamId: "team-1",
             });
            useTasksStore.getState().handleSSEEvent(joinEvent);
            expect(useTasksStore.getState().members["team-1"]).toHaveLength(1);

            useTasksStore.getState().clearTeamMembers("team-1");
            expect(useTasksStore.getState().members["team-1"]).toBeUndefined();
        });
});

    describe("reset", () => {
        it("clears all state", () => {
            useTasksStore.getState().addTask(makeTask({ id: "t1" }));
            useTasksStore.getState().setTeams([
                {
                    id: "team-1",
                    name: "T",
                    inviteCode: "X",
                    createdAt: "2024",
                    updatedAt: "2024",
                },
            ]);
            useTasksStore.getState().reset();
            const state = useTasksStore.getState();
            expect(state.tasks).toEqual({});
            expect(state.teams).toEqual([]);
            expect(state.myTasks).toEqual([]);
        });
    });
});
