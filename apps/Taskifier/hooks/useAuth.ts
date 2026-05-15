import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { apiFetch, clearTokens } from "../services/api";
import type { Team } from "@taskifier/types";

interface AuthState {
    userId: string | null;
    teams: Team[];
    isAuthenticated: boolean;
    isLoading: boolean;
}

export function useAuth() {
    const router = useRouter();
    const isFetched = useRef(false);
    const [state, setState] = useState<AuthState>({
        userId: null,
        teams: [],
        isAuthenticated: false,
        isLoading: true,
    });

    // Separate from the root layout's init flow — this hook is used by individual screens
    // that need to verify auth state independently (e.g. after app resume)
    const checkAuth = useCallback(async (): Promise<AuthState> => {
        try {
            const data = await apiFetch<{
                id: string;
                teams: Team[];
            }>("/api/me");
            const newState = {
                userId: data.id,
                teams: data.teams,
                isAuthenticated: true,
                isLoading: false,
            };
            setState(newState);
            return newState;
        } catch {
            const newState = { userId: null, teams: [], isAuthenticated: false, isLoading: false };
            setState(newState);
            return newState;
        }
    }, []);

    useEffect(() => {
        if (isFetched.current) return;
        isFetched.current = true;

        checkAuth().then((authState) => {
            if (!authState.isAuthenticated) {
                router.replace("/login" as any);
            }
        });
    }, [router, checkAuth]);

    const logout = useCallback(async (): Promise<void> => {
        await apiFetch("/api/logout", { method: "POST", retryOn401: false }).catch(() => {});
        await clearTokens();
        router.replace("/login" as any);
    }, [router]);

    return { ...state, checkAuth, logout };
}
