import type { Team } from "@taskifier/types";
import type { StoreState, TeamSlice } from "./types";

export const createTeamSlice = (
    set: (fn: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
    get: () => StoreState,
    _api?: unknown,
): TeamSlice => ({
    currentTeamId: null,
    teams: [],

    setCurrentTeam: (teamId) => set({ currentTeamId: teamId }),

    setTeams: (teams) => set({ teams }),
});
