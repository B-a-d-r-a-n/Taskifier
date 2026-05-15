import type { StoreState, UISlice } from "./types";

export const createUISlice = (
    set: (fn: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
    get: () => StoreState,
    _api?: unknown,
): UISlice => ({
    userId: null,
    isLoading: false,
    error: null,
    theme: "light",
    kickedFromTeam: null,
    toastMessage: null,

    setUserId: (userId) => set({ userId }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setTheme: (theme) => set({ theme }),
    setKickedFromTeam: (kickedFromTeam) => set({ kickedFromTeam }),
    setToastMessage: (message) => set({ toastMessage: message }),
});
