import type { StoreState, SSESlice } from "./types";

export const createSSESlice = (
    set: (fn: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
    get: () => StoreState,
    _api?: unknown,
): SSESlice => ({
    handleSSEEvent: (event) => {
        const s = get();
        switch (event.type) {
            case "task:created":
                s.addTask(event.payload);
                break;
            case "task:updated":
                s.updateTask(event.payload);
                break;
            case "task:deleted":
                s.deleteTask(event.payload.id);
                break;
            case "member:joined":
                s.addMember(event.payload.userId, event.payload.user, event.payload.teamId);
                break;
            case "member:left":
                s.removeMember(event.payload.userId, event.payload.teamId);
                break;
            case "member:promoted":
                s.promoteMember(event.payload.userId, event.payload.user, event.payload.teamId);
                break;
            case "member:kicked":
                // When self is kicked: clear all team data from store, show toast.
                // The useTeamGuard hook detects kickedFromTeam and triggers a redirect.
                s.removeMember(event.payload.userId, event.payload.teamId);
                if (event.payload.userId === s.userId) {
                    const teamId = event.payload.teamId;
                    const teamName = s.teams.find((t) => t.id === teamId)?.name ?? "a team";
                    const { [teamId]: _removedTasks, ...restTasks } = s.tasks;
                    const { [teamId]: _removedMembers, ...restMembers } = s.members;
                    set({
                        kickedFromTeam: teamId,
                        teams: s.teams.filter((t) => t.id !== teamId),
                        tasks: restTasks,
                        members: restMembers,
                        myTasks: s.myTasks.filter((t) => t.teamId !== teamId),
                        currentTeamId: s.currentTeamId === teamId ? (s.teams.find((t) => t.id !== teamId)?.id ?? "") : s.currentTeamId,
                        toastMessage: `You have been kicked from "${teamName}"`,
                    });
                } else {
                    // When another member is kicked, unassign their tasks in the local store
                    const kickedUserId = event.payload.userId;
                    const teamId = event.payload.teamId;
                    set((st) => ({
                        tasks: {
                            ...st.tasks,
                            [teamId]: (st.tasks[teamId] ?? []).map((t) =>
                                t.assignedToId === kickedUserId ? { ...t, assignedToId: null, assignedTo: null } : t,
                            ),
                        },
                        myTasks: st.myTasks.map((t) =>
                            t.assignedToId === kickedUserId && t.teamId === teamId
                                ? { ...t, assignedToId: null, assignedTo: null }
                                : t,
                        ),
                    }));
                }
                break;
            // Team was deleted (last member left): remove it from local state,
            // and if it was the active team, switch to the first remaining team
            case "team:deleted":
                set((st) => ({
                    teams: st.teams.filter((t) => t.id !== event.payload.teamId),
                    currentTeamId: st.currentTeamId === event.payload.teamId
                        ? (st.teams.find((t) => t.id !== event.payload.teamId)?.id ?? "")
                        : st.currentTeamId,
                }));
                break;
            case "team:invite-updated":
                set((st) => ({
                    teams: st.teams.map((t) =>
                        t.id === event.payload.teamId
                            ? { ...t, inviteCode: event.payload.inviteCode }
                            : t,
                    ),
                }));
                break;
        }
    },

    // Called on logout: clears all in-memory state back to defaults.
    // Tokens in SecureStore are cleared separately by clearTokens() in api.ts.
    reset: () =>
        set({
            tasks: {},
            myTasks: [],
            currentTeamId: null,
            teams: [],
            members: {},
            userId: null,
            isLoading: false,
            error: null,
            theme: "light",
            kickedFromTeam: null,
            toastMessage: null,
        }),
});
