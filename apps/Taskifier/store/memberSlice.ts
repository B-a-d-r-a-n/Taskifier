import type { User, TeamMember, Role } from "@taskifier/types";
import type { StoreState, MemberSlice } from "./types";

export const createMemberSlice = (
    set: (fn: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
    get: () => StoreState,
    _api?: unknown,
): MemberSlice => ({
    members: {},

    setMembers: (teamId, members) =>
        set((s) => ({ members: { ...s.members, [teamId]: members } })),

    addMember: (userId, user, teamId?) =>
        set((s) => {
            const tid = teamId ?? s.currentTeamId;
            if (!tid) return {};
            const existing = s.members[tid] ?? [];
            if (existing.some((m) => m.userId === userId)) return {};
            // Local-only ID with tmp- prefix until the server confirms the member record.
            // React needs a stable key; we can't wait for the server roundtrip on SSE events.
            const newMember: TeamMember = {
                id: `tmp-${userId}`,
                userId,
                teamId: tid,
                role: "MEMBER",
                joinedAt: new Date().toISOString(),
                user,
            };
            return { members: { ...s.members, [tid]: [...existing, newMember] } };
        }),

    removeMember: (userId, teamId?) =>
        set((s) => {
            const tid = teamId ?? s.currentTeamId;
            if (!tid) return {};
            return {
                members: {
                    ...s.members,
                    [tid]: (s.members[tid] ?? []).filter((m) => m.userId !== userId),
                },
            };
        }),

    clearTeamMembers: (teamId) =>
        set((s) => {
            const { [teamId]: _, ...rest } = s.members;
            return { members: rest };
        }),

    promoteMember: (userId, user, teamId) =>
        set((s) => {
            const members = s.members[teamId];
            if (!members) return {};
            return {
                members: {
                    ...s.members,
                    [teamId]: members.map((m) =>
                        m.userId === userId ? { ...m, role: "ADMIN" as Role, user } : m,
                    ),
                },
            };
        }),
});
