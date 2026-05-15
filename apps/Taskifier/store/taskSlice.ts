import type { Task } from "@taskifier/types";
import type { StoreState, TaskSlice } from "./types";

type SetFn = (fn: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void;

export const createTaskSlice = (
    set: SetFn,
    get: () => StoreState,
    _api?: unknown,
): TaskSlice => ({
    tasks: {},
    myTasks: [],

    setTasks: (teamId, tasks) =>
        set((s) => ({ tasks: { ...s.tasks, [teamId]: tasks } })),

    setMyTasks: (tasks) => set({ myTasks: tasks }),

    // Add task to the team's task list, and to myTasks if assigned to the current user
    addTask: (task) =>
        set((s) => {
            const existing = s.tasks[task.teamId] ?? [];
            if (existing.some((t) => t.id === task.id)) return {};
            const myTasks =
                task.assignedToId && task.assignedToId === s.userId
                    ? [task, ...s.myTasks]
                    : s.myTasks;
            return { tasks: { ...s.tasks, [task.teamId]: [task, ...existing] }, myTasks };
        }),

    // Replace the task in-place within the team's task list (immutable update via copy).
    // If the task is in myTasks (assigned to the current user), update it there too.
    updateTask: (task) =>
        set((s) => {
            const existing = s.tasks[task.teamId] ?? [];
            const idx = existing.findIndex((t) => t.id === task.id);
            const newTeamTasks = idx !== -1
                ? (() => { const copy = [...existing]; copy[idx] = task; return copy; })()
                : existing;
            const myIdx = s.myTasks.findIndex((t) => t.id === task.id);
            const myTasks = myIdx !== -1 ? s.myTasks.map((t) => (t.id === task.id ? task : t)) : s.myTasks;
            if (newTeamTasks === existing && myTasks === s.myTasks) return {};
            return { tasks: { ...s.tasks, [task.teamId]: newTeamTasks }, myTasks };
        }),

    // Delete a task from all team lists — the task could exist in any team's cache
    deleteTask: (taskId) =>
        set((s) => {
            const updatedTasks: Record<string, Task[]> = {};
            for (const [teamId, tasks] of Object.entries(s.tasks)) {
                updatedTasks[teamId] = tasks.filter((t) => t.id !== taskId);
            }
            return {
                tasks: updatedTasks,
                myTasks: s.myTasks.filter((t) => t.id !== taskId),
            };
        }),
});
